import { create } from 'zustand';
import { supabase } from './supabase';

export const useVesselsStore = create((set) => ({
    vessels: [],
    loading: false,
    error: null,

    fetchVessels: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('vessels')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ vessels: data });
        } catch (error) {
            set({ error: error.message });
            console.error('Error fetching vessels:', error);
        } finally {
            set({ loading: false });
        }
    },

    addVessel: async (vesselData) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('vessels')
                .insert([vesselData])
                .select();

            if (error) throw error;
            set((state) => ({ vessels: [data[0], ...state.vessels] }));
            return { success: true, data: data[0] };
        } catch (error) {
            set({ error: error.message });
            console.error('Error adding vessel:', error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false });
        }
    },

    updateVessel: async (id, vesselData) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('vessels')
                .update({ ...vesselData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;
            set((state) => ({
                vessels: state.vessels.map((v) => (v.id === id ? data[0] : v)),
            }));
            return { success: true, data: data[0] };
        } catch (error) {
            set({ error: error.message });
            console.error('Error updating vessel:', error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false });
        }
    },

    deleteVessel: async (id) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase.from('vessels').delete().eq('id', id);
            if (error) throw error;
            set((state) => ({
                vessels: state.vessels.filter((v) => v.id !== id),
            }));
            return { success: true };
        } catch (error) {
            set({ error: error.message });
            console.error('Error deleting vessel:', error);
            return { success: false, error: error.message };
        } finally {
            set({ loading: false });
        }
    },
}));
