-- Run once in Supabase SQL Editor. Complements optimize_routine_logs_indexes.sql and tips.sql.
-- Column names match the app (camelCase "userId" on tasks/goals per update_score_rpc.sql).

-- Tasks: filter by owner + status; sort by createdAt
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
  ON public.tasks ("userId", status);

CREATE INDEX IF NOT EXISTS idx_tasks_created
  ON public.tasks ("createdAt" DESC);

-- Goals: filter by owner + status
CREATE INDEX IF NOT EXISTS idx_goals_user_status
  ON public.goals ("userId", status);

-- Routines: list by user (days filter is app-side)
CREATE INDEX IF NOT EXISTS idx_routines_user_id
  ON public.routines (user_id);

-- Tips: admin / analytics filters (partial indexes also exist in database/tips.sql)
CREATE INDEX IF NOT EXISTS idx_tips_user_payment
  ON public.tips (user_id, payment_status);
