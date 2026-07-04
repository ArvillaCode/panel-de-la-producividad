# 07. Pendientes y Riesgos

Consolidado de deuda técnica, inconsistencias documentales y preguntas abiertas detectadas durante el análisis. Ver `PROJECT_ANALYSIS.md` para el detalle narrativo de cada punto.

## Deuda técnica en código

- `useAuth.jsx` es un contexto único de +800 líneas con demasiadas responsabilidades (sesión, perfil, notificaciones, gestión de usuarios admin, RPCs de negocio). Candidato a dividirse antes de intentar cualquier modularización.
- Progreso de Academia guardado solo en `localStorage`, no en Supabase.
- Restricción de dominio hardcodeada (`DomainRestrictedRoute` en `App.jsx`), incluida una IP fija de Coolify.
- `react-draggable` declarado en `package.json` sin uso localizado — confirmar si sigue siendo necesario.
- Dos fuentes de verdad para la CSP (`vercel.json` y `_headers` estáticos).
- Carpetas ajenas al build en el árbol de trabajo: `.codex-tmp/`, `Nueva carpeta` (sin explorar) — limpieza pendiente.

## Inconsistencias documentales

- `README.md` de la raíz describe una versión muy anterior del producto (sin Supabase, Auth, Stripe, Academia ni panel admin).
- `Guia_Conexion_IA.md` y `Guia_Conexion_IA_Upfunnel.md` describen una arquitectura de IA (Next.js + Google Gemini) que **no coincide** con la implementación real (Supabase Edge Function + OpenRouter).
- `sec_audit_report.md` (2026-05-21) no fue actualizado tras remediar sus propios hallazgos críticos (ver [`04_Seguridad.md`](./04_Seguridad.md)).
- Precio de suscripción distinto entre `stripe_integration_guide.md` ($50 USD) y la landing actual ($49 USD).

## Esquema de base de datos no versionado

`supabase/migrations/20260511131943_remote_schema.sql` está vacío. El esquema base completo no puede reconstruirse solo con este repositorio. Ver [`03_Base_de_Datos.md`](./03_Base_de_Datos.md).

## Preguntas abiertas para el equipo (no deducibles del código)

1. ¿Cuál es el entorno de producción activo real: Vercel, el contenedor Docker/Coolify, o ambos?
2. ¿Dónde y cómo se gestiona el esquema base de Supabase si no está en `migrations/`?
3. ¿Los flags "modo mantenimiento" y "modo debug" de `/admin/config` tienen algún consumidor real fuera del código revisado, o son placeholders?
4. ¿Existe algún proceso externo (cron, Supabase pg_cron, script) que implemente la "frecuencia de respaldo" y "retención de logs" configurables en el admin?
5. ¿Cuál es el plan de fases real para migrar hacia la visión de `upfunnel-os` (Fase 0 → Fase 1 del roadmap de ese repo)? Ver [`06_Brecha_hacia_UpFunnel_OS.md`](./06_Brecha_hacia_UpFunnel_OS.md).
6. ¿Qué relación de mantenimiento tendrán este repo y `upfunnel-os` de aquí en adelante — se fusionan, o `upfunnel-os` seguirá siendo un repo de documentación pura mientras el código migra aquí mismo por fases?
