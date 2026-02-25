-- Run this in the Supabase SQL Editor to fix missing columns
DO $$ 
BEGIN
    -- Partners Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='business_card_url') THEN
        ALTER TABLE public.partners ADD COLUMN business_card_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='business_card_back_url') THEN
        ALTER TABLE public.partners ADD COLUMN business_card_back_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='customerCredit') THEN
        ALTER TABLE public.partners ADD COLUMN "customerCredit" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='supplierCredit') THEN
        ALTER TABLE public.partners ADD COLUMN "supplierCredit" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='customerCreditTime') THEN
        ALTER TABLE public.partners ADD COLUMN "customerCreditTime" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='supplierCreditTime') THEN
        ALTER TABLE public.partners ADD COLUMN "supplierCreditTime" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='company_id') THEN
        ALTER TABLE public.partners ADD COLUMN company_id uuid;
    END IF;

    -- Contacts Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='business_card_url') THEN
        ALTER TABLE public.contacts ADD COLUMN business_card_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='business_card_back_url') THEN
        ALTER TABLE public.contacts ADD COLUMN business_card_back_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='company_id') THEN
        ALTER TABLE public.contacts ADD COLUMN company_id uuid;
    END IF;

END $$;
