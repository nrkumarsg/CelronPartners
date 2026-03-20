-- Add pincode column to partners table
ALTER TABLE IF EXISTS public.partners 
ADD COLUMN IF NOT EXISTS pincode text;
