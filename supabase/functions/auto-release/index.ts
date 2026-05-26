import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0'

interface Commit {
  message: string
  author: string
  sha: string
}

type ReleaseType = 'feature' | 'fix' | 'security' | 'improvement'

function normalizeCommit(raw: unknown): Commit | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const message = typeof item.message === 'string' ? item.message.trim() : ''
  if (!message) return null

  const rawAuthor = item.author
  const author =
    rawAuthor && typeof rawAuthor === 'object' && typeof (rawAuthor as Record<string, unknown>).name === 'string'
      ? String((rawAuthor as Record<string, unknown>).name)
      : typeof rawAuthor === 'string'
        ? rawAuthor
        : 'GitHub'

  const sha = typeof item.sha === 'string'
    ? item.sha
    : typeof item.id === 'string'
      ? item.id
      : ''

  return { message, author, sha }
}

function cleanSubject(msg: string): string {
  return msg
    .split('\n')[0]
    .replace(/^(feat|feature|fix|security|sec|chore|refactor|docs|style|test|perf|build|ci)\s*(\([^)]+\))?\s*:\s*/i, '')
    .replace(/#[0-9]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyCommit(msg: string): { type: ReleaseType; cleanMessage: string } {
  const lower = msg.toLowerCase()
  const cleanMessage = cleanSubject(msg)

  if (lower.startsWith('feat') || lower.startsWith('feature')) return { type: 'feature', cleanMessage }
  if (lower.startsWith('fix') || lower.includes(' bug') || lower.includes('error')) return { type: 'fix', cleanMessage }
  if (lower.startsWith('security') || lower.startsWith('sec') || lower.includes('seguridad')) return { type: 'security', cleanMessage }
  return { type: 'improvement', cleanMessage }
}

function getCommitTopic(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('release') || lower.includes('novedad')) return 'novedades'
  if (lower.includes('admin') || lower.includes('dashboard')) return 'panel de administración'
  if (lower.includes('academia') || lower.includes('curso') || lower.includes('lesson')) return 'academia'
  if (lower.includes('stripe') || lower.includes('pago') || lower.includes('checkout')) return 'pagos'
  if (lower.includes('auth') || lower.includes('login') || lower.includes('sesion') || lower.includes('sesión')) return 'inicio de sesión'
  if (lower.includes('banner') || lower.includes('publicidad')) return 'banners'
  if (lower.includes('agent') || lower.includes('agente')) return 'agentes'
  if (lower.includes('ui') || lower.includes('ux') || lower.includes('screen') || lower.includes('pantalla')) return 'experiencia visual'
  return 'la plataforma'
}

function humanizeCommit(commit: Commit): string {
  const { type, cleanMessage } = classifyCommit(commit.message)
  const topic = getCommitTopic(cleanMessage)

  if (type === 'feature') return `Se agregó una mejora nueva en ${topic}.`
  if (type === 'fix') return `Se corrigió un problema en ${topic}.`
  if (type === 'security') return `Se reforzó la seguridad de ${topic}.`

  const readable = cleanMessage
    .replace(/\bapi\b/gi, 'conexión')
    .replace(/\bdeploy\b/gi, 'publicación')
    .replace(/\bworkflow\b/gi, 'proceso automático')
    .replace(/\bbug\b/gi, 'problema')
    .replace(/\bfix\b/gi, 'corrección')
    .replace(/\brefactor\b/gi, 'mejora interna')
    .trim()

  if (!readable || readable.length < 8) return `Se aplicaron ajustes en ${topic}.`

  return `Se mejoró ${readable.charAt(0).toLowerCase()}${readable.slice(1)}.`
}

function uniqueChanges(commits: Commit[]): string[] {
  const seen = new Set<string>()
  const changes: string[] = []

  for (const commit of commits) {
    const change = humanizeCommit(commit)
    if (!seen.has(change)) {
      seen.add(change)
      changes.push(change)
    }
  }

  return changes
}

function getCategoryCounts(commits: Commit[]) {
  return commits.reduce<Record<ReleaseType, number>>((counts, commit) => {
    const { type } = classifyCommit(commit.message)
    counts[type] += 1
    return counts
  }, { feature: 0, fix: 0, security: 0, improvement: 0 })
}

function generateSummary(commits: Commit[]): string {
  const counts = getCategoryCounts(commits)
  const parts: string[] = []

  if (counts.feature > 0) parts.push(`${counts.feature} mejora${counts.feature > 1 ? 's nuevas' : ' nueva'}`)
  if (counts.fix > 0) parts.push(`${counts.fix} corrección${counts.fix > 1 ? 'es' : ''}`)
  if (counts.security > 0) parts.push(`${counts.security} ajuste${counts.security > 1 ? 's' : ''} de seguridad`)
  if (counts.improvement > 0) parts.push(`${counts.improvement} ajuste${counts.improvement > 1 ? 's' : ''} general${counts.improvement > 1 ? 'es' : ''}`)

  const changesText = parts.length > 0 ? parts.join(', ') : `${commits.length} cambio${commits.length > 1 ? 's' : ''}`
  return `Esta nota privada resume ${changesText} guardado${commits.length > 1 ? 's' : ''} en la rama main. Está escrita para revisión interna antes de publicarla a los usuarios.`
}

function inferTitle(commits: Commit[]): string {
  const counts = getCategoryCounts(commits)
  const topTopic = getCommitTopic(commits.map((commit) => cleanSubject(commit.message)).join(' '))

  if (counts.security > 0) return `Seguridad y mejoras en ${topTopic}`
  if (counts.feature > 0 && counts.fix > 0) return `Mejoras y correcciones en ${topTopic}`
  if (counts.feature > 0) return `Nuevas mejoras en ${topTopic}`
  if (counts.fix > 0) return `Correcciones en ${topTopic}`
  return `Actualización de ${topTopic}`
}

function inferPrimaryType(commits: Commit[]): ReleaseType {
  const counts = getCategoryCounts(commits)
  if (counts.security > 0) return 'security'
  if (counts.feature > 0) return 'feature'
  if (counts.fix > 0) return 'fix'
  return 'improvement'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '')
  const releaseToken = req.headers.get('x-auto-release-token')
  const expectedToken = Deno.env.get('AUTO_RELEASE_TOKEN')
  if (!expectedToken || (releaseToken !== expectedToken && bearerToken !== expectedToken)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const payload = await req.json()
    const ref = typeof payload?.ref === 'string' ? payload.ref : ''
    if (ref && ref !== 'refs/heads/main') {
      return new Response(JSON.stringify({ message: 'Branch ignored' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const commits = Array.isArray(payload?.commits)
      ? payload.commits.map(normalizeCommit).filter((commit): commit is Commit => commit !== null)
      : []

    if (commits.length === 0) {
      return new Response(JSON.stringify({ message: 'No commits provided' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const filtered = commits.filter((c) => {
      const message = c.message.trim()
      return !message.startsWith('Merge') && !message.startsWith('Auto-commit')
    })

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ message: 'Only merge/auto commits, skipped' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: lastRelease } = await supabase
      .from('release_notes')
      .select('version')
      .order('publish_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextVersion = '2.5.1'
    if (lastRelease?.version) {
      const parts = lastRelease.version.replace(/[^0-9.]/g, '').split('.')
      if (parts.length >= 3) {
        const lastNum = parseInt(parts[parts.length - 1])
        parts[parts.length - 1] = isNaN(lastNum) ? 1 : lastNum + 1
        nextVersion = parts.join('.')
      }
    }

    const changes = uniqueChanges(filtered)
    const summary = generateSummary(filtered)
    const title = inferTitle(filtered)
    const primaryType = inferPrimaryType(filtered)

    const { data, error } = await supabase
      .from('release_notes')
      .insert({
        version: nextVersion,
        title,
        description: summary,
        changes,
        type: primaryType,
        is_visible: false,
        is_important: false,
        publish_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    console.log(`Auto-release created: v${nextVersion} with ${changes.length} changes`)

    return new Response(JSON.stringify({ success: true, release: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[auto-release] Error:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
