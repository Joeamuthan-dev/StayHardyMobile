-- 🚀 OPTIMIZATION: Database Indexes for routine_logs
-- Run this script in your Supabase Dashboard -> SQL Editor to speed up Disk I/O scans.

-- 1. Speed up list fetches and history trends (e.g., .eq('user_id', ...).gte('completed_at', ...))
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date 
ON routine_logs (user_id, completed_at);

-- 2. Speed up detail toggles and lookups (e.g., .eq('routine_id', ...).eq('completed_at', ...))
CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date 
ON routine_logs (routine_id, completed_at);
