import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.join('=').trim();
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function promoteAdmin() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    console.error('ADMIN_EMAIL environment variable is required');
    process.exit(1);
  }
  
  const { data: users, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email);
    
  if (fetchError) {
    console.error('Error fetching:', fetchError);
    process.exit(1);
  }
  
  if (!users || users.length === 0) {
    console.error('User not found.');
    process.exit(1);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      role: 'core_admin',
      is_approved: true,
      status: 'active'
    })
    .eq('email', email);
    
  if (updateError) {
    console.error('Error updating:', updateError);
    process.exit(1);
  } else {
    console.log('User promoted to core_admin successfully!');
    process.exit(0);
  }
}

promoteAdmin();
