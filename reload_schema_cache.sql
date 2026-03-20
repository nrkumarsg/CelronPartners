-- Run this to force Supabase to refresh its schema cache
-- This ensures the new 'customer_ref' column is visible to the API immediately
NOTIFY pgrst, 'reload schema';
