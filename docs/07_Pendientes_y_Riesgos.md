# 07. Pendientes y Riesgos

> Última verificación: 2026-07-03 (segunda pasada, tras integrar 43 commits de mayo-julio 2026: planes, finanzas, refactor de Academia, sprint de seguridad).

Consolidado de deuda técnica, inconsistencias documentales y preguntas abiertas detectadas durante el análisis. Ver `PROJECT_ANALYSIS.md` para el detalle narrativo de cada punto.

## Deuda técnica en código

- `useAuth.jsx` es un contexto único (aún mayor tras sumar la lógica de planes/trial) con demasiadas responsabilidades (sesión, perfil, notificaciones, gestión de usuarios admin, RPCs de negocio). Candidato a dividirse antes de intentar cualquier modularización. La Academia ya demostró el camino: fue refactorizada de monolito a `components/` + `hooks/` + `services/`.
- Progreso de Academia — **parcialmente resuelto**: existe `academy_progress` en DB (segundos vistos, RLS por usuario, usada por `AcademyPlayer`), pero las lecciones completadas (`academy_completed`) siguen solo en `localStorage` (`useAcademyProgress.ts`).
- Restricción de dominio hardcodeada (`DomainRestrictedRoute` en `App.jsx`), incluida una IP fija de Coolify.
- `react-draggable` declarado en `package.json` sin uso localizado — la reordenación de la Academia usa el hook propio `useAcademyDragDrop`, lo que refuerza que probablemente es dependencia residual.
- Dos fuentes de verdad para la CSP (`vercel.json` y `_headers` estáticos).
- Carpetas ajenas al build en el árbol de trabajo: `.codex-tmp/`, `Nueva carpeta` (sin explorar) — limpieza pendiente.

## Inconsistencias documentales

- `README.md` de la raíz describe una versión muy anterior del producto (sin Supabase, Auth, Stripe, Academia ni panel admin).
- `Guia_Conexion_IA.md` y `Guia_Conexion_IA_Upfunnel.md` describen una arquitectura de IA (Next.js + Google Gemini) que **no coincide** con la implementación real (Supabase Edge Function + OpenRouter).
- `sec_audit_report.md` (2026-05-21) no fue actualizado tras remediar sus propios hallazgos críticos (ver [`04_Seguridad.md`](./04_Seguridad.md)).
- `stripe_integration_guide.md` describe el flujo antiguo de pago único anual de $50 USD; el producto real hoy usa planes de $14.99/mes y $79.99/año parametrizados en `pricing_plans`.
- **Nueva (jul-2026), mitigada (2026-07-04):** `DOCUMENTACION_COMPLETA.md` (manual técnico V3.0) + la página in-app `/documentacion` coexisten con esta carpeta `/docs`. El manual porta ahora una nota de vigencia que lo declara **no autoritativo** y enlaza a `/docs`, y su diagrama ya no dice "Gemini API Edge" — la capa real es: Edge Function `openrouter-chat` → OpenRouter, con `google/gemini-2.5-flash` como modelo por defecto (Gemini es el *modelo*, no una integración aparte). Pendiente: propiedad y cadencia del manual (pregunta 7) y decidir si su contenido único se fusiona en `/docs`.
- `openrouter_skill.md` (852 líneas, raíz del repo) apareció sin integrarse a ninguna estructura documental — evaluar si pertenece a `/docs`, al manual de producto, o a tooling.

## Esquema de base de datos no versionado

`supabase/migrations/20260511131943_remote_schema.sql` está vacío. El esquema base completo anterior a mayo 2026 no puede reconstruirse solo con este repositorio (las migraciones 7-12 sí versionan los cambios funcionales recientes: planes, finanzas, YouTube/progreso). Ver [`03_Base_de_Datos.md`](./03_Base_de_Datos.md).

## Preguntas abiertas para el equipo (no deducibles del código)

1. ¿Cuál es el entorno de producción activo real: Vercel, el contenedor Docker/Coolify, o ambos?
2. ¿Dónde y cómo se gestiona el esquema base de Supabase si no está en `migrations/`?
3. ¿Los flags "modo mantenimiento" y "modo debug" de `/admin/config` tienen algún consumidor real fuera del código revisado, o son placeholders?
4. ¿Existe algún proceso externo (cron, Supabase pg_cron, script) que implemente la "frecuencia de respaldo" y "retención de logs" configurables en el admin?
5. ¿Cuál es el plan de fases real para migrar hacia la visión de `upfunnel-os` (Fase 0 → Fase 1 del roadmap de ese repo)? Ver [`06_Brecha_hacia_UpFunnel_OS.md`](./06_Brecha_hacia_UpFunnel_OS.md).
6. ¿Qué relación de mantenimiento tendrán este repo y `upfunnel-os` de aquí en adelante — se fusionan, o `upfunnel-os` seguirá siendo un repo de documentación pura mientras el código migra aquí mismo por fases?
7. ¿Quién mantiene `DOCUMENTACION_COMPLETA.md` y con qué cadencia, ahora que existen dos fuentes de documentación técnica en paralelo?
