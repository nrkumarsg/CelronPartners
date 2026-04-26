import { supabase } from './supabase';

/**
 * Fetch all payments associated with a specific job
 */
export const getJobPayments = async (jobId) => {
    try {
        const [customerRes, supplierRes] = await Promise.all([
            supabase
                .from('job_customer_payments')
                .select('*')
                .eq('job_id', jobId)
                .order('received_date', { ascending: false }),
            supabase
                .from('job_supplier_payments')
                .select('*, supplier:partners(id, name)')
                .eq('job_id', jobId)
                .order('invoice_date', { ascending: false })
        ]);

        if (customerRes.error) throw customerRes.error;
        if (supplierRes.error) throw supplierRes.error;

        return {
            customerPayments: customerRes.data || [],
            supplierPayments: supplierRes.data || [],
            error: null
        };
    } catch (error) {
        console.error('Error fetching job payments:', error);
        return { customerPayments: [], supplierPayments: [], error };
    }
};

/**
 * Save Customer Payment
 */
export const saveCustomerPayment = async (payment) => {
    try {
        const { id, ...payload } = payment;
        let result;

        if (id && !id.startsWith('temp_')) {
            result = await supabase
                .from('job_customer_payments')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('job_customer_payments')
                .insert([payload])
                .select()
                .single();
        }

        if (result.error) throw result.error;
        return { data: result.data, error: null };
    } catch (error) {
        console.error('Error saving customer payment:', error);
        return { data: null, error };
    }
};

/**
 * Save Supplier Payment
 */
export const saveSupplierPayment = async (payment) => {
    try {
        const { id, supplier, ...payload } = payment; // Remove joined data
        let result;

        if (id && !id.startsWith('temp_')) {
            result = await supabase
                .from('job_supplier_payments')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('job_supplier_payments')
                .insert([payload])
                .select()
                .single();
        }

        if (result.error) throw result.error;
        return { data: result.data, error: null };
    } catch (error) {
        console.error('Error saving supplier payment:', error);
        return { data: null, error };
    }
};

/**
 * Delete Payment Record
 */
export const deletePayment = async (type, id) => {
    try {
        const table = type === 'customer' ? 'job_customer_payments' : 'job_supplier_payments';
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Error deleting payment:', error);
        return { error };
    }
};
