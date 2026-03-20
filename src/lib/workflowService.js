import { supabase } from './supabase';

// Helper to pad numbers
const padZero = (num, length) => String(num).padStart(length, '0');

// Generate next Enquiry No: ECEL-YYMM-DDXX (resets daily)
export const generateEnquiryNo = async (companyId) => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = padZero(today.getMonth() + 1, 2);
    const dd = padZero(today.getDate(), 2);
    const prefix = `ECEL-${yy}${mm}-${dd}`;

    const { data, error } = await supabase
        .from('customer_enquiries')
        .select('enquiry_no')
        .eq('company_id', companyId)
        .ilike('enquiry_no', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest enquiry:', error);
        return `${prefix}01`;
    }

    if (data && data.length > 0) {
        const lastNo = data[0].enquiry_no;
        const lastIncremental = parseInt(lastNo.slice(-2), 10);
        if (!isNaN(lastIncremental)) {
            return `${prefix}${padZero(lastIncremental + 1, 2)}`;
        }
    }

    return `${prefix}01`;
};

// Generate next Job No: CELYYMM-XXXX where XXXX starts from 5001
export const generateJobNo = async (companyId, companyPrefix = 'CEL') => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = padZero(today.getMonth() + 1, 2);
    const prefix = `${companyPrefix}${yy}${mm}-`;

    const { data, error } = await supabase
        .from('jobs')
        .select('job_no')
        .eq('company_id', companyId)
        .ilike('job_no', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest job:', error);
        return `${prefix}5001`;
    }

    if (data && data.length > 0) {
        const lastNo = data[0].job_no;
        const parts = lastNo.split('-');
        const lastIncremental = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastIncremental)) {
            return `${prefix}${lastIncremental + 1}`;
        }
    }

    return `${prefix}5001`;
};

// ... existing CRUD operations for Enquiries, Jobs ...

// Delivery Orders
export const getDeliveryOrders = async (companyId, jobId = null) => {
    let query = supabase
        .from('delivery_orders')
        .select(`*, jobs(job_no), vessels(vessel_name)`)
        .eq('company_id', companyId);

    if (jobId) query = query.eq('job_id', jobId);

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
};

export const createDeliveryOrder = async (doData) => {
    const { data, error } = await supabase.from('delivery_orders').insert([doData]).select().single();
    return { data, error };
};

// Job Expenses (CRUD)
export const getJobExpenses = async (companyId, jobId) => {
    const { data, error } = await supabase
        .from('job_expenses')
        .select('*')
        .eq('company_id', companyId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
    return { data, error };
};

export const createJobExpense = async (expenseData) => {
    const { data, error } = await supabase.from('job_expenses').insert([expenseData]).select().single();
    return { data, error };
};

export const updateJobExpense = async (id, updateData) => {
    const { data, error } = await supabase.from('job_expenses').update(updateData).eq('id', id).select().single();
    return { data, error };
};

export const deleteJobExpense = async (id) => {
    const { error } = await supabase.from('job_expenses').delete().eq('id', id);
    return { error };
};

// Supplier Quotes
export const getSupplierQuotes = async (enquiryId) => {
    const { data, error } = await supabase
        .from('supplier_quotes')
        .select(`*, supplier:partners(name)`)
        .eq('enquiry_id', enquiryId)
        .order('created_at', { ascending: true });
    return { data, error };
};

export const saveSupplierQuote = async (quoteData) => {
    const { id, ...payload } = quoteData;
    if (id) {
        return await supabase.from('supplier_quotes').update(payload).eq('id', id).select().single();
    }
    return await supabase.from('supplier_quotes').insert([payload]).select().single();
};

export const shortlistSupplierQuote = async (enquiryId, quoteId) => {
    // 1. Mark all as Received (reset)
    await supabase.from('supplier_quotes').update({ status: 'Received' }).eq('enquiry_id', enquiryId);

    // 2. Mark specific as Shortlisted
    const { data, error } = await supabase.from('supplier_quotes').update({ status: 'Shortlisted' }).eq('id', quoteId).select().single();
    return { data, error };
};

// ... rest of the file ...

// ... other CRUD operations for Enquiries, Jobs, etc.
// Enquiries
export const getEnquiries = async (companyId) => {
    const { data, error } = await supabase
        .from('customer_enquiries')
        .select(`*, customer:partners!customer_id(name), contact:contacts!contact_id(name)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const getEnquiryById = async (companyId, enquiryId) => {
    const { data, error } = await supabase
        .from('customer_enquiries')
        .select(`*, customer:partners!customer_id(name), contact:contacts!contact_id(name)`)
        .eq('company_id', companyId)
        .eq('id', enquiryId)
        .single();
    return { data, error };
};

export const createEnquiry = async (enquiryData) => {
    const { data, error } = await supabase.from('customer_enquiries').insert([enquiryData]).select().single();
    return { data, error };
};

export const updateEnquiry = async (id, updateData) => {
    const { data, error } = await supabase.from('customer_enquiries').update(updateData).eq('id', id).select().single();
    return { data, error };
};

// Jobs
export const getJobs = async (companyId) => {
    const { data, error } = await supabase
        .from('jobs')
        .select(`*, enquiries:customer_enquiries(enquiry_no, source_type, customer:partners!customer_id(name), gdrive_folder_id), job_expenses(amount)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const getJobById = async (companyId, jobId) => {
    const { data, error } = await supabase
        .from('jobs')
        .select(`*, enquiries:customer_enquiries(enquiry_no, source_type, catalog_items, customer_id, customer:partners!customer_id(name, address, email1), gdrive_folder_id), job_expenses(*)`)
        .eq('company_id', companyId)
        .eq('id', jobId)
        .single();
    return { data, error };
};

export const createJob = async (jobData) => {
    const { data, error } = await supabase.from('jobs').insert([jobData]).select().single();

    // Also mark the original enquiry as Converted
    if (jobData.enquiry_id && !error) {
        await supabase.from('customer_enquiries').update({ status: 'Converted' }).eq('id', jobData.enquiry_id);
    }

    return { data, error };
};

export const updateJob = async (id, updateData) => {
    const { data, error } = await supabase.from('jobs').update(updateData).eq('id', id).select().single();
    return { data, error };
};

// Purchase Orders (Finance Tracking for Jobs)
export const getPurchaseOrders = async (companyId, jobId) => {
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
    return { data, error };
};

export const createPurchaseOrder = async (poData) => {
    const { data, error } = await supabase.from('purchase_orders').insert([poData]).select().single();
    return { data, error };
};


// Documents Manager
export const getDocuments = async (companyId, referenceType, referenceId) => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const addDocumentLink = async (docData) => {
    const { data, error } = await supabase.from('documents').insert([docData]).select().single();
    return { data, error };
};

// Deletions
export const deleteEnquiry = async (id) => {
    const { error } = await supabase.from('customer_enquiries').delete().eq('id', id);
    return { error };
};

export const deleteJob = async (id) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    return { error };
};

export const deleteDocument = async (id) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    return { error };
};

