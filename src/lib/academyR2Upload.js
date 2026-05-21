import { supabase } from './supabase';

const ALLOWED_SUBFOLDERS = new Set(['videos', 'thumbnails', 'courses']);
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

function sanitizeFilename(name) {
  const safeName = String(name || 'upload.bin')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+/, '')
    .slice(0, 120);

  return safeName || 'upload.bin';
}

/**
 * Sube un archivo a R2 usando una URL firmada generada en el servidor (Worker).
 * Las credenciales de R2 NUNCA deben estar en el frontend.
 */
export async function uploadToAcademyR2(file, subfolder) {
  if (!ALLOWED_SUBFOLDERS.has(subfolder)) {
    throw new Error('Carpeta de subida no permitida.');
  }

  if (!file || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Archivo invalido o demasiado grande.');
  }

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

  const key = `academy/${subfolder}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const presignRes = await fetch(presignEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      key,
      contentType: file.type || 'application/octet-stream',
      size: file.size
    }),
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
