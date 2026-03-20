-- 1. Ensure instruments table has all required master data columns
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS serial_no TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS maker TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS youtube_link TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS manual_url TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create the junction table for multiple instruments per calibration record
CREATE TABLE IF NOT EXISTS calibration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    calibration_id UUID REFERENCES calibration_records(id) ON DELETE CASCADE,
    instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
    -- Store snapshot data for historical accuracy in case master instrument record is edited/deleted
    instrument_name TEXT,
    instrument_maker TEXT,
    instrument_model TEXT,
    instrument_serial_no TEXT,
    -- Reading results
    standard_reading TEXT,
    actual_reading TEXT,
    deviation TEXT,
    result TEXT DEFAULT 'Pass'
);

-- 3. Enable RLS and add policies for calibration_items
ALTER TABLE calibration_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calibration items" ON calibration_items;
CREATE POLICY "Users can view their own calibration items" ON calibration_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM calibration_records
            WHERE calibration_records.id = calibration_items.calibration_id
            AND (calibration_records.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.company_id = calibration_records.company_id
            ))
        )
    );

DROP POLICY IF EXISTS "Users can insert calibration items" ON calibration_items;
CREATE POLICY "Users can insert calibration items" ON calibration_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM calibration_records
            WHERE calibration_records.id = calibration_items.calibration_id
            AND calibration_records.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own calibration items" ON calibration_items;
CREATE POLICY "Users can delete their own calibration items" ON calibration_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM calibration_records
            WHERE calibration_records.id = calibration_items.calibration_id
            AND calibration_records.user_id = auth.uid()
        )
    );

-- 4. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_calib_item_rec ON calibration_items(calibration_id);
CREATE INDEX IF NOT EXISTS idx_calib_item_ins ON calibration_items(instrument_id);

-- 5. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

-- 6. STORAGE BUCKET CREATION (Fixes "company_assets" upload error)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company_assets', 'company_assets', true)
ON CONFLICT (id) DO NOTHING;

-- 7. STORAGE POLICIES
-- Allow anyone to view images (needed for PDF generation and public links)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'company_assets' OR bucket_id = 'partners');

-- Allow authenticated users to upload and manage company assets
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects 
FOR ALL TO authenticated 
WITH CHECK (bucket_id = 'company_assets' OR bucket_id = 'partners');
