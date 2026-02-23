import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkPolicies() {
    console.log('--- Final Verification of Module Saves ---');

    // 1. Test Partners
    console.log('Testing insert into partners...');
    const { error: pErr, data: pData } = await supabase.from('partners').insert([{ name: 'Verification Partner' }]).select();
    if (pErr) console.log(`  Partners Failed: ${pErr.message}`);
    else console.log(`  Partners Success! ID: ${pData[0].id}`);

    // 2. Test Vessels
    console.log('Testing insert into vessels...');
    const { error: vErr, data: vData } = await supabase.from('vessels').insert([{ vessel_name: 'Verification Vessel', imo_number: '1234567' }]).select();
    if (vErr) console.log(`  Vessels Failed: ${vErr.message}`);
    else console.log(`  Vessels Success! ID: ${vData[0].id}`);

    // 3. Test Work Locations
    console.log('Testing insert into work_locations...');
    const { error: wErr, data: wData } = await supabase.from('work_locations').insert([{ location_name: 'Verification Dock' }]).select();
    if (wErr) console.log(`  Work Locations Failed: ${wErr.message}`);
    else console.log(`  Work Locations Success! ID: ${wData[0].id}`);

    // 4. Test Todos (should fail if not authenticated, or succeed if policy allows NULL user_id)
    console.log('Testing insert into todos (anonymous)...');
    const { error: tErr, data: tData } = await supabase.from('todos').insert([{ title: 'Anonymous Test Task' }]).select();
    if (tErr) console.log(`  Todos Failed: ${tErr.message} (Expected if personal)`);
    else console.log(`  Todos Success! ID: ${tData[0].id}`);

    // Cleanup - Delete test rows
    if (pData) await supabase.from('partners').delete().eq('id', pData[0].id);
    if (vData) await supabase.from('vessels').delete().eq('id', vData[0].id);
    if (wData) await supabase.from('work_locations').delete().eq('id', wData[0].id);
    if (tData) await supabase.from('todos').delete().eq('id', tData[0].id);
}

checkPolicies();
