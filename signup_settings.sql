-- Add Signup Configuration to document_settings

-- 1. Ensure the table exists (in case it was created manually before)
CREATE TABLE IF NOT EXISTS public.document_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name text,
    gst_uen text,
    address text,
    phone text,
    email text,
    logo_url text,
    signature_url text,
    watermark boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add allow_signup column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='allow_signup') THEN
        ALTER TABLE public.document_settings ADD COLUMN allow_signup boolean DEFAULT true;
    END IF;
END $$;

-- 3. Ensure RLS is enabled and permissive for the demo
ALTER TABLE public.document_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access on document_settings" ON public.document_settings;
CREATE POLICY "Allow anonymous read access on document_settings" ON public.document_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous update access on document_settings" ON public.document_settings;
CREATE POLICY "Allow anonymous update access on document_settings" ON public.document_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert access on document_settings" ON public.document_settings;
CREATE POLICY "Allow anonymous insert access on document_settings" ON public.document_settings FOR INSERT WITH CHECK (true);
