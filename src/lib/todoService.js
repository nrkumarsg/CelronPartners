import { supabase } from './supabase';

export const getTodos = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching todos:', error);
        return { data: null, error };
    }
};

export const createTodo = async (todo) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('todos')
            .insert([{ ...todo, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating todo:', error);
        return { data: null, error };
    }
};

export const updateTodo = async (id, updates) => {
    try {
        const { data, error } = await supabase
            .from('todos')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating todo:', error);
        return { data: null, error };
    }
};

export const deleteTodo = async (id) => {
    try {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting todo:', error);
        return { error };
    }
};
