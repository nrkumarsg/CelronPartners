-- Multi-Tenant Foundation: Company-User Junction Table
-- This allows a user to manage N companies.

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff', -- 'admin', 'manager', 'staff'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(company_id, user_id)
);

-- Enable RLS on core tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Policies for company access
CREATE POLICY "Users can view companies they belong to" ON public.companies
FOR SELECT TO authenticated
USING (
    (id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
    OR 
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'))
);

CREATE POLICY "Users can view their own company memberships" ON public.company_users
FOR SELECT TO authenticated
USING (
    (user_id = auth.uid())
    OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'))
);

-- Comprehensive RLS for ALL Entity Tables
DO $$ 
DECLARE 
    t TEXT;
    entity_tables TEXT[] := ARRAY[
        'partners', 'contacts', 'vessels', 'work_locations', 
        'customer_enquiries', 'jobs', 'delivery_orders', 
        'job_expenses', 'supplier_quotes', 'notes', 
        'todos', 'workflow_documents', 'workflow_line_items',
        'document_settings'
    ];
BEGIN 
    FOREACH t IN ARRAY entity_tables LOOP
        -- Ensure RLS is enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Drop if exists
        EXECUTE format('DROP POLICY IF EXISTS "Multi-tenant Access" ON public.%I', t);
        
        -- Create strict company-based policy with superadmin bypass
        EXECUTE format('
            CREATE POLICY "Multi-tenant Access" ON public.%I
            FOR ALL TO authenticated
            USING (
                (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
                OR
                (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = "superadmin"))
            )
            WITH CHECK (
                (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
                OR
                (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = "superadmin"))
            )
        ', t);
    END LOOP;
END $$;
