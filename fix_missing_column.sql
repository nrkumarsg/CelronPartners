-- 1. Add the missing column to existing table
ALTER TABLE public.customer_enquiries 
ADD COLUMN IF NOT EXISTS customer_ref TEXT;

-- 2. Force Supabase to reload the schema cache
NOTIFY pgrst, 'reload schema';
