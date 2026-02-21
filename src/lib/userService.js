import { supabase } from './supabase';

export const getProfile = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, company:companies(*)')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching profile:', error);
        return { data: null, error };
    }
};

export const getAllProfiles = async () => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, company:companies(name)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching all profiles:', error);
        return { data: null, error };
    }
};

export const updateProfile = async (userId, updates) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { data: null, error };
    }
};

export const getAllCompanies = async () => {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching companies:', error);
        return { data: null, error };
    }
};
