# 🤖 Guía de Conexión: Inteligencia Artificial en Upfunnel (Google Gemini)

Esta guía documenta el funcionamiento, configuración y mantenimiento del asistente virtual (AgentGuide) integrado en Upfunnel utilizando la API de Google Generative AI.

---

## 🔑 1. Configuración del Entorno y Credenciales
El agente opera en el cliente usando el SDK oficial de Google. Requiere una clave API activa.

- **Variable de Entorno:** `VITE_GOOGLE_GEMINI_API_KEY`
- **Ubicación:** Esta variable debe configurarse en Vercel (Environment Variables) y en el archivo `.env.local` del entorno de desarrollo.
- **Validación:** Si la variable falta, el asistente informará inmediatamente: *"Fallo de Configuración: No se ha detectado la clave API..."*

## 🧠 2. Configuración del Modelo
- **Modelo Designado:** `gemini-1.5-flash-latest` (Elegido por su rapidez y optimización de costos en tareas de recomendación rápida).
- **Temperature:** `0.1` (Se mantiene muy bajo para forzar respuestas estrictas, analíticas y deterministas basadas únicamente en los agentes activos).
- **Max Output Tokens:** `500` (El agente de sugerencias es conciso y no debe dar monólogos largos, ahorrando consumo de API).

## ⚙️ 3. Flujo Lógico y "Prompt Engineering"
El asistente recibe un "System Prompt" invisible antes de cada interacción.

**Reglas de Oro del Prompt (Inyectadas en código):**
1. El agente desconoce que es una IA de Google; asume el rol de "Asistente de Upfunnel".
2. Su conocimiento está encapsulado: Solo puede sugerir herramientas que estén en la lista de agentes obtenida de Supabase.
3. Si le preguntan por algo externo, debe negarlo amablemente usando el nombre del usuario.
4. Genera botones ejecutables devolviendo la sintaxis estricta: `[BOT_LINK:Nombre|URL]`.

## 🛡️ 4. Resiliencia y Control de Errores
El componente `AgentGuide.jsx` tiene medidas de protección severas contra la latencia y la saturación:
- **Timeout Preventivo:** Si Gemini tarda más de 8 segundos en responder, se interrumpe la petición para no agotar el tiempo de ejecución en Vercel o el dispositivo móvil del usuario.
- **Mecanismo de Reintento (Retry):** Si hay una caída de red ligera, hace un reintento silencioso antes de fallar.
- **Fallback de Error:** En cualquier fallo crítico de API o límite de tiempo, NUNCA expone el error de la API al usuario. Muestra el mensaje: *"¡Ups! Mi conexión se tomó un respiro. Dame un segundo y vuelve a preguntarme."*

## 🔄 5. Persistencia de Historial
- El historial conversacional (el hilo con Gemini) no se guarda en Supabase, sino en **sessionStorage** del navegador del usuario.
- Esto asegura que al cambiar entre Novedades, Administrador o Inicio, el usuario no pierda su conversación activa, pero al cerrar el navegador o la pestaña, se restablece, evitando fuga de datos locales.

## 🛠️ 6. Troubleshooting
- **Responde cosas genéricas o alucina funciones:** Revisa si la llamada a `fetchActiveAgents()` en `AgentGuide.jsx` está devolviendo un arreglo vacío o fallando por permisos RLS en Supabase.
- **Mensaje de timeout constante:** Es posible que Google Gemini esté experimentando interrupciones, o la red del usuario sea inestable. Verifica el status de Google Cloud.
- **Error 404 (Not Found):** Asegúrate de que el modelo configurado existe. `gemini-1.5-flash-latest` es el actual; si Google lo deprecia, debe actualizarse.
