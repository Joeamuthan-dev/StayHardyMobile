ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS subcategory text;

ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS ticket_id text;

ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'
CHECK (status IN ('open', 'pending', 'solved'));

ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'low'
CHECK (priority IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS idx_feedback_ticket_id
ON feedback(ticket_id);

CREATE INDEX IF NOT EXISTS idx_feedback_status
ON feedback(status, created_at DESC);

