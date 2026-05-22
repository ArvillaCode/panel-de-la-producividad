import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const MAX_HISTORY = 12
const MAX_CONTENT_CHARS = 4000
const FALLBACK_MODEL = 'google/gemini-2.5-flash'

// Configuración de Rate Limiting en memoria para evitar DoS financiero en OpenRouter
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 15 // 15 chats por minuto
const userRequestCounts = new Map<string, { count: number; resetTime: number }>()

const isRateLimited = (userId: string): boolean => {
  const now = Date.now()
  const limit = userRequestCounts.get(userId)

  if (!limit || now > limit.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  limit.count++
  return false
}

const defaultAllowedOrigins = [
  'https://upfunnel.click',
  'https://app.upfunnel.click',
  'http://localhost:5173'
]

const getAllowedOrigins = () => {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return configured.length > 0 ? configured : defaultAllowedOrigins
}

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigins = getAllowedOrigins()
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

const jsonResponse = (req: Request, status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json'
    }
  })

const cleanMessages = (messages: unknown): ChatMessage[] => {
  if (!Array.isArray(messages)) return []

  return messages
    .slice(-MAX_HISTORY)
    .map((message) => {
      if (!message || typeof message !== 'object') return null

      const raw = message as Record<string, unknown>
      const role = raw.role === 'assistant' || raw.role === 'user' ? raw.role : null
      const content = typeof raw.content === 'string' ? raw.content.trim().slice(0, MAX_CONTENT_CHARS) : ''

      if (!role || !content) return null
      return { role, content }
    })
    .filter((message): message is ChatMessage => Boolean(message))
}

const stripControlChars = (value: string) =>
  value.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '').trim()

const buildSystemInstruction = ({
  prompt,
  userName,
  agents
}: {
  prompt: string
  userName: string
  agents: Array<Record<string, unknown>>
}) => {
  const agentList = agents.length > 0
    ? agents
      .map((agent) => {
        const name = String(agent.name || 'Agente sin nombre')
        const specialty = String(agent.specialty || '')
        const description = String(agent.description || '').slice(0, 180)
        const link = String(agent.chatLink || '')
        return `- ${name}${specialty ? ` (${specialty})` : ''}: ${description} [LINK:${link}]`
      })
      .join('\n')
    : 'No hay agentes disponibles.'

  return stripControlChars(`
${prompt || `Actuas como Consultor Senior de Crecimiento y Especialista del ecosistema SaaS de Upfunnel. Te diriges a ${userName}. Tu mision es guiar al usuario hacia la herramienta ideal del catalogo.`}

REGLAS:
1. Usa exclusivamente la lista de agentes activos recibida abajo.
2. No inventes funciones, agentes, enlaces ni herramientas externas.
3. Si no existe un agente para la tarea, dilo de forma breve y profesional.
4. Para cada recomendacion menciona nombre y especialidad.
5. Si recomiendas un agente, incluye el enlace exacto en este formato: [BOT_LINK:Nombre|URL]
6. Responde siempre en Espanol.
7. No uses Markdown. Escribe texto plano.

AGENTES ACTIVOS:
${agentList}
  `)
}

const callOpenRouter = async ({
  apiKey,
  origin,
  model,
  messages
}: {
  apiKey: string
  origin: string
  model: string
  messages: Array<{ role: string; content: string }>
}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': origin || 'https://upfunnel.click',
        'X-Title': 'Upfunnel Productivity Panel'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 500
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const details = await response.json().catch(() => ({}))
      const providerMessage = String(details?.error?.message || response.statusText || '')
      const notFound = response.status === 404 ||
        providerMessage.toLowerCase().includes('no endpoints found') ||
        providerMessage.toLowerCase().includes('model_not_found')

      throw new Error(notFound ? 'OPENROUTER_NO_ENDPOINTS_FOUND' : `OPENROUTER_${response.status}`)
    }

    const data = await response.json()
    return String(data?.choices?.[0]?.message?.content || '').trim()
  } finally {
    clearTimeout(timeoutId)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { error: 'method_not_allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openRouterKey) {
    console.error('[OPENROUTER_CHAT] Missing required environment variables')
    return jsonResponse(req, 500, { error: 'server_not_configured' })
  }

  const authorization = req.headers.get('Authorization') || ''
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim()

  if (!accessToken) {
    return jsonResponse(req, 401, { error: 'unauthorized' })
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return jsonResponse(req, 401, { error: 'unauthorized' })
    }

    // Aplicar Rate Limiting (Hardening de ciberseguridad)
    if (isRateLimited(authData.user.id)) {
      console.warn(`[OPENROUTER_CHAT] Rate limit exceeded for user: ${authData.user.id}`)
      return jsonResponse(req, 429, { 
        error: 'too_many_requests', 
        message: 'Has excedido el límite de consultas (15 por minuto). Por favor, espera un momento antes de volver a intentarlo.' 
      })
    }

    const dbClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
    })

    const [{ data: profile }, { data: config }, { data: agents, error: agentsError }] = await Promise.all([
      dbClient
        .from('profiles')
        .select('id, email, name, role, status, is_approved')
        .eq('id', authData.user.id)
        .maybeSingle(),
      dbClient
        .from('system_config')
        .select('ai_assistant_enabled, ai_model, system_prompt, ai_system_prompt')
        .eq('id', 1)
        .maybeSingle(),
      dbClient
        .from('agents')
        .select('name, specialty, description, chatLink, admin_only, visible')
        .eq('visible', true)
    ])

    if (agentsError) {
      console.error('[OPENROUTER_CHAT] Agents query failed:', agentsError.message)
      return jsonResponse(req, 500, { error: 'catalog_unavailable' })
    }

    const role = String(profile?.role || '')
    const isAdmin = role === 'admin' || role === 'core_admin'
    const isApproved = profile?.is_approved === true && profile?.status === 'active'

    if (!isAdmin && !isApproved) {
      return jsonResponse(req, 403, { error: 'profile_not_approved' })
    }

    if (config?.ai_assistant_enabled === false && !isAdmin) {
      return jsonResponse(req, 403, { error: 'assistant_disabled' })
    }

    const body = await req.json().catch(() => ({}))
    const history = cleanMessages(body?.messages)

    if (history.length === 0) {
      return jsonResponse(req, 400, { error: 'empty_messages' })
    }

    const visibleAgents = (agents || []).filter((agent) => isAdmin || agent.admin_only !== true)
    const userName = String(profile?.name || authData.user.user_metadata?.name || authData.user.email || 'Usuario')
    const systemInstruction = buildSystemInstruction({
      prompt: String(config?.system_prompt || config?.ai_system_prompt || ''),
      userName,
      agents: visibleAgents
    })

    const model = String(config?.ai_model || DEFAULT_MODEL).replace(/['"]/g, '').trim() || DEFAULT_MODEL
    const messages = [
      { role: 'system', content: systemInstruction },
      ...history
    ]

    let text = ''
    try {
      text = await callOpenRouter({
        apiKey: openRouterKey,
        origin: req.headers.get('Origin') || '',
        model,
        messages
      })
    } catch (firstError) {
      console.warn('[OPENROUTER_CHAT] Main model failed:', firstError)
      if (model === FALLBACK_MODEL) throw firstError

      text = await callOpenRouter({
        apiKey: openRouterKey,
        origin: req.headers.get('Origin') || '',
        model: FALLBACK_MODEL,
        messages
      })
    }

    if (!text) {
      return jsonResponse(req, 502, { error: 'empty_provider_response' })
    }

    return jsonResponse(req, 200, { text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[OPENROUTER_CHAT] Request failed:', message)

    if (message.includes('OPENROUTER_NO_ENDPOINTS_FOUND')) {
      return jsonResponse(req, 502, { error: 'OPENROUTER_NO_ENDPOINTS_FOUND' })
    }

    if (message === 'AbortError') {
      return jsonResponse(req, 504, { error: 'provider_timeout' })
    }

    return jsonResponse(req, 500, { error: 'assistant_unavailable' })
  }
})
