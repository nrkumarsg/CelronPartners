-- Run this entirely in the Supabase SQL Editor

ALTER TABLE public.document_settings 
ADD COLUMN IF NOT EXISTS smtp_host text DEFAULT 'smtp.zoho.com',
ADD COLUMN IF NOT EXISTS smtp_port text DEFAULT '465',
ADD COLUMN IF NOT EXISTS sales_email text,
ADD COLUMN IF NOT EXISTS sales_password text,
ADD COLUMN IF NOT EXISTS accounts_email text,
ADD COLUMN IF NOT EXISTS accounts_password text;
