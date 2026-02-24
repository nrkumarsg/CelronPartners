import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBuckets() {
    console.log('Checking Supabase Storage buckets...');
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    console.log('Found buckets:', data.map(b => b.name));

    const bucketName = 'company_assets';
    const exists = data.find(b => b.name === bucketName);

    if (!exists) {
        console.log(`Bucket "${bucketName}" does not exist. Attempting to create it...`);
        const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'],
            fileSizeLimit: 5242880 // 5MB
        });

        if (createError) {
            console.error(`Failed to create bucket "${bucketName}":`, createError);
            console.log('\n--- Manual Fix ---');
            console.log(`Please run the following SQL in your Supabase SQL Editor:`);
            console.log(`
INSERT INTO storage.buckets (id, name, public) 
VALUES ('${bucketName}', '${bucketName}', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = '${bucketName}');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${bucketName}');
            `);
        } else {
            console.log(`Successfully created bucket "${bucketName}"!`);
        }
    } else {
        console.log(`Bucket "${bucketName}" already exists.`);
        if (!exists.public) {
            console.log(`Warning: Bucket "${bucketName}" is NOT public. Updating...`);
            await supabase.storage.updateBucket(bucketName, { public: true });
        }
    }
}

checkBuckets();
