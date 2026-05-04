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

/**
 * Synchronize forms from a specific Google Drive folder.
 */
export const syncFormsFromDrive = async (accessToken, folderId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { listFolderContent } = await import('./driveService');
    const driveFiles = await listFolderContent(accessToken, folderId);

    const formsToUpsert = driveFiles.map(file => ({
        user_id: user.id,
        company_id: user.user_metadata?.company_id,
        title: file.name,
        file_id: file.id,
        file_url: file.webViewLink,
        form_type: file.mimeType.split('.').pop()?.toUpperCase() || 'DOCUMENT'
    }));

    if (formsToUpsert.length === 0) return { count: 0 };

    // Batch upsert based on file_id to prevent duplicates
    const { data, error } = await supabase
        .from('forms_library')
        .upsert(formsToUpsert, { onConflict: 'file_id' })
        .select();

    return { data, error, count: formsToUpsert.length };
};
