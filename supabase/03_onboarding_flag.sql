-- ============================================
-- Registrar — Onboarding flag (idempotent)
-- Adds has_onboarded to users so the welcome guide
-- shows only once, to brand-new business owners.
-- Run this in the Supabase SQL Editor.
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_onboarded boolean NOT NULL DEFAULT false;

-- Everyone who already exists has been using the app — mark them onboarded
-- so they don't suddenly get sent to the welcome screen.
UPDATE public.users SET has_onboarded = true;
