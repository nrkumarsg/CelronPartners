-- Create forms_library table
CREATE TABLE IF NOT EXISTS forms_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    form_type TEXT,
    author_company TEXT,
    file_url TEXT,
    file_id TEXT,
    info TEXT
);

-- Enable RLS
ALTER TABLE forms_library ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view forms for their company" ON forms_library
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = forms_library.company_id
        )
    );

CREATE POLICY "Users can insert forms" ON forms_library
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms" ON forms_library
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms" ON forms_library
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_forms_company ON forms_library(company_id);
CREATE INDEX IF NOT EXISTS idx_forms_title ON forms_library(title);
