-- Push notifications (FCM/APNs via FCM server) — run in Supabase SQL editor.
-- Client saves token + timezone from device; Edge Function send-daily-pushes sends scheduled messages.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token_updated_at timestamptz;

-- IANA timezone for scheduling (e.g. Asia/Kolkata); updated when user enables push
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_timezone text DEFAULT 'UTC';

-- Local calendar dates (user TZ) — dedupe one morning / one evening per day
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_morning_push_date date;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_evening_push_date date;

COMMENT ON COLUMN public.users.push_notifications_enabled IS 'User opted in to daily push reminders';
COMMENT ON COLUMN public.users.push_token IS 'FCM registration token (Android) or compatible token';
COMMENT ON COLUMN public.users.push_timezone IS 'IANA timezone for 9 AM / 10 PM local scheduling';
