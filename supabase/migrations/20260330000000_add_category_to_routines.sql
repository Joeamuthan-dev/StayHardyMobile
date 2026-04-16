-- Add category column to routines table if it doesn't exist
ALTER TABLE routines ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- Backfill any existing rows that have NULL or empty category
UPDATE routines SET category = 'General' WHERE category IS NULL OR category = '';
