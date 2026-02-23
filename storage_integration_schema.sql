-- Database Updates for Google Drive and Calendar Integration

-- 1. Update document_settings to include per-company Google IDs
ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS google_drive_folder_id text,
ADD COLUMN IF NOT EXISTS google_calendar_id text;

-- 2. Update enquiries and jobs to include direct storage links
ALTER TABLE public.enquiries 
ADD COLUMN IF NOT EXISTS google_drive_link text;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS google_drive_link text;

-- 3. Ensure RLS is enabled and unified policies exist (from previous fixes)
-- The existing policies on document_settings, enquiries, and jobs should already cover these new columns
-- since they are company-scoped.
