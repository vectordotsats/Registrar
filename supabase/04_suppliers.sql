-- ============================================
-- Registrar — Suppliers (idempotent)
-- Replaces the old Customers section. Admin-only:
-- only business owners can see or manage suppliers.
-- Run this in the Supabase SQL Editor.
-- ============================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- In case an older version exists without these columns
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Admin-only: uses the is_admin() helper from 02_warehouse_admin_rls.sql
DROP POLICY IF EXISTS "admin all suppliers" ON suppliers;
CREATE POLICY "admin all suppliers" ON suppliers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
