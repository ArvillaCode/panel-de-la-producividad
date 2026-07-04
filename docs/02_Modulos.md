# 02. Módulos (inventario funcional actual)

> Nota de terminología: en este documento "módulo" significa **área funcional cohesionada del monolito**, no un módulo independiente en el sentido de `upfunnel-os` (que exige desacoplamiento total y comunicación solo por API — ver [`06_Brecha_hacia_UpFunnel_OS.md`](./06_Brecha_hacia_UpFunnel_OS.md)). Hoy todos comparten código, base de datos y contexto de auth.

## Catálogo de Agentes
- **UI:** `src/components/AgentPanel.jsx`, `AgentCard.jsx`, `AgentCompactCard.jsx`.
- **Datos:** tabla `agents` en Supabase; fallback a `src/data/agents.js` si la consulta falla.
- **Admin:** `src/pages/admin/AdminAgents.jsx` (CRUD, visibilidad, `admin_only`).
- **Estado:** completo y estable; incluye contador de interacciones (`total_interactions`).

## Asistente / Matchmaker
- **UI:** `src/components/user/AgentGuide.jsx` (chat flotante), configuración en `src/pages/admin/MatchmakerConfig.jsx` y `AdminConfig.jsx`.
- **Backend:** Edge Function `supabase/functions/openrouter-chat/index.ts`.
- **Estado:** funcional, con rate limiting (15 req/min/usuario) y manejo de errores por tipo (perfil no aprobado, asistente desactivado, sin respuesta del proveedor). Modelo y prompt configurables desde `system_config`.
- **Inconsistencia documental:** `Guia_Conexion_IA.md` y `Guia_Conexion_IA_Upfunnel.md` en la raíz describen una arquitectura distinta (Next.js API route + Google Gemini SDK directo) que **no coincide con el código real**. Tratar como legado, no como referencia.

## Academia (LMS)
- **UI usuario:** `src/app/dashboard/academia/page.tsx` (curso → módulo → lección, video embebido YouTube/Vimeo/Drive o R2 directo, materiales adjuntos, progreso local).
- **UI admin:** `src/app/dashboard/academia/admin/page.tsx` (creador de contenido).
- **Datos:** tablas `academy_courses`, `academy_modules`, `academy_lessons`.
- **Media:** subida/lectura vía Cloudflare Worker (`workers/r2-presign.js`) + helper `src/lib/academyR2Upload.js`.
- **Estado:** en desarrollo activo (mayor volumen de commits recientes). Progreso de usuario solo en `localStorage`, no en Supabase (no auditable ni multi-dispositivo).

## Autenticación y Gestión de Usuarios
- **Núcleo:** `src/hooks/useAuth.jsx` (contexto global de sesión, perfil, notificaciones, RPCs admin).
- **Admin:** `src/pages/admin/AdminUsers.jsx`.
- **Estado:** completo — login password y Magic Link/OTP, roles (`admin`/`core_admin`/`editor`/`support`/`user`), expiración de suscripción por fecha, protección del último admin.
- **Incompleto declarado:** 2FA es solo un switch estético (confirmado en `ADMIN_STATUS.md`), sin flujo OTP adicional real.

## Panel de Administración
- **Páginas:** `AdminDashboard` (métricas), `AdminUsers`, `AdminAgents`, `AdminBanners`, `AdminConfig`, `AdminReleases`, `AdminLogs`, `MatchmakerConfig`.
- **Estado:** completo funcionalmente; modo mantenimiento/modo debug/frecuencia de backup son flags de `system_config` sin consumidor verificado en el código (ver `ADMIN_STATUS.md` y `07_Pendientes_y_Riesgos.md`).

## Pagos
- **Backend:** Edge Function `stripe-webhook` (activa/reactiva/revoca perfiles), idempotencia vía tabla `webhook_events`.
- **Frontend:** enlace directo a un Stripe Payment Link hosteado, sin checkout propio.
- **Estado:** funcional para el flujo de pago único anual descrito en `stripe_integration_guide.md`.

## Notificaciones y Release Notes
- **UI:** `GlobalBanner.jsx`, `ReleaseAutoNotification.jsx`, `ReleaseNotesModal.jsx`, badge de novedades.
- **Backend:** tablas `notifications`, `release_notes`, `user_release_reads`; generación automática de notas vía Edge Function `auto-release` llamada desde GitHub Actions en cada push a `main`.
- **Estado:** completo, con lectura optimista y notas "privadas" (`is_visible: false`) que un admin debe publicar manualmente desde `AdminReleases.jsx`.
