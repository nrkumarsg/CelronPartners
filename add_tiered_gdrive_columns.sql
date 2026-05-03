-- Migration: Add missing tiered Google Drive persistence columns to document_settings
-- This ensures that the structure created by vaultService.js is persisted and not recreated.

DO $$ 
BEGIN
    -- Tiered root IDs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_01_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_01_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_02_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_02_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_03_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_03_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_04_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_04_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_05_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_05_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_99_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_99_id text;
    END IF;

    -- Current Year Specific IDs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_current_jobs_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_current_jobs_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_current_expenses_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_current_expenses_id text;
    END IF;

    -- Inventory Specific IDs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_inventory_photos_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_inventory_photos_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_settings' AND column_name='gdrive_inventory_datasheets_id') THEN
        ALTER TABLE public.document_settings ADD COLUMN gdrive_inventory_datasheets_id text;
    END IF;

END $$;
