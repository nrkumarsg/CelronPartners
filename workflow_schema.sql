-- schema for new workflow tables
CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_no text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('Supply', 'Service')),
  status text NOT NULL DEFAULT 'Draft',
  source text,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  catalog_items jsonb,
  company_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_no text NOT NULL UNIQUE,
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Supply', 'Service')),
  status text NOT NULL DEFAULT 'Active',
  company_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  amount numeric,
  status text NOT NULL DEFAULT 'Pending',
  notes text,
  company_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  type text NOT NULL,
  total_amount numeric,
  expenses numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  company_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  amount numeric,
  status text NOT NULL CHECK (status IN ('Draft', 'Sent', 'Paid', 'Cancelled')),
  company_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_type text NOT NULL, -- 'Enquiry', 'Job', 'Partner', 'PO', etc.
  reference_id uuid NOT NULL,
  url text NOT NULL,
  name text,
  company_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In a real app we might want strict RLS, but for this demo:
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access on enquiries" ON public.enquiries FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on enquiries" ON public.enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on enquiries" ON public.enquiries FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on enquiries" ON public.enquiries FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on jobs" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on jobs" ON public.jobs FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on jobs" ON public.jobs FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on quotations" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on quotations" ON public.quotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on quotations" ON public.quotations FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on quotations" ON public.quotations FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on purchase_orders" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on purchase_orders" ON public.purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on purchase_orders" ON public.purchase_orders FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on invoices" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on invoices" ON public.invoices FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access on documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access on documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access on documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access on documents" ON public.documents FOR DELETE USING (true);
