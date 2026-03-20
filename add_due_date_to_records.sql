-- Add due_date column to calibration_records
ALTER TABLE calibration_records ADD COLUMN IF NOT EXISTS due_date DATE;

-- Update RLS if necessary (usually not needed for just adding a column if policies are broad)
-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
