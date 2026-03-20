-- MASTER MULTI-TENANT SETUP (AUTO-USER LOOKUP)
-- Run this in your Supabase SQL Editor.

-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. REPAIR COLUMNS
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='slug') THEN
        ALTER TABLE public.companies ADD COLUMN slug TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='logo_url') THEN
        ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- 3. JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(company_id, user_id)
);

-- 4. SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company memberships" ON public.company_users;

CREATE POLICY "Users can view companies they belong to" ON public.companies
FOR SELECT TO authenticated
USING (id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own company memberships" ON public.company_users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 5. SEED DEMO COMPANIES
INSERT INTO public.companies (name, slug)
VALUES 
    ('Oceanic Logistics Pte Ltd', 'oceanic-logistics'),
    ('Global Maritime Services', 'global-maritime'),
    ('Northwest Shipping Co.', 'northwest-shipping')
ON CONFLICT (slug) DO NOTHING;

-- 6. SMART ASSIGNMENT
-- This query finds the most recently active user in your system and assigns them to the companies.
DO $$
DECLARE
    uid UUID;
    cid UUID;
BEGIN
    -- Dynamically find a valid user ID (likely yours)
    SELECT id INTO uid FROM auth.users ORDER BY created_at DESC LIMIT 1;

    IF uid IS NOT NULL THEN
        FOR cid IN (SELECT id FROM public.companies) LOOP
            INSERT INTO public.company_users (company_id, user_id, role)
            VALUES (cid, uid, 'admin')
            ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'admin';
        END LOOP;
    END IF;
END $$;
