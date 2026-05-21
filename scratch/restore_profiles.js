import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable requerida: ${name}`);
  }
  return value;
};

const SUPABASE_URL = required('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY');
const RESTORE_ADMIN_EMAILS = new Set(
  (process.env.RESTORE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function restoreProfiles() {
  console.log('--- INICIANDO RECUPERACION DE PERFILES ---');

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  console.log(`Se encontraron ${users.length} usuarios en Supabase Auth.`);

  for (const user of users) {
    const metadata = user.user_metadata || {};
    const email = user.email || '';
    const emailLower = email.toLowerCase();
    const isAdmin = RESTORE_ADMIN_EMAILS.has(emailLower);

    const profileData = {
      id: user.id,
      email,
      name: metadata.name || email.split('@')[0] || 'Usuario',
      role: isAdmin ? 'admin' : 'user',
      avatar_url: metadata.avatar_url || '',
      status: isAdmin ? 'active' : 'pending',
      is_approved: isAdmin,
      timezone: metadata.timezone || 'UTC',
      start_date: isAdmin ? new Date().toISOString() : null,
      end_date: isAdmin ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
    };

    console.log(`Procesando usuario: ${email} | ID: ${user.id} | Rol: ${profileData.role}`);

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (upsertError) {
      console.error(`Error al restaurar perfil para ${email}:`, upsertError.message);
    } else {
      console.log(`Perfil restaurado para ${email}`);
    }
  }

  console.log('--- RECUPERACION COMPLETADA ---');
}

restoreProfiles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
