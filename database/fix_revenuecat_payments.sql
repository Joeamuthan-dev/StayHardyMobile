-- RevenueCat Integration Migration
-- Run in Supabase SQL Editor

-- 1. Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  product_id text,
  amount numeric,
  currency text,
  platform text,
  transaction_id text UNIQUE,
  revenuecat_customer_id text,
  purchase_date timestamptz,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- 2. Ensure users table has required columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pro_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenuecat_customer_id text;

-- 3. Add RLS policies for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can only view their own payments" 
    ON public.payments FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable public.payments for service role if needed
-- Normally authenticated users should only read.
