import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const result = {
    columns: [],
    rels: {}
  };

  const { data, error } = await supabase.from('customer_enquiries').select('*').limit(1);
  if (data && data.length > 0) {
    result.columns = Object.keys(data[0]);
  } else if (error) {
    result.error = error.message;
  }

  const rels = ['partners', 'vessels', 'work_locations'];
  for (const rel of rels) {
    const { error: relError } = await supabase.from('customer_enquiries').select(`id, ${rel}(*)`).limit(1);
    result.rels[rel] = relError ? 'FAIL: ' + relError.message : 'SUCCESS';
  }

  fs.writeFileSync('schema_result.json', JSON.stringify(result, null, 2));
  console.log("Done. Results in schema_result.json");
}
checkSchema();
