-- Migration to fix jobs table referencing legacy enquiries table
-- 0. Nullify orphan records that don't exist in the new customer_enquiries table
UPDATE public.jobs SET enquiry_id = NULL WHERE enquiry_id IS NOT NULL AND enquiry_id NOT IN (SELECT id FROM public.customer_enquiries);
UPDATE public.quotations SET enquiry_id = NULL WHERE enquiry_id IS NOT NULL AND enquiry_id NOT IN (SELECT id FROM public.customer_enquiries);

-- 1. Drop the old foreign key constraint
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_enquiry_id_fkey;

-- 2. Add the new foreign key constraint pointing to the active customer_enquiries table
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_enquiry_id_fkey 
FOREIGN KEY (enquiry_id) 
REFERENCES public.customer_enquiries(id) 
ON DELETE SET NULL;

-- 3. Also fix other potential legacy references if they exist
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_enquiry_id_fkey;
ALTER TABLE public.quotations 
ADD CONSTRAINT quotations_enquiry_id_fkey 
FOREIGN KEY (enquiry_id) 
REFERENCES public.customer_enquiries(id) 
ON DELETE SET NULL;
