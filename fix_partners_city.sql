-- Run this in the Supabase SQL Editor to fix the missing columns
ALTER TABLE IF EXISTS public.partners 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS company_id uuid;
