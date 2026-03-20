-- Add gdrive_folder_id to jobs table to support the new integration flow
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_gdrive_folder_id ON public.jobs(gdrive_folder_id);

COMMENT ON COLUMN public.jobs.gdrive_folder_id IS 'Stored Google Drive folder ID for the project hierarchy';
