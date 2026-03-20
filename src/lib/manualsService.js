import { supabase } from './supabase';

/**
 * Fetch all manuals from the library.
 */
export const getManuals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
        .from('manuals_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    return { data, error };
};

/**
 * Save a new manual metadata record.
 */
export const saveManual = async (manual) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('manuals_library')
        .upsert([{
            ...manual,
            user_id: user.id,
            company_id: manual.company_id || user.user_metadata?.company_id
        }])
        .select()
        .single();
    return { data, error };
};

/**
 * Delete a manual record.
 */
export const deleteManual = async (id) => {
    const { error } = await supabase
        .from('manuals_library')
        .delete()
        .eq('id', id);
    return { error };
};
