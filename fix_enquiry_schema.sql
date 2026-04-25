-- Add vessel and location support to customer_enquiries table
ALTER TABLE public.customer_enquiries ADD COLUMN IF NOT EXISTS vessel_id UUID REFERENCES public.vessels(id);
ALTER TABLE public.customer_enquiries ADD COLUMN IF NOT EXISTS work_location_id UUID REFERENCES public.work_locations(id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
