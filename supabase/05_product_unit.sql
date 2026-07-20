-- ============================================
-- Registrar — Product unit of measure (idempotent)
-- Optional free-text unit per product (e.g. bag, carton).
-- Blank shows as "units" in the app.
-- Run this in the Supabase SQL Editor.
-- ============================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unit text DEFAULT '';
