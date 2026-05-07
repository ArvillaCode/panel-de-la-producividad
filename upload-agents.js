import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { agents } from './src/data/agents.js';

// Leer credenciales de .env.local manualmente
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envUrlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const envKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = envUrlMatch ? envUrlMatch[1].trim() : null;
const supabaseAnonKey = envKeyMatch ? envKeyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("No se encontraron las credenciales en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadAgents() {
  console.log('🚀 Iniciando subida de 50 agentes a Supabase...');
  
  // Iniciar sesión para poder insertar datos (pasar las políticas RLS)
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'admin123'
  });

  if (authError) {
    console.error('❌ No se pudo iniciar sesión como admin. Revisa el correo/contraseña.', authError.message);
    return;
  }
  
  console.log('🔓 Sesión iniciada con éxito. Subiendo datos...');

  // Limpiar la tabla antes de insertar por si se corre múltiples veces
  // Primero revisamos si hay datos
  const { data: existingData } = await supabase.from('agents').select('id');
  if (existingData && existingData.length > 0) {
    console.log(`⚠️ Se encontraron ${existingData.length} agentes. No los subiremos de nuevo para evitar duplicados.`);
    return;
  }

  for (const agent of agents) {
    const { error } = await supabase.from('agents').insert({
      id: agent.id, // Mantenemos los IDs para que las URL sigan funcionando
      name: agent.name,
      specialty: agent.specialty,
      description: agent.description,
      avatar: agent.avatar,
      category: agent.category,
      chatLink: agent.chatLink,
      visible: agent.visible ?? true
    });

    if (error) {
      console.error(`❌ Error subiendo el agente ${agent.name}:`, error.message);
    } else {
      console.log(`✅ Agente subido: ${agent.name}`);
    }
  }
  console.log('🎉 ¡Migración de agentes completada exitosamente!');
}

uploadAgents();
