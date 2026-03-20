-- APK Management Table
CREATE TABLE IF NOT EXISTS public.application_apks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_identifier TEXT UNIQUE NOT NULL, -- e.g. 'scanner', 'price_scanner', 'pod'
    display_name TEXT NOT NULL,
    drive_file_id TEXT,
    drive_folder_id TEXT,
    download_url TEXT,
    version TEXT DEFAULT '1.0.0',
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.application_apks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view
CREATE POLICY "Allow authenticated users to view APKs" ON public.application_apks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins/superadmins to manage (basic policy, can be refined based on company_id)
CREATE POLICY "Allow admins to manage APKs" ON public.application_apks
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_application_apks_updated_at
    BEFORE UPDATE ON public.application_apks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
