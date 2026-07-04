# 00. Estado Actual

## Qué es hoy Upfunnel

Un SaaS de productividad (React SPA + Supabase) con tres pilares funcionales:

1. **Catálogo de agentes de IA** (~71 tarjetas con enlace directo a GPTs de ChatGPT), organizadas por categoría.
2. **Asistente/copiloto propio** ("matchmaker"): chat que usa un LLM vía OpenRouter para recomendar qué agente del catálogo usar.
3. **Academia**: LMS interno (cursos → módulos → lecciones en video), con contenido premium/gratuito.

Todo protegido por una puerta de pago/aprobación: registro o pago vía Stripe → aprobación manual o automática (webhook) → acceso al panel. Existe un panel de administración completo en `/admin/*`.

Detalle completo en [`PROJECT_ANALYSIS.md`](../PROJECT_ANALYSIS.md), secciones 1 y 5.

## Etapa del producto

El propio código y su historial de commits muestran tres etapas superpuestas:

1. **Origen:** directorio estático de agentes GPT sin backend (el `README.md` de la raíz todavía describe esta etapa y está desactualizado).
2. **Actual/dominante:** SaaS completo con cuentas, panel admin, IA propia como capa de descubrimiento sobre el catálogo.
3. **En construcción activa:** Academia como canal de retención/upsell — es el área con más commits recientes (breadcrumbs, edición inline, ajustes de marca).

## Modelo de negocio observable

Suscripción por planes parametrizados en la tabla `pricing_plans`: **mensual $14.99 USD**, **anual $79.99 USD** (presentado como oferta de lanzamiento frente a un precio regular de $199), **trial de 7 días gratis** (alta manual desde el panel admin) y **legacy** para usuarios antiguos protegidos contra bloqueo al expirar (`is_legacy_fallback`). El webhook de Stripe asigna el plan automáticamente según el intervalo de la suscripción. No es freemium: todo el producto vive detrás del paywall, aunque la Academia está activada para todos los planes (los cursos premium se restringen por plan).

## Lo que este documento NO cubre

- La arquitectura objetivo de "IA Operating System" (módulos independientes + Tool Registry) definida en el repositorio `upfunnel-os` — ver [`06_Brecha_hacia_UpFunnel_OS.md`](./06_Brecha_hacia_UpFunnel_OS.md).
- Detalles de implementación por módulo — ver [`02_Modulos.md`](./02_Modulos.md).
