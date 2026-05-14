# 📘 Guía Maestra: Arquitectura y Mantenimiento de Upfunnel V3.0

Esta guía describe los fundamentos arquitectónicos, reglas de UI/UX, y flujos operativos críticos del **Panel de Productividad (Upfunnel)** para garantizar su correcta escalabilidad y mantenimiento.

---

## 🏗️ 1. Arquitectura del Sistema
Upfunnel V3.0 es una aplicación React estática (SPA) construida con **Vite**, impulsada por **TailwindCSS** y respaldada por **Supabase** (PostgreSQL + Auth).

- **Core Routing:** `react-router-dom` maneja la navegación. Las rutas están divididas entre `/` (Panel de Usuario) y `/admin` (Terminal Administrativa).
- **Global State:** Gestionado por el `AuthContext` (`useAuth.jsx`), que sincroniza el perfil, sesión y notificaciones en tiempo real (Optimistic UI) mediante polling a Supabase.
- **Data Fetching:** Se interactúa con la base de datos de Supabase de manera directa mediante el cliente `@supabase/supabase-js`. *PROHIBIDO* el uso del MCP de Supabase para evitar conflictos de autenticación de bots y saturación de base de datos.

## 🎨 2. Ecosistema UI/UX Premium (Reglas Estrictas)
El panel cuenta con un diseño *Glassmorphism* que soporta Light Mode ("Blanco Puro") y Dark Mode (Azul profundo espacial).
- **Estilos Globales:** Se usa `src/App.css` para configurar variables y utilidades base (ej: `.glass-card`, `.neon-glow`).
- **Responsividad:** 
  - Usamos el hook dinámico `h-[100dvh]` para evitar problemas con la barra de navegación móvil (iOS Safari/Android Chrome).
  - Los contenedores deben usar `flex-col mt-auto` para componentes anclados abajo (como Logout) y `overflow-y-auto scrollbar-hide` para el contenido central desplazable.
- **Modales:** 
  - Todos los modales deben poder cerrarse con la tecla **Escape** y al **hacer clic fuera del modal (Overlay click)**.
  - El hook `useCloseModal` debe usarse siempre que sea posible.

## 🚀 3. Despliegue en Vercel
Para evitar el error de "Página Negra" o fallos de compilación 404 en Vercel:
1. **Case-Sensitivity:** Vercel usa Linux (estricto con mayúsculas/minúsculas). Todas las importaciones deben coincidir exactamente con el nombre de archivo real (ej: `AgentGuide.jsx` debe importarse respetando mayúsculas).
2. **Importaciones Extensas:** Preferir remover la extensión `.jsx` en importaciones internas.
3. **Control de Ramas:** Antes de enviar a producción, asegurar que no hay warnings en el terminal que rompan el CI/CD de Vercel. Usa el comando estándar:
   `git add . && git commit -m "build: <mensaje>" && git push`

## 🗄️ 4. Reglas de Supabase (Database)
- **Seguridad (RLS):** Las políticas de seguridad están configuradas para que solo administradores modifiquen perfiles, y los usuarios normales solo puedan modificar sus propios registros o visualizar agentes.
- **Roles:** El campo `role` en Supabase puede ser `admin`, `editor`, `support` o `user`. Solo el `admin` tiene acceso a la Terminal Admin `/admin`.
- **Notificaciones (Optimistic UI):** Al hacer clic en una notificación, su estado de lectura debe ser modificado a `true` primero en el estado local de React, e inmediatamente después ejecutar la consulta de Supabase para evitar retrasos visuales.

## 🛡️ 5. Manejo de Errores
Todos los componentes sensibles (API IA, llamadas DB) deben implementar un `try/catch`. En caso de fallo de red, se debe mostrar un mensaje amigable al usuario en lugar de un error técnico o en crudo (Ej: *"¡Ups! Mi conexión se tomó un respiro. Dame un segundo y vuelve a preguntarme."*).
