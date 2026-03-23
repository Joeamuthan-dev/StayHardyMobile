-- Tips / support payments (Razorpay). Run in Supabase SQL editor or via migration.
-- Verify table exists: SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tips');
-- Admin dashboard reads tips via Edge Function `admin-tips` (service role). The policy below is for direct client SELECT as admin if needed.
-- Amounts stored in whole rupees (not paise).

CREATE TABLE IF NOT EXISTS public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  user_email text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  amount integer NOT NULL CHECK (amount >= 1 AND amount <= 9999),
  razorpay_payment_id text,
  razorpay_order_id text NOT NULL,
  payment_status text NOT NULL CHECK (payment_status IN ('success', 'failed', 'pending')),
  tipped_at timestamptz NOT NULL DEFAULT now(),
  device_platform text NOT NULL DEFAULT 'web' CHECK (device_platform IN ('android', 'ios', 'web'))
);

CREATE UNIQUE INDEX IF NOT EXISTS tips_razorpay_payment_id_unique
  ON public.tips (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tips_tipped_at_idx ON public.tips (tipped_at DESC);
CREATE INDEX IF NOT EXISTS tips_user_id_idx ON public.tips (user_id);
CREATE INDEX IF NOT EXISTS tips_payment_status_idx ON public.tips (payment_status);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Admins read tips via authenticated JWT + users.role = admin
CREATE POLICY "tips_select_admin"
  ON public.tips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- No insert/update/delete for authenticated clients — edge functions use service role

COMMENT ON TABLE public.tips IS 'Razorpay support/tip payments; inserts only from Edge Functions (service role).';

-- Aggregates for admin (Edge Functions only — service_role execute)
CREATE OR REPLACE FUNCTION public.admin_tips_financial_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_inr', (SELECT COALESCE(SUM(amount), 0)::bigint FROM public.tips WHERE payment_status = 'success'),
    'supporters', (SELECT COUNT(DISTINCT user_id)::int FROM public.tips WHERE payment_status = 'success'),
    'this_month_inr', (
      SELECT COALESCE(SUM(amount), 0)::bigint FROM public.tips
      WHERE payment_status = 'success'
        AND tipped_at >= date_trunc('month', (now() AT TIME ZONE 'utc'))
    ),
    'last_month_inr', (
      SELECT COALESCE(SUM(amount), 0)::bigint FROM public.tips
      WHERE payment_status = 'success'
        AND tipped_at >= date_trunc('month', (now() AT TIME ZONE 'utc') - interval '1 month')
        AND tipped_at < date_trunc('month', (now() AT TIME ZONE 'utc'))
    )
  );
$$;

REVOKE ALL ON FUNCTION public.admin_tips_financial_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_tips_financial_summary() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_tips_amount_breakdown()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('amount', amount, 'cnt', cnt) ORDER BY amount),
    '[]'::jsonb
  )
  FROM (
    SELECT amount, COUNT(*)::int AS cnt
    FROM public.tips
    WHERE payment_status = 'success'
    GROUP BY amount
  ) s;
$$;

REVOKE ALL ON FUNCTION public.admin_tips_amount_breakdown() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_tips_amount_breakdown() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_tips_top_supporters()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_email', user_email,
        'total_tipped', total_tipped,
        'tip_count', tip_count
      ) ORDER BY total_tipped DESC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT user_email, SUM(amount)::bigint AS total_tipped, COUNT(*)::int AS tip_count
    FROM public.tips
    WHERE payment_status = 'success'
    GROUP BY user_id, user_email
    ORDER BY SUM(amount) DESC
    LIMIT 5
  ) x;
$$;

REVOKE ALL ON FUNCTION public.admin_tips_top_supporters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_tips_top_supporters() TO service_role;

