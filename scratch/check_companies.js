
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCompanies() {
    console.log("Fetching companies...");
    const { data, error } = await supabase
        .from('companies')
        .select('*');

    if (error) {
        console.error("Error fetching companies:", error);
    } else {
        console.log(`Found ${data.length} companies.`);
        data.forEach(c => {
            console.log(`- ${c.name} (ID: ${c.id})`);
        });
    }
}

checkCompanies();
