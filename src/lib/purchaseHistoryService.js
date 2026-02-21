import { supabase } from './supabase';

export const getPurchaseHistoryByItemId = async (itemId) => {
    try {
        const { data, error } = await supabase
            .from('purchase_history')
            .select(`
        *,
        supplier:partners(id, name)
      `)
            .eq('item_id', itemId)
            .order('purchase_date', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        return { data: null, error };
    }
};

export const createPurchaseHistory = async (purchaseData) => {
    try {
        const { data, error } = await supabase
            .from('purchase_history')
            .insert([purchaseData])
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating purchase history:', error);
        return { data: null, error };
    }
};

export const updatePurchaseHistory = async (id, purchaseData) => {
    try {
        const { data, error } = await supabase
            .from('purchase_history')
            .update(purchaseData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error updating purchase history:', error);
        return { data: null, error };
    }
};

export const deletePurchaseHistory = async (id) => {
    try {
        const { error } = await supabase
            .from('purchase_history')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting purchase history:', error);
        return { error };
    }
};
