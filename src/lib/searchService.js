import { supabase } from './supabase';

/**
 * Universal Search Service
 * Searches across Supabase tables and Google Drive.
 */

export const searchInternal = async (query, companyId) => {
    if (!query || query.length < 2) return { results: [], error: null };

    try {
        const searchTerm = `%${query}%`;

        // Parallel search across multiple tables
        const [jobs, enquiries, partners, catalog, notes, wallMessages] = await Promise.all([
            // 1. Jobs
            supabase.from('jobs')
                .select('id, job_no, description')
                .eq('company_id', companyId)
                .or(`job_no.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5),
            
            // 2. Enquiries
            supabase.from('customer_enquiries')
                .select('id, enquiry_no, subject')
                .eq('company_id', companyId)
                .or(`enquiry_no.ilike.${searchTerm},subject.ilike.${searchTerm}`)
                .limit(5),

            // 3. Partners
            supabase.from('partners')
                .select('id, name, email')
                .eq('company_id', companyId)
                .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
                .limit(5),

            // 4. Catalog
            supabase.from('catalog_items')
                .select('id, name, specification, barcode')
                .eq('company_id', companyId)
                .or(`name.ilike.${searchTerm},specification.ilike.${searchTerm},barcode.ilike.${searchTerm}`)
                .limit(5),

            // 5. Personal Notes
            supabase.from('notes')
                .select('id, title, content')
                .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
                .limit(5),

            // 6. Communication Wall (Documents table)
            supabase.from('documents')
                .select('id, name, reference_type, reference_id')
                .eq('company_id', companyId)
                .ilike('name', searchTerm)
                .limit(5)
        ]);

        const results = [
            ...(jobs.data || []).map(item => ({ ...item, type: 'Job', label: item.job_no, sublabel: item.description, link: `/workflows/jobs/${item.id}` })),
            ...(enquiries.data || []).map(item => ({ ...item, type: 'Enquiry', label: item.enquiry_no, sublabel: item.subject, link: `/workflows/enquiries/${item.id}` })),
            ...(partners.data || []).map(item => ({ ...item, type: 'Partner', label: item.name, sublabel: item.email, link: `/partners/${item.id}` })),
            ...(catalog.data || []).map(item => ({ ...item, type: 'Catalog', label: item.name, sublabel: item.specification || item.barcode, link: `/catalog/${item.id}` })),
            ...(notes.data || []).map(item => ({ ...item, type: 'Note', label: item.title, sublabel: item.content?.substring(0, 50), link: `/notes` })), // Link to notes list for now
            ...(wallMessages.data || []).map(item => ({ ...item, type: 'Wall Activity', label: item.name, sublabel: `${item.reference_type} Activity`, link: item.reference_type === 'Job' ? `/workflows/jobs/${item.reference_id}` : `/workflows/enquiries/${item.reference_id}` }))
        ];

        return { results, error: null };
    } catch (error) {
        console.error('Universal Search Error:', error);
        return { results: [], error };
    }
};

/**
 * Searches Google Drive files for the current company.
 */
export const searchDrive = async (query, accessToken) => {
    if (!query || !accessToken) return [];

    try {
        // We search files where the name matches and it's within our root or subfolders
        // For simplicity, we search all files accessible to the token that match the name
        // but we filter them or rank them by relevance to CELRON if possible in the UI.
        const q = `name contains '${query}' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name, webViewLink, mimeType, iconLink)&pageSize=10`;

        const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await resp.json();

        return (data.files || []).map(file => ({
            id: file.id,
            type: 'File',
            label: file.name,
            sublabel: file.mimeType.split('/').pop().toUpperCase(),
            link: file.webViewLink,
            icon: file.iconLink,
            isExternal: true
        }));
    } catch (error) {
        console.error('Drive Search Error:', error);
        return [];
    }
};
