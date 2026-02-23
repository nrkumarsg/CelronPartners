import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL) || 'http://placeholder.url'
const supabaseAnonKey = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY) || 'placeholderKey'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageOptions: {}, // Can optionally clear this if needed
    },
    global: {
        headers: { 'x-my-custom-header': 'celronhub' }
    }
})
