-- REPAIR COMPANIES TABLE & SEED DATA (FIXED SYNTAX)
-- Run this in your Supabase SQL Editor.

-- 1. ADD THE MISSING 'slug' COLUMN IF IT DOES NOT EXIST
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='slug') THEN
        ALTER TABLE public.companies ADD COLUMN slug TEXT UNIQUE;
    END IF;

    -- Also check for logo_url while we're here
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='logo_url') THEN
        ALTER TABLE public.companies ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- 2. CREATE NEW TENANT COMPANIES
INSERT INTO public.companies (name, slug)
VALUES 
    ('Oceanic Logistics Pte Ltd', 'oceanic-logistics'),
    ('Global Maritime Services', 'global-maritime'),
    ('Northwest Shipping Co.', 'northwest-shipping')
ON CONFLICT (slug) DO NOTHING;

-- 3. ASSIGN YOUR CURRENT USER TO ALL COMPANIES
-- Pre-filled with your UUID: 8431cd0b-7449-44a5-8213-2a8680d09ebe
DO $$
DECLARE
    uid UUID := '8431cd0b-7449-44a5-8213-2a8680d09ebe';
    cid UUID;
BEGIN
    FOR cid IN (SELECT id FROM public.companies) LOOP
        INSERT INTO public.company_users (company_id, user_id, role)
        VALUES (cid, uid, 'admin')
        ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'admin';
    END LOOP;
END $$;
