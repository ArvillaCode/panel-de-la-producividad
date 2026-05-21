/**
 * Cloudflare Worker: genera URLs firmadas para subir a R2.
 *
 * Secretos requeridos:
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_ACCOUNT_ID
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 */

import { AwsClient } from 'aws4fetch';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://upfunnel.click',
  'https://app.upfunnel.click',
  'http://localhost:5173'
];
const ALLOWED_FOLDERS = new Set(['videos', 'thumbnails', 'courses']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const DEFAULT_MAX_BYTES = 512 * 1024 * 1024;

function getAllowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(request, env, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...getCorsHeaders(request, env),
      'Content-Type': 'application/json'
    }
  });
}

function requireEnv(env) {
  const required = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
}

async function assertAdmin(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { ok: false, status: 401, code: 'unauthorized' };
  }

  const token = auth.slice(7);
  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY
    }
  });

  if (!userRes.ok) {
    return { ok: false, status: 401, code: 'invalid_session' };
  }

  const user = await userRes.json();
  const profileRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY
      }
    }
  );

  if (!profileRes.ok) {
    return { ok: false, status: 403, code: 'profile_unavailable' };
  }

  const profiles = await profileRes.json();
  const role = profiles[0]?.role;
  if (role !== 'admin' && role !== 'core_admin') {
    return { ok: false, status: 403, code: 'admin_required' };
  }

  return { ok: true };
}

function validateUpload({ key, contentType, size }, env) {
  if (!key || typeof key !== 'string') {
    return 'invalid_key';
  }

  if (key.includes('..') || key.includes('\\') || key.includes('//') || key.length > 220) {
    return 'invalid_key';
  }

  const match = key.match(/^academy\/([a-z]+)\/[A-Za-z0-9._-]+$/);
  if (!match || !ALLOWED_FOLDERS.has(match[1])) {
    return 'invalid_key';
  }

  const folder = match[1];
  const normalizedType = String(contentType || 'application/octet-stream').toLowerCase();
  const isImageFolder = folder === 'thumbnails' || folder === 'courses';
  const validType = isImageFolder ? IMAGE_TYPES.has(normalizedType) : VIDEO_TYPES.has(normalizedType);

  if (!validType) {
    return 'invalid_content_type';
  }

  const maxBytes = Number(env.MAX_UPLOAD_BYTES || DEFAULT_MAX_BYTES);
  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > maxBytes) {
    return 'invalid_size';
  }

  return null;
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, env, 405, { error: 'method_not_allowed' });
    }

    try {
      requireEnv(env);
    } catch (error) {
      console.error('[R2_PRESIGN] Missing configuration:', error);
      return jsonResponse(request, env, 500, { error: 'server_not_configured' });
    }

    const authResult = await assertAdmin(request, env);
    if (!authResult.ok) {
      return jsonResponse(request, env, authResult.status, { error: authResult.code });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, env, 400, { error: 'invalid_json' });
    }

    const validationError = validateUpload(body, env);
    if (validationError) {
      return jsonResponse(request, env, 400, { error: validationError });
    }

    const { key, contentType } = body;
    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    });

    const url = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`;

    try {
      const signed = await aws.sign(
        new Request(url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType }
        }),
        { aws: { signQuery: true, expires: 900 } }
      );

      return jsonResponse(request, env, 200, { uploadUrl: signed.url, key });
    } catch (error) {
      console.error('[R2_PRESIGN] Signing failed:', error);
      return jsonResponse(request, env, 500, { error: 'signing_failed' });
    }
  }
};
