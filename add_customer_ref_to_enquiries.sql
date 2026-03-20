-- Add customer_ref column to customer_enquiries table
ALTER TABLE public.customer_enquiries ADD COLUMN IF NOT EXISTS customer_ref TEXT;

-- Update description to clarify it's for enquiry/quotation reference
COMMENT ON COLUMN public.customer_enquiries.customer_ref IS 'Customer Reference for enquiry / quotation ref';
