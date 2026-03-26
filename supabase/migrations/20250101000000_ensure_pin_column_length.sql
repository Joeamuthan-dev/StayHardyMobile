-- Ensure pin column can store bcrypt hashes (~60 chars)
-- Plain text PINs are 4 chars, hashes are ~60 chars
ALTER TABLE public.users
  ALTER COLUMN pin TYPE VARCHAR(255);

-- Add migration tracking comment
COMMENT ON COLUMN public.users.pin IS
  'bcrypt hashed PIN. Plain text PINs migrated silently on next login.';
