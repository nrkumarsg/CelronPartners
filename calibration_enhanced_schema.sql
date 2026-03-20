-- Enhanced Calibration Lab Schema Updates

-- 1. Create Instrument Library
CREATE TABLE IF NOT EXISTS instrument_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    maker TEXT,
    model TEXT,
    description TEXT, -- Can store RichText or plain text
    youtube_link TEXT,
    manual_url TEXT,
    notes TEXT,
    UNIQUE(company_id, name, maker, model)
);

-- Enable RLS for instrument_library
ALTER TABLE instrument_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view instruments for their company" ON instrument_library
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = instrument_library.company_id
        )
    );

CREATE POLICY "Users can insert instruments for their company" ON instrument_library
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = instrument_library.company_id
        )
    );

-- 2. Update calibration_records
ALTER TABLE calibration_records 
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS description TEXT, -- RichText Description
    ADD COLUMN IF NOT EXISTS remark TEXT,
    ADD COLUMN IF NOT EXISTS remark_category TEXT,
    ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]'::jsonb;

-- Create indices for new columns
CREATE INDEX IF NOT EXISTS idx_calib_job_id ON calibration_records(job_id);
CREATE INDEX IF NOT EXISTS idx_calib_customer_id ON calibration_records(customer_id);
