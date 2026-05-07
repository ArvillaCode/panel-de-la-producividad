import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
  console.log("Comprobando tabla 'profiles'...");
  const { data, error } = await supabase.from('profiles').select('*');
  
  if (error) {
    console.error("Error al consultar 'profiles':", error);
    if (error.code === 'PGRST116') {
        console.log("Parece que la tabla no tiene datos o hay un problema de permisos.");
    }
  } else {
    console.log(`Tabla 'profiles' encontrada. Filas: ${data.length}`);
    if (data.length > 0) {
        console.log("Primeros usuarios:", data.slice(0, 5));
    }
  }

  console.log("\nComprobando tabla 'agents'...");
  const { data: agents, error: agentsError } = await supabase.from('agents').select('*');
  if (agentsError) {
    console.error("Error al consultar 'agents':", agentsError);
  } else {
    console.log(`Tabla 'agents' encontrada. Filas: ${agents.length}`);
  }
}

checkProfiles();
