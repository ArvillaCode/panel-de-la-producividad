import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { agents } from '../src/data/agents.js';

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;

  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
    }
  }
}

loadEnvFile('.env.local');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = process.env.UPLOAD_SCRIPT_ADMIN_EMAIL;
const adminPassword = process.env.UPLOAD_SCRIPT_ADMIN_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Define UPLOAD_SCRIPT_ADMIN_EMAIL y UPLOAD_SCRIPT_ADMIN_PASSWORD en .env.local');
  console.error('Usa una cuenta admin real de Supabase (nunca subas esas credenciales a Git).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadAgents() {
  console.log('🚀 Iniciando subida de agentes a Supabase...');

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (authError) {
    console.error('❌ No se pudo iniciar sesión como admin:', authError.message);
    process.exit(1);
  }

  console.log('🔓 Sesión iniciada. Subiendo datos...');

  const { data: existingData } = await supabase.from('agents').select('id');
  if (existingData && existingData.length > 0) {
    console.log(`⚠️ Se encontraron ${existingData.length} agentes. No se insertan duplicados.`);
    return;
  }

  for (const agent of agents) {
    const { error } = await supabase.from('agents').insert({
      id: agent.id,
      name: agent.name,
      specialty: agent.specialty,
      description: agent.description,
      avatar: agent.avatar,
      category: agent.category,
      chatLink: agent.chatLink,
      visible: agent.visible ?? true
    });

    if (error) {
      console.error(`❌ Error subiendo ${agent.name}:`, error.message);
    } else {
      console.log(`✅ Agente subido: ${agent.name}`);
    }
  }

  console.log('🎉 Migración completada.');
}

uploadAgents();
