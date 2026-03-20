-- Create Enum for Enquiry Sources (Optional but good for data integrity)
-- CREATE TYPE enquiry_source AS ENUM ('Phone', 'WhatsApp', 'Verbal', 'Sample Collected', 'Others');

CREATE TABLE IF NOT EXISTS public.customer_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_no TEXT UNIQUE, -- e.g. Enq-26-03-0001
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL, -- Logical separation for multi-tenancy
    customer_id UUID REFERENCES public.partners(id) ON DELETE SET NULL, 
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    source_type TEXT NOT NULL, -- Phone, WhatsApp, Verbal, Sample Collected, Others
    description TEXT, -- Rich text content
    gdrive_file_id TEXT, -- ID of the file in GDrive
    gdrive_file_link TEXT, -- Viewable link
    customer_ref TEXT, -- Customer Reference for enquiry / quotation ref
    status TEXT DEFAULT 'Open', -- e.g. Open, Quoted, Closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.customer_enquiries ENABLE ROW LEVEL SECURITY;

-- Policies for isolated company access
DROP POLICY IF EXISTS "Users can view their company's customer enquiries" ON public.customer_enquiries;
CREATE POLICY "Users can view their company's customer enquiries"
ON public.customer_enquiries FOR SELECT
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert customer enquiries for their company" ON public.customer_enquiries;
CREATE POLICY "Users can insert customer enquiries for their company"
ON public.customer_enquiries FOR INSERT
WITH CHECK (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update their company's customer enquiries" ON public.customer_enquiries;
CREATE POLICY "Users can update their company's customer enquiries"
ON public.customer_enquiries FOR UPDATE
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their company's customer enquiries" ON public.customer_enquiries;
CREATE POLICY "Users can delete their company's customer enquiries"
ON public.customer_enquiries FOR DELETE
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger on update
DROP TRIGGER IF EXISTS update_customer_enquiries_modtime ON public.customer_enquiries;
CREATE TRIGGER update_customer_enquiries_modtime
BEFORE UPDATE ON public.customer_enquiries
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
