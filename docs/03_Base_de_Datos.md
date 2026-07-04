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
| `webhook_events` | Idempotencia de webhooks de Stripe | **Pendiente de confirmar** (no aparece en las políticas listadas) |
| `banners` | Banners globales | Sí (políticas de storage/tabla en `20260520_security_hardening.sql`) |
| Buckets de storage: `images`, `avatars` | Media de UI y avatares de usuario | Sí (políticas de storage) |

## Funciones RPC (`SECURITY DEFINER`)

- `public.is_admin(user_id)` — chequeo central de rol admin, usado en casi todas las políticas RLS.
- `public.admin_update_profile(target_user_id, profile_patch)` / `public.admin_delete_profile(target_user_id)` — únicas vías para que un admin modifique/borre perfiles ajenos.
- `public.reset_user_password(target_user_id, new_password)`.
- `public.get_public_system_config()` — única vía de lectura pública/segura de `system_config` (evita exponer la tabla cruda).
- `public.handle_new_user_profile()` — trigger de creación de perfil al registrarse.

## Historial de hardening (orden cronológico)

1. `20260520_security_hardening.sql` — RLS inicial de `profiles`, `banners`, storage; RPCs admin.
2. `20260521120000_rls_hardening.sql` — RLS extendido a agentes, academia, favoritos, ratings, sugerencias, notificaciones, logs, releases.
3. `20260521130000_delete_auth_user.sql` — función de borrado de usuario de Auth.
4. `20260522_lock_down_system_config.sql` — bloqueo de `system_config` detrás de RPC.
5. `20260523_security_hardening_phase2.sql` — reset de contraseña por admin + visibilidad de lecciones.
6. `20260526090000_academy_lesson_visibility_defaults.sql` — defaults de visibilidad de lecciones.

Este historial coincide con los hallazgos de `sec_audit_report.md` (auditoría del 2026-05-21), lo que confirma que las brechas de RLS detectadas ahí **fueron efectivamente remediadas** en migraciones posteriores.
