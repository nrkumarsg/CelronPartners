-- Create communication_accounts table
CREATE TABLE IF NOT EXISTS public.communication_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID, -- Optional: if shared across company
    platform TEXT NOT NULL, -- 'email', 'whatsapp', 'social'
    provider TEXT NOT NULL, -- 'gmail', 'zoho', 'meta', 'twitter', 'linkedin', 'tiktok', 'youtube'
    email_address TEXT,
    account_label TEXT NOT NULL, -- e.g., 'Sales', 'Personal', 'X-Support'
    account_url TEXT, -- Base URL for the portal
    auth_data JSONB DEFAULT '{}'::jsonb, -- Store tokens, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure id default is set correctly even if table existed
ALTER TABLE public.communication_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Enable RLS
ALTER TABLE public.communication_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own communication accounts." ON public.communication_accounts;
CREATE POLICY "Users can view their own communication accounts." ON public.communication_accounts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own communication accounts." ON public.communication_accounts;
CREATE POLICY "Users can insert their own communication accounts." ON public.communication_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own communication accounts." ON public.communication_accounts;
CREATE POLICY "Users can update their own communication accounts." ON public.communication_accounts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own communication accounts." ON public.communication_accounts;
CREATE POLICY "Users can delete their own communication accounts." ON public.communication_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_comm_accounts_user_id ON public.communication_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_accounts_platform ON public.communication_accounts(platform);
