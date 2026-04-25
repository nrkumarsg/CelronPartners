-- Enhance jobs table with direct links for easier lookup in Scanner App
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vessel_id UUID REFERENCES public.vessels(id) ON DELETE SET NULL;

-- Backfill data from existing enquiry links if possible
UPDATE public.jobs j
SET 
  customer_id = ce.customer_id
FROM public.customer_enquiries ce
WHERE j.enquiry_id = ce.id
AND j.customer_id IS NULL;

-- No direct vessel_id in customer_enquiries, but we could add it there too if needed.
-- For now, let's just make the columns available.

-- Ensure RLS allows the Scanner App (Anon) to read these if needed, 
-- or ensure it's included in the Multi-tenant Access policy.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'jobs' AND schemaname = 'public') THEN
        ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
