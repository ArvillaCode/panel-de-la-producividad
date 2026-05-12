const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function announceUpdate() {
  try {
    // Obtener el último commit message
    const commitMsg = execSync('git log -1 --pretty=%B').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    
    console.log(`[GIT-BOT] Detectado push en ${branch}: ${commitMsg}`);

    // Solo procesar si no es un commit de sistema
    if (commitMsg.includes('[SISTEMA]') || commitMsg.includes('Merge')) return;

    // Obtener la última versión para sugerir la siguiente
    const { data: lastReleases } = await supabase
      .from('release_notes')
      .select('version')
      .order('publish_date', { ascending: false })
      .limit(1);

    const lastVersion = lastReleases?.[0]?.version || '2.5.0';
    const parts = lastVersion.split('.');
    parts[parts.length - 1] = parseInt(parts[parts.length - 1]) + 1;
    const nextVersion = parts.join('.');

    // Guardar en pendientes (status: pending)
    const { error } = await supabase
      .from('release_notes')
      .insert([{
        version: nextVersion,
        title: `Actualización desde Git: ${commitMsg.split('\n')[0]}`,
        content: `Cambios automáticos detectados:\n${commitMsg}`,
        status: 'pending',
        type: 'feature',
        publish_date: new Date().toISOString()
      }]);

    if (error) throw error;
    console.log(`✅ Novedad guardada como pendiente (v${nextVersion})`);
    
  } catch (err) {
    console.error('❌ Error al anunciar actualización:', err.message);
  }
}

announceUpdate();
