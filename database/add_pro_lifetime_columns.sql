-- Run in Supabase SQL Editor. Adds Lifetime Access (₹99) fields for Razorpay + app gating.
-- Adjust table name if your public user profile table differs from `users`.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pro_purchase_date timestamptz;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payment_id text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payment_amount numeric;

COMMENT ON COLUMN public.users.is_pro IS 'Lifetime access (Stats + Routine) after successful Razorpay payment';
COMMENT ON COLUMN public.users.pro_purchase_date IS 'When lifetime access was granted';
COMMENT ON COLUMN public.users.payment_id IS 'Razorpay payment id';
COMMENT ON COLUMN public.users.payment_amount IS 'Amount charged (e.g. 99 for INR)';
