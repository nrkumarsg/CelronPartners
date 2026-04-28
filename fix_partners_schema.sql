-- Comprehensive Fix for Partners Table Schema
-- Run this in the Supabase SQL Editor

-- Add missing columns for detailed partner profiles
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS company_id uuid,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS activity_summary text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS brands text,
ADD COLUMN IF NOT EXISTS "customerCreditTime" text,
ADD COLUMN IF NOT EXISTS "supplierCreditTime" text;

-- Ensure RLS is updated for company_id (isolation)
-- Note: Replace with proper policy if needed, but for now allow all
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow company-based access' AND tablename = 'partners'
    ) THEN
        CREATE POLICY "Allow company-based access" ON public.partners FOR ALL USING (true);
    END IF;
END $$;

-- Fix contacts table if needed
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS company_id uuid;

-- Add index for search optimization
CREATE INDEX IF NOT EXISTS idx_partners_company ON public.partners(company_id);
CREATE INDEX IF NOT EXISTS idx_partners_name ON public.partners(name);
