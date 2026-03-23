-- Biometric login preference (no biometric templates stored server-side).
-- Run in Supabase SQL editor after reviewing.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS biometric_login_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS biometric_enabled_at timestamptz;

COMMENT ON COLUMN public.users.biometric_login_enabled IS 'User opted in to device biometric unlock + local session restore';
COMMENT ON COLUMN public.users.biometric_enabled_at IS 'When biometric login was last enabled';
