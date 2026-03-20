-- CREATE NEW TENANT COMPANIES
-- Run this in your Supabase SQL Editor to seed some demo companies.

INSERT INTO public.companies (name, slug)
VALUES 
    ('Oceanic Logistics Pte Ltd', 'oceanic-logistics'),
    ('Global Maritime Services', 'global-maritime'),
    ('Northwest Shipping Co.', 'northwest-shipping')
ON CONFLICT (slug) DO NOTHING;

-- ASSIGN YOUR CURRENT USER TO ALL COMPANIES
-- Replace 'YOUR_USER_ID_HERE' with your actual Supabase Auth User ID.
-- You can find your ID in the Supabase 'auth.users' table or the 'profiles' tab.

DO $$
DECLARE
    uid UUID := 'YOUR_USER_ID_HERE'; -- <--- UPDATE THIS
    cid UUID;
BEGIN
    FOR cid IN SELECT id FROM public.companies LOOP
        INSERT INTO public.company_users (company_id, user_id, role)
        VALUES (cid, uid, 'admin')
        ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'admin';
    END FOR;
END $$;
