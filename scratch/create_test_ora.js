import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function createTestORA() {
    const partnerId = '3536e2e4-af83-4899-8f52-03a72a2852df';
    const companyId = '777c570b-46a4-4f2b-88a2-25b827727110'; // Standard demo company ID
    
    const docData = {
        company_id: companyId,
        document_type: 'Order Acknowledgment',
        document_no: 'ORA-2604-0001',
        partner_id: partnerId,
        subject: 'Order Acknowledgment for Spares',
        status: 'Draft',
        currency: 'SGD',
        subtotal: 1000,
        tax_amount: 90,
        total_amount: 1090,
        issue_date: new Date().toISOString().split('T')[0]
    };

    const { data: doc, error: docError } = await supabase.from('workflow_documents').insert([docData]).select().single();
    if (docError) {
        console.error('Doc Error:', docError.message);
        return;
    }
    console.log(`Created ORA: ${doc.id}`);

    const itemData = {
        document_id: doc.id,
        description: 'MARINE SPARE PARTS - ENGINE OVERHAUL KIT',
        details: 'Genuine Parts for Model XYZ',
        quantity: 1,
        unit_price: 1000,
        amount: 1000,
        tax_rate: 9,
        uom: 'SET',
        sort_order: 0
    };

    const { error: itemError } = await supabase.from('workflow_line_items').insert([itemData]);
    if (itemError) {
        console.error('Item Error:', itemError.message);
        return;
    }
    console.log('Added line item.');
}

createTestORA();
