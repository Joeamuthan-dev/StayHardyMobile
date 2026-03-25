-- ============================================================
-- StayHardy — Profile Images Storage RLS (split_part version)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Drop ALL existing storage policies for both buckets
DROP POLICY IF EXISTS "profile-images public read"         ON storage.objects;
DROP POLICY IF EXISTS "profile-images user insert"         ON storage.objects;
DROP POLICY IF EXISTS "profile-images user update"         ON storage.objects;
DROP POLICY IF EXISTS "profile-images user delete"         ON storage.objects;
DROP POLICY IF EXISTS "Public Access"                      ON storage.objects;
DROP POLICY IF EXISTS "StayHardy Avatars Public Access"    ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar upload"                ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar update"                ON storage.objects;
DROP POLICY IF EXISTS "Allow avatar delete"                ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars"                ON storage.objects;

-- Step 2: Ensure the profile-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 3: Policy 1 — Public SELECT (anyone can read avatars)
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-images' );

-- Step 4: Policy 2 — Authenticated INSERT (only into own folder)
CREATE POLICY "Allow avatar upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Step 5: Policy 3 — Authenticated UPDATE (only own avatar)
CREATE POLICY "Allow avatar update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Step 6: Policy 4 — Authenticated DELETE (only own avatar)
CREATE POLICY "Allow avatar delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND auth.uid()::text = split_part(name, '/', 1)
);
