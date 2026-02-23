-- Comprehensive SQL Fix for Row Level Security and Table Alignment

-- 1. Ensure ownership columns exist on ALL tables
DO $$ 
BEGIN
    -- Partners
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='company_id') THEN
        ALTER TABLE public.partners ADD COLUMN company_id uuid;
    END IF;

    -- Contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='company_id') THEN
        ALTER TABLE public.contacts ADD COLUMN company_id uuid;
    END IF;

    -- Vessels
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vessels' AND column_name='company_id') THEN
        ALTER TABLE public.vessels ADD COLUMN company_id uuid;
    END IF;

    -- Work Locations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_locations' AND column_name='company_id') THEN
        ALTER TABLE public.work_locations ADD COLUMN company_id uuid;
    END IF;

    -- Todos (Uses user_id for personal tasks)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='todos' AND column_name='user_id') THEN
        ALTER TABLE public.todos ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Reset and Re-enable RLS on all used tables
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 3. DROP old policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read access on partners" ON public.partners;
DROP POLICY IF EXISTS "Allow anonymous insert access on partners" ON public.partners;
DROP POLICY IF EXISTS "Allow anonymous update access on partners" ON public.partners;
DROP POLICY IF EXISTS "Allow anonymous delete access on partners" ON public.partners;

DROP POLICY IF EXISTS "Allow anonymous read access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow anonymous insert access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow anonymous update access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow anonymous delete access on contacts" ON public.contacts;

-- 4. Create UNIFIED Permissive Policies for Demo (Allows authenticated users to do everything)
-- In production, replace (true) with (company_id = (select company_id from profiles where id = auth.uid()))

CREATE POLICY "Enable all for authenticated users" ON public.partners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.vessels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.work_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.enquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Todos should remain personal
DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

CREATE POLICY "Users can manage their own todos" ON public.todos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Seed a Demo Company if needed
INSERT INTO public.companies (id, name) 
VALUES ('d0000000-0000-0000-0000-000000000001', 'Cel-Ron Demo') 
ON CONFLICT (id) DO NOTHING;
