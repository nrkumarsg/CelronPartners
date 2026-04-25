import '../server/loadEnv.js';
import { supabase } from '../src/lib/supabase.js';

async function setupStorage() {
    console.log("Checking storage buckets...");
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
        console.error("Error listing buckets:", error);
        return;
    }

    const bucketName = 'workflow-attachments';
    const exists = buckets.find(b => b.name === bucketName);

    if (!exists) {
        console.log(`Creating bucket: ${bucketName}`);
        const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800 // 50MB
        });
        if (createError) {
            console.error("Error creating bucket:", createError);
        } else {
            console.log("Bucket created successfully.");
        }
    } else {
        console.log(`Bucket ${bucketName} already exists.`);
    }
}

setupStorage();
