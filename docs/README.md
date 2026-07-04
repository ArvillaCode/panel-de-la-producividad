# Documentación de `panel-de-la-producividad` (Upfunnel — estado actual)

Esta carpeta documenta el **estado real e implementado** de la plataforma Upfunnel tal como existe hoy en este repositorio (el "as-is"). Es el complemento operativo de [`PROJECT_ANALYSIS.md`](../PROJECT_ANALYSIS.md) (análisis puntual, fecha 2026-07-03) y del repositorio hermano [`upfunnel-os`](https://github.com/ArvillaCode/upfunnel-os), que define la **visión objetivo** ("IA Operating System" modular, ver `docs/06_Brecha_hacia_UpFunnel_OS.md`).

Mientras `upfunnel-os` responde "¿hacia dónde vamos?", esta carpeta responde **"¿dónde estamos parados hoy, exactamente?"** — para que cualquier decisión de migración parta de hechos verificados en código, no de suposiciones.

## Índice

| Documento | Contenido |
|---|---|
| [00_Estado_Actual.md](./00_Estado_Actual.md) | Resumen ejecutivo del producto y su etapa actual |
| [01_Arquitectura.md](./01_Arquitectura.md) | Arquitectura as-built: capas, flujos de datos, integraciones externas |
| [02_Modulos.md](./02_Modulos.md) | Inventario de "módulos" funcionales tal como existen hoy (acoplados, no independientes) |
| [03_Base_de_Datos.md](./03_Base_de_Datos.md) | Tablas, RPCs y políticas RLS inferidas de las migraciones y del código cliente |
| [04_Seguridad.md](./04_Seguridad.md) | Estado de seguridad, hardening aplicado y brechas conocidas |
| [05_Despliegue_e_Infraestructura.md](./05_Despliegue_e_Infraestructura.md) | Vercel, Docker/Coolify, Cloudflare Workers/R2, Supabase, CI/CD |
| [06_Brecha_hacia_UpFunnel_OS.md](./06_Brecha_hacia_UpFunnel_OS.md) | Comparación entre el monolito actual y la visión de "IA Operating System" modular |
| [07_Pendientes_y_Riesgos.md](./07_Pendientes_y_Riesgos.md) | Deuda técnica, inconsistencias y preguntas abiertas |

## Convenciones

- Todo lo que no pudo verificarse directamente en el código se marca **"Pendiente de confirmar"**, igual que en `PROJECT_ANALYSIS.md`.
- Estos documentos describen **hechos del código actual**, no aspiraciones. Las decisiones de rediseño (target architecture, fases de migración, ADRs) se registran en el repositorio `upfunnel-os`, no aquí — para no duplicar ni desincronizar la fuente de verdad de la visión.
- Cuando el código cambie de forma relevante para alguno de estos documentos, debe actualizarse en el mismo PR que introduce el cambio.

## Estado

📄 Contenido generado a partir de una auditoría estática completa del repositorio (código, migraciones SQL, Edge Functions, workers, CI/CD y documentación interna existente). **Última verificación: 2026-07-03 (segunda pasada)** — actualizado tras integrar los 43 commits de mayo-julio 2026 (planes de suscripción, módulo financiero, refactor de Academia con player de YouTube, sprint de seguridad v31). Pendiente de revisión por el equipo antes de tratarse como referencia definitiva.
