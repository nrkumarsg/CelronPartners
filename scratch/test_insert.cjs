const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dfoihdzpgkrtyerzzchm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb2loZHpwZ2tydHllcnp6Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMxMTgsImV4cCI6MjA4NzE0OTExOH0.9FGN21KeUpS0UyyFJJ1YjXLElL4AF6ym_hKAJsr_ek4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function tryInsert() {
    const vessel = {
        vessel_name: 'TEST VESSEL',
        imo_number: '1234567',
        mmsi: '123456789',
        vessel_type: 'CARGO',
        vessel_management: 'TEST MGMT',
        vessel_owner: 'TEST OWNER',
        company_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        flag: 'TEST',
        built_year: '2020',
        deadweight: '10000'
    };

    console.log('Trying insert with extra fields...');
    const res1 = await supabase.from('vessels').insert([vessel]);
    console.log('Result 1 (Extra fields):', res1.error?.message || 'Success');

    console.log('\nTrying insert with valid fields...');
    const { flag, built_year, deadweight, ...validVessel } = vessel;
    const res2 = await supabase.from('vessels').insert([validVessel]);
    console.log('Result 2 (Valid fields):', res2.error?.message || 'Success');
}

tryInsert();
