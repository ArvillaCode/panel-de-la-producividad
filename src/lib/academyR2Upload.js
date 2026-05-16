import { supabase } from './supabase';

/**
 * Sube un archivo a R2 usando una URL firmada generada en el servidor (Worker).
 * Las credenciales de R2 NUNCA deben estar en el frontend.
 */
export async function uploadToAcademyR2(file, subfolder) {
  const presignEndpoint = import.meta.env.VITE_R2_PRESIGN_URL;
  if (!presignEndpoint) {
    throw new Error(
      'Subida de academia no configurada. Define VITE_R2_PRESIGN_URL (Worker de presign) en el entorno.'
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Debes iniciar sesión para subir archivos.');
  }

  const key = `academy/${subfolder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  const presignRes = await fetch(presignEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ key, contentType: file.type || 'application/octet-stream' }),
  });

  if (!presignRes.ok) {
    const detail = await presignRes.text().catch(() => '');
    throw new Error(detail || `No se pudo obtener URL de subida (${presignRes.status})`);
  }

  const { uploadUrl } = await presignRes.json();
  if (!uploadUrl) {
    throw new Error('Respuesta inválida del servidor de subida.');
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Error al subir el archivo (${uploadRes.status})`);
  }

  return key;
}

export const ACADEMY_MEDIA_WORKER_URL =
  import.meta.env.VITE_ACADEMY_MEDIA_URL ||
  'https://rough-silence-cf74.arvilladigital12.workers.dev/?key=';

export function academyMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = ACADEMY_MEDIA_WORKER_URL.split('?')[0];
  return `${base}?key=${path}`;
}
