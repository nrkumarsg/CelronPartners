-- Database Migration: Jobs Control v3 (Combined Model)

-- 1. Enhance workflow_documents table
ALTER TABLE public.workflow_documents 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_po_no text,
ADD COLUMN IF NOT EXISTS customer_po_date date,
ADD COLUMN IF NOT EXISTS customer_po_by_id uuid REFERENCES public.contacts(id),
ADD COLUMN IF NOT EXISTS customer_po_attachment_url text,
ADD COLUMN IF NOT EXISTS is_job boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_job_no text,
ADD COLUMN IF NOT EXISTS original_document_id uuid REFERENCES public.workflow_documents(id),
ADD COLUMN IF NOT EXISTS revision_no integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS delivery_verification jsonb DEFAULT '{}';

-- 2. Enhance workflow_line_items (ensure unit price logic)
-- (Already exists, but ensuring columns are ready if needed)

-- 3. Create workflow_payments table for full/partial history
CREATE TABLE IF NOT EXISTS public.workflow_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id uuid REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
    payment_date date DEFAULT CURRENT_DATE,
    amount numeric NOT NULL,
    payment_mode text, -- Cash, Check, PayNow, Bank Transfer
    reference_no text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id uuid -- For RLS
);

-- Enable RLS on new table
ALTER TABLE public.workflow_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.workflow_payments 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Finalize numbering constraints
-- (Optional: Add index for assigned_job_no for fast lookups)
CREATE INDEX IF NOT EXISTS idx_workflow_docs_job_no ON public.workflow_documents(assigned_job_no);
CREATE INDEX IF NOT EXISTS idx_workflow_docs_original_id ON public.workflow_documents(original_document_id);
