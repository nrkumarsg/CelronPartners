-- SEED COMPANIES AND ASSIGN SUPERADMIN
-- Run this in your Supabase SQL Editor to populate the dropdown.

-- 1. Insert Companies
INSERT INTO public.companies (name, slug)
VALUES 
    ('Cel-Ron Hub', 'celron-hub'),
    ('Ark International Services', 'ark-international'),
    ('Northwest Shipping Co.', 'northwest-shipping')
ON CONFLICT (slug) DO NOTHING;

-- 2. Find the Superadmin User (nrkumarsg@gmail.com)
-- This query finds the user by email and assigns them to the companies.
DO $$
DECLARE
    uid UUID;
    cid UUID;
BEGIN
    SELECT id INTO uid FROM auth.users WHERE email = 'nrkumarsg@gmail.com' LIMIT 1;

    IF uid IS NOT NULL THEN
        -- Ensure the profile is set to superadmin
        UPDATE public.profiles SET role = 'superadmin' WHERE id = uid;

        -- Assign to all companies as admin for redundancy (though RLS now allows global access)
        FOR cid IN (SELECT id FROM public.companies) LOOP
            INSERT INTO public.company_users (company_id, user_id, role)
            VALUES (cid, uid, 'admin')
            ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'admin';
        END LOOP;
    END IF;
END $$;
