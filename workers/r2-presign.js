/**
 * Cloudflare Worker: genera URLs firmadas para subir a R2 con CORS robusto.
 * Despliega con: wrangler deploy (configura secretos en el dashboard)
 *
 * Secretos requeridos en Cloudflare:
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_ACCOUNT_ID          (ej: 1fbed4859cc6f03d691ea813a7039210)
 * - R2_BUCKET_NAME         (ej: upfunnel-academy)
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 */

import { AwsClient } from 'aws4fetch';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

async function assertAdmin(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { ok: false, status: 401, message: 'No autorizado' };
  }

  const token = auth.slice(7);
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });

  if (!res.ok) {
    return { ok: false, status: 401, message: 'Sesión inválida' };
  }

  const user = await res.json();
  const profileRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    }
  );

  if (!profileRes.ok) {
    return { ok: false, status: 403, message: 'No se pudo verificar el perfil' };
  }

  const profiles = await profileRes.json();
  if (profiles[0]?.role !== 'admin') {
    return { ok: false, status: 403, message: 'Solo administradores pueden subir archivos' };
  }

  return { ok: true };
}

export default {
  async fetch(request, env) {
    // Manejar peticiones Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    const authResult = await assertAdmin(request, env);
    if (!authResult.ok) {
      return new Response(authResult.message, { 
        status: authResult.status,
        headers: corsHeaders
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('JSON inválido', { 
        status: 400,
        headers: corsHeaders
      });
    }

    const { key, contentType } = body;
    if (!key || typeof key !== 'string' || !key.startsWith('academy/')) {
      return new Response('Clave inválida', { 
        status: 400,
        headers: corsHeaders
      });
    }

    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });

    const bucket = env.R2_BUCKET_NAME || 'upfunne-academy';
    const accountId = env.R2_ACCOUNT_ID;
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

    try {
      const signed = await aws.sign(
        new Request(url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType || 'application/octet-stream' },
        }),
        { aws: { signQuery: true, expires: 3600 } }
      );

      return new Response(JSON.stringify({ uploadUrl: signed.url, key }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      return new Response(`Error al firmar URL: ${err.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};
