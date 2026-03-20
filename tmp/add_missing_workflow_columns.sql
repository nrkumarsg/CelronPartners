-- Add missing columns for new features
ALTER TABLE public.workflow_documents ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE public.workflow_line_items ADD COLUMN IF NOT EXISTS tax_enabled boolean DEFAULT true;

-- Update tax_rate to ensure it's numeric (it already is, but just in case)
-- ALTER TABLE public.workflow_line_items ALTER COLUMN tax_rate TYPE numeric;
