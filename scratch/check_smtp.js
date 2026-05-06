
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSmtpSettings() {
    console.log('Checking SMTP Settings...');
    const { data, error } = await supabase
        .from('document_settings')
        .select('company_id, sales_email, sales_password, accounts_email, accounts_password, smtp_host, smtp_port');

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No document settings found.');
        return;
    }

    data.forEach(s => {
        console.log(`\n--- Company: ${s.company_id} ---`);
        console.log(`Sales Email: ${s.sales_email || 'NOT SET'}`);
        console.log(`Sales Password: ${s.sales_password ? 'SET (Masked)' : 'NOT SET'}`);
        console.log(`Accounts Email: ${s.accounts_email || 'NOT SET'}`);
        console.log(`Accounts Password: ${s.accounts_password ? 'SET (Masked)' : 'NOT SET'}`);
        console.log(`SMTP Host: ${s.smtp_host || 'NOT SET (Default: smtp.zoho.com)'}`);
        console.log(`SMTP Port: ${s.smtp_port || 'NOT SET (Default: 465)'}`);
    });
}

checkSmtpSettings();
