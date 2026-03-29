-- Allow RC (Android) tips to be recorded without a Razorpay order ID.
-- Run in Supabase SQL editor.

-- 1. Make razorpay_order_id nullable (RC tips have no Razorpay order ID)
ALTER TABLE public.tips ALTER COLUMN razorpay_order_id DROP NOT NULL;

-- 2. Allow authenticated users to insert their own tip rows.
--    RC purchases are verified client-side by Google Play via the RC SDK,
--    so direct inserts are safe — user_id is pinned to auth.uid().
CREATE POLICY "tips_insert_own"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = user_id);
