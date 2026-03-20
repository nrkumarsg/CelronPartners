import { supabase } from './supabase';

/**
 * Fetches all companies that the current user belongs to.
 */
export const getMyCompanies = async (userId) => {
    if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return { data: [], error: 'Not authenticated' };
        userId = session.user.id;
    }

    const { data, error } = await supabase
        .from('company_users')
        .select(`
            id,
            role,
            company:companies(id, name, slug, logo_url)
        `)
        .eq('user_id', userId);

    // Transform to simple array of company objects
    const companies = data ? data.map(cu => ({
        ...cu.company,
        role: cu.role,
        junction_id: cu.id
    })) : [];

    return { data: companies, error };
};

/**
 * Creates a new company record.
 * Handles slug generation: if slug is provided, uses it; otherwise generates from name.
 */
export const createCompany = async (name, slug) => {
    let finalSlug = slug || name.toLowerCase().trim().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');

    // Ensure slug is not empty
    if (!finalSlug) finalSlug = 'company-' + Math.floor(Math.random() * 1000);

    const { data, error } = await supabase
        .from('companies')
        .insert([{ name, slug: finalSlug }])
        .select()
        .single();
    return { data, error };
};

/**
 * Ensures a company exists with the given name for demo purposes.
 */
export const ensureDemoCompany = async (name = 'Cel-Ron Demo') => {
    const { data: existing } = await supabase
        .from('companies')
        .select('*')
        .eq('name', name)
        .limit(1)
        .single();

    if (existing) return existing;

    const { data } = await createCompany(name);
    return data;
};

/**
 * Superadmin utility: Get all companies in the system.
 */
export const getAllCompanies = async () => {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });
    return { data, error };
};

/**
 * Assign or update a user's role in a company.
 */
export const assignUserToCompany = async (userId, companyId, role = 'staff') => {
    const { data, error } = await supabase
        .from('company_users')
        .upsert([{ user_id: userId, company_id: companyId, role }], { onConflict: 'user_id,company_id' })
        .select()
        .single();
    return { data, error };
};

/**
 * Remove a user from a company.
 */
export const removeUserFromCompany = async (userId, companyId) => {
    const { error } = await supabase
        .from('company_users')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);
    return { error };
};

/**
 * Update company metadata (name, logo_url, etc.)
 */
export const updateCompany = async (companyId, updates) => {
    const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId)
        .select()
        .single();
    return { data, error };
};

/**
 * Superadmin utility: Delete a company from the system.
 * WARNING: This will likely fail if there are foreign key constraints (cascade should be handled in DB).
 */
export const deleteCompany = async (companyId) => {
    const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
    return { error };
};
