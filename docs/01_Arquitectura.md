# 01. Arquitectura (as-built)

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 8, SPA (no Next.js real pese a la carpeta `src/app/dashboard/`), `react-router-dom` v7 |
| Estilos | TailwindCSS 3 + `App.css` custom, dark/light mode |
| Backend | Supabase (PostgreSQL + Auth + RLS + RPC + Edge Functions/Deno) |
| LLM Gateway | OpenRouter, consumido solo desde una Edge Function (nunca desde el cliente) |
| Pagos | Stripe (Payment Links + Webhook) |
| Media | Cloudflare R2 + Worker propio (`workers/r2-presign.js`) |
| Hosting | Vercel **y** Docker/Nginx (Coolify) en paralelo — ver [`05_Despliegue_e_Infraestructura.md`](./05_Despliegue_e_Infraestructura.md) |
| CI/CD | GitHub Actions: `release-drafter` + workflow custom que llama a la Edge Function `auto-release` |

Tabla ampliada con notas por dependencia en `PROJECT_ANALYSIS.md`, sección 2.

## Vista general de comunicación entre componentes

```
[Navegador] ──(supabase-js, anon key)──► Supabase (Postgres + RLS + RPCs SECURITY DEFINER)
     │
     ├──(JWT usuario)──► Edge Function openrouter-chat ──► OpenRouter API
     │                         (rate-limit 15 req/min, valida perfil aprobado)
     │
     └──(admin, JWT)──► Cloudflare Worker r2-presign ──► Cloudflare R2
                              (firma PUT / sirve GET con streaming de video)

[Stripe] ──(webhook firmado)──► Edge Function stripe-webhook ──(service role)──► Supabase.profiles

[GitHub Actions, push a main] ──(token compartido)──► Edge Function auto-release ──► Supabase.release_notes
```

Todos los flujos están descritos con detalle en `PROJECT_ANALYSIS.md`, sección 4.

## Puntos de acoplamiento (relevantes para la sección 6 — brecha hacia el IA OS)

- **Una sola base de datos** para todo: perfiles, agentes, academia, notificaciones, logs, config del asistente. No hay separación de datos por dominio funcional.
- **Un solo cliente Supabase** (`src/lib/supabase.js`) importado directamente por casi cualquier componente — no existe una capa de abstracción/API interna entre "features".
- **El "asistente" no orquesta módulos**: es una función de recomendación de texto que conoce de antemano la tabla `agents` completa vía una query SQL directa dentro de la Edge Function, no un router que invoque servicios independientes.
- **`AuthProvider` (`useAuth.jsx`) es un god-context**: sesión, perfil, notificaciones, gestión de usuarios admin, RPCs de negocio y ahora la lógica de planes/trial conviven en un solo archivo consumido por casi toda la app.
- **Excepción parcial (jul-2026):** la Academia fue refactorizada con una capa de datos propia (`academyService.ts`) y componentes/hooks separados — el primer precedente interno de la separación por capas que la migración hacia `upfunnel-os` necesitará en el resto de la app.

## Restricciones de infraestructura observadas

- Restricción de dominio hardcodeada en `App.jsx` (`DomainRestrictedRoute`): compara `window.location.hostname` contra literales, incluida una IP fija de Coolify (`51.79.68.*`). Frágil ante cambios de infraestructura.
- CSP definida tanto en `vercel.json` como en cabeceras estáticas (`public/_headers`, `dist/_headers`) — dos fuentes de verdad para la misma política.
