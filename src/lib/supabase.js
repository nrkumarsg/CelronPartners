import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://placeholder.url'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholderKey'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
