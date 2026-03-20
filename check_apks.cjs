
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApks() {
    const { data, error } = await supabase
        .from('application_apks')
        .select('*');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('DATA_START');
    console.log(JSON.stringify(data, null, 2));
    console.log('DATA_END');
}

checkApks();
