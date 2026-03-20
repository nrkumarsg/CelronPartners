-- SQL Migration for QR/Barcode Integration
-- Add barcode column to catalog_items table
ALTER TABLE public.catalog_items 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Add index for fast scanning search
CREATE INDEX IF NOT EXISTS idx_catalog_barcode ON public.catalog_items(barcode);
