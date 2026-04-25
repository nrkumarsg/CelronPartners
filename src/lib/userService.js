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
        const payload = { ...updates };
        // Remove fields that shouldn't be updated directly via profile
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;

        const { data, error } = await supabase
            .from('profiles')
            .update(payload)
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

export const createProfileManually = async (profileData) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating profile:', error);
        return { data: null, error };
    }
};

export const deleteProfile = async (userId) => {
    try {
        // Note: This usually requires elevated permissions or deleting the Auth user first
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting profile:', error);
        return { error };
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

// --- STAFF DIRECTORY (NEW TABLE) ---

export const getAllStaff = async () => {
    try {
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching staff:', error);
        return { data: null, error };
    }
};

export const createStaff = async (staffData) => {
    try {
        const { data, error } = await supabase
            .from('staff')
            .insert([staffData])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating staff:', error);
        return { data: null, error };
    }
};

export const updateStaff = async (staffId, updates) => {
    try {
        const payload = { ...updates };
        delete payload.id;
        delete payload.created_at;

        const { data, error } = await supabase
            .from('staff')
            .update(payload)
            .eq('id', staffId)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating staff:', error);
        return { data: null, error };
    }
};

export const deleteStaff = async (staffId) => {
    try {
        const { error } = await supabase
            .from('staff')
            .delete()
            .eq('id', staffId);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting staff:', error);
        return { error };
    }
};
