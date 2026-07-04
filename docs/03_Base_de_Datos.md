# 03. Base de Datos

## Advertencia principal

El esquema base de Supabase **no está versionado en este repositorio**. La migración `supabase/migrations/20260511131943_remote_schema.sql` existe pero tiene **0 líneas**. Todo lo que sigue se infirió de:
- Las migraciones incrementales de *hardening* que sí tienen contenido (RLS, funciones RPC).
- Las columnas y tablas referenciadas directamente desde el código cliente (`supabase.from(...)`, `.select(...)`).

**Pendiente de confirmar con el equipo:** dónde vive la fuente de verdad del esquema base (¿Supabase Studio manual sin exportar? ¿otro repo?). Sin esto, el esquema no es reproducible desde cero solo con este repositorio.

## Tablas identificadas (por uso en código + políticas RLS)

| Tabla | Rol | RLS confirmado por migración |
|---|---|---|
| `profiles` | Perfil de usuario, rol, estado de suscripción, `stripe_customer_id` | Sí (`20260520_security_hardening.sql`) |
| `agents` | Catálogo de agentes IA | Sí (`20260521120000_rls_hardening.sql`) |
| `system_config` | Config global (modelo IA, prompt, flags admin) | Sí, expuesta solo vía RPC `get_public_system_config` (`20260522_lock_down_system_config.sql`) |
| `academy_courses` / `academy_modules` / `academy_lessons` | Academia | Sí |
| `user_favorites` | Favoritos de agentes por usuario | Sí |
| `agent_ratings` | Calificaciones de agentes | Sí |
| `agent_suggestions` | Sugerencias de agentes enviadas por usuarios | Sí |
| `notifications` | Notificaciones personales/broadcast | Sí |
| `audit_logs` | Historial de actividad admin | Sí |
| `release_notes` / `user_release_reads` | Notas de versión y lectura por usuario | Sí |
| `webhook_events` | Idempotencia de webhooks de Stripe | Sí — formalizada en `20260530130000_financial_v1_schema.sql` (lectura admin-only) |
| `banners` | Banners globales | Sí (políticas de storage/tabla en `20260520_security_hardening.sql`) |
| `pricing_plans` | Catálogo parametrizable de planes (monthly/annual/trial/legacy) | Sí (lectura autenticados, escritura admin) |
| `payments` | Registro de pagos/transacciones de Stripe | Sí (admin-only) |
| `financial_targets_history` | Historial de metas financieras | Sí (admin-only) |
| `academy_progress` | Progreso de visualización por usuario/lección (`max_watched_seconds`) | Sí (owner-only, 4 políticas CRUD) |
| `academy_analytics_events` | Eventos de analítica de la Academia | Sí (insert autenticados, select admin) |
| Buckets de storage: `images`, `avatars` | Media de UI y avatares de usuario | Sí (políticas de storage) |

### Columnas nuevas relevantes (migraciones de mayo-junio 2026)

- `profiles.plan` (`monthly`/`annual`/`legacy`/`trial`, CHECK constraint) y `profiles.is_legacy_fallback` (reversión a legacy al expirar) — `20260529000000`.
- `profiles.stripe_subscription_id` (escrito por el webhook).
- `academy_lessons`: `youtube_id` (CHECK de formato de 11 caracteres), `youtube_title`, `youtube_duration_seconds`, `youtube_thumbnail_url`, `require_completion`, `minimum_watch_percent` (CHECK 1-100) — `20260602000000`.

## Funciones RPC (`SECURITY DEFINER`)

- `public.is_admin(user_id)` — chequeo central de rol admin, usado en casi todas las políticas RLS.
- `public.admin_update_profile(target_user_id, profile_patch)` / `public.admin_delete_profile(target_user_id)` — únicas vías para que un admin modifique/borre perfiles ajenos.
- `public.reset_user_password(target_user_id, new_password)`.
- `public.get_public_system_config()` — única vía de lectura pública/segura de `system_config` (evita exponer la tabla cruda).
- `public.handle_new_user_profile()` — trigger de creación de perfil al registrarse.

## Historial de migraciones (orden cronológico)

1. `20260520_security_hardening.sql` — RLS inicial de `profiles`, `banners`, storage; RPCs admin.
2. `20260521120000_rls_hardening.sql` — RLS extendido a agentes, academia, favoritos, ratings, sugerencias, notificaciones, logs, releases.
3. `20260521130000_delete_auth_user.sql` — función de borrado de usuario de Auth.
4. `20260522_lock_down_system_config.sql` — bloqueo de `system_config` detrás de RPC.
5. `20260523_security_hardening_phase2.sql` — reset de contraseña por admin + visibilidad de lecciones.
6. `20260526090000_academy_lesson_visibility_defaults.sql` — defaults de visibilidad de lecciones.
7. `20260529000000_add_plan_to_profiles.sql` — planes de suscripción (`plan`, `is_legacy_fallback`).
8. `20260529190000_update_admin_update_profile.sql` — RPC de admin actualizada para los campos nuevos.
9. `20260530130000_financial_v1_schema.sql` — esquema financiero v1: `pricing_plans`, `payments`, `financial_targets_history`, `webhook_events`, RPC `get_financial_dashboard_stats`.
10. `20260531_security_sprint_1_hardening_v31.sql` — sprint de seguridad: `audit_logs` inmutable por trigger, auditoría automática por triggers, protección del último admin en DB (ver `04_Seguridad.md`).
11. `20260601000000_add_trial_to_profiles_constraint.sql` — plan `trial` (7 días, $0) agregado al constraint y a `pricing_plans`.
12. `20260602000000_academy_youtube_integration.sql` — integración YouTube en lecciones + `academy_progress` + `academy_analytics_events` con RLS.

Las migraciones 1-6 coinciden con los hallazgos de `sec_audit_report.md` (auditoría del 2026-05-21), confirmando que las brechas de RLS detectadas ahí **fueron efectivamente remediadas**. Las migraciones 7-12 son funcionales (planes, finanzas, Academia), no solo de hardening — la advertencia principal sigue vigente: **el esquema base anterior a mayo 2026 sigue sin estar versionado en el repo**.
