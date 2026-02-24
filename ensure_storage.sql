-- Ensure the 'partners' bucket exists for general file uploads (notes, partners, catalog, etc.)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('partners', 'partners', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES FOR 'partners' bucket
-- 1. Public Access: Allow anyone to view images/files via public URL
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'partners' OR bucket_id = 'company_assets');

-- 2. Authenticated Upload: Allow logged-in users to upload and manage files
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects 
FOR ALL TO authenticated 
WITH CHECK (bucket_id = 'partners' OR bucket_id = 'company_assets');
