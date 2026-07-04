# 04. Seguridad

## Resumen del estado

`sec_audit_report.md` (2026-05-21) es la auditoría formal más reciente presente en el repo. Su diagnóstico en ese momento: **"protegido en capa cliente / vulnerable en backend (RLS faltante)"**. Las migraciones posteriores (ver [`03_Base_de_Datos.md`](./03_Base_de_Datos.md)) indican que los hallazgos críticos **ya fueron remediados**:

| Hallazgo original (2026-05-21) | Estado verificado ahora |
|---|---|
| RLS inactivo en 11 tablas críticas (`system_config`, `agents`, academia, logs, etc.) | ✅ Remediado — políticas presentes en `20260521120000_rls_hardening.sql` y siguientes |
| Sin rate limiting en `openrouter-chat` (riesgo de DoS financiero contra OpenRouter) | ✅ Remediado — límite de 15 req/min/usuario implementado en la función actual |
| Componentes huérfanos `SignUpModal.jsx`, `RegisterForm.jsx` | ✅ Remediado — ya no existen en `src/components/` |
| Carpeta vacía `mcp-antigravity-auditor/` | ✅ Remediado — ya no existe en el árbol del repo |

**El propio `sec_audit_report.md` no fue actualizado** para reflejar estas correcciones — sigue describiendo el estado de mayo. Recomendación: o se actualiza el reporte, o se reemplaza por este documento como fuente viva.

## Controles de seguridad activos hoy

- **RLS granular** en todas las tablas de negocio, apoyada en `public.is_admin(auth.uid())`.
- **RPCs `SECURITY DEFINER`** como única vía de escritura administrativa sobre `profiles` (evita que el cliente escriba roles/estados directamente).
- **`system_config` no expuesta como tabla** — solo lectura pública vía `get_public_system_config()`.
- **CSP estricta** en `vercel.json` y en `_headers` estáticos (dos definiciones a reconciliar, ver [`01_Arquitectura.md`](./01_Arquitectura.md)).
- **Edge Functions con validación server-side de sesión y rol** (`openrouter-chat` valida JWT, perfil aprobado y estado del asistente antes de gastar cuota de OpenRouter).
- **Webhook de Stripe con verificación de firma criptográfica** (`stripe.webhooks.constructEventAsync`) e idempotencia vía `webhook_events`.
- **Worker de R2 con validación de rol admin** contra Supabase antes de firmar cualquier `PUT`, y validación estricta de rutas/tipos de archivo/tamaño (`validateUpload`).
- **Protección del último administrador en dos capas**: la app rechaza degradar, expulsar o eliminar al único `admin` restante (`useAuth.jsx`), y desde el sprint 1 v31 también lo impide un trigger a nivel de base de datos (`check_last_admin_protection`) — la protección ya no depende solo del frontend.
- **Sprint de seguridad 1 v31** (migración `20260531`, 612 líneas): `audit_logs` inmutable por trigger (`prevent_audit_log_mutation` — ni admins pueden alterar o borrar registros de auditoría), auditoría automática de acciones administrativas y de cambios de perfil mediante triggers (`audit_administrative_actions`, `audit_profile_changes` — el registro ya no depende de que el frontend llame a `logAction`), y re-endurecimiento de las RPCs administrativas.
- **RLS extendido a las tablas nuevas**: financieras (`payments`, `pricing_plans`, `financial_targets_history`, `webhook_events` — admin-only salvo lectura de planes) y de Academia (`academy_progress` owner-only, `academy_analytics_events` insert autenticado/select admin).

## Brechas y riesgos no resueltos (identificados en este análisis, jul-2026)

1. **2FA cosmético** — el switch en `/admin/config` no dispara ningún flujo OTP real (`ADMIN_STATUS.md`).
2. **Modo mantenimiento/debug sin consumidor verificado** — flags guardados pero sin lógica de lectura localizada en frontend.
3. **Restricción de dominio hardcodeada** (`DomainRestrictedRoute` en `App.jsx`) — compara hostname contra literales, incluida una IP fija; frágil y no auditable centralmente.
4. **Progreso de Academia solo en `localStorage`** — no es un riesgo de seguridad per se, pero sí de integridad de datos (un admin no puede auditar el avance real de un alumno).
5. **Sin esquema base versionado** — imposibilita reconstruir o auditar el modelo de datos completo solo desde este repo (ver [`03_Base_de_Datos.md`](./03_Base_de_Datos.md)).

## Recomendación

Antes de iniciar cualquier migración hacia la arquitectura modular de `upfunnel-os` (ver [`06_Brecha_hacia_UpFunnel_OS.md`](./06_Brecha_hacia_UpFunnel_OS.md)), congelar este documento como línea base de seguridad y exigir que cada módulo nuevo declare su propio modelo de amenazas — el principio 3 de `PRINCIPLES.md` ("ningún módulo conoce a otro") implica que la superficie de ataque debe evaluarse por módulo, no de forma monolítica como hoy.
