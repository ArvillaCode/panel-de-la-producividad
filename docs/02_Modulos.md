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

## Academia (LMS) — refactorizada
- **UI usuario:** `src/app/dashboard/academia/page.tsx`, ya no monolítica: componentes extraídos (`AcademyPlayer.tsx` — player de YouTube propio con controles custom, tracking de visualización, `require_completion`/`minimum_watch_percent` por lección —, `CourseCard`, `LessonSidebar`, `AdminActionsMenu`), hooks (`useAcademyDragDrop` para reordenación persistente, `useAcademyPermissions`, `useAcademyProgress`) y capa de datos (`services/academyService.ts`, `utils/mediaUtils.ts`).
- **UI admin:** `src/app/dashboard/academia/admin/page.tsx` (creador de contenido) + modo edición inline con autoguardado e insignia en tiempo real.
- **Datos:** tablas `academy_courses`, `academy_modules`, `academy_lessons` (ampliada con campos `youtube_*`), `academy_progress` (RLS por usuario, segundos vistos) y `academy_analytics_events`.
- **Media:** YouTube embebido (vía `youtube_id`), o subida/lectura vía Cloudflare Worker (`workers/r2-presign.js`, ahora con CDN edge caching, Range requests y soporte MKV) + helper `src/lib/academyR2Upload.js`; Google Drive con auto-conversión de enlaces.
- **Acceso:** activada para todos los planes; los cursos premium se restringen por plan (trial incluido, legacy protegido).
- **Estado:** en desarrollo muy activo. El progreso es híbrido: la tabla `academy_progress` persiste segundos vistos, pero las lecciones completadas (`academy_completed`) siguen en `localStorage`.

## Autenticación y Gestión de Usuarios
- **Núcleo:** `src/hooks/useAuth.jsx` (contexto global de sesión, perfil, notificaciones, RPCs admin; ampliado con lógica de planes y trial).
- **Admin:** `src/pages/admin/AdminUsers.jsx` (ampliado: asignación de plan con recálculo de fechas, trial manual de 7 días).
- **Estado:** completo — login password y Magic Link/OTP, roles (`admin`/`core_admin`/`editor`/`support`/`user`), expiración de suscripción por fecha con fallback legacy, protección del último admin (ahora también a nivel de DB vía trigger `check_last_admin_protection`, no solo en frontend).
- **Incompleto declarado:** 2FA es solo un switch estético (confirmado en `ADMIN_STATUS.md`), sin flujo OTP adicional real.

## Panel de Administración
- **Páginas:** `AdminDashboard` (métricas), `AdminUsers`, `AdminAgents`, `AdminBanners`, `AdminConfig`, `AdminReleases`, `AdminLogs`, `MatchmakerConfig`.
- **Estado:** completo funcionalmente; modo mantenimiento/modo debug/frecuencia de backup son flags de `system_config` sin consumidor verificado en el código (ver `ADMIN_STATUS.md` y `07_Pendientes_y_Riesgos.md`).

## Pagos y Planes
- **Planes:** `monthly` ($14.99), `annual` ($79.99), `trial` (7 días gratis, alta manual) y `legacy` (usuarios antiguos con `is_legacy_fallback` que evita bloqueo al expirar). Parametrizados en la tabla `pricing_plans`; el campo `plan` vive en `profiles` con constraint CHECK.
- **Backend:** Edge Function `stripe-webhook` ampliada — deduce el plan del intervalo de la suscripción de Stripe (`month`/`year`), activa/crea el perfil con `plan` y `stripe_subscription_id`, registra cada pago en la tabla `payments`, y al cancelarse revoca acceso o revierte a `legacy` según el fallback. Idempotencia vía `webhook_events`.
- **Frontend:** Payment Links de Stripe (mensual y anual) en la landing, sin checkout propio; gating premium unificado por plan en `useAuth.jsx`.
- **Estado:** funcional. Nota: `stripe_integration_guide.md` quedó desactualizada (describe el flujo de pago único anual de $50).

## Finanzas (Admin) — módulo nuevo
- **UI:** `src/pages/admin/AdminFinance.jsx` (~985 líneas, lazy-loaded), ruta `/admin/finance`.
- **Datos:** tablas `payments`, `pricing_plans`, `financial_targets_history` y `webhook_events` (todas con RLS admin-only para lectura/escritura salvo `pricing_plans`, legible por autenticados); RPC `get_financial_dashboard_stats`.
- **Estado:** primera versión (`financial_v1_schema.sql`); dashboard de ingresos, transacciones y metas.

## Notificaciones y Release Notes
- **UI:** `GlobalBanner.jsx`, `ReleaseAutoNotification.jsx`, `ReleaseNotesModal.jsx`, badge de novedades.
- **Backend:** tablas `notifications`, `release_notes`, `user_release_reads`; generación automática de notas vía Edge Function `auto-release` llamada desde GitHub Actions en cada push a `main`.
- **Estado:** completo, con lectura optimista y notas "privadas" (`is_visible: false`) que un admin debe publicar manualmente desde `AdminReleases.jsx`.
