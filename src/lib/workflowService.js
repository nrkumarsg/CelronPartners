import { supabase } from './supabase';

// Helper to pad numbers
const padZero = (num, length) => String(num).padStart(length, '0');

// Generate next Enquiry No: Enq-YY-MM-XXXX
export const generateEnquiryNo = async (companyId) => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = padZero(today.getMonth() + 1, 2);
    const prefix = `Enq-${yy}-${mm}-`;

    const { data, error } = await supabase
        .from('enquiries')
        .select('enquiry_no')
        .eq('company_id', companyId)
        .ilike('enquiry_no', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest enquiry:', error);
        return `${prefix}0001`; // Fallback safely
    }

    if (data && data.length > 0) {
        // extract XXXX
        const lastNo = data[0].enquiry_no;
        const parts = lastNo.split('-');
        const lastIncremental = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastIncremental)) {
            return `${prefix}${padZero(lastIncremental + 1, 4)}`;
        }
    }

    return `${prefix}0001`;
};

// Generate next Job No: CEL-YYMM-XXXX where XXXX >= 5000
export const generateJobNo = async (companyId, companyPrefix = 'CEL') => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = padZero(today.getMonth() + 1, 2);
    const prefix = `${companyPrefix}-${yy}${mm}-`;

    const { data, error } = await supabase
        .from('jobs')
        .select('job_no')
        .eq('company_id', companyId)
        .ilike('job_no', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest job:', error);
        return `${prefix}5000`; // Fallback
    }

    if (data && data.length > 0) {
        // extract XXXX
        const lastNo = data[0].job_no;
        const parts = lastNo.split('-');
        const lastIncremental = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastIncremental) && lastIncremental >= 5000) {
            return `${prefix}${lastIncremental + 1}`;
        }
    }

    return `${prefix}5000`;
};

// ... other CRUD operations for Enquiries, Jobs, etc.
// Enquiries
export const getEnquiries = async (companyId) => {
    const { data, error } = await supabase
        .from('enquiries')
        .select(`*, partners(name), contacts(name)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const createEnquiry = async (enquiryData) => {
    const { data, error } = await supabase.from('enquiries').insert([enquiryData]).select().single();
    return { data, error };
};

// Jobs
export const getJobs = async (companyId) => {
    const { data, error } = await supabase
        .from('jobs')
        .select(`*, enquiries(enquiry_no, type, partners(name))`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    return { data, error };
};

export const createJob = async (jobData) => {
    const { data, error } = await supabase.from('jobs').insert([jobData]).select().single();
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
