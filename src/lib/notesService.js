import { supabase } from './supabase';

export const getNotes = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching notes:', error);
        return { data: null, error };
    }
};

export const getNoteById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching note:', error);
        return { data: null, error };
    }
};

export const createNote = async (noteData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const payload = {
            ...noteData,
            user_id: user?.id || null
        };

        const { data, error } = await supabase
            .from('notes')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating note:', error);
        return { data: null, error };
    }
};

export const updateNote = async (id, noteData) => {
    try {
        const { data, error } = await supabase
            .from('notes')
            .update({ ...noteData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating note:', error);
        return { data: null, error };
    }
};

export const deleteNote = async (id) => {
    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting note:', error);
        return { error };
    }
};
