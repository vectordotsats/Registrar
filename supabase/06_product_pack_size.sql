-- ============================================
-- Registrar — Pack size per product (idempotent)
-- Optional "pieces per unit" (e.g. a carton = 40 pieces).
-- 0 / blank means the product isn't counted in packs.
-- Run this in the Supabase SQL Editor.
-- ============================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pack_size integer DEFAULT 0;
