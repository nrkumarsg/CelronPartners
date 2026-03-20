-- Add linkage columns to workflow_documents
ALTER TABLE public.workflow_documents 
ADD COLUMN IF NOT EXISTS enquiry_id UUID REFERENCES public.customer_enquiries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

-- Also update policies if any
