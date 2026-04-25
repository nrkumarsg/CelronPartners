-- Add description column to jobs table for multi-line job details
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS description TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
