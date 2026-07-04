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

La landing (`src/pages/LandingPage.jsx`) vende una oferta de lanzamiento de $49 USD/año con renovación congelada frente a un precio regular de $199 USD — confirma suscripción anual con paywall, no freemium.

## Lo que este documento NO cubre

- La arquitectura objetivo de "IA Operating System" (módulos independientes + Tool Registry) definida en el repositorio `upfunnel-os` — ver [`06_Brecha_hacia_UpFunnel_OS.md`](./06_Brecha_hacia_UpFunnel_OS.md).
- Detalles de implementación por módulo — ver [`02_Modulos.md`](./02_Modulos.md).
