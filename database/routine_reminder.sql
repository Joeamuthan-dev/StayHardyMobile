ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS routine_reminder_enabled boolean DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS routine_reminder_time text DEFAULT '20:00';
