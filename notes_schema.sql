-- Notes Module Schema

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid,
    title text NOT NULL,
    content text,
    tags text[], -- Array of strings for tagging
    is_pinned boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- DROP old permissive policy
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.notes;

-- Strictly private individual access
CREATE POLICY "Users can manage their own private notes" ON public.notes 
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Index for title/content search performance
CREATE INDEX IF NOT EXISTS idx_notes_search ON public.notes USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));
