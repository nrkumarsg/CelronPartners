import { supabase } from './supabase';

const padZero = (num, length) => String(num).padStart(length, '0');

/**
 * Generate Next Document Number
 * Pattern: [PREFIX]-YYYYMM-XXXX
 */
export const generateDocNumber = async (companyId, type, isRevision = false, originalNo = null) => {
    if (isRevision && originalNo) {
        // Pattern: [ORIGINAL]-R[REV_NO]
        const { data: latestRev } = await supabase
            .from('workflow_documents')
            .select('document_no')
            .ilike('document_no', `${originalNo}-R%`)
            .order('document_no', { ascending: false })
            .limit(1);

        if (latestRev && latestRev.length > 0) {
            const lastNo = latestRev[0].document_no;
            const rPart = lastNo.split('-R')[1];
            const nextRev = (parseInt(rPart, 10) || 0) + 1;
            return `${originalNo}-R${nextRev}`;
        }
        return `${originalNo}-R1`;
    }

    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = padZero(today.getMonth() + 1, 2);

    let prefix = 'DOC';
    switch (type) {
        case 'Enquiry': prefix = 'ENQ'; break;
        case 'Quotation': prefix = 'QTN'; break;
        case 'Purchase Order': prefix = 'PO'; break;
        case 'Delivery Order': prefix = 'DO'; break;
        case 'Service Report': prefix = 'SR'; break;
        case 'Certificate': prefix = 'CERT'; break;
        case 'Proforma Invoice': prefix = 'PRO'; break;
        case 'Packing List': prefix = 'PKL'; break;
        case 'Tax Invoice': prefix = 'INV'; break;
        case 'Payment Received': prefix = 'PAY'; break;
        case 'Statement of Account': prefix = 'SOA'; break;
        case 'Job': prefix = 'CEL'; break; // v3 Requirement
    }

    const fullPrefix = `${prefix}-${yy}${mm}-`;

    const { data, error } = await supabase
        .from('workflow_documents')
        .select('document_no')
        .eq('company_id', companyId)
        .eq('document_type', type === 'Job' ? 'Tax Invoice' : type) // Jobs share invoice/workflow space but have CEL prefix
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
 * Fetch Documents linked to a Job
 */
export const getWorkflowDocumentsByJob = async (jobId) => {
    const { data, error } = await supabase
        .from('workflow_documents')
        .select(`*, partners(name), vessels(vessel_name), work_locations(location_name)`)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
    return { data, error };
};

/**
 * Fetch Documents linked to an Enquiry
 */
export const getWorkflowDocumentsByEnquiry = async (enquiryId) => {
    const { data, error } = await supabase
        .from('workflow_documents')
        .select(`*, partners(name), vessels(vessel_name), work_locations(location_name)`)
        .eq('enquiry_id', enquiryId)
        .order('created_at', { ascending: false });
    return { data, error };
};

/**
 * Fetch Single Document with All Line Items
 */
export const getWorkflowDocumentById = async (id) => {
    const { data: document, error: docError } = await supabase
        .from('workflow_documents')
        .select(`*, partners(*), vessels(*), work_locations(*)`)
        .eq('id', id);

    if (docError) {
        console.error('getWorkflowDocumentById Error:', docError);
        return { error: docError };
    }

    if (!document || document.length === 0) {
        return { error: { message: "Document not found or access denied" } };
    }

    const { data: items, error: itemsError } = await supabase
        .from('workflow_line_items')
        .select('*')
        .eq('document_id', id)
        .order('sort_order', { ascending: true });

    return { data: { ...document[0], items: items || [] }, error: itemsError };
};

/**
 * Save Document (Create or Update) + Sync Line Items
 */
export const saveWorkflowDocument = async (docData, lineItems) => {
    const { items, partners, contacts, vessels, work_locations, ...headerData } = docData;
    const isNew = !headerData.id;

    // Sanitize Document Header
    const validDocKeys = [
        'id', 'company_id', 'document_type', 'document_no', 'issue_date', 'expiry_date',
        'partner_id', 'contact_id', 'vessel_id', 'work_location_id',
        'salesperson_name', 'subject', 'customer_ref', 'currency',
        'terms_conditions', 'notes', 'status', 'subtotal', 'tax_amount', 'total_amount',
        'internal_notes',
        'discount_amount', 'discount_percent',
        'customer_po_no', 'customer_po_date', 'customer_po_by_id', 'customer_po_attachment_url',
        'is_job', 'assigned_job_no',
        'original_document_id', 'revision_no',
        'attachment_urls', 'delivery_verification'
    ];

    const sanitizedHeader = {};
    validDocKeys.forEach(key => {
        if (headerData[key] !== undefined) sanitizedHeader[key] = headerData[key];
    });

    // Clean UUID fields (ensure null if empty/invalid)
    const uuidFields = ['partner_id', 'contact_id', 'vessel_id', 'work_location_id'];
    uuidFields.forEach(f => {
        if (!sanitizedHeader[f]) sanitizedHeader[f] = null;
    });

    // Ensure numeric fields are actually numbers
    sanitizedHeader.subtotal = parseFloat(sanitizedHeader.subtotal) || 0;
    sanitizedHeader.tax_amount = parseFloat(sanitizedHeader.tax_amount) || 0;
    sanitizedHeader.total_amount = parseFloat(sanitizedHeader.total_amount) || 0;

    let savedDoc;
    if (isNew) {
        // Double check document_no is set
        if (!sanitizedHeader.document_no) {
            throw new Error("Document number is required for saving.");
        }

        const { data, error } = await supabase
            .from('workflow_documents')
            .insert([sanitizedHeader])
            .select()
            .single();
        if (error) throw error;
        savedDoc = data;
    } else {
        const { data, error } = await supabase
            .from('workflow_documents')
            .update(sanitizedHeader)
            .eq('id', headerData.id)
            .select()
            .single();
        if (error) throw error;
        savedDoc = data;
    }

    // Handle Line Items
    if (lineItems && lineItems.length >= 0) {
        if (!isNew) {
            await supabase.from('workflow_line_items').delete().eq('document_id', savedDoc.id);
        }

        const validItemKeys = [
            'document_id', 'item_id', 'description', 'details',
            'quantity', 'uom', 'unit_price', 'tax_rate', 'amount',
            'sort_order', 'is_section', 'is_note',
            'tax_enabled' // Now enabled
        ];

        const itemsToInsert = lineItems.map((item, index) => {
            const sanitizedItem = {
                document_id: savedDoc.id,
                sort_order: index
            };
            validItemKeys.forEach(key => {
                if (item[key] !== undefined) sanitizedItem[key] = item[key];
            });

            // Clean item UUID and numbers
            if (!sanitizedItem.item_id) sanitizedItem.item_id = null;
            sanitizedItem.quantity = parseFloat(sanitizedItem.quantity) || 0;
            sanitizedItem.unit_price = parseFloat(sanitizedItem.unit_price) || 0;
            sanitizedItem.amount = parseFloat(sanitizedItem.amount) || 0;
            sanitizedItem.tax_rate = parseFloat(sanitizedItem.tax_rate) || 0;

            return sanitizedItem;
        });

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

/**
 * Helper: Map V1 Enquiry to V2 Document Header
 */
const mapEnquiryToV2Header = (enq, nextNo) => ({
    company_id: enq.company_id,
    document_type: 'Quotation',
    document_no: nextNo,
    partner_id: enq.customer_id,
    contact_id: enq.contact_id,
    vessel_id: enq.vessel_id,
    work_location_id: enq.work_location_id,
    subject: enq.subject || `Ref: ${enq.enquiry_no}`,
    customer_ref: enq.customer_ref,
    status: 'Draft',
    currency: 'SGD',
    enquiry_id: enq.id
});

/**
 * Helper: Map Catalog Item to Workflow Line Item
 */
const mapCatalogItemToLineItem = (item, docId, index) => ({
    document_id: docId,
    item_id: item.id,
    description: item.name,
    details: item.specification || '',
    quantity: 1,
    unit_price: item.selling_price || 0,
    uom: 'UNIT(S)',
    amount: item.selling_price || 0,
    sort_order: index,
    tax_rate: 9,
    tax_enabled: true
});

/**
 * Convert V1 Enquiry -> V2 Document (Quotation)
 */
export const convertEnquiryToV2Document = async (enquiryId) => {
    // 1. Fetch the V1 Enquiry
    const { data: enq, error: enqError } = await supabase
        .from('customer_enquiries')
        .select('*')
        .eq('id', enquiryId)
        .single();
    if (enqError) throw enqError;

    // 2. Generate Next Number for QTN
    const nextNo = await generateDocNumber(enq.company_id, 'Quotation');

    // 3. Prepare Header
    const docData = mapEnquiryToV2Header(enq, nextNo);

    // 4. Save Header
    const { data: savedDoc, error: saveError } = await supabase
        .from('workflow_documents')
        .insert([docData])
        .select()
        .single();
    if (saveError) throw saveError;

    // 5. Handle Line Items (if any)
    const v1Items = enq.catalog_items || [];
    if (v1Items.length > 0) {
        const itemsToInsert = v1Items.map((item, index) => mapCatalogItemToLineItem(item, savedDoc.id, index));

        const { error: itemError } = await supabase
            .from('workflow_line_items')
            .insert(itemsToInsert);
        if (itemError) throw itemError;
    }

    return savedDoc;
};

/**
 * Convert Shortlisted Supplier Quote -> V2 Document (Quotation for Customer)
 */
export const createQuotationFromSupplierQuote = async (quoteId) => {
    // 1. Fetch the Supplier Quote with Enquiry info
    const { data: quote, error: quoteError } = await supabase
        .from('supplier_quotes')
        .select(`*, enquiries:customer_enquiries(*)`)
        .eq('id', quoteId)
        .single();
    if (quoteError) throw quoteError;

    const enq = quote.enquiries;
    if (!enq) throw new Error("Linked enquiry not found");

    // 2. Generate Next Number for QTN
    const nextNo = await generateDocNumber(enq.company_id, 'Quotation');

    // 3. Prepare Header
    const docData = {
        company_id: enq.company_id,
        document_type: 'Quotation',
        document_no: nextNo,
        partner_id: enq.customer_id,
        contact_id: enq.contact_id,
        subject: `Ref: ${enq.enquiry_no} | Quotation based on Supplier Bid`,
        customer_ref: enq.customer_ref,
        status: 'Draft',
        currency: 'SGD',
        subtotal: quote.quote_amount || 0,
        total_amount: (quote.quote_amount || 0) * 1.09 // Add GST 9% by default
    };

    // 4. Save Header
    const { data: savedDoc, error: saveError } = await supabase
        .from('workflow_documents')
        .insert([docData])
        .select()
        .single();
    if (saveError) throw saveError;

    // 5. Handle Line Items (Map items from enquiry with supplier pricing)
    const v1Items = enq.catalog_items || [];
    if (v1Items.length > 0) {
        // Average the supplier price across items for simplicity in demo
        const avgPrice = (quote.quote_amount || 0) / v1Items.length;

        const itemsToInsert = v1Items.map((item, index) => ({
            document_id: savedDoc.id,
            item_id: item.id,
            description: item.name,
            details: item.specification || '',
            quantity: 1,
            unit_price: avgPrice,
            uom: 'UNIT(S)',
            amount: avgPrice,
            sort_order: index,
            tax_rate: 9,
            tax_enabled: true
        }));

        const { error: itemError } = await supabase
            .from('workflow_line_items')
            .insert(itemsToInsert);
        if (itemError) throw itemError;
    }

    return savedDoc;
};

/**
 * Create a Revision of an existing Document
 */
export const createDocumentRevision = async (docId) => {
    const { data: original, error: fetchErr } = await getWorkflowDocumentById(docId);
    if (fetchErr) throw fetchErr;

    const { items, id, created_at, updated_at, ...cleanHeader } = original;

    // 1. Mark original as Superseded (optional UI logic, but let's keep it active for history)
    // 2. Generate New Revision Number
    const revNo = await generateDocNumber(original.company_id, original.document_type, true, original.document_no);

    const newDocData = {
        ...cleanHeader,
        document_no: revNo,
        original_document_id: original.original_document_id || original.id,
        revision_no: (original.revision_no || 0) + 1,
        status: 'Draft' // Reset status for new revision
    };

    return await saveWorkflowDocument(newDocData, items);
};

/**
 * Convert Quotation to Active Job (v3)
 */
export const convertQuotationToJob = async (quotationId, poData) => {
    const { data: qtn, error: qtnErr } = await getWorkflowDocumentById(quotationId);
    if (qtnErr) throw qtnErr;

    const jobNo = await generateDocNumber(qtn.company_id, 'Job');

    const updateData = {
        ...qtn,
        is_job: true,
        assigned_job_no: jobNo,
        status: 'Confirmed', // Or 'Job Active'
        customer_po_no: poData.po_no,
        customer_po_date: poData.po_date,
        customer_po_by_id: poData.contact_id,
        customer_po_attachment_url: poData.attachment_url
    };

    return await saveWorkflowDocument(updateData, qtn.items);
};

/**
 * GDrive Folder Mapping Logic (v3)
 */
export const getGDriveFolderIdForStage = (stage) => {
    // This mapping aligns with driveService.provisionFullProjectStructure
    switch (stage) {
        case 'Enquiry': return '1. Customer_Request_&_Offer';
        case 'Quotation': return '1. Customer_Request_&_Offer';
        case 'Purchase Order': return '2. Supplier_Quotes_&_PO';
        case 'Delivery Order': return '3. Operations_DO_SR_&_Certificates';
        case 'Proforma Invoice': return '4. Finance_Invoices_&_Payments';
        case 'Tax Invoice': return '4. Finance_Invoices_&_Payments';
        case 'Payment Received': return '4. Finance_Invoices_&_Payments';
        case 'Statement of Account': return '4. Finance_Invoices_&_Payments';
        default: return '1. Customer_Request_&_Offer';
    }
};

/**
 * Submit Mobile Proof of Delivery (v3)
 */
export const submitDeliveryProof = async (docId, proofData) => {
    const { signature_url, photos, gps, device_id } = proofData;

    const { data, error } = await supabase
        .from('workflow_documents')
        .update({
            customer_signature_url: signature_url,
            delivery_verification: {
                gps,
                device_id,
                network_timestamp: new Date().toISOString(),
                photos
            },
            status: 'Delivered'
        })
        .eq('id', docId)
        .select()
        .single();

    return { data, error };
};

/**
 * Record External Document (Service Report, Certificate, etc. from Drive)
 */
export const recordExternalDocument = async (docData) => {
    const { data, error } = await supabase
        .from('workflow_documents')
        .insert([docData])
        .select()
        .single();
    return { data, error };
};

