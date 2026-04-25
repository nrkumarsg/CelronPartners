-- 1. Add module level permissions to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT ARRAY['partners', 'contacts', 'vessels', 'work-locations', 'catalog', 'reports', 'settings', 'workflows', 'universal-finder', 'storage', 'vault', 'manuals', 'forms', 'todo', 'notes', 'calendar', 'scanner', 'commercial-wall'];

-- 2. Add "Shared" capability to Master Data tables
DO $$
DECLARE
    t TEXT;
    master_tables TEXT[] := ARRAY['partners', 'vessels', 'contacts', 'work_locations'];
BEGIN
    FOREACH t IN ARRAY master_tables LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE', t);
        
        -- Update RLS for these tables to allow shared access
        EXECUTE format('DROP POLICY IF EXISTS "Multi-tenant Access" ON public.%I', t);
        EXECUTE format('
            CREATE POLICY "Multi-tenant Access" ON public.%I
            FOR ALL TO authenticated
            USING (
                (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
                OR (is_shared = true)
                OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''superadmin''))
            )
            WITH CHECK (
                (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))
                OR (is_shared = true)
                OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''superadmin''))
            )
        ', t, t);
    END LOOP;
END $$;

-- 3. Pre-seed enabled_modules for existing companies to ensure they don't lose access
UPDATE public.companies 
SET enabled_modules = ARRAY['partners', 'contacts', 'vessels', 'work-locations', 'catalog', 'reports', 'settings', 'workflows', 'universal-finder', 'storage', 'vault', 'manuals', 'forms', 'todo', 'notes', 'calendar', 'scanner', 'commercial-wall']
WHERE enabled_modules IS NULL;
