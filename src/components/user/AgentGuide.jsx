import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, X, Send, Sparkles, MessageCircle, ChevronRight, 
  ExternalLink, Search, Zap, HelpCircle, Compass
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

const AgentGuide = () => {
  const { isAdmin, isAuthenticated, profile, user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('Usuario');
  const messagesEndRef = useRef(null);

  // No mostrar a usuarios no autenticados
  if (!isAuthenticated) return null;

  // Cargar nombre del usuario y mensaje inicial personalizado
  useEffect(() => {
    if (profile) {
      const name = profile.name || user?.user_metadata?.name || 'Usuario';
      setUserName(name);
      setMessages([
        { 
          role: 'model', 
          content: `¡Hola, ${name}! Soy el Asistente de Upfunnel y del Panel de la Productividad. ¿En qué puedo ayudarte hoy?` 
        }
      ]);
    } else if (isAuthenticated) {
      // Fallback mientras carga el perfil
      setMessages([
        { 
          role: 'model', 
          content: '¡Hola! Bienvenido de nuevo. Soy el Asistente de Upfunnel. ¿En qué puedo ayudarte hoy?' 
        }
      ]);
    }
  }, [profile, isAuthenticated, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const fetchActiveAgents = async () => {
    // Filtrar por visible=true (equivalente a status='active' en este esquema)
    const { data, error } = await supabase
      .from('agents')
      .select('name, specialty, description, chatLink')
      .eq('visible', true);
    
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
      // 1. Obtener datos frescos de agentes
      const agents = await fetchActiveAgents();
      
      if (agents.length === 0) {
        console.warn('[GUIDE] No se encontraron agentes activos en Supabase.');
      }

      // 2. Configurar Google Gemini (REST API)
      const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('[GUIDE] VITE_GOOGLE_GEMINI_API_KEY no encontrada en variables de entorno.');
        throw new Error('Configuración de API ausente');
      }

      // 3. Construir el prompt de sistema estricto
      const systemInstruction = `
        Eres el Asistente de Upfunnel y del Panel de la Productividad. Te estás dirigiendo a ${userName}.
        Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema.

        REGLAS DE ORO (MÁXIMA PRIORIDAD):
        1. Tu conocimiento se limita ÚNICA y EXCLUSIVAMENTE a la lista de agentes activos que recibirás a continuación.
        2. Está TERMINANTEMENTE PROHIBIDO inventar funciones, sugerir herramientas externas o mencionar que eres un modelo de IA de Google.
        3. Si el usuario pregunta por algo que no existe en nuestra lista, responde educadamente: "Lo siento, ${userName}. Actualmente no contamos con un agente especializado para esa tarea en Upfunnel, pero puedo ayudarte con otras automatizaciones."
        4. Tono: Profesional, ejecutivo, servicial, minimalista y PERSONALIZADO (dirígete al usuario por su nombre ocasionalmente).
        5. Para cada recomendación, menciona el NOMBRE del agente y su ESPECIALIDAD.
        6. Al final de tu recomendación, incluye el enlace de esta forma exacta: [BOT_LINK:Nombre|URL]
        7. Responde siempre en Español.

        LISTA DE AGENTES ACTIVOS EN UPFUNNEL:
        ${agents.length > 0 
          ? agents.map(a => `- ${a.name} (${a.specialty}): ${a.description} [LINK:${a.chatLink}]`).join('\n')
          : 'No hay agentes disponibles en este momento.'}
      `;

      // 4. Llamada a la REST API de Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUsuario: ${userMessage}` }]
            }
          ],
          generationConfig: {
            temperature: 0.1, // Aún más bajo para mayor veracidad
            maxOutputTokens: 500,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[GUIDE] Error en la API de Gemini:', response.status, errorData);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const responseText = data.candidates[0].content.parts[0].text;
        setMessages(prev => [...prev, { role: 'model', content: responseText }]);
        
        // Disparar Toast de éxito si hay recomendación
        if (responseText.includes('[BOT_LINK:')) {
          toast.success('Agente recomendado con éxito');
        }
      } else {
        console.error('[GUIDE] Respuesta malformada de Gemini:', data);
        throw new Error('Respuesta malformada');
      }

    } catch (error) {
      console.error('[GUIDE] Error crítico de conexión:', error.message);
      setMessages(prev => [...prev, { role: 'model', content: 'Lo siento, he tenido un inconveniente al conectar con el sistema de asistencia. Por favor, intenta de nuevo en unos momentos.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content) => {
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
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      {/* Botón Flotante (Burbuja) - Premium Glass */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 w-16 h-16 bg-neon-teal/10 backdrop-blur-xl text-neon-teal rounded-2xl border border-neon-teal/20 shadow-[0_0_30px_rgba(0,229,255,0.15)] flex items-center justify-center transition-all duration-500 hover:scale-110 hover:rotate-6 active:scale-95 z-[100] group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <div className="absolute inset-0 bg-neon-teal/20 rounded-2xl animate-ping opacity-20 group-hover:opacity-40"></div>
        <Compass className="w-8 h-8 relative z-10 neon-glow" />
      </button>

      {/* Ventana de Chat - Premium Dark Glass */}
      <div className={`fixed bottom-4 right-4 w-full max-w-[380px] h-[580px] bg-deep-dark/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] transition-all duration-500 flex flex-col rounded-[2.5rem] border border-white/10 overflow-hidden ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        
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
              <div className={`max-w-[88%] p-5 rounded-2xl text-xs leading-loose font-medium shadow-xl ${
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
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Comando o consulta..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder-gray-600 focus:ring-2 focus:ring-neon-teal/30 focus:border-neon-teal/50 transition-all outline-none"
            disabled={loading}
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
