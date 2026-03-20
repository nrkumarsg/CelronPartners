import { supabase } from './supabase';

/**
 * Fetch all customer enquiries for the current user's company
 */
export const getEnquiries = async (companyId = null) => {
    let query = supabase
        .from('customer_enquiries')
        .select(`
            *,
            customer:partners(id, name),
            contact:contacts(id, name)
        `)
        .order('created_at', { ascending: false });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching enquiries:', error);
        throw error;
    }
    return data || [];
};

/**
 * Fetch a single enquiry by ID
 */
export const getEnquiryById = async (id) => {
    const { data, error } = await supabase
        .from('customer_enquiries')
        .select(`
            *,
            customer:partners(id, name),
            contact:contacts(id, name)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching enquiry by id:', error);
        throw error;
    }
    return data;
};

/**
 * Create a new customer enquiry
 */
export const createEnquiry = async (payload) => {
    const { data, error } = await supabase
        .from('customer_enquiries')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Error creating enquiry:', error);
        throw error;
    }
    return data;
};

/**
 * Update an existing customer enquiry
 */
export const updateEnquiry = async (id, payload) => {
    // Prevent updating immutable fields
    const dataToUpdate = { ...payload };
    delete dataToUpdate.id;
    delete dataToUpdate.created_at;
    delete dataToUpdate.updated_at;

    const { data, error } = await supabase
        .from('customer_enquiries')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating enquiry:', error);
        throw error;
    }
    return data;
};

/**
 * Delete a customer enquiry
 */
export const deleteEnquiry = async (id) => {
    const { error } = await supabase
        .from('customer_enquiries')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting enquiry:', error);
        throw error;
    }
    return true;
};

/**
 * Generate next Enquiry No: Enq-YY-MM-XXXX
 */
export const generateEnquiryNo = async (companyId) => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `Enq-${yy}${mm}-`;

    const { data, error } = await supabase
        .from('customer_enquiries')
        .select('enquiry_no')
        .eq('company_id', companyId)
        .ilike('enquiry_no', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest enquiry:', error);
        return `${prefix}0001`;
    }

    if (data && data.length > 0) {
        const lastNo = data[0].enquiry_no;
        const parts = lastNo.split('-');
        const lastIncremental = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastIncremental)) {
            return `${prefix}${String(lastIncremental + 1).padStart(4, '0')}`;
        }
    }

    return `${prefix}0001`;
};
