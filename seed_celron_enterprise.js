import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
// Using Service Role Key if available to bypass RLS, otherwise Anon Key might fail on insert if RLS blocks it.
// Let's check if there is a SERVICE_ROLE_KEY or something in .env
// We'll use the anon key for now, and hope RLS allows it or we will fetch it.
const supabase = createClient(url, key);

async function seedCompany() {
    console.log('--- Seeding CEL-RON ENTERPRISES PTE LTD ---');
    
    // 1. Insert Company
    const { data: company, error: insertErr } = await supabase
        .from('companies')
        .upsert([{ 
            id: '8431cd0b-7449-44a5-8213-2a8680d09ebe', // Standard ID used in fallback
            name: 'CEL-RON ENTERPRISES PTE LTD', 
            slug: 'celron-enterprises',
            logo_url: '/logo.png'
        }], { onConflict: 'id' })
        .select()
        .single();
        
    if (insertErr) {
        console.error('Error inserting company:', insertErr.message);
        // If RLS blocked upsert, let's just try to update it using a backend bypass if possible.
    } else {
        console.log('Successfully inserted/updated company:', company.name);
    }
    
    // 2. Assign User
    const { data: users, error: userErr } = await supabase.from('profiles').select('id, email').eq('email', 'nrkumarsg@gmail.com');
    if (userErr) {
        console.error('Error finding user:', userErr.message);
    } else if (users && users.length > 0) {
        const userId = users[0].id;
        
        // Update profile
        await supabase.from('profiles').update({ company_id: '8431cd0b-7449-44a5-8213-2a8680d09ebe', role: 'superadmin' }).eq('id', userId);
        
        // Insert into company_users
        const { error: cuErr } = await supabase.from('company_users').upsert([{
            company_id: '8431cd0b-7449-44a5-8213-2a8680d09ebe',
            user_id: userId,
            role: 'admin'
        }], { onConflict: 'company_id,user_id' });
        
        if (cuErr) {
            console.error('Error linking user to company:', cuErr.message);
        } else {
            console.log('Successfully linked nrkumarsg@gmail.com to the company.');
        }
    } else {
        console.log('User nrkumarsg@gmail.com not found in profiles.');
    }
}

seedCompany();
