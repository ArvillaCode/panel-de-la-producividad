# 05. Despliegue e Infraestructura

## Doble estrategia de hosting (a reconciliar)

El repo contiene configuración simultánea para dos objetivos de despliegue distintos, sin que quede explícito en el código cuál está activo en producción hoy:

1. **Vercel** — `vercel.json` define CSP, rewrites SPA (`/* → /index.html`). `.vercel/repo.json` confirma un proyecto vinculado.
2. **Contenedor propio (Docker + Nginx), aparentemente en Coolify** — `Dockerfile` (build multi-stage Node 22 → Nginx alpine) + `nginx.conf`. `App.jsx` tiene una comprobación explícita `hostname.startsWith('51.79.68.')` con el comentario *"Permitir acceso desde Coolify"*.

**Pendiente de confirmar:** si ambos están activos (ej. producción en uno, staging en otro) o si uno es legado.

## Backend (Supabase)

- Proyecto Supabase referenciado por URL fija en varios archivos (`krtthtzljlyewlngaklo.supabase.co`, visible en CSP y en una imagen de logo hardcodeada en `AgentPanel.jsx`).
- Edge Functions desplegadas: `openrouter-chat`, `stripe-webhook`, `auto-release` (`supabase/functions/`).
- `supabase/.temp/` contiene metadatos de CLI vinculados (project-ref, versiones) — confirma que el proyecto se gestiona con Supabase CLI localmente al menos para algunas tareas.
- `mcp-supabase-custom/` — servidor MCP local para inspección de la base de datos. Uso explícitamente restringido a desarrollo (`Guia_Maestra_Upfunnel.md`: *"PROHIBIDO el uso del MCP de Supabase [en producción] para evitar conflictos de autenticación de bots y saturación de base de datos"*).

## Media (Cloudflare)

- **R2** como almacenamiento de video/imágenes de la Academia (bucket `upfunnel-academy` según `workers/wrangler.toml.example`).
- **Worker** (`workers/r2-presign.js`) como única puerta de entrada/salida a R2: firma `PUT` (solo admin) y sirve `GET` con streaming (`Range` headers) para reproducción de video.
- Variables de entorno del Worker: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `ALLOWED_ORIGINS`, `MAX_UPLOAD_BYTES` (default 512 MB).

## Pagos (Stripe)

- Flujo basado en **Payment Links** hosteados por Stripe (sin checkout propio) + webhook (`stripe-webhook`) que activa perfiles en Supabase.
- Configuración documentada en `stripe_integration_guide.md` (suscripción anual $50 USD en la guía; la landing actual muestra $49 USD — **pequeña discrepancia de precio entre documentación y producto real**, verificar cuál es el vigente).

## CI/CD (GitHub Actions)

- `.github/workflows/draft-release.yml` — genera borradores de release notes públicas con `release-drafter` en cada push a `main`.
- `.github/workflows/private-release-note.yml` — en cada push a `main`, llama a la Edge Function `auto-release` (con `AUTO_RELEASE_TOKEN` + `SUPABASE_ANON_KEY` como secrets) para generar una nota de versión **privada** que luego un admin revisa y publica manualmente desde `/admin/releases`.
- No se identificó ningún workflow de **tests automatizados**, **linting en CI**, ni **despliegue automatizado** (el deploy a Vercel probablemente ocurre por integración nativa de Vercel con GitHub, no por un step explícito en Actions — **pendiente de confirmar**).

## Variables de entorno (`.env.example`)

Agrupadas por consumidor: frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_R2_PRESIGN_URL`, `VITE_ACADEMY_MEDIA_URL`), Edge Functions/servidor (`OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTO_RELEASE_TOKEN`), scripts Node (`UPLOAD_SCRIPT_ADMIN_EMAIL/PASSWORD`, credenciales R2), y MCP local (`SUPABASE_DB_URL`). La separación entre variables `VITE_*` (expuestas al cliente) y variables servidor está bien respetada en el ejemplo.
