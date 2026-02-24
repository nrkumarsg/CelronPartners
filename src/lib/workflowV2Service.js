import { supabase } from './supabase';

const padZero = (num, length) => String(num).padStart(length, '0');

/**
 * Generate Next Document Number
 * Pattern: [PREFIX]-YYYYMM-XXXX
 */
export const generateDocNumber = async (companyId, type) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = padZero(today.getMonth() + 1, 2);

    let prefix = 'DOC';
    switch (type) {
        case 'Enquiry': prefix = 'ENQ'; break;
        case 'Quotation': prefix = 'QTN'; break;
        case 'Purchase Order': prefix = 'PO'; break;
        case 'Delivery Order': prefix = 'DO'; break;
        case 'Proforma Invoice': prefix = 'PRO'; break;
        case 'Packing List': prefix = 'PKL'; break;
        case 'Tax Invoice': prefix = 'INV'; break;
    }

    const fullPrefix = `${prefix}-${yyyy}${mm}-`;

    const { data, error } = await supabase
        .from('workflow_documents')
        .select('document_no')
        .eq('company_id', companyId)
        .eq('document_type', type)
        .ilike('document_no', `${fullPrefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching latest doc no:', error);
        return `${fullPrefix}0001`;
    }

    if (data && data.length > 0) {
        const lastNo = data[0].document_no;
        const parts = lastNo.split('-');
        const lastIncremental = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastIncremental)) {
            return `${fullPrefix}${padZero(lastIncremental + 1, 4)}`;
        }
    }

    return `${fullPrefix}0001`;
};

/**
 * Fetch Documents by Type
 */
export const getWorkflowDocuments = async (companyId, type = null) => {
    let query = supabase
        .from('workflow_documents')
        .select(`*, partners(name), vessels(vessel_name), work_locations(location_name)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (type) {
        query = query.eq('document_type', type);
    }

    const { data, error } = await query;
    return { data, error };
};

/**
 * Fetch Single Document with All Line Items
 */
export const getWorkflowDocumentById = async (id) => {
    const { data: document, error: docError } = await supabase
        .from('workflow_documents')
        .select(`*, partners(*), contacts(*), vessels(*), work_locations(*)`)
        .eq('id', id)
        .single();

    if (docError) return { error: docError };

    const { data: items, error: itemsError } = await supabase
        .from('workflow_line_items')
        .select('*')
        .eq('document_id', id)
        .order('sort_order', { ascending: true });

    return { data: { ...document, items: items || [] }, error: itemsError };
};

/**
 * Save Document (Create or Update) + Sync Line Items
 */
export const saveWorkflowDocument = async (docData, lineItems) => {
    const { items, ...headerData } = docData;
    const isNew = !headerData.id;

    let savedDoc;
    if (isNew) {
        const { data, error } = await supabase
            .from('workflow_documents')
            .insert([headerData])
            .select()
            .single();
        if (error) throw error;
        savedDoc = data;
    } else {
        const { data, error } = await supabase
            .from('workflow_documents')
            .update(headerData)
            .eq('id', headerData.id)
            .select()
            .single();
        if (error) throw error;
        savedDoc = data;
    }

    // Handle Line Items
    if (lineItems && lineItems.length >= 0) {
        // For simplicity in the demo, we'll delete existing and re-insert 
        // Or we could do a more complex diff. Let's do a simple wipe and replace for reliability.
        if (!isNew) {
            await supabase.from('workflow_line_items').delete().eq('document_id', savedDoc.id);
        }

        const itemsToInsert = lineItems.map((item, index) => ({
            ...item,
            document_id: savedDoc.id,
            sort_order: index,
            id: undefined // Let DB generate new IDs
        }));

        const { error: insertError } = await supabase
            .from('workflow_line_items')
            .insert(itemsToInsert);

        if (insertError) throw insertError;
    }

    return { data: savedDoc, error: null };
};

export const deleteWorkflowDocument = async (id) => {
    const { error } = await supabase.from('workflow_documents').delete().eq('id', id);
    return { error };
};
