-- Create user_tools table
CREATE TABLE IF NOT EXISTS public.user_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    company_id UUID REFERENCES public.companies(id),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    logo_url TEXT,
    group_name TEXT,
    notes TEXT, -- Stores username, password, key-values, etc.
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

-- Policies for user_tools (Users can only see/manage their own tools)
DROP POLICY IF EXISTS "Users can manage their own tools" ON public.user_tools;
CREATE POLICY "Users can manage their own tools" ON public.user_tools
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_tools_updated_at ON public.user_tools;
CREATE TRIGGER update_user_tools_updated_at
    BEFORE UPDATE ON public.user_tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
