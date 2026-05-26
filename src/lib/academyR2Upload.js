import { supabase } from './supabase';

const ALLOWED_SUBFOLDERS = new Set(['videos', 'thumbnails', 'courses', 'banners']);
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
    throw new Error('Archivo inválido o demasiado grande.');
  }

  // Resolver e inferir Content-Type correcto por extensión si es genérico
  let contentType = file.type || 'application/octet-stream';
  if (!contentType || contentType === 'application/octet-stream') {
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    const extensionMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'qt': 'video/quicktime'
    };
    if (extensionMap[extension]) {
      contentType = extensionMap[extension];
    }
  }

  // Validaciones del tipo de archivo en el cliente según la subcarpeta
  const isImageFolder = subfolder === 'thumbnails' || subfolder === 'courses' || subfolder === 'banners';
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

  if (isImageFolder) {
    if (!allowedImageTypes.has(contentType)) {
      throw new Error(
        `Formato de imagen no permitido: ${contentType}. Sube un archivo JPG, PNG, WebP o GIF válido.`
      );
    }
  } else if (subfolder === 'videos') {
    if (!allowedVideoTypes.has(contentType)) {
      throw new Error(
        `Formato de video no permitido: ${contentType}. Sube un archivo de video MP4, WebM o MOV válido.`
      );
    }
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
      contentType,
      size: file.size
    }),
  });

  if (!presignRes.ok) {
    let errorMsg = `No se pudo obtener la URL de subida del servidor (${presignRes.status})`;
    try {
      const detailText = await presignRes.text();
      try {
        const detail = JSON.parse(detailText);
        if (detail.error === 'invalid_content_type') {
          errorMsg = 'El tipo de archivo no está permitido en el servidor de almacenamiento. Sube un archivo de video (MP4/WebM) o imagen (JPG/PNG/WebP) válido.';
        } else if (detail.error) {
          errorMsg = detail.error;
        }
      } catch {
        if (detailText.includes('invalid_content_type')) {
          errorMsg = 'El tipo de archivo no está permitido en el servidor de almacenamiento. Sube un archivo de video (MP4/WebM) o imagen (JPG/PNG/WebP) válido.';
        } else if (detailText) {
          errorMsg = detailText;
        }
      }
    } catch (err) {
      // Ignorar errores leyendo cuerpo
    }
    throw new Error(errorMsg);
  }

  const { uploadUrl } = await presignRes.json();
  if (!uploadUrl) {
    throw new Error('Respuesta inválida del servidor de subida.');
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(
      `Error al subir el archivo al almacenamiento (${uploadRes.status}). Verifica tu conexión o intenta con un archivo más liviano.`
    );
  }

  return key;
}

export function academyMediaUrl(path) {
  const rawPath = String(path || '').trim();
  if (!rawPath) return '';

  if (/^(https?:|blob:|data:)/i.test(rawPath)) {
    // Si es una URL de Google Drive, la convertimos a formato directo de descarga o miniatura para evitar CORS/500
    if (rawPath.includes('drive.google.com') || rawPath.includes('docs.google.com')) {
      const match = rawPath.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawPath.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        // Si no tiene una extensión de video obvia, asumimos que es una imagen y usamos
        // el endpoint público de thumbnails de Drive. Este endpoint no requiere cookies de terceros
        // y funciona 100% de las veces en etiquetas <img> sin lanzar 403 por bloqueo de Chrome.
        const isVideo = /\.(mp4|webm|mov|qt)(?:[?#]|$)/i.test(rawPath);
        if (!isVideo) {
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
        return `https://docs.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return rawPath;
  }

  if (rawPath.startsWith('?')) {
    const key = new URLSearchParams(rawPath).get('key');
    return key ? academyMediaUrl(key) : '';
  }

  const cleanPath = rawPath.replace(/^\/+/, '');
  const normalizedPath = /^(videos|thumbnails|courses|banners)\//.test(cleanPath)
    ? `academy/${cleanPath}`
    : cleanPath;

  const mediaWorkerUrl = import.meta.env.VITE_ACADEMY_MEDIA_URL;
  if (!mediaWorkerUrl) {
    console.warn('VITE_ACADEMY_MEDIA_URL not configured');
    return '';
  }
  const base = mediaWorkerUrl.split('?')[0];
  return `${base}?key=${encodeURIComponent(normalizedPath)}`;
}
