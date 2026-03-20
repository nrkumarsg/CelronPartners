-- Add photos column to catalog_items table
-- This stores an array of Google Drive URLs for item photos
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';
