-- Migration: Add Google Drive integration to Partners
-- Run this in the Supabase SQL Editor

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS google_drive_link TEXT;

-- Update RLS if necessary (assuming standard permissive demo mode)
-- If you have strict RLS, ensure company_id based access is maintained.
