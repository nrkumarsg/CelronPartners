-- Unified Workflow System Schema
-- Table for all document types (Enquiry, Quotation, Purchase Order, etc.)

CREATE TABLE IF NOT EXISTS public.workflow_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid,
    document_type text NOT NULL CHECK (document_type IN (
        'Enquiry', 
        'Quotation', 
        'Purchase Order', 
        'Delivery Order', 
        'Proforma Invoice', 
        'Packing List', 
        'Tax Invoice'
    )),
    document_no text NOT NULL UNIQUE,
    issue_date date DEFAULT CURRENT_DATE,
    expiry_date date,
    
    -- Relationships
    partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
    contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
    vessel_id uuid REFERENCES public.vessels(id) ON DELETE SET NULL,
    work_location_id uuid REFERENCES public.work_locations(id) ON DELETE SET NULL,
    
    -- Header Info
    salesperson_name text,
    subject text,
    customer_ref text,
    currency text DEFAULT 'SGD',
    
    -- Content & Totals
    terms_conditions text,
    notes text,
    status text NOT NULL DEFAULT 'Draft',
    subtotal numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0, -- 9% GST calculated on subtotal
    total_amount numeric DEFAULT 0,
    
    -- Metadata
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for line items within any workflow document
CREATE TABLE IF NOT EXISTS public.workflow_line_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id uuid REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
    
    -- Item Info
    item_id uuid, -- Optional link to catalog_items
    description text NOT NULL,
    details text, -- Rich text/Long description
    
    -- Pricing & Stats
    quantity numeric DEFAULT 1,
    uom text DEFAULT 'Units',
    unit_price numeric DEFAULT 0,
    tax_rate numeric DEFAULT 9.0, -- Percentage
    amount numeric DEFAULT 0,
    
    -- Display Structure
    sort_order integer DEFAULT 0,
    is_section boolean DEFAULT false,
    is_note boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.workflow_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_line_items ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (Demo Mode)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.workflow_documents;
CREATE POLICY "Enable all for authenticated users" ON public.workflow_documents 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.workflow_line_items;
CREATE POLICY "Enable all for authenticated users" ON public.workflow_line_items 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_docs_company ON public.workflow_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_docs_type ON public.workflow_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_workflow_items_doc ON public.workflow_line_items(document_id);
