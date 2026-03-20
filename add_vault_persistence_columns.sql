-- Add persistence columns for Google Drive folder IDs to document_settings
-- This prevents duplicate folder creation and ensures the CELRON\FOLDER1 format

DO $$ 
BEGIN
    -- Root CELRON folder ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_celron_root_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_celron_root_id text;
    END IF;

    -- Year-specific folder ID (e.g. ID of YEAR2026)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_year_folder_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_year_folder_id text;
    END IF;

    -- Corporate Vault folder ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_vault_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_vault_id text;
    END IF;

    -- Standards & Stationery folder ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_standards_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_standards_id text;
    END IF;
END $$;
