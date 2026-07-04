# PROJECT_ANALYSIS.md

> Análisis técnico y de producto del repositorio local `panel-de-la-producividad` (nombre de carpeta local: `IA Operative System`).
> Generado el 2026-07-03 mediante inspección estática del código fuente, migraciones SQL, funciones Edge, workers y documentación existente en el repo. No se ejecutó la aplicación ni se consultó la base de datos real de Supabase.
>
> Convención: todo lo marcado como **"Pendiente de confirmar"** no pudo deducirse con certeza del código y requiere validación con el equipo o con el entorno de producción/Supabase real.

---

## 1. Qué hace el producto

El producto se llama **Upfunnel** (nombre comercial visible en dominios, CSP, branding y guías internas; el `package.json` conserva el nombre legado `panel-50-agentes-ia-v2`). Es un **SaaS de productividad por suscripción** que combina tres pilares:

1. **Catálogo de agentes de IA** (actualmente ~71 "agentes" definidos como tarjetas con enlace a GPTs de ChatGPT, organizados por categoría/especialidad) — el producto original del que evolucionó la app.
2. **Copiloto/Asistente conversacional propio** ("Asistente de Upfunnel" / matchmaker) que usa un LLM vía OpenRouter para recomendar el agente adecuado dentro del propio catálogo, con enlaces directos a cada bot.
3. **Academia** (LMS interno): cursos → módulos → lecciones en video, con contenido premium/gratuito, materiales descargables y progreso de usuario.

Todo esto vive detrás de una **puerta de pago/aprobación manual**: los usuarios se registran o pagan vía Stripe, y un administrador (o el propio webhook de Stripe) debe aprobar/activar la cuenta antes de que puedan usar el panel. Existe un **Panel de Administración** completo (`/admin/*`) para gestionar usuarios, agentes, banners, releases, logs de auditoría y configuración global del sistema (incluyendo el prompt y modelo del asistente IA).

La landing pública (`LandingPage.jsx`) vende una "oferta de lanzamiento" de $49 USD (con precio de renovación de $199 USD), lo que confirma el modelo de negocio: suscripción anual con paywall.

## 2. Tecnologías utilizadas

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React 18 + Vite 8 (SPA, no Next.js real) | `react-router-dom` v7 para ruteo |
| Estilos | TailwindCSS 3 + CSS custom (`App.css`) | Diseño "Glassmorphism", dark/light mode vía `useTheme` |
| Iconos | `lucide-react` | |
| Gráficas admin | `recharts` | Usado en `AdminDashboard.jsx` |
| Drag & drop | `react-draggable` | Uso puntual (no localizado a fondo, **pendiente de confirmar** dónde se usa) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS + RPC + Edge Functions) | Cliente único en `src/lib/supabase.js` |
| Funciones serverless | Supabase Edge Functions (Deno) | `openrouter-chat`, `stripe-webhook`, `auto-release` |
| LLM Gateway | OpenRouter (modelos Gemini/DeepSeek/Claude/Llama/Gemma según whitelist) | Consumido solo desde la Edge Function, nunca desde el cliente |
| Pagos | Stripe (Payment Links + Webhooks) | Activa/desactiva perfiles automáticamente |
| Almacenamiento de media | Cloudflare R2 + Cloudflare Worker (`workers/r2-presign.js`, `aws4fetch`) | Sirve y firma subidas de videos/imágenes de la Academia |
| Hosting frontend | Vercel (config en `vercel.json`, CSP, rewrites SPA) — también hay `Dockerfile` + `nginx.conf` para self-host (Coolify, según comentarios en el código) | Doble estrategia de despliegue |
| CI/CD | GitHub Actions: `release-drafter` (notas públicas) + workflow custom que llama a la Edge Function `auto-release` (notas privadas) en cada push a `main` | |
| Utilidades internas | `mcp-supabase-custom/` (servidor MCP local para consultas a Supabase, uso solo en desarrollo, explícitamente prohibido para producción según `Guia_Maestra_Upfunnel.md`) | |

## 3. Estructura de módulos (mapa del repo)

```
src/
├── App.jsx                    # Router raíz + guards de dominio/rol
├── hooks/
│   ├── useAuth.jsx            # Contexto global: sesión, perfil, roles, notificaciones, RPCs admin
│   ├── useTheme.jsx           # Dark/Light mode
│   ├── useFavorites.js        # Favoritos de agentes (localStorage)
│   ├── useCloseModal.js       # Cierre de modales (Escape + click fuera)
│   └── useReleaseNotes.js     # Notas de versión
├── lib/
│   ├── supabase.js            # Cliente único de Supabase
│   └── academyR2Upload.js     # Subida/lectura de media de Academia vía Worker R2
├── context/ToastContext.jsx   # Sistema de notificaciones toast
├── data/agents.js             # Catálogo local de agentes (fallback si Supabase falla)
├── components/
│   ├── AgentPanel.jsx         # Panel principal de usuario (catálogo, buscador, notificaciones)
│   ├── AgentCard.jsx / AgentCompactCard.jsx / Avatar.jsx
│   ├── admin/AdminLayout.jsx  # Layout compartido del panel admin
│   ├── user/                  # Sidebar, modales de settings/sugerencias, AgentGuide (chat IA), banner global, release notes
│   └── ui/                    # Fondo de partículas, visualizador "tech", Toaster
├── pages/
│   ├── LandingPage.jsx, ComingSoon.jsx, PendingApproval.jsx, Policies.jsx, Privacy.jsx, Support.jsx, ReleaseHistory.jsx
│   └── admin/                 # AdminLogin, AdminDashboard, AdminUsers, AdminAgents, AdminBanners,
│                               # AdminConfig, AdminReleases, AdminLogs, MatchmakerConfig
└── app/dashboard/academia/    # LMS: page.tsx (vista usuario) + admin/page.tsx (creador de contenido)
                                # Nota: convive con Vite bajo una ruta con forma "Next.js App Router",
                                # pero NO es Next.js real (solo naming, ver sección 6).

supabase/
├── functions/
│   ├── openrouter-chat/       # Proxy seguro + rate limit al LLM, inyecta catálogo de agentes como contexto
│   ├── stripe-webhook/        # checkout.session.completed / customer.subscription.deleted → activa/revoca perfiles
│   └── auto-release/          # Genera notas de versión automáticas a partir de commits (uso interno/privado)
└── migrations/                # Solo hardening incremental (RLS, funciones RPC); el esquema base NO está versionado aquí

workers/
└── r2-presign.js               # Cloudflare Worker: firma PUT a R2 (admin only) y sirve GET de media pública validada

scripts/                        # Utilidades Node one-off: promoción de usuarios, subida de agentes/video, anuncios de update
mcp-supabase-custom/            # Servidor MCP local para inspección de Supabase (solo dev)
```

## 4. Cómo se comunican los componentes

1. **Cliente ⇄ Supabase (directo):** la mayoría de las pantallas (`AgentPanel`, páginas `admin/*`, Academia) llaman directamente a `supabase.from(...)` con la clave anónima desde el navegador. La seguridad recae en **RLS + funciones RPC `SECURITY DEFINER`** (`is_admin`, `admin_update_profile`, `admin_delete_profile`, `reset_user_password`, `get_public_system_config`).
2. **Cliente ⇄ Edge Function `openrouter-chat`:** el componente `AgentGuide.jsx` (matchmaker) envía el historial de chat con el JWT del usuario; la función valida sesión, aprobación, rate-limit (15 req/min), arma el prompt de sistema con la lista de agentes visibles y llama a OpenRouter, devolviendo texto plano con marcadores `[BOT_LINK:Nombre|URL]`.
3. **Cliente (admin) ⇄ Cloudflare Worker `r2-presign`:** al subir video/miniaturas en la Academia, el frontend pide una URL firmada (POST, valida rol admin contra Supabase) y sube el archivo directo a R2; la reproducción/lectura pasa por el mismo Worker vía GET con streaming (`Range` headers soportados).
4. **Stripe ⇄ Supabase (server-to-server):** `stripe-webhook` valida firma criptográfica, usa Service Role Key para activar/crear perfiles o revocar acceso en `customer.subscription.deleted`, con tabla `webhook_events` para idempotencia.
5. **GitHub Actions ⇄ Supabase:** en cada push a `main`, un workflow llama a `auto-release` con un token compartido (`AUTO_RELEASE_TOKEN`) para generar automáticamente una entrada en `release_notes` (marcada `is_visible: false` hasta que un admin la revise en `/admin/releases`).
6. **Estado global de auth:** `AuthProvider` (`useAuth.jsx`) centraliza sesión, perfil, notificaciones (polling cada 60s) y config del sistema; usa caché en `localStorage` (`cached_profile_<id>`) para evitar pantallas de carga infinitas y tiene múltiples "fail-safes" de timeout (2–2.5s) para no bloquear la UI si Supabase tarda.

## 5. Funcionalidades ya implementadas

- **Autenticación completa:** login por password, Magic Link/OTP (login sin contraseña), registro, cambio de contraseña, validación de fortaleza configurable (`system_config`), expiración de sesión con purga de tokens corruptos.
- **Control de acceso granular:** roles `admin`/`core_admin`/`editor`/`support`/`user`; estados `pending/active/inactive/rejected`; fechas de suscripción (`start_date`/`end_date`) con expulsión automática si expira; protección explícita contra eliminar/degradar al último admin.
- **Catálogo de agentes:** CRUD completo desde `/admin/agents`, visibilidad pública/oculta, `admin_only`, contador de interacciones (`total_interactions`), fallback a datos locales (`src/data/agents.js`) si Supabase falla.
- **Asistente IA (matchmaker):** chat flotante con historial persistido en `sessionStorage`, manejo de errores amigable, configuración de modelo/prompt/activación desde `/admin/matchmaker-config` y `/admin/config`.
- **Academia (LMS):** cursos con categorías y flag premium, módulos ordenables, lecciones con video (soporta YouTube/Vimeo/Google Drive embebido o video directo vía R2), materiales adjuntos, progreso de usuario (localStorage), modo edición inline para admins, ajustes globales de marca de la Academia (título/logo vía un "curso" especial `global-academy-settings`).
- **Panel Admin:** Dashboard con métricas (recharts, contadores animados), gestión de usuarios (aceptar/rechazar/expulsar/resetear contraseña/crear manualmente), gestión de banners globales, historial de actividad (`audit_logs`), gestión de notas de versión (`release_notes`) con publicación manual, logs.
- **Notificaciones:** personales y broadcast, lectura optimista (UI local + persistencia diferida en DB o localStorage para broadcasts), banner global (`GlobalBanner.jsx`).
- **Pagos:** integración Stripe vía Payment Link + webhook (alta automática de usuario nuevo o reactivación), sin backend propio de checkout (se apoya 100% en el link hosteado por Stripe).
- **Seguridad reforzada (post-auditoría de 2026-05-21):** RLS habilitado y con políticas en las tablas críticas, rate limiting en la Edge Function de IA, RPCs con verificación server-side de rol, `system_config` expuesto solo vía función `get_public_system_config` (no la tabla cruda).
- **Automatización de release notes:** generación heurística de notas de versión legibles a partir de mensajes de commit (clasifica en feature/fix/security/improvement).

## 6. Partes que parecen incompletas o inconsistentes

- **2FA:** el switch existe en `/admin/config` pero es **puramente estético** — no hay flujo de OTP adicional en `useAuth.jsx`. Confirmado explícitamente en `ADMIN_STATUS.md`.
- **Modo mantenimiento / modo debug:** son flags guardados en `system_config` pero **no hay evidencia** en `App.jsx` ni `LandingPage.jsx` de que se consulten para redirigir usuarios o activar logging extendido. Parecen no conectados aún (según el propio `ADMIN_STATUS.md`).
- **Frecuencia de respaldo / retención de logs:** configuración "de intención" en el admin panel; no existe ningún script o Edge Function programada (cron) que ejecute backups o purgue logs. **Pendiente de confirmar** si existe un cron externo (Supabase pg_cron, GitHub Action programada) fuera del repo.
- **Documentación desactualizada / contradictoria sobre el asistente de IA:** `Guia_Conexion_IA_Upfunnel.md` y `Guia_Conexion_IA.md` describen una arquitectura **distinta a la real** (Next.js App Router `app/api/chat/route.js` + SDK de Google Gemini directo desde una API route). El código real usa una **Supabase Edge Function** (`openrouter-chat`) que llama a **OpenRouter**, no a Gemini directamente. Estas guías deben tratarse como legado/aspiracional, no como fuente de verdad.
- **`README.md` desactualizado:** describe una versión mucho más simple del proyecto ("Panel de 71 Agentes IA" con integración directa a ChatGPT, sin mención de Supabase, Auth, Stripe, Academia ni panel admin), que corresponde a una etapa muy anterior del producto.
- **Migración de esquema base vacía:** `supabase/migrations/20260511131943_remote_schema.sql` tiene 0 líneas. Todo el esquema base (tablas `profiles`, `agents`, `academy_*`, `notifications`, etc.) **no está versionado en migraciones** — solo existen migraciones incrementales de *hardening* (RLS, funciones). Esto implica que el esquema real vive únicamente en el proyecto de Supabase remoto y no puede reconstruirse solo con este repo. **Pendiente de confirmar** con el equipo cómo se gestiona el schema base (¿Supabase Studio manual? ¿otro repo?).
- **Mezcla de convenciones Next.js/Vite:** la carpeta `src/app/dashboard/academia/*.tsx` imita la convención de rutas de Next.js App Router, pero el proyecto es una SPA Vite pura enrutada con `react-router-dom`. Es simplemente una convención de nombres de carpeta, no un App Router real; puede confundir a quien no conozca el histórico.
- **Doble estrategia de despliegue:** hay configuración simultánea para Vercel (`vercel.json`, rewrites SPA) y para contenedor propio (`Dockerfile` + `nginx.conf`, mencionado como Coolify en comentarios de `App.jsx`: `hostname.startsWith('51.79.68.')`). **Pendiente de confirmar** cuál es el entorno de producción activo actualmente (¿ambos? ¿uno legado?).
- **Restricción de dominio "hardcodeada":** `DomainRestrictedRoute` en `App.jsx` compara `window.location.hostname` con literales (`app.`, `localhost`, una IP fija de Coolify). Es frágil ante cambios de infraestructura y no está centralizado en configuración.
- **`react-draggable` y otras dependencias:** declarada en `package.json` pero no se localizó su uso durante la exploración. **Pendiente de confirmar** si sigue en uso o es dependencia residual.
- **Progreso de Academia solo local:** `academy_completed` se guarda en `localStorage`, no en Supabase — el progreso del alumno no es multi-dispositivo ni auditable por el admin.
- **Carpetas ajenas al build presentes en el repo:** `.codex-tmp/` (logs y capturas de otra herramienta de agente), `Nueva carpeta` (nombre por defecto de Windows, contenido no explorado), sugieren limpieza pendiente del árbol de trabajo.
- **`sec_audit_report.md`** (fechado 2026-05-21) menciona componentes huérfanos (`SignUpModal.jsx`, `RegisterForm.jsx`) y una carpeta `mcp-antigravity-auditor/` vacía — **ya no existen** en el estado actual del repo, por lo que ese hallazgo específico está resuelto, pero el documento en sí no fue actualizado para reflejarlo.

## 7. Visión de producto inferida

Upfunnel se posiciona como un **"sistema operativo" de productividad basado en IA para solopreneurs y agencias pequeñas** (frase literal en la landing: *"Centraliza tu ejecución con inteligencia artificial. Un solo workspace, todos tus agentes optimizados y un copiloto que hace el trabajo por ti"*). La estrategia de producto parece evolucionar en tres etapas visibles en el propio código/historial:

1. **Etapa 1 (origen):** directorio estático de "agentes" (personas GPT) categorizados, sin backend propio — el README aún refleja esta etapa.
2. **Etapa 2 (actual, dominante):** plataforma SaaS con cuentas, aprobación manual/pago, panel admin robusto, IA propia como "copiloto" que actúa de capa de descubrimiento sobre el catálogo (no reemplaza a los agentes, los recomienda).
3. **Etapa 3 (en construcción activa):** Academia como canal de retención/upsell ("cursos premium"), con inversión reciente notable en UX (breadcrumbs, edición inline, ajustes de marca) a juzgar por el historial de commits.

El nombre de marca "Upfunnel" y el enfoque en *growth/marketing* (el propio prompt del asistente lo define como "Consultor Senior de Crecimiento") sugieren que el público objetivo son equipos de marketing/ventas/growth que necesitan acceso curado a múltiples asistentes especializados sin pagar múltiples suscripciones de IA por separado.

## 8. Resumen de pendientes de confirmar

- Ubicación real/gestión del esquema base de Supabase (no está en `migrations/`).
- Si el modo mantenimiento y modo debug de `/admin/config` tienen algún consumidor real fuera de lo revisado.
- Entorno de producción activo real: Vercel vs. contenedor Docker/Coolify (o ambos en paralelo).
- Uso real de `react-draggable` en la UI.
- Existencia de algún proceso externo (cron/backup) que sí implemente frecuencia de respaldo/retención de logs.
- Contenido de `Nueva carpeta` y relevancia de `.codex-tmp/` para el flujo de trabajo actual.
- Cómo y cuándo se planea ejecutar la migración hacia la arquitectura descrita en `upfunnel-os` (ver sección 9): no hay ADRs, fases ni criterios de corte definidos todavía, solo índices vacíos.

## 9. Repositorio complementario `github.com/ArvillaCode/upfunnel-os`

Durante este análisis, el usuario señaló un segundo repositorio privado, clonado localmente (fuera de este repo, en el scratchpad de la sesión) para revisión. Hallazgos relevantes:

- **No contiene código de producto.** Es exclusivamente documentación de arquitectura objetivo: `README.md`, `PRINCIPLES.md` y `docs/00_Vision.md` … `docs/10_Roadmap.md` + `docs/11_ADRs/`. Todos los documentos son *stubs* de 18-20 líneas con un índice de subtemas y la nota literal *"Pendiente de completar"* — ningún contenido está desarrollado aún, y no existe ningún ADR registrado.
- **Visión declarada (`PRINCIPLES.md`):** Upfunnel debe evolucionar hacia un **"IA Operating System"**: un **núcleo de IA como único punto de entrada del usuario**, que orquesta **módulos/herramientas independientes y desacoplados**, comunicados **exclusivamente por API**, sin que ningún módulo conozca a otro ni al revés. El núcleo decide automáticamente qué módulo usar (tool selection), los módulos se registran/dan de baja vía un **Tool Registry** sin tocar el núcleo, y la arquitectura se concibe explícitamente **orientada a plugins** y escalable a terceros.
- **Fase declarada:** "Fase 0 — Documentación y fundamentos (fase actual)" según `docs/10_Roadmap.md`. Aún no hay núcleo, ni módulos, ni Tool Registry implementados en ningún lado.

### 9.1 Relación con el código de este repositorio (`panel-de-la-producividad`)

El repo analizado en las secciones 1-8 **no implementa esta visión todavía**: hoy es un **monolito SPA** donde el "asistente" (`AgentGuide.jsx` + Edge Function `openrouter-chat`) es una única función de recomendación textual sobre una lista estática de agentes, no un orquestador de módulos con Tool Registry; la Academia, el catálogo de agentes y el panel admin están **acoplados en el mismo codebase y la misma base de datos Supabase**, exactamente el patrón que `PRINCIPLES.md` busca evitar ("ningún módulo conoce directamente a otro", "todas las herramientas son módulos independientes"). Es decir: **este repo es el "antes"**; `upfunnel-os` documenta el **"después" deseado**. Ver `docs/06_Brecha_hacia_UpFunnel_OS.md` (propuesto en la sección siguiente) para el análisis de la brecha.
