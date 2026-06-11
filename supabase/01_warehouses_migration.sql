-- ============================================
-- Registrar — Warehouses Migration (idempotent)
-- Safe to re-run: skips tables that exist, adds
-- missing columns, recreates policies.
-- Run this in the Supabase SQL Editor.
-- ============================================

-- Warehouses (locations)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- In case an older version of the table exists without these columns
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Stock per warehouse (products are global, this links them to locations)
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (warehouse_id, product_id)
);

ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE warehouse_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Movement history (stock in, stock out, transfers, adjustments)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'transfer', 'adjustment')),
  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  moved_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS moved_by TEXT DEFAULT '';
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at DESC);

-- Row Level Security (ENABLE is idempotent)
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read warehouses" ON warehouses;
DROP POLICY IF EXISTS "Authenticated insert warehouses" ON warehouses;
DROP POLICY IF EXISTS "Authenticated update warehouses" ON warehouses;
DROP POLICY IF EXISTS "Authenticated delete warehouses" ON warehouses;
CREATE POLICY "Authenticated read warehouses" ON warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert warehouses" ON warehouses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update warehouses" ON warehouses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete warehouses" ON warehouses FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read warehouse_stock" ON warehouse_stock;
DROP POLICY IF EXISTS "Authenticated insert warehouse_stock" ON warehouse_stock;
DROP POLICY IF EXISTS "Authenticated update warehouse_stock" ON warehouse_stock;
DROP POLICY IF EXISTS "Authenticated delete warehouse_stock" ON warehouse_stock;
CREATE POLICY "Authenticated read warehouse_stock" ON warehouse_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert warehouse_stock" ON warehouse_stock FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update warehouse_stock" ON warehouse_stock FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete warehouse_stock" ON warehouse_stock FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated insert stock_movements" ON stock_movements;
CREATE POLICY "Authenticated read stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
