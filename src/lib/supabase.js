import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL) || 'http://placeholder.url'
const supabaseAnonKey = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY) || 'placeholderKey'

console.log('Supabase config:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageOptions: {},
        lockManagerType: 'ls',
    },
    global: {
        headers: { 'x-my-custom-header': 'celronhub' }
    }
})
