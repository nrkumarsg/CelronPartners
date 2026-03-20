import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function migrate() {
    console.log('Running Workflow V2 Database Migration...');

    const sql = `
      -- 1. Complete Jobs Table Alignment
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS po_ref TEXT,
      ADD COLUMN IF NOT EXISTS po_date DATE,
      ADD COLUMN IF NOT EXISTS po_amount NUMERIC,
      ADD COLUMN IF NOT EXISTS po_by_contact_id UUID REFERENCES contacts(id),
      ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid',
      ADD COLUMN IF NOT EXISTS payment_details TEXT,
      ADD COLUMN IF NOT EXISTS po_attachment_url TEXT;

      -- 2. Complete Purchase Orders (Expenses) Table Alignment
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS supplier_name TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS amount NUMERIC,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Unpaid',
      ADD COLUMN IF NOT EXISTS attachment_note TEXT,
      ADD COLUMN IF NOT EXISTS attachment_url TEXT;

      -- 3. Enquiry Folder Support
      ALTER TABLE customer_enquiries
      ADD COLUMN IF NOT EXISTS gdrive_folder_id TEXT;
    `;

    console.log('Attempting to execute SQL via exec_sql RPC...');
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (sqlError) {
        console.error('Failed to run migration via RPC:', sqlError.message);
        console.log('PLEASE RUN THE FOLLOWING SQL MANUALLY IN SUPABASE DASHBOARD:');
        console.log(sql);
    } else {
        console.log('Migration completed successfully!');
    }
}

migrate();
