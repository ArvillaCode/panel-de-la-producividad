# Guía Definitiva: Prevención y Solución de Desconexiones del Asistente Upfunnel

Esta guía técnica está diseñada para garantizar la estabilidad, disponibilidad y correcto funcionamiento del Asistente de IA de Upfunnel. Sigue estos pasos para configurar, estabilizar y diagnosticar cualquier problema de conexión.

---

## 1. Configuración de "Cerebro" (Variables de Entorno)

Para que el asistente tenga "vida", necesita conectarse a su cerebro (la API de Google Gemini). Esto se hace mediante la clave `GOOGLE_GEMINI_API_KEY`.

### Diferencia entre Entornos:

*   **Desarrollo Local (Tu PC):**
    Debes crear o editar un archivo llamado `.env.local` en la raíz de tu proyecto. Este archivo **no debe subirse a GitHub** por seguridad.
    ```env
    # Archivo: .env.local
    GOOGLE_GEMINI_API_KEY=tu_clave_secreta_aqui
    ```

*   **Producción (Vercel):**
    En la web, el archivo `.env.local` no existe. Debes inyectar la variable directamente en la configuración del servidor:
    1. Ve al panel de control de tu proyecto en [Vercel](https://vercel.com/).
    2. Navega a **Settings** > **Environment Variables**.
    3. Añade una nueva variable:
        *   **Key:** `GOOGLE_GEMINI_API_KEY`
        *   **Value:** `tu_clave_secreta_aqui`
    4. Haz clic en **Save** y realiza un nuevo despliegue (Redeploy) para que los cambios surtan efecto.

> [!WARNING]
> Nunca expongas tu `GOOGLE_GEMINI_API_KEY` en código del lado del cliente (archivos que terminan enviándose al navegador sin pasar por el servidor).

---

## 2. Estabilización de la Ruta de Comunicación (API Route)

La comunicación entre el panel y el modelo de IA debe ser robusta. Si hay un corte de red o la IA tarda en responder, la aplicación no debe colapsar.

Asegúrate de usar el modelo más rápido y eficiente para chat (`gemini-1.5-flash`) e implementa bloques `try/catch` para capturar errores.

**Ejemplo de código para tu API Route (Ej. `app/api/chat/route.js`):**

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciamos el SDK con la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // 1. Validar que la API Key exista
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error("API Key de Gemini no configurada en el servidor.");
    }

    // 2. Seleccionar el modelo óptimo (gemini-1.5-flash es ideal para chats rápidos)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // Opcional: Configurar timeout a nivel de fetch global si es necesario
    });

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    // 3. Enviar el mensaje con manejo de errores
    const msg = messages[messages.length - 1].content;
    const result = await chat.sendMessage(msg);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error crítico en la comunicación con IA:", error);
    
    return new Response(JSON.stringify({ 
      error: "El asistente se encuentra temporalmente desconectado.",
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

> [!TIP]
> En Vercel, el timeout por defecto para Serverless Functions en la capa gratuita (Hobby) es de **10 segundos**. Si el modelo `gemini-1.5-pro` tarda más que eso, Vercel cortará la conexión (Error 504). Por eso es crucial usar `gemini-1.5-flash` para interacciones de chat en tiempo real.

---

## 3. Validación de Identidad (Andres / Upfunnel)

Un error común que "rompe" al asistente en el lado del cliente (frontend) es intentar saludar o procesar información del usuario cuando los datos aún no han cargado, resultando en errores de "Variable no definida" (undefined).

Para solucionarlo, el componente del asistente debe verificar la identidad de "Andrés" (o del usuario autenticado) antes de renderizar o enviar el primer mensaje.

**Patrón de Validación en Frontend:**

```javascript
import { useState, useEffect } from 'react';

function AssistantChat({ userName }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Solo activamos el asistente si el nombre del usuario está definido
    if (userName && userName.trim() !== "") {
      setIsReady(true);
      // Opcional: Enviar mensaje de bienvenida silencioso al modelo aquí
    } else {
      setIsReady(false);
    }
  }, [userName]);

  if (!isReady) {
    return <div>Cargando perfil para el asistente...</div>;
  }

  return (
    <div>
      {/* Interfaz de Chat aquí */}
      <p>Hola {userName}, soy tu asistente de Upfunnel.</p>
    </div>
  );
}
```

---

## 4. Verificación de Despliegue (Build Check)

Muchas desconexiones en producción ocurren porque los archivos de la IA no se incluyeron en el *build* final o están en carpetas que Vercel no reconoce como Rutas de API.

### Checklist para Vercel:
1. **Estructura de Carpetas (Next.js App Router):** Si usas App Router, tu archivo de conexión debe estar exactamente en `app/api/chat/route.js` (o `.ts`). Vercel expone automáticamente todo dentro de `app/api/` como endpoints.
2. **Dependencias:** Verifica que `@google/generative-ai` esté listado en las `dependencies` de tu `package.json`, **no** en `devDependencies`. Vercel no instala dependencias de desarrollo para el entorno de producción.
3. **Logs de Build:** Antes de probar, revisa los logs de despliegue en Vercel. Si ves advertencias sobre "Module not found" relacionadas con la IA, el build fallará silenciosamente en tiempo de ejecución.

---

## 5. Diagnóstico Rápido (Troubleshooting)

Usa esta tabla para resolver los problemas más comunes inmediatamente:

| Si ves este error en la consola/pantalla... | Significa que... | Haz esta acción |
| :--- | :--- | :--- |
| `Error: API Key not valid` o `401 Unauthorized` | La variable `GOOGLE_GEMINI_API_KEY` está mal escrita, vacía o falta en Vercel. | Ve a Settings > Environment Variables en Vercel, asegúrate de que esté pegada correctamente (sin espacios) y haz un Redeploy. |
| `504 Gateway Timeout` | La IA tardó demasiado en responder y Vercel cortó la conexión (pasa de los 10s). | Cambia el modelo en tu código a `gemini-1.5-flash`. Asegúrate de no estar enviando historiales excesivamente largos. |
| `Variable is not defined` o `Cannot read properties of undefined (reading 'name')` | El asistente intentó hablar antes de que el perfil del usuario (Andrés) cargara. | Implementa la validación de identidad (Paso 3) usando *Conditional Rendering* (`if (!user) return null;`). |
| `Quota Exceeded` o `429 Too Many Requests` | Agotaste el límite gratuito de peticiones de Google Gemini API. | Revisa el uso en Google AI Studio. Considera implementar un "Rate Limiter" en tu API Route o actualizar tu plan. |
| El mensaje se envía pero no pasa nada (Sin error visible) | Posible problema de red (sin internet) o un fallo silencioso en el `try/catch`. | Revisa la pestaña de "Network" (Red) en las herramientas de desarrollador (F12). Verifica si la llamada a `/api/chat` quedó en "Pending" o falló. |

---
*Documento generado para la arquitectura de Upfunnel. Mantenimiento a cargo de Arquitectura de Soluciones IA.*
