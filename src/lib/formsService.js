import { supabase } from './supabase';

/**
 * Fetch all forms from the library.
 */
export const getForms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
        .from('forms_library')
        .select('*')
        .order('created_at', { ascending: false });
    return { data, error };
};

/**
 * Save a new form metadata record.
 */
export const saveForm = async (form) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('forms_library')
        .upsert([{
            ...form,
            user_id: user.id,
            company_id: form.company_id || user.user_metadata?.company_id
        }])
        .select()
        .single();
    return { data, error };
};

/**
 * Delete a form record.
 */
export const deleteForm = async (id) => {
    const { error } = await supabase
        .from('forms_library')
        .delete()
        .eq('id', id);
    return { error };
};
