-- Fix Missing Columns for Partners Table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

-- 1. Add missing columns to 'partners' table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS activity_summary text,
ADD COLUMN IF NOT EXISTS uen text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS "customerCredit" text,
ADD COLUMN IF NOT EXISTS "supplierCredit" text,
ADD COLUMN IF NOT EXISTS "customerCreditTime" text,
ADD COLUMN IF NOT EXISTS "supplierCreditTime" text,
ADD COLUMN IF NOT EXISTS business_card_url text,
ADD COLUMN IF NOT EXISTS business_card_back_url text;

-- 2. Add missing columns to 'contacts' table for consistency
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS business_card_url text,
ADD COLUMN IF NOT EXISTS business_card_back_url text;

-- 3. Force reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
