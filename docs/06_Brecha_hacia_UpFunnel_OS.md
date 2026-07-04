# 06. Brecha hacia UpFunnel OS

Este documento compara el estado actual de `panel-de-la-producividad` (este repo) contra los **principios rectores** declarados en el repositorio hermano [`upfunnel-os`](https://github.com/ArvillaCode/upfunnel-os) (`PRINCIPLES.md`), que define hacia dónde debe evolucionar la plataforma: un **"IA Operating System"** donde un núcleo de IA es el único punto de entrada del usuario y orquesta módulos independientes conectados solo por API.

`upfunnel-os` está hoy en **Fase 0 (documentación)** — ningún principio tiene todavía una decisión de implementación tomada (no hay ADRs). Este documento existe para que, cuando esa fase avance, las decisiones se tomen conociendo el punto de partida real.

## Comparación principio por principio

| Principio (`upfunnel-os`) | Estado en el código actual |
|---|---|
| 1. La IA Operating System es el único punto de entrada del usuario | ❌ No existe núcleo de IA como entrada. El usuario navega directamente por rutas de React (`AgentPanel`, Academia, Admin); el chat de IA (`AgentGuide.jsx`) es una función opcional y adicional, no la puerta de entrada. |
| 2. Todas las herramientas son módulos independientes | ❌ Agentes, Academia, Admin y Auth comparten codebase, base de datos y contexto (`useAuth.jsx`). No hay separación de despliegue, versión ni ciclo de vida. |
| 3. Ningún módulo conoce directamente a otro | ❌ Ejemplos directos: `AgentPanel.jsx` importa y usa `useAuth`, `supabase`, `useFavorites`, componentes de Academia y Admin conviven en el mismo router (`App.jsx`); la Edge Function del asistente hace `SELECT` directo sobre la tabla `agents`. |
| 4. Toda comunicación ocurre mediante APIs | ⚠️ Parcial. La comunicación con Supabase sí pasa por su API REST/RPC, pero **no hay una API interna propia** entre "features" del producto — todo son queries directas de Supabase desde cualquier componente. |
| 5. La IA decide automáticamente qué herramienta utilizar | ⚠️ Parcial/superficial. El asistente actual **recomienda en texto** (marcador `[BOT_LINK:Nombre|URL]`) cuál agente externo abrir, pero no invoca ni orquesta ningún módulo interno — es sugerencia, no enrutamiento real (tool calling). |
| 6. Los módulos deben poder agregarse/eliminarse sin tocar el núcleo | ❌ Agregar una funcionalidad hoy requiere tocar `App.jsx` (rutas), `useAuth.jsx` (si necesita roles/estado) y la base de datos compartida. |
| 7. Arquitectura escalable orientada a plugins | ❌ No existe ningún mecanismo de registro de plugins ni contrato de módulo. |
| 8. La documentación es la fuente de verdad | ⚠️ Este repo tiene documentación abundante pero dispersa y con contradicciones (ver [`07_Pendientes_y_Riesgos.md`](./07_Pendientes_y_Riesgos.md)); `upfunnel-os` centraliza la visión, pero aún no está poblada. |

## Lectura honesta de la brecha

No es una brecha pequeña: **`upfunnel-os` no describe una refactorización incremental del código actual, describe un sistema distinto** (arquitectura de plugins con núcleo orquestador + Tool Registry + módulos aislados con datos propios, según `docs/07_Database.md` de `upfunnel-os`: *"base de datos por módulo vs. compartida"*). El monolito actual usa **una sola base de datos compartida** para todo, lo opuesto al aislamiento que exige el principio 2-3.

Esto tiene dos lecturas posibles (a decidir con el equipo, no asumidas aquí):

- **(a) Reescritura por fases**: construir el núcleo de IA Operating System como una capa nueva, y migrar Agentes/Academia/Admin a "módulos" uno por uno detrás de una API, deprecando el acceso directo a Supabase desde el cliente.
- **(b) Evolución incremental disfrazada de OS**: mantener Supabase como base compartida pero introducir una capa de orquestación de IA (tool calling real) por encima del monolito actual, aceptando una versión más laxa del principio 2-3 mientras el producto crece.

## Qué falta para que `upfunnel-os` deje de ser solo un índice

Según su propio `10_Roadmap.md`, la Fase 0 (documentación) sigue abierta. Antes de escribir código hacia esta visión, `upfunnel-os` necesita al menos:
- El primer ADR real (ej. `0001-eleccion-de-nucleo-ia.md`): qué motor/framework de orquestación se usará para el núcleo.
- Una definición concreta de "contrato mínimo de módulo" (`03_Modulos.md` de `upfunnel-os`, hoy vacío).
- Un criterio de qué módulo migrar primero (`03_Modulos.md`, punto 6: *"criterios para decidir si una funcionalidad es un módulo nuevo o parte de uno existente"*).

## Recomendación de trabajo conjunto

Usar el catálogo de `docs/02_Modulos.md` (este repo) como candidatos reales a convertirse en los "primeros módulos de referencia" de la Fase 2 del roadmap de `upfunnel-os`, priorizando el que tenga **menor acoplamiento actual** con `useAuth.jsx` y la tabla `profiles` — probablemente la **Academia**, que ya tiene sus propias tablas (`academy_*`) relativamente aisladas y un módulo de storage propio (R2), a diferencia de Agentes o Admin que dependen fuertemente de roles y perfiles compartidos.
