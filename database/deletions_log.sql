-- Audit log for account deletions (no PII retention beyond email + id). Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.deletions_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text,
  user_id text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'user_requested'
);

CREATE INDEX IF NOT EXISTS deletions_log_deleted_at_idx ON public.deletions_log (deleted_at DESC);

ALTER TABLE public.deletions_log ENABLE ROW LEVEL SECURITY;

-- No client access; inserts only via service role (Edge Functions).
CREATE POLICY "deletions_log_no_select"
  ON public.deletions_log FOR SELECT
  USING (false);
