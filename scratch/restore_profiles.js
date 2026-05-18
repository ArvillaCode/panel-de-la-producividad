import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://krtthtzljlyewlngaklo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtydHRodHpsamx5ZXdsbmdha2xvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEwOTMyMywiZXhwIjoyMDkzNjg1MzIzfQ.X1-WWW80SmdJEorwNvSWwANE5G4UpksA-ik7AuY837g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function restoreProfiles() {
  console.log('--- INICIANDO RECUPERACIÓN DE PERFILES ---');
  
  // 1. Obtener todos los usuarios de Supabase Auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error al obtener lista de usuarios de Auth:', listError);
    return;
  }
  
  console.log(`Se encontraron ${users.length} usuarios en Supabase Auth.`);
  
  // 2. Restaurar perfiles uno a uno
  for (const user of users) {
    const metadata = user.user_metadata || {};
    
    // Determinar rol correcto
    let role = metadata.role || 'user';
    let emailLower = user.email.toLowerCase();
    
    // Andrés y Gabriel e emails que contengan admin se catalogan como administradores
    if (emailLower.includes('admin') || emailLower.includes('andres') || emailLower.includes('gabriel')) {
      role = 'admin';
    }
    
    console.log(`Procesando usuario: ${user.email} | ID: ${user.id} | Rol Determinado: ${role}`);
    
    const profileData = {
      id: user.id,
      email: user.email,
      name: metadata.name || user.email.split('@')[0],
      role: role,
      avatar_url: metadata.avatar_url || '',
      status: 'active',
      is_approved: true,
      timezone: metadata.timezone || 'UTC',
      start_date: metadata.start_date || new Date().toISOString(),
      end_date: metadata.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Upsert para recrear el perfil borrado o actualizar a activo
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });
      
    if (upsertError) {
      console.error(`Error al restaurar perfil para ${user.email}:`, upsertError.message);
    } else {
      console.log(`✅ Perfil restaurado exitosamente para ${user.email} con rol [${role}]`);
    }
  }
  
  console.log('--- RECUPERACIÓN COMPLETADA CON ÉXITO ---');
}

restoreProfiles().catch(console.error);
