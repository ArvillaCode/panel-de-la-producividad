# Guia de Conexion: Inteligencia Artificial en Upfunnel

El asistente `AgentGuide` ya no llama proveedores de IA desde el navegador. El flujo seguro es:

1. El usuario autenticado envia el historial a la Edge Function `openrouter-chat`.
2. La funcion valida el JWT con Supabase.
3. La funcion consulta perfil, configuracion y agentes visibles en el backend.
4. La funcion llama a OpenRouter usando el secreto `OPENROUTER_API_KEY`.
5. El navegador recibe solo el texto de respuesta.

## Variables Requeridas

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Backend / Supabase Edge Functions:

```env
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_ORIGINS=https://upfunnel.click,https://app.upfunnel.click,http://localhost:5173
```

No uses variables `VITE_` para claves privadas de IA. Todo valor con prefijo `VITE_` termina disponible en el bundle del navegador.

## Operacion

- El modelo global se configura en `system_config.ai_model`.
- El prompt global se configura en `system_config.system_prompt` / `ai_system_prompt`.
- Los agentes `admin_only` solo se inyectan al prompt si el usuario autenticado es admin o core_admin.
- La clave de OpenRouter no se guarda en `system_config`; debe existir como secreto `OPENROUTER_API_KEY`.

## Troubleshooting

- `server_not_configured`: falta una variable del backend.
- `profile_not_approved`: el usuario no esta aprobado o activo.
- `assistant_disabled`: el asistente esta desactivado para usuarios no admin.
- `OPENROUTER_NO_ENDPOINTS_FOUND`: revisa saldo, modelo disponible y politicas de privacidad en OpenRouter.
