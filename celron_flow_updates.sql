-- Celron Flow Schema Updates

-- 1. Enhance Enquiry Table
ALTER TABLE public.customer_enquiries 
ADD COLUMN IF NOT EXISTS customer_ref TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT;

-- 2. Enhance Jobs Table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS po_ref TEXT,
ADD COLUMN IF NOT EXISTS po_date DATE,
ADD COLUMN IF NOT EXISTS po_by TEXT,
ADD COLUMN IF NOT EXISTS po_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS po_attachment_url TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid',
ADD COLUMN IF NOT EXISTS payment_details TEXT,
ADD COLUMN IF NOT EXISTS salesperson_name TEXT;

-- 3. New Table for Delivery Orders
CREATE TABLE IF NOT EXISTS public.delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    document_no TEXT UNIQUE,
    delivery_to TEXT,
    pic_name TEXT,
    pic_phone TEXT,
    pic_email TEXT,
    dimensions TEXT,
    weight TEXT,
    vessel_id UUID REFERENCES public.vessels(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Dedicated Job Expenses Table
CREATE TABLE IF NOT EXISTS public.job_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    supplier_name TEXT,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Unpaid',
    attachment_url TEXT,
    attachment_note TEXT,
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Supplier Quotes (Floating Logic)
CREATE TABLE IF NOT EXISTS public.supplier_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_id UUID REFERENCES public.customer_enquiries(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    quote_amount NUMERIC,
    status TEXT DEFAULT 'Sent', -- Sent, Received, Shortlisted, Rejected
    gdrive_file_id TEXT,
    gdrive_file_link TEXT,
    notes TEXT,
    company_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotes ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant RLS Policies (Isolation by Company)
-- These policies ensure users can only access records belonging to their assigned company.

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.delivery_orders;
CREATE POLICY "Users can manage their company delivery orders" ON public.delivery_orders 
FOR ALL TO authenticated 
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) 
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.job_expenses;
CREATE POLICY "Users can manage their company job expenses" ON public.job_expenses 
FOR ALL TO authenticated 
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) 
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.supplier_quotes;
CREATE POLICY "Users can manage their company supplier quotes" ON public.supplier_quotes 
FOR ALL TO authenticated 
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())) 
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
