-- Add missing columns to calibration_records table if they don't exist
DO $$
BEGIN
    -- Add serial_no to instruments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='serial_no') THEN
        ALTER TABLE instruments ADD COLUMN serial_no TEXT;
    END IF;

    -- Add instrument_id to calibration_records

    -- Add customer_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='customer_name') THEN
        ALTER TABLE calibration_records ADD COLUMN customer_name TEXT;
    END IF;

    -- Add serial_no
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='serial_no') THEN
        ALTER TABLE calibration_records ADD COLUMN serial_no TEXT;
    END IF;

    -- Add calibration_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='calibration_date') THEN
        ALTER TABLE calibration_records ADD COLUMN calibration_date DATE DEFAULT CURRENT_DATE;
    END IF;

    -- Add description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='description') THEN
        ALTER TABLE calibration_records ADD COLUMN description TEXT;
    END IF;

    -- Add remark
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='remark') THEN
        ALTER TABLE calibration_records ADD COLUMN remark TEXT;
    END IF;

    -- Add remark_category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='remark_category') THEN
        ALTER TABLE calibration_records ADD COLUMN remark_category TEXT DEFAULT 'Normal';
    END IF;

    -- Add certificate_file_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='certificate_file_id') THEN
        ALTER TABLE calibration_records ADD COLUMN certificate_file_id TEXT;
    END IF;

    -- Add certificate_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='certificate_url') THEN
        ALTER TABLE calibration_records ADD COLUMN certificate_url TEXT;
    END IF;

    -- Add file_attachments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='file_attachments') THEN
        ALTER TABLE calibration_records ADD COLUMN file_attachments JSONB;
    END IF;

    -- Add youtube_link
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='youtube_link') THEN
        ALTER TABLE calibration_records ADD COLUMN youtube_link TEXT;
    END IF;

    -- Add manual_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='manual_url') THEN
        ALTER TABLE calibration_records ADD COLUMN manual_url TEXT;
    END IF;

    -- Add is_archived
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='is_archived') THEN
        ALTER TABLE calibration_records ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add archived_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='archived_at') THEN
        ALTER TABLE calibration_records ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calibration_records' AND column_name='data') THEN
        ALTER TABLE calibration_records ADD COLUMN data JSONB;
    END IF;
END $$;

-- Refresh PostgREST cache (Supabase does this automatically, but running this helps if stuck)
NOTIFY pgrst, 'reload schema';
