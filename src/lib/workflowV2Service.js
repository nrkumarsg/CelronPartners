import { supabase } from './supabase';

const padZero = (num, length) => String(num).padStart(length, '0');

/**
 * Fetch revision history for a document.
 * Filters by original_document_id or document_no pattern.
 */
export const getDocumentHistory = async (doc) => {
    const originalId = doc.original_document_id || doc.id;
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('*')
        .or(`id.eq.${originalId},original_document_id.eq.${originalId}`)
        .order('revision_no', { ascending: false });

    return { data, error };
};

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
        case 'Order Acknowledgment': prefix = 'ORA'; break;
    }

    const fullPrefix = `${prefix}-${yy}${mm}-`;

    // Fetch the latest number, excluding revisions to avoid parsing errors like -R1
    let query = supabase
        .from('workflow_documents')
        .select('document_no')
        .eq('company_id', companyId)
        .ilike('document_no', `${fullPrefix}%`)
        .not('document_no', 'ilike', '%-R%') // Exclude revisions
        .order('document_no', { ascending: false })
        .limit(1);

    if (type !== 'Job') {
        query = query.eq('document_type', type);
    }

    const { data, error } = await query;

    let nextNum = 1;
    if (type === 'Job') nextNum = 6051;

    if (data && data.length > 0) {
        const lastNo = data[0].document_no;
        const parts = lastNo.split('-');
        const lastIncremental = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastIncremental)) {
            nextNum = lastIncremental + 1;
        }
    }

    // Safety Loop: Ensure the generated number is truly unique
    let finalNo = `${fullPrefix}${padZero(nextNum, 4)}`;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        const { data: existing } = await supabase
            .from('workflow_documents')
            .select('id')
            .eq('document_no', finalNo)
            .maybeSingle();
        
        if (!existing) {
            isUnique = true;
        } else {
            nextNum++;
            finalNo = `${fullPrefix}${padZero(nextNum, 4)}`;
            attempts++;
        }
    }

    return finalNo;
};

/**
 * Fetch Documents by Type
 */
export const getWorkflowDocuments = async (companyId, type = null) => {
    let query = supabase
        .from('workflow_documents')
        .select(`*`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (type) {
        if (Array.isArray(type)) {
            query = query.in('document_type', type);
        } else {
            query = query.eq('document_type', type);
        }
    }

    const { data, error } = await query;
    if (error) return { data: null, error };

    // Fetch related names manually if needed to avoid relationship join errors
    if (data && data.length > 0) {
        // Fetch partners
        const partnerIds = [...new Set(data.map(d => d.partner_id).filter(Boolean))];
        if (partnerIds.length > 0) {
            const { data: partners } = await supabase.from('partners').select('id, name').in('id', partnerIds);
            const partnerMap = Object.fromEntries(partners?.map(p => [p.id, p]) || []);
            data.forEach(d => { d.partners = partnerMap[d.partner_id]; });
        }

        // Fetch vessels
        const vesselIds = [...new Set(data.map(d => d.vessel_id).filter(Boolean))];
        if (vesselIds.length > 0) {
            const { data: vessels } = await supabase.from('vessels').select('id, vessel_name').in('id', vesselIds);
            const vesselMap = Object.fromEntries(vessels?.map(v => [v.id, v]) || []);
            data.forEach(d => { d.vessels = vesselMap[d.vessel_id]; });
        }

        // Fetch work locations
        const locationIds = [...new Set(data.map(d => d.work_location_id).filter(Boolean))];
        if (locationIds.length > 0) {
            const { data: locations } = await supabase.from('work_locations').select('id, location_name').in('id', locationIds);
            const locationMap = Object.fromEntries(locations?.map(l => [l.id, l]) || []);
            data.forEach(d => { d.work_locations = locationMap[d.work_location_id]; });
        }
    }
    
    return { data, error };
};

/**
 * Get Workflow Counts for Dashboards/Sidebar
 */
export const getWorkflowCounts = async (companyId) => {
    const { data, error } = await supabase
        .from('workflow_documents')
        .select('document_type, status')
        .eq('company_id', companyId);

    if (error) return { enquiryCount: 0, jobCount: 0, quotationCount: 0 };

    const enquiryCount = data.filter(d => d.document_type === 'Enquiry').length;
    const jobCount = data.filter(d => d.document_type === 'Job').length;
    const quotationCount = data.filter(d => d.document_type === 'Quotation').length;

    return { enquiryCount, jobCount, quotationCount, all: data };
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
        .select(`*, partners(*), vessels(*), contacts!contact_id(*), work_locations(*)`)
        .eq('id', id)
        .single();

    if (docError) {
        console.error("Error fetching document:", docError);
        return { error: docError };
    }

    const { data: items, error: itemsError } = await supabase
        .from('workflow_line_items')
        .select('*')
        .eq('document_id', id)
        .order('sort_order', { ascending: true });

    // Deduplicate items to fix legacy database repeats
    const rawItems = items || [];
    const uniqueItems = [];
    const seen = new Set();
    
    rawItems.forEach(item => {
        const desc = (item.description || '').trim();
        const details = (item.details || '').trim();
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const isSec = !!item.is_section;
        const isNote = !!item.is_note;

        const key = `${desc}|${details}|${qty}|${price}|${isSec}|${isNote}`;
        
        if (!seen.has(key)) {
            uniqueItems.push(item);
            seen.add(key);
        }
    });

    // Unnest salesperson details from delivery_verification if they exist
    if (document.delivery_verification) {
        if (document.delivery_verification.salesperson_phone) document.salesperson_phone = document.delivery_verification.salesperson_phone;
        if (document.delivery_verification.salesperson_email) document.salesperson_email = document.delivery_verification.salesperson_email;
    }

    return { data: { ...document, items: uniqueItems }, error: itemsError };
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
        'attachment_urls', 'delivery_verification', 'gdrive_folder_id', 'drive_folder_id',
        'signature_url', 'signed_by', 'is_signed'
    ];

    const sanitizedHeader = {};
    validDocKeys.forEach(key => {
        if (headerData[key] !== undefined) sanitizedHeader[key] = headerData[key];
    });

    // Nest salesperson details into delivery_verification if they exist at top level
    if (headerData.salesperson_phone || headerData.salesperson_email) {
        sanitizedHeader.delivery_verification = {
            ...(sanitizedHeader.delivery_verification || {}),
            salesperson_phone: headerData.salesperson_phone,
            salesperson_email: headerData.salesperson_email
        };
    }

    // Clean UUID fields (ensure null if empty/invalid)
    const uuidFields = [
        'company_id', 'partner_id', 'contact_id', 'vessel_id', 'work_location_id',
        'customer_po_by_id', 'original_document_id', 'enquiry_id', 'job_id'
    ];
    uuidFields.forEach(f => {
        if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        else if (!sanitizedHeader[f]) sanitizedHeader[f] = null;
    });

    // Handle ID separately: if it's empty or null for a new record, delete it so DB can generate it
    if (!sanitizedHeader.id || sanitizedHeader.id === '') {
        delete sanitizedHeader.id;
    }

    // Clean Date fields (ensure null if empty)
    const dateFields = ['issue_date', 'expiry_date', 'customer_po_date'];
    dateFields.forEach(f => {
        if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
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

        // Deduplicate items before saving
        const uniqueItems = [];
        const seen = new Set();
        
        // Filter out completely empty items that aren't sections/notes
        const itemsToProcess = lineItems.filter(it => (it.description && it.description.trim()) || it.is_section || it.is_note);

        itemsToProcess.forEach(item => {
            const desc = (item.description || '').trim();
            const details = (item.details || '').trim();
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const isSec = !!item.is_section;
            const isNote = !!item.is_note;

            const key = `${desc}|${details}|${qty}|${price}|${isSec}|${isNote}`;
            
            if (!seen.has(key)) {
                uniqueItems.push({
                    document_id: savedDoc.id,
                    item_id: item.item_id || null,
                    description: desc,
                    details: details,
                    quantity: qty,
                    unit_price: price,
                    uom: item.uom || 'UNIT(S)',
                    amount: qty * price,
                    sort_order: uniqueItems.length,
                    tax_rate: parseFloat(item.tax_rate ?? 9) || 0,
                    tax_enabled: item.tax_enabled !== false,
                    is_section: isSec,
                    is_note: isNote
                });
                seen.add(key);
            }
        });

        if (uniqueItems.length > 0) {
            const { error: itemError } = await supabase
                .from('workflow_line_items')
                .insert(uniqueItems);
            if (itemError) throw itemError;
        }
    }

    return { data: savedDoc, error: null };
};

/**
 * Upload Job Attachment to Supabase Storage
 */
export const uploadJobAttachment = async (file, companyId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `jobs/${fileName}`;

    const { data, error } = await supabase.storage
        .from('workflow-attachments')
        .upload(filePath, file);

    if (error) {
        console.error("Upload error:", error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('workflow-attachments')
        .getPublicUrl(filePath);

    return publicUrl;
};

export const deleteWorkflowDocument = async (id) => {
    const { error } = await supabase.from('workflow_documents').delete().eq('id', id);
    return { error };
};

/**
 * Helper: Map V1 Enquiry to V2 Document Header
 */
const mapEnquiryToV2Header = (enq, nextNo, targetType = 'Quotation') => ({
    company_id: enq.company_id,
    document_type: targetType,
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
export const convertEnquiryToV2Document = async (enquiryId, targetType = 'Quotation') => {
    // 1. Fetch the V1 Enquiry
    const { data: enq, error: enqError } = await supabase
        .from('customer_enquiries')
        .select('*')
        .eq('id', enquiryId)
        .single();
    if (enqError) throw enqError;

    // 2. Generate Next Number for Target Type
    const nextNo = await generateDocNumber(enq.company_id, targetType);

    // 3. Prepare Header
    const docData = mapEnquiryToV2Header(enq, nextNo, targetType);

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
        status: 'Draft',
        is_job: false,
        assigned_job_no: null,
        customer_po_no: null,
        customer_po_date: null,
        customer_po_by_id: null,
        customer_po_attachment_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    return await saveWorkflowDocument(newDocData, items);
};

/**
 * Duplicate a Document (Creates a brand new copy with a new number)
 */
export const duplicateWorkflowDocument = async (docId) => {
    const { data: original, error: fetchErr } = await getWorkflowDocumentById(docId);
    if (fetchErr) throw fetchErr;

    const { items, id, created_at, updated_at, original_document_id, revision_no, document_no, ...cleanHeader } = original;

    // Generate new Document Number
    const newNo = await generateDocNumber(original.company_id, original.document_type);

    const newDocData = {
        ...cleanHeader,
        document_no: newNo,
        status: 'Draft', // Reset status for the duplicated document
        is_job: false,
        assigned_job_no: null,
        customer_po_no: null,
        customer_po_date: null,
        customer_po_by_id: null,
        customer_po_attachment_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Clean up items for the new document (remove old IDs)
    const cleanItems = items.map(item => {
        const { id, document_id, created_at, ...cleanItem } = item;
        return cleanItem;
    });

    return await saveWorkflowDocument(newDocData, cleanItems);
};

/**
 * Convert Quotation to Active Job (v3)
 */
/**
 * Convert Quotation to Active Job (v3)
 * Automatically creates: ORA, DO, PRO, INV, PKL, and optionally CERT/SR
 */
export const convertQuotationToJob = async (quotationId, poData, options = {}) => {
    // 1. Fetch source quotation with items
    const { data: qtn, error: qtnErr } = await getWorkflowDocumentById(quotationId);
    if (qtnErr) throw qtnErr;
    if (qtn.is_job) throw new Error("This quotation has already been converted to a job.");

    // 2. Find Next Available Suite Number (Ensure all prefixes are free)
    let baseJobNo = await generateDocNumber(qtn.company_id, 'Job');
    let seqPart = baseJobNo.split('-').slice(1).join('-'); // YYMM-XXXX
    
    const prefixes = ['CEL', 'ORA', 'DO', 'PRO', 'INV', 'PKL', 'CERT', 'SR'];
    let attempts = 0;
    while (attempts < 20) {
        const targetNos = prefixes.map(p => `${p}-${seqPart}`);
        const { data: existing } = await supabase
            .from('workflow_documents')
            .select('document_no')
            .in('document_no', targetNos);
            
        if (!existing || existing.length === 0) break;
        
        // If any taken, increment the number part
        const parts = seqPart.split('-');
        const yyMM = parts[0];
        const num = parseInt(parts[1]);
        seqPart = `${yyMM}-${padZero(num + 1, 4)}`;
        attempts++;
    }
    
    const jobNo = `CEL-${seqPart}`;

    // 3. Update Original Quotation
    const qtnUpdate = {
        ...qtn,
        is_job: true,
        assigned_job_no: jobNo,
        status: 'Confirmed',
        customer_po_no: poData.po_no,
        customer_po_date: poData.po_date,
        customer_po_by_id: poData.contact_id || qtn.contact_id,
        customer_po_attachment_url: poData.attachment_url,
        delivery_verification: {
            ...(qtn.delivery_verification || {}),
            po_description: poData.po_description,
            po_value: poData.po_value
        }
    };
    await saveWorkflowDocument(qtnUpdate, qtn.items);

    // 4. Batch Generate Associated Documents
    const docTypes = [
        { type: 'Job', prefix: 'CEL' }, // Master Job Record
        { type: 'Order Acknowledgment', prefix: 'ORA' }, 
        { type: 'Delivery Order', prefix: 'DO' },
        { type: 'Proforma Invoice', prefix: 'PRO' },
        { type: 'Tax Invoice', prefix: 'INV' },
        { type: 'Packing List', prefix: 'PKL' }
    ];

    if (options.includeCertificates) docTypes.push({ type: 'Certificate', prefix: 'CERT' });
    if (options.includeServiceReport) docTypes.push({ type: 'Service Report', prefix: 'SR' });

    for (const doc of docTypes) {
        const packageDetailsTemplate = `
            <p><strong>Package Details</strong></p>
            <ul>
                <li>Size of the Package : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; mm (L) x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; mm (B) x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; mm (H)</li>
                <li>Weight of the Package : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Kgs</li>
                <li>Origin of spares : Singapore</li>
                <li>Total No. of Packages: </li>
                <li>Package Type (Carton / Wooden Crate / Pallet / Drum): </li>
                <li>Package Qty: </li>
                <li>Description of Contents: </li>
            </ul>
        `;

        const newDocData = {
            ...qtn,
            id: undefined, // Force insert
            document_type: doc.type,
            document_no: `${doc.prefix}-${seqPart}`,
            assigned_job_no: jobNo,
            is_job: true,
            status: 'Draft',
            issue_date: new Date().toISOString().split('T')[0],
            customer_po_no: poData.po_no,
            customer_po_date: poData.po_date,
            customer_po_by_id: poData.contact_id || qtn.contact_id,
            notes: (doc.type === 'Delivery Order' || doc.type === 'Packing List') ? packageDetailsTemplate : qtn.notes,
            delivery_verification: qtnUpdate.delivery_verification
        };
        
        await saveWorkflowDocument(newDocData, qtn.items);
    }

    return { jobNo };
};

/**
 * Revert a Job back to a Quotation
 * Clears job status and unlinks associated documents
 */
export const revertJobToQuotation = async (jobNo) => {
    // 1. Find all documents associated with this job number
    const { data: docs, error: fetchErr } = await supabase
        .from('workflow_documents')
        .select('id, document_type, document_no')
        .eq('assigned_job_no', jobNo);
    
    if (fetchErr) throw fetchErr;

    // 2. Identify the original Quotation and the derived documents
    const quotation = docs.find(d => (d.document_no || '').startsWith('QTN'));
    const derivedIds = docs.filter(d => !(d.document_no || '').startsWith('QTN')).map(d => d.id);

    // 3. Reset the Quotation
    if (quotation) {
        await supabase
            .from('workflow_documents')
            .update({
                is_job: false,
                assigned_job_no: null,
                status: 'Draft',
                customer_po_no: null,
                customer_po_date: null,
                customer_po_by_id: null
            })
            .eq('id', quotation.id);
    }

    // 4. Delete derived documents (ORA, DO, INV, etc.)
    if (derivedIds.length > 0) {
        // First delete their items
        await supabase.from('workflow_line_items').delete().in('document_id', derivedIds);
        // Then delete the documents
        await supabase.from('workflow_documents').delete().in('id', derivedIds);
    }

    return { success: true };
};

/**
 * GDrive Folder Mapping Logic (v3)
 */
export const getGDriveFolderIdForStage = (stage) => {
    // This mapping aligns with driveService.provisionFullProjectStructure
    switch (stage) {
        case 'Enquiry': return '1. Enquiries & Quotations';
        case 'Quotation': return '1. Enquiries & Quotations';
        case 'Order Acknowledgment': return '1. Enquiries & Quotations';
        case 'Purchase Order': return '2. Supplier Bids & POs';
        case 'Delivery Order': return '3. Operations & Logistics';
        case 'Packing List': return '3. Operations & Logistics';
        case 'Service Report': return '3. Operations & Logistics';
        case 'Certificate': return '3. Operations & Logistics';
        case 'Proforma Invoice': return '4. Finance & Invoices';
        case 'Tax Invoice': return '4. Finance & Invoices';
        case 'Statement of Account': return '4. Finance & Invoices';
        case 'Payment Received': return '5. Expenses & Payments';
        case 'Signed Proof': return '6. Completed Proof of Delivery / Signed Reports';
        default: return '7. Correspondence & Admin';
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

/**
 * Convert Proforma Invoice to Tax Invoice
 */
export const convertProformaToTaxInvoice = async (proformaId) => {
    // 1. Fetch source proforma with items
    const { data: pro, error: proErr } = await getWorkflowDocumentById(proformaId);
    if (proErr) throw proErr;

    // 2. Generate Next Tax Invoice Number
    const invNo = await generateDocNumber(pro.company_id, 'Tax Invoice');

    // 3. Prepare New Tax Invoice Header
    const { id, created_at, updated_at, document_no, document_type, ...cleanHeader } = pro;
    const newInvData = {
        ...cleanHeader,
        document_type: 'Tax Invoice',
        document_no: invNo,
        status: 'Draft',
        issue_date: new Date().toISOString().split('T')[0]
    };

    // 4. Save New Document
    const { data: savedInv, error: saveError } = await saveWorkflowDocument(newInvData, pro.items);
    if (saveError) throw saveError;

    return savedInv;
};


