-- ============================================
-- Registrar — Admin-only warehouse writes (idempotent)
-- Staff can VIEW warehouses; only admins can add / edit / delete.
-- Run this in the Supabase SQL Editor.
-- ============================================

-- Helper: is the currently logged-in user an admin?
-- SECURITY DEFINER so it can read public.users regardless of that table's RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Remove the old permissive policies
DROP POLICY IF EXISTS "Authenticated read warehouses"   ON warehouses;
DROP POLICY IF EXISTS "Authenticated insert warehouses"  ON warehouses;
DROP POLICY IF EXISTS "Authenticated update warehouses"  ON warehouses;
DROP POLICY IF EXISTS "Authenticated delete warehouses"  ON warehouses;
DROP POLICY IF EXISTS "read warehouses"          ON warehouses;
DROP POLICY IF EXISTS "admin insert warehouses"  ON warehouses;
DROP POLICY IF EXISTS "admin update warehouses"  ON warehouses;
DROP POLICY IF EXISTS "admin delete warehouses"  ON warehouses;

-- Anyone signed in (admin or staff) can read warehouses
CREATE POLICY "read warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can create / modify / remove warehouses
CREATE POLICY "admin insert warehouses" ON warehouses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin update warehouses" ON warehouses
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin delete warehouses" ON warehouses
  FOR DELETE TO authenticated
  USING (public.is_admin());
