-- Run on Supabase SQL editor (or migration). Speeds up admin COUNT / range filters on Pro purchases.
-- Pro purchases are represented by users.is_pro + users.pro_purchase_date (lifetime Razorpay flow).

CREATE INDEX IF NOT EXISTS idx_users_pro_purchase_date_active
  ON public.users (pro_purchase_date DESC)
  WHERE is_pro = true AND pro_purchase_date IS NOT NULL;

COMMENT ON INDEX idx_users_pro_purchase_date_active IS 'Admin analytics: time-range counts and last-N purchases without full scans';
