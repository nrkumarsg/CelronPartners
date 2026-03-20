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

    // Attempt to fetch profile to get company_id
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

    return await supabase
        .from('communication_accounts')
        .insert([{ ...accountData, user_id: user.id, company_id: profile?.company_id || null }]);
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
    return accounts.reduce((acc, account) => {
        // If it's a Gmail account with auth, don't show random mock numbers
        if (account.provider?.toLowerCase() === 'gmail' && account.auth_data?.access_token) {
            acc[account.id] = 0;
        } else {
            acc[account.id] = Math.floor(Math.random() * 5); // Reduced random range
        }
        return acc;
    }, {});
};
