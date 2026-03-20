-- Create instruments table for master library
CREATE TABLE IF NOT EXISTS instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    maker TEXT,
    model TEXT,
    serial_no TEXT,
    description TEXT, -- RichText
    youtube_link TEXT,
    manual_url TEXT,
    notes TEXT
);

-- Create calibration_records table
CREATE TABLE IF NOT EXISTS calibration_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    job_no TEXT NOT NULL,
    vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    customer_name TEXT,
    instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
    instrument_name TEXT NOT NULL,
    serial_no TEXT,
    calibration_date DATE DEFAULT CURRENT_DATE,
    description TEXT,       -- RichText details from form
    remark TEXT,
    remark_category TEXT DEFAULT 'Normal',
    certificate_file_id TEXT, -- GDrive File ID
    certificate_url TEXT,     -- GDrive webViewLink
    file_attachments JSONB,   -- Array of {name, id, url}
    youtube_link TEXT,        -- YouTube tutorial link (override/snapshot)
    manual_url TEXT,          -- Maker's manual link (override/snapshot)
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    data JSONB                -- Store calibration data (standard vs actual, etc.)
);

-- Enable RLS
ALTER TABLE calibration_records ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view calibration records for their company" ON calibration_records;
CREATE POLICY "Users can view calibration records for their company" ON calibration_records
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = calibration_records.company_id
        )
    );

DROP POLICY IF EXISTS "Users can insert calibration records" ON calibration_records;
CREATE POLICY "Users can insert calibration records" ON calibration_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own records" ON calibration_records;
CREATE POLICY "Users can update their own records" ON calibration_records
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own records" ON calibration_records;
CREATE POLICY "Users can delete their own records" ON calibration_records
    FOR DELETE USING (auth.uid() = user_id);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_calib_company ON calibration_records(company_id);
CREATE INDEX IF NOT EXISTS idx_calib_job ON calibration_records(job_no);
CREATE INDEX IF NOT EXISTS idx_calib_vessel ON calibration_records(vessel_id);
CREATE INDEX IF NOT EXISTS idx_calib_archived ON calibration_records(is_archived);
