-- 1. DATABASE SCHEMA UPDATES FOR SETTINGS
-- Add company_id to document_settings for multi-company isolation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='company_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN company_id uuid;
    END IF;
END $$;

-- 2. RESET RLS FOR DOCUMENT SETTINGS
ALTER TABLE public.document_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.document_settings;
CREATE POLICY "Enable all for authenticated users" ON public.document_settings 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. STORAGE BUCKET CREATION
-- Run this to ensure the bucket exists (if not already there)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company_assets', 'company_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. STORAGE POLICIES
-- Allow anyone to view images (needed for PDF generation and public links)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'company_assets');

-- Allow authenticated users to upload and manage company assets
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects 
FOR ALL TO authenticated 
WITH CHECK (bucket_id = 'company_assets');
