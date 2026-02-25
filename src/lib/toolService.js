import { supabase } from './supabase';

export const getUserTools = async () => {
    const { data, error } = await supabase
        .from('user_tools')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('name');
    return { data, error };
};

export const createUserTool = async (tool) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('user_tools')
        .insert([{ ...tool, user_id: user.id }])
        .select()
        .single();
    return { data, error };
};

export const updateUserTool = async (id, updates) => {
    const { data, error } = await supabase
        .from('user_tools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { data, error };
};

export const deleteUserTool = async (id) => {
    const { error } = await supabase
        .from('user_tools')
        .delete()
        .eq('id', id);
    return { error };
};
