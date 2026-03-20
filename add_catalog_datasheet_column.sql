
-- Add datasheet_url column to catalog_items
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS datasheet_url text;
