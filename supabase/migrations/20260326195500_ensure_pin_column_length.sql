-- Ensure pin column can hold bcrypt hashes (60 chars)
-- Plain text PINs are 4 chars, hashes are ~60 chars
ALTER TABLE public.users
  ALTER COLUMN pin TYPE VARCHAR(255);

-- Add migration tracking comment
COMMENT ON COLUMN public.users.pin IS
  'Stores bcrypt hashed PIN. Migration: plain text PINs are hashed silently on next user login via app.';
