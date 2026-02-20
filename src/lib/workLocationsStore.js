import { create } from 'zustand';
import { supabase } from './supabase';

export const useWorkLocationsStore = create((set) => ({
    workLocations: [],
    loading: false,
    error: null,

    fetchWorkLocations: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('work_locations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ workLocations: data });
        } catch (error) {
            set({ error: error.message });
            console.error('Error fetching work locations:', error);
        } finally {
            set({ loading: false });
        }
    },

    addWorkLocation: async (locationData) => {
        set({ loading: true, error: null });
        try {
            const payload = { ...locationData };
            if (payload.id === '' || !payload.id) {
                delete payload.id;
            }

            const { data, error } = await supabase
                .from('work_locations')
                .insert([payload])
                .select();

            if (error) throw error;
            set((state) => ({ workLocations: [data[0], ...state.workLocations] }));
            return { success: true, data: data[0] };
        } catch (error) {
            set({ error: error.message });
            console.error('Error adding work location:', error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false });
        }
    },

    updateWorkLocation: async (id, locationData) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('work_locations')
                .update({ ...locationData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;
            set((state) => ({
                workLocations: state.workLocations.map((loc) => (loc.id === id ? data[0] : loc)),
            }));
            return { success: true, data: data[0] };
        } catch (error) {
            set({ error: error.message });
            console.error('Error updating work location:', error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false });
        }
    },

    deleteWorkLocation: async (id) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase.from('work_locations').delete().eq('id', id);
            if (error) throw error;
            set((state) => ({
                workLocations: state.workLocations.filter((loc) => loc.id !== id),
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message });
            console.error('Error deleting work location:', error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false });
        }
    },
}));
