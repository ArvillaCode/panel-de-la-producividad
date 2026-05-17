import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listProfiles() {
  console.log("--- PROFILES LIST ---");
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching profiles:", error.message);
  } else {
    console.log(`Found ${data.length} profiles:`);
    data.forEach(p => {
      console.log(`ID: ${p.id} | Email: ${p.email} | Name: ${p.name} | Role: ${p.role} | Status: ${p.status} | Approved: ${p.is_approved}`);
    });
  }
}

listProfiles();
