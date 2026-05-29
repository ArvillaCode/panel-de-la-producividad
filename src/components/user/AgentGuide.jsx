import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  ExternalLink,
  Zap,
  Compass,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { useCloseModal } from '../../hooks/useCloseModal';

const DEFAULT_GREETING = 'Hola. Bienvenido de nuevo. Soy el Asistente de Upfunnel. En que puedo ayudarte hoy?';
const CHAT_HISTORY_KEY = 'upfunnel_chat_history';
const HISTORY_LIMIT = 12;

const getFriendlyError = (error) => {
  const message = error?.message || '';

  if (message.includes('OPENROUTER_NO_ENDPOINTS_FOUND')) {
    return 'Error de acceso en OpenRouter: revisa saldo, modelo disponible y politicas de privacidad en la cuenta de OpenRouter.';
  }

  if (message.includes('server_not_configured')) {
    return 'El servidor de IA no esta configurado correctamente. Por favor, contacte a soporte.';
  }

  if (message.includes('profile_not_approved')) {
    return 'Tu cuenta aun no ha sido aprobada o no esta activa para usar el asistente de IA.';
  }

  if (message.includes('assistant_disabled')) {
    return 'El asistente de IA esta desactivado temporalmente por la administracion.';
  }

  if (message.includes('401') || message.includes('Unauthorized') || message.includes('API key')) {
    return 'Error de configuracion: la clave del proveedor no esta autorizada en el backend.';
  }

  return 'El servicio esta experimentando alta demanda. Intenta de nuevo en unos instantes.';
};

const AgentGuide = () => {
  const { isAdmin, isAuthenticated, profile, user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { modalRef } = useCloseModal(isOpen, () => setIsOpen(false));

  const handleNewChat = () => {
    sessionStorage.removeItem(CHAT_HISTORY_KEY);
    const name = profile?.name || user?.user_metadata?.name || 'Usuario';
    setMessages([
      {
        role: 'model',
        content: profile ? `Hola, ${name}. Soy el Asistente de Upfunnel y del Panel de la Productividad. En que puedo ayudarte hoy?` : DEFAULT_GREETING
      }
    ]);
    toast.success('Chat reiniciado correctamente');
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const name = profile?.name || user?.user_metadata?.name || 'Usuario';
    const savedMessages = sessionStorage.getItem(CHAT_HISTORY_KEY);

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
        return;
      } catch (e) {
        sessionStorage.removeItem(CHAT_HISTORY_KEY);
      }
    }

    setMessages([
      {
        role: 'model',
        content: profile ? `Hola, ${name}. Soy el Asistente de Upfunnel y del Panel de la Productividad. En que puedo ayudarte hoy?` : DEFAULT_GREETING
      }
    ]);
  }, [profile, isAuthenticated, user]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_system_config');

        if (error) {
          console.warn('[GUIDE] Advertencia recuperando config global:', error.message);
          setIsEnabled(true);
          return;
        }

        const publicConfig = Array.isArray(data) ? data[0] : data;
        if (publicConfig) setIsEnabled(publicConfig.ai_assistant_enabled !== false);
      } catch (err) {
        console.warn('[GUIDE] Excepcion capturada en checkStatus:', err);
        setIsEnabled(true);
      }
    };

    if (isAuthenticated) checkStatus();
  }, [isAuthenticated]);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || loading) return;

    inputRef.current?.focus();
    const timers = [50, 150, 300, 500, 700].map((delay) =>
      setTimeout(() => inputRef.current?.focus(), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isOpen, loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const nextMessages = [...messages, { role: 'user', content: userMessage }];

    setInput('');
    setMessages(nextMessages);
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Unauthorized');
      }

      const historyPayload = nextMessages.slice(-HISTORY_LIMIT).map((message) => ({
        role: message.role === 'model' ? 'assistant' : message.role,
        content: message.content
      }));

      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: { messages: historyPayload },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            if (body && body.error) {
              errorMessage = body.error;
            }
          } catch (_) {
            // Ignorar fallos de parseo
          }
        }
        throw new Error(errorMessage);
      }

      const responseText = data?.text;
      if (!responseText) throw new Error('Respuesta vacia del servidor de IA');

      setMessages((prev) => [...prev, { role: 'model', content: responseText }]);
      if (responseText.includes('[BOT_LINK:') || responseText.includes('[LINK:')) {
        toast.success('Agente recomendado con exito');
      }
    } catch (error) {
      console.error('[GUIDE] Error critico de conexion:', error);
      setMessages((prev) => [...prev, { role: 'model', content: getFriendlyError(error) }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content) => {
    if (typeof content !== 'string') return null;
    const parts = content.split(/(\[BOT_LINK:.*?\|.*?\]|\[LINK:.*?\])/g);

    return parts.map((part, index) => {
      if (part.startsWith('[BOT_LINK:')) {
        const match = part.match(/\[BOT_LINK:(.*?)\|(.*?)\]/);
        if (match) {
          const [, name, url] = match;
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
      } else if (part.startsWith('[LINK:')) {
        const match = part.match(/\[LINK:(.*?)\]/);
        if (match) {
          const [, url] = match;
          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black mt-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              Abrir Agente Recomendado
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          );
        }
      }

      const textClean = part.replace(/\*\*/g, '').replace(/\*/g, '');
      return <span key={index}>{textClean}</span>;
    });
  };

  if (!isAuthenticated) return null;

  const shouldRender = (isEnabled || isAdmin) && (profile?.plan !== 'legacy' || isAdmin);
  if (!shouldRender) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 md:bottom-12 md:right-12 w-16 h-16 bg-neon-teal/10 backdrop-blur-xl text-neon-teal rounded-2xl border border-neon-teal/20 shadow-[0_0_30px_rgba(0,229,255,0.15)] flex items-center justify-center transition-all duration-500 hover:scale-110 hover:rotate-6 active:scale-95 z-[100] group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <div className="absolute inset-0 bg-neon-teal/20 rounded-2xl animate-ping opacity-20 group-hover:opacity-40"></div>
        <Compass className="w-8 h-8 relative z-10 neon-glow" />
      </button>

      <div
        ref={modalRef}
        className={`fixed bottom-6 left-6 right-6 sm:left-auto sm:bottom-8 sm:right-8 md:bottom-12 md:right-12 w-auto sm:w-full max-w-[380px] h-[580px] bg-deep-dark/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[101] transition-all duration-500 flex flex-col rounded-[2.5rem] border border-white/10 overflow-hidden ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
      >
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
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              title="Iniciar nuevo chat"
              className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-neon-teal hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:20px_20px] scroll-smooth custom-scrollbar">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] p-5 rounded-2xl text-xs leading-loose font-medium shadow-xl whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-neon-teal/10 border border-neon-teal/30 text-white rounded-tr-none shadow-neon-teal/5'
                  : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none backdrop-blur-md'
              }`}>
                {renderContent(message.content)}
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
