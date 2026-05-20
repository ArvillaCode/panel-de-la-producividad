import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, X, Send, Sparkles, MessageCircle, ChevronRight, 
  ExternalLink, Search, Zap, HelpCircle, Compass
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { useCloseModal } from '../../hooks/useCloseModal';

const AgentGuide = () => {
  const { isAdmin, isAuthenticated, profile, user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('Usuario');
  const [isEnabled, setIsEnabled] = useState(true);
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [dbApiKey, setDbApiKey] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { modalRef } = useCloseModal(isOpen, () => setIsOpen(false));

  // No mostrar a usuarios no autenticados
  if (!isAuthenticated) return null;

  // Cargar nombre del usuario y mensaje inicial personalizado
  useEffect(() => {
    if (profile) {
      const name = profile.name || user?.user_metadata?.name || 'Usuario';
      setUserName(name);
      
      const savedMessages = sessionStorage.getItem('upfunnel_chat_history');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([
          { 
            role: 'model', 
            content: `¡Hola, ${name}! Soy el Asistente de Upfunnel y del Panel de la Productividad. ¿En qué puedo ayudarte hoy?` 
          }
        ]);
      }
    } else if (isAuthenticated) {
      // Fallback mientras carga el perfil
      const savedMessages = sessionStorage.getItem('upfunnel_chat_history');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([
          { 
            role: 'model', 
            content: '¡Hola! Bienvenido de nuevo. Soy el Asistente de Upfunnel. ¿En qué puedo ayudarte hoy?' 
          }
        ]);
      }
    }
  }, [profile, isAuthenticated, user]);
  
  // Verificar si el asistente está activado globalmente y qué modelo tiene asignado
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        
        if (error) {
          console.warn('[GUIDE] Advertencia recuperando config global de la BD, aplicando fallback local:', error.message);
          setIsEnabled(true);
          setAiModel('google/gemini-2.5-flash');
          return;
        }
        
        if (data) {
          setIsEnabled(data.ai_assistant_enabled !== false);
          setAiModel(data.ai_model || 'google/gemini-2.5-flash');
          setCustomSystemPrompt(data.system_prompt || data.ai_system_prompt || '');
          setDbApiKey(data.openrouter_api_key || '');
        }
      } catch (err) {
        console.warn('[GUIDE] Excepción capturada en checkStatus, aplicando fallback:', err);
        setIsEnabled(true);
        setAiModel('google/gemini-2.5-flash');
      }
    };
    
    if (isAuthenticated) {
      checkStatus();
    }
  }, [isAuthenticated]);

  // Guardar en sessionStorage cada vez que cambien los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('upfunnel_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);
  
  // Auto-enfocar el input cuando se abre el chat o cambia el estado de carga
  useEffect(() => {
    if (isOpen && !loading) {
      // Intentar enfocar de inmediato
      inputRef.current?.focus();
      
      // Intentar enfocar con diferentes retrasos para superar transiciones CSS y refrescos del DOM
      const timers = [50, 150, 300, 500, 700].map(delay => 
        setTimeout(() => {
          inputRef.current?.focus();
        }, delay)
      );
      
      return () => timers.forEach(clearTimeout);
    }
  }, [isOpen, loading]);

  const fetchActiveAgents = async () => {
    // Filtrar por visible=true (equivalente a status='active' en este esquema)
    let query = supabase
      .from('agents')
      .select('name, specialty, description, chatLink, admin_only')
      .eq('visible', true);
    
    if (!isAdmin) {
      query = query.eq('admin_only', false);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[GUIDE] Error fetching agents:', error);
      return [];
    }
    return data || [];
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // 1. Obtener datos frescos de agentes (aislado)
      let agents = [];
      try {
        agents = await fetchActiveAgents();
        if (agents.length === 0) {
          console.warn('[GUIDE] No se encontraron agentes activos en Supabase.');
        }
      } catch (dbError) {
        console.error('[GUIDE] Error obteniendo agentes de Supabase:', dbError);
        // Falla silenciosamente y usa una lista vacía
      }

      // 2. Validación estricta de API Key (Priorizar dbApiKey si es válida y comienza con "sk-or-", de lo contrario usar .env)
      const isDbKeyValid = typeof dbApiKey === 'string' && dbApiKey.trim().startsWith('sk-or-');
      const rawApiKey = isDbKeyValid ? dbApiKey : (import.meta.env.VITE_OPENROUTER_API_KEY || '');
      const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';

      console.log(`[GUIDE-AI] Validando API Key resolved (primeros 8 chars): ${apiKey.substring(0, 8)}...`);

      if (!apiKey || apiKey === 'undefined' || apiKey.toLowerCase() === 'undefined' || apiKey.length < 10 || !apiKey.startsWith('sk-or-')) {
        console.error('[GUIDE-AI] Error: La API Key de OpenRouter está vacía, no se ha cargado o es inválida.');
        setMessages(prev => [...prev, { role: 'model', content: 'Fallo de Configuración: La clave API de OpenRouter está vacía o no es válida. Por favor, configúrala introduciendo tu token "sk-or-..." en el panel de Configuración Matchmaker en el sidebar.' }]);
        setLoading(false);
        return;
      }

      if (apiKey.startsWith('AIzaSy')) {
        console.error('[GUIDE-AI] Error: Detectada clave API de Google Gemini en lugar de OpenRouter.');
        setMessages(prev => [...prev, { role: 'model', content: '⚠️ Fallo de Proveedor: Has configurado una clave API de Google Gemini (empieza con "AIzaSy"), pero el catálogo está migrado a OpenRouter. Por favor, ve a "Configuración Matchmaker" en el menú de la izquierda e introduce una API Key de OpenRouter válida (que comience con "sk-or-").' }]);
        setLoading(false);
        return;
      }

      // 1. Sanitizar y escapar el System Prompt
      const cleanedSystemPrompt = typeof customSystemPrompt === 'string' ? customSystemPrompt.trim() : '';
      
      const systemInstructionRaw = `
        ${cleanedSystemPrompt || `[ROL Y PERFIL]: Actúas como Consultor Senior de Crecimiento & Especialista de Ecosistema SaaS en Upfunnel. Te diriges a ${userName}.
        Tu misión es brindar asesoría profesional de alto nivel y guiar de forma ejecutiva a los usuarios a encontrar la herramienta ideal en nuestro ecosistema.`}

        [REGLAS DE ORO (MÁXIMA PRIORIDAD)]:
        1. Tu conocimiento se limita ÚNICA y EXCLUSIVAMENTE a la lista de agentes activos que recibirás a continuación.
        2. Está TERMINANTEMENTE PROHIBIDO inventar funciones, sugerir herramientas externas o mencionar que eres un modelo de IA.
        3. Si el usuario pregunta por algo que no existe en nuestra lista, responde de manera elegante y profesional: "Lo siento, ${userName}. Actualmente no contamos con un agente especializado para esa tarea en Upfunnel, pero puedo ayudarte con otras automatizaciones y herramientas del catálogo."
        4. Tono: Profesional, ejecutivo, de consultor senior, servicial, minimalista y PERSONALIZADO (dirígete a ${userName} de forma natural).
        5. Para cada recomendación, menciona el NOMBRE del agente y su ESPECIALIDAD en una línea limpia.
        6. Al final de tu recomendación, incluye el enlace de esta forma exacta: [BOT_LINK:Nombre|URL]
        7. Responde siempre en Español.
        8. NO UTILICES formato Markdown (como asteriscos ** o *) bajo ninguna circunstancia. Escribe todo en texto plano limpio. Por ejemplo, escribe "1. Nombre del Agente: Especialidad" en lugar de "1. **Nombre del Agente**: Especialidad". Esta regla es crítica para la elegancia de la interfaz.

        [GUÍA TÉCNICA DE RESOLUCIÓN DE ERRORES (CASOS DE BORDE)]:
        Si el usuario menciona tener problemas de conexión, errores de saldo, errores de API (ej. error 404, 401, 402, 429) o fallas al conectar con OpenRouter, guíalo con estos pasos exactos en texto plano:
        - Paso 1: Verificar el saldo/crédito disponible en la cuenta de OpenRouter.
        - Paso 2: Si el saldo es cero, se pueden activar/seleccionar modelos gratuitos del catálogo de OpenRouter.
        - Paso 3: Revisar los ajustes de privacidad en "https://openrouter.ai/settings/privacy" y asegurarse de desactivar o ajustar la opción de "Zero Data Retention" (ZDR) si el modelo elegido no la soporta, ya que esto suele causar bloqueos en la conexión de la API.

        [LISTA DE AGENTES ACTIVOS EN UPFUNNEL]:
        ${agents.length > 0 
          ? agents.map(a => `- ${a.name}: ${a.description ? a.description.slice(0, 120) : ''} [LINK:${a.chatLink || ''}]`).join('\n')
          : 'No hay agentes disponibles.'}
      `;

      // Eliminar caracteres de control no imprimibles no deseados
      const systemInstruction = systemInstructionRaw.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "").trim();

      // 3. Mapear historial en formato compatible con OpenAI (filtrando posibles errores previos)
      const chatHistoryPayload = [
        ...messages.map(m => ({
          role: m.role === 'model' ? 'assistant' : m.role,
          content: m.content
        })),
        { role: 'user', content: userMessage }
      ];

      // 4. Mecanismo de reintento inteligente y Modelo Alternativo (Respaldo)
      let responseText = null;
      let modelToUse = typeof aiModel === 'string' ? aiModel.trim() : 'google/gemini-2.5-flash';
      modelToUse = modelToUse.replace(/['"]+/g, '').trim(); // Eliminar comillas accidentales
      let payloadA = null;

      try {
        // --- INTENTO A: Intentar con el modelo configurado ---
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos

        payloadA = {
          model: modelToUse,
          messages: [
            { role: "system", content: systemInstruction },
            ...chatHistoryPayload
          ],
          temperature: 0.1,
          max_tokens: 500
        };

        console.log(`[GUIDE-AI] Intentando petición con modelo principal: ${modelToUse}`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin || "https://upfunnel.com",
            "X-Title": "Upfunnel Productivity Panel"
          },
          body: JSON.stringify(payloadA),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorDetails = await response.json().catch(() => ({}));
          const errMsg = errorDetails.error?.message || `HTTP error! status: ${response.status}`;
          const is404 = response.status === 404 || errMsg.toLowerCase().includes('no endpoints found') || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('model_not_found');
          throw new Error(is404 ? `OPENROUTER_NO_ENDPOINTS_FOUND: ${errMsg}` : errMsg);
        }

        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content;
      } catch (firstAttemptError) {
        console.error("Error Real OpenRouter (Intento Principal):", firstAttemptError);
        console.log("Payload enviado (Intento Principal):", payloadA);
        console.warn('[GUIDE-AI] Primer intento fallido, intentando fallback de resiliencia...');
        
        // --- INTENTO B/C: Reintento con Modelo Alternativo (Respaldo Premium) ---
        const fallbackModel = 'google/gemini-2.5-flash';
          
        let payloadB = null;
        console.log(`[GUIDE-AI] Reintentando con modelo de respaldo premium estable: ${fallbackModel}`);
        
        try {
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 8000);

          payloadB = {
            model: fallbackModel,
            messages: [
              { role: "system", content: systemInstruction },
              ...chatHistoryPayload
            ],
            temperature: 0.1,
            max_tokens: 500
          };

          const fallbackResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": window.location.origin || "https://upfunnel.com",
              "X-Title": "Upfunnel Productivity Panel"
            },
            body: JSON.stringify(payloadB),
            signal: fallbackController.signal
          });

          clearTimeout(fallbackTimeoutId);

          if (!fallbackResponse.ok) {
            const fallbackErrorDetails = await fallbackResponse.json().catch(() => ({}));
            const fallbackErrMsg = fallbackErrorDetails.error?.message || `HTTP error! status: ${fallbackResponse.status}`;
            const isFallback404 = fallbackResponse.status === 404 || fallbackErrMsg.toLowerCase().includes('no endpoints found') || fallbackErrMsg.toLowerCase().includes('not found') || fallbackErrMsg.toLowerCase().includes('model_not_found');
            throw new Error(isFallback404 ? `OPENROUTER_NO_ENDPOINTS_FOUND: ${fallbackErrMsg}` : fallbackErrMsg);
          }

          const fallbackData = await fallbackResponse.json();
          responseText = fallbackData.choices?.[0]?.message?.content;
        } catch (secondAttemptError) {
          console.error("Error Real OpenRouter (Intento Respaldo):", secondAttemptError);
          console.log("Payload enviado (Intento Respaldo):", payloadB);
          
          if (firstAttemptError.message?.includes('OPENROUTER_NO_ENDPOINTS_FOUND') || 
              secondAttemptError.message?.includes('OPENROUTER_NO_ENDPOINTS_FOUND') ||
              firstAttemptError.message?.includes('No endpoints found') || 
              secondAttemptError.message?.includes('No endpoints found')) {
            throw new Error('OPENROUTER_NO_ENDPOINTS_FOUND');
          }
          throw new Error('FALLBACK_FAILED');
        }
      }

      if (responseText) {
        setMessages(prev => [...prev, { role: 'model', content: responseText }]);
        if (responseText.includes('[BOT_LINK:')) {
          toast.success('Agente recomendado con éxito');
        }
      } else {
        throw new Error('Respuesta vacía del servidor de OpenRouter');
      }

    } catch (error) {
      console.error('[GUIDE] Error crítico de conexión:', error);
      
      let userErrorMsg = 'El servicio está experimentando alta demanda, por favor intenta de nuevo en unos instantes.';
      
      if (error.message === 'OPENROUTER_NO_ENDPOINTS_FOUND') {
        userErrorMsg = '⚠️ Error de Acceso en OpenRouter ("No Endpoints Found"):\n\n' +
          'Esto ocurre comúnmente por dos razones:\n\n' +
          '1. Para Modelos Premium (como Claude 3.5 Sonnet): Tu cuenta de OpenRouter no tiene saldo/crédito suficiente para procesar la consulta.\n' +
          '2. Para Modelos Gratuitos (como Llama 3.1): OpenRouter requiere que tengas configurada tu política de privacidad. Ve a https://openrouter.ai/settings/privacy y asegúrate de:\n' +
          '   - ACTIVAR "Permitir endpoints gratuitos que puedan publicar prompts/completions".\n' +
          '   - DESACTIVAR la opción "ZDR (Zero Data Retention) únicamente", ya que los modelos gratuitos no son compatibles con ZDR.';
      } else if (error.name === 'AbortError') {
        userErrorMsg = 'El sistema de IA está tardando demasiado en responder. Por favor, inténtalo de nuevo en unos segundos.';
      } else if (error.message && (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized'))) {
        userErrorMsg = 'Error de Configuración: La clave API de OpenRouter no es válida o no está autorizada.';
      }

      setMessages(prev => [...prev, { role: 'model', content: userErrorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content) => {
    if (typeof content !== 'string') return null;
    const parts = content.split(/(\[BOT_LINK:.*?\|.*?\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[BOT_LINK:')) {
        const match = part.match(/\[BOT_LINK:(.*?)\|(.*?)\]/);
        if (match) {
          const [_, name, url] = match;
          return (
            <a 
              key={index} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black mt-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              Chatear con {name}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          );
        }
      }
      // Limpiar los asteriscos de Markdown para mostrar texto plano limpio y premium
      const textClean = part.replace(/\*\*/g, '').replace(/\*/g, '');
      return <span key={index}>{textClean}</span>;
    });
  };

  // El administrador siempre ve la burbuja del Matchmaker (para pruebas),
  // los usuarios finales solo si está habilitado globalmente (isEnabled)
  const shouldRender = isEnabled || isAdmin;
  if (!shouldRender) return null;

  return (
    <>
      {/* Botón Flotante (Burbuja) - Premium Glass */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className={`fixed bottom-4 right-4 w-16 h-16 bg-neon-teal/10 backdrop-blur-xl text-neon-teal rounded-2xl border border-neon-teal/20 shadow-[0_0_30px_rgba(0,229,255,0.15)] flex items-center justify-center transition-all duration-500 hover:scale-110 hover:rotate-6 active:scale-95 z-[100] group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <div className="absolute inset-0 bg-neon-teal/20 rounded-2xl animate-ping opacity-20 group-hover:opacity-40"></div>
        <Compass className="w-8 h-8 relative z-10 neon-glow" />
      </button>

      {/* Ventana de Chat - Premium Dark Glass */}
      <div 
        ref={modalRef}
        className={`fixed bottom-4 right-4 w-full max-w-[380px] h-[580px] bg-deep-dark/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] transition-all duration-500 flex flex-col rounded-[2.5rem] border border-white/10 overflow-hidden ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
      >
        
        {/* Header - Glass Overlay */}
        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neon-teal/10 rounded-2xl flex items-center justify-center border border-neon-teal/20 shadow-lg shadow-neon-teal/5">
              <Sparkles className="w-6 h-6 text-neon-teal neon-glow" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight text-white uppercase italic">Asistente de Upfunnel</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Core IA Activo</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mensajes - Spatial Grid Background */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:20px_20px] scroll-smooth custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] p-5 rounded-2xl text-xs leading-loose font-medium shadow-xl whitespace-pre-wrap ${
                m.role === 'user' 
                  ? 'bg-neon-teal/10 border border-neon-teal/30 text-white rounded-tr-none shadow-neon-teal/5' 
                  : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none backdrop-blur-md'
              }`}>
                {renderContent(m.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none flex gap-2">
                <div className="w-1.5 h-1.5 bg-neon-teal rounded-full animate-bounce shadow-neon-teal/50"></div>
                <div className="w-1.5 h-1.5 bg-neon-teal rounded-full animate-bounce delay-75 shadow-neon-teal/50"></div>
                <div className="w-1.5 h-1.5 bg-neon-teal rounded-full animate-bounce delay-150 shadow-neon-teal/50"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Glass Overlay */}
        <form onSubmit={handleSendMessage} className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Comando o consulta..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder-gray-600 focus:ring-2 focus:ring-neon-teal/30 focus:border-neon-teal/50 transition-all outline-none"
            readOnly={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-14 h-14 bg-neon-teal text-deep-dark rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-neon-teal/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </>
  );
};

export default AgentGuide;
