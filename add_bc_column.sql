ALTER TABLE partners ADD COLUMN IF NOT EXISTS business_card_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_card_url TEXT;

-- Also ensure storage is set up or at least assumes 'business-cards' bucket will be used
-- (I can't create buckets via SQL easily if RLS is on, but I can assume it's created or create it via JS)
