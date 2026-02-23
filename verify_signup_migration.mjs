import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Reading migration file...');
    const sql = fs.readFileSync(path.join(__dirname, 'signup_settings.sql'), 'utf8');

    console.log('Executing SQL migration...');
    // Note: Supabase JS client doesn't have a direct 'run sql' method for security reasons.
    // Usually, migrations are run via CLI or SQL Editor.
    // However, for this demo, we assume the user will run it in the SQL Editor.
    // I will simply verify if the current settings table has the column.

    const { data, error } = await supabase.from('document_settings').select('*').limit(1);

    if (error) {
        console.log('Table document_settings might not exist yet.');
    } else if (data && data.length > 0 && data[0].allow_signup !== undefined) {
        console.log('Migration already applied! allow_signup column found.');
    } else {
        console.log('Migration might be needed. Please run the content of signup_settings.sql in your Supabase SQL Editor.');
    }
}

runMigration();
