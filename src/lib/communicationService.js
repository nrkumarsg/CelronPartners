import { supabase } from './supabase';

export const getCommunicationAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    return await supabase
        .from('communication_accounts')
        .select('*')
        .order('platform', { ascending: true })
        .order('created_at', { ascending: true });
};

export const createCommunicationAccount = async (accountData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    return await supabase
        .from('communication_accounts')
        .insert([{ ...accountData, user_id: user.id }]);
};

export const updateCommunicationAccount = async (id, accountData) => {
    return await supabase
        .from('communication_accounts')
        .update(accountData)
        .eq('id', id);
};

export const deleteCommunicationAccount = async (id) => {
    return await supabase
        .from('communication_accounts')
        .delete()
        .eq('id', id);
};

// Mock function for fetching unread counts (to be replaced with actual API calls later)
export const getUnreadCounts = async (accounts) => {
    // In a real implementation, this would call specialized Edge Functions 
    // that interact with Zoho, Gmail, Meta, etc.
    return accounts.reduce((acc, account) => {
        acc[account.id] = Math.floor(Math.random() * 15); // Random mock data
        return acc;
    }, {});
};
