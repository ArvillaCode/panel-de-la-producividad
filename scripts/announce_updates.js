import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

// 1. Obtener credenciales de .env.local
let supabaseUrl, supabaseKey;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
  }
} catch (e) {
  console.error('❌ No se pudo leer .env.local');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function announceUpdates() {
  console.log('🔍 Analizando cambios en Git...');
  
  try {
    // 2. Obtener los últimos 5 mensajes de commit
    const commits = execSync('git log -n 5 --pretty=format:"%s"')
      .toString()
      .split('\n')
      .filter(msg => msg.trim() !== '' && !msg.includes('Merge branch'));

    if (commits.length === 0) {
      console.log('⚠️ No se encontraron cambios recientes.');
      return;
    }

    // 3. Obtener la última versión para autoincrementar
    const { data: latestRelease } = await supabase
      .from('release_notes')
      .select('version')
      .order('publish_date', { ascending: false })
      .limit(1);

    let nextVersion = '1.0.0';
    if (latestRelease && latestRelease[0]) {
      const parts = latestRelease[0].version.replace('v', '').split('.');
      parts[2] = parseInt(parts[2]) + 1;
      nextVersion = parts.join('.');
    }

    const newRelease = {
      version: nextVersion,
      title: `Actualización del Sistema - ${new Date().toLocaleDateString()}`,
      description: 'Nuevas mejoras y correcciones implementadas en el panel.',
      changes: commits.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      type: 'improvement',
      is_visible: false, // Pendiente de aprobación
      is_important: false,
      publish_date: new Date().toISOString()
    };

    console.log(`🚀 Generando novedad v${nextVersion} (Pendiente de aprobación)...`);
    
    const { error } = await supabase
      .from('release_notes')
      .insert([newRelease]);

    if (error) throw error;

    console.log('✅ Novedad generada con éxito. Puedes verla en el panel admin para aprobarla.');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

announceUpdates();
