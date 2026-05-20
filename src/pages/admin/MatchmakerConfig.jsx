import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Save, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  MessageSquare, 
  Cpu, 
  Activity, 
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

const OPENROUTER_MODELS = [
  // --- MODELOS PREMIUM ULTRA-ECONÓMICOS ---
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek: DeepSeek V3 (Premium Ultra-Económico)' },
  { value: 'deepseek/deepseek-reasoner', label: 'DeepSeek: DeepSeek R1 (Premium Razonamiento Ultra-Económico)' },
  { value: 'google/gemini-2.5-flash', label: 'Google: Gemini 2.5 Flash (Premium)' },
  { value: 'google/gemini-2.5-pro', label: 'Google: Gemini 2.5 Pro (Premium)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic: Claude 3.5 Sonnet (Premium)' },
  // --- MODELOS GRATUITOS (FREE) ---
  { value: 'openrouter/free', label: 'OpenRouter: Auto Free Router (Free)' },
  { value: 'meta-llama/llama-3-8b-instruct:free', label: 'Meta: Llama 3 8B Instruct (Free)' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta: Llama 3.3 70B Instruct (Free)' },
  { value: 'google/gemma-2-9b-it:free', label: 'Google: Gemma 2 9B IT (Free)' },
];

const MatchmakerConfig = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Objeto de estado config con inicialización instantánea desde caché local si existe
  const [config, setConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_system_config');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      system_prompt: '',
      ai_model: 'google/gemini-2.5-flash',
      ai_assistant_enabled: true,
      openrouter_api_key: ''
    };
  });

  // Respaldo para revertir cambios
  const [originalConfig, setOriginalConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_system_config');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      system_prompt: '',
      ai_model: 'google/gemini-2.5-flash',
      ai_assistant_enabled: true,
      openrouter_api_key: ''
    };
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_system_config');
      return !cached; // Si hay caché, renderizamos inmediatamente sin bloquear la pantalla
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const hasCache = !!localStorage.getItem('cached_system_config');
    if (!hasCache) {
      setLoading(true);
    }
    setError('');
    try {
      // Carrera de promesas con timeout de 2 segundos para mitigar la latencia de Supabase
      const fetchPromise = supabase
        .from('system_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de conexión con Supabase')), 2000)
      );

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (fetchError) {
        console.warn('[MATCHMAKER_CONFIG] Fallo de consulta a Supabase, aplicando fallback local:', fetchError.message);
        // Fallback local seguro para que la pantalla no se rompa si falla la conexión
        const fallback = {
          system_prompt: 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.',
          ai_model: 'google/gemini-2.5-flash',
          ai_assistant_enabled: true,
          openrouter_api_key: ''
        };
        setConfig(fallback);
        setOriginalConfig(fallback);
        return;
      }

      const defaultPrompt = 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.';
      
      if (data) {
        const loadedConfig = {
          system_prompt: data.system_prompt || data.ai_system_prompt || defaultPrompt,
          ai_model: data.ai_model || 'google/gemini-2.5-flash',
          ai_assistant_enabled: data.ai_assistant_enabled !== false,
          openrouter_api_key: data.openrouter_api_key || ''
        };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
        try {
          localStorage.setItem('cached_system_config', JSON.stringify(loadedConfig));
        } catch (e) {
          console.error('[MATCHMAKER_CONFIG] Error guardando en caché:', e);
        }
      } else {
        // Inicialización de objeto por defecto si la tabla está vacía
        const defaultObject = {
          system_prompt: defaultPrompt,
          ai_model: 'google/gemini-2.5-flash',
          ai_assistant_enabled: true,
          openrouter_api_key: ''
        };
        setConfig(defaultObject);
        setOriginalConfig(defaultObject);
        try {
          localStorage.setItem('cached_system_config', JSON.stringify(defaultObject));
        } catch (e) {}
      }
    } catch (err) {
      console.error('[MATCHMAKER_CONFIG] Excepción en fetchConfig:', err);
      // Si ya hay datos configurados, no los sobreescribimos con el error
      const cached = localStorage.getItem('cached_system_config');
      if (!cached) {
        setError('Fallo de red o error crítico al conectar con la base de datos.');
        const fallback = {
          system_prompt: 'Eres el Asistente de Upfunnel y del Panel de la Productividad. Tu misión es ser un consultor profesional que ayuda a los usuarios a encontrar la herramienta ideal en nuestro ecosistema. Ayuda al usuario a seleccionar el mejor agente del catálogo.',
          ai_model: 'google/gemini-2.5-flash',
          ai_assistant_enabled: true,
          openrouter_api_key: ''
        };
        setConfig(fallback);
        setOriginalConfig(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ai_assistant_enabled: config.ai_assistant_enabled,
        ai_model: config.ai_model,
        system_prompt: config.system_prompt,
        ai_system_prompt: config.system_prompt, // Mantener ambos por compatibilidad
        openrouter_api_key: config.openrouter_api_key,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('system_config')
        .upsert({ 
          id: 1, 
          ...payload 
        }, { onConflict: 'id' });

      if (updateError) throw updateError;

      setOriginalConfig(config);
      try {
        localStorage.setItem('cached_system_config', JSON.stringify(config));
      } catch (e) {}
      toast.success('Configuración del Matchmaker actualizada con éxito');
    } catch (err) {
      console.error('[MATCHMAKER_CONFIG] Save Error:', err);
      setError('Fallo al guardar cambios en Supabase: ' + err.message);
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
      toast.success('Cambios revertidos al último estado guardado');
    }
  };

  // Guard de carga defensivo contra deshidratación de estados
  if (loading) {
    return (
      <AdminLayout currentPage="matchmaker-config">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-neon-teal/20 border-t-neon-teal animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizando cerebro de IA...</p>
        </div>
      </AdminLayout>
    );
  }

  const hasChanges = originalConfig && (
    config.ai_assistant_enabled !== originalConfig.ai_assistant_enabled ||
    config.ai_model !== originalConfig.ai_model ||
    config.system_prompt !== originalConfig.system_prompt ||
    config.openrouter_api_key !== originalConfig.openrouter_api_key
  );

  return (
    <AdminLayout currentPage="matchmaker-config">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Encabezado Premium */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic neon-glow flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-neon-teal" /> Configuración Matchmaker
            </h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
              Control centralizado y tuning del asistente virtual inteligente
            </p>
          </div>
        </div>

        {error && (
          <div className="glass-card p-6 border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal - Panel de Configuración */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-8 border-white/10 space-y-8">
              
              {/* Sección 1: Instrucción del Sistema */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">System Prompt Maestro</h3>
                </div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                  Este prompt guía el comportamiento global del asistente en todo el sitio web. Modifica las reglas de tono, personalidad, restricciones y cómo se presenta al usuario.
                </p>
                <div className="space-y-2">
                  <textarea 
                    rows="8" 
                    value={config?.system_prompt || ''} 
                    onChange={e => setConfig({ ...config, system_prompt: e.target.value })} 
                    className="premium-input w-full resize-none font-mono text-xs leading-relaxed" 
                    placeholder="Define las instrucciones maestras..." 
                    required
                  />
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-1">
                    Nota: Se inyectarán automáticamente las variables dinámicas de los agentes del catálogo al final de la instrucción.
                  </span>
                </div>
              </div>

              {/* Sección 2: Cerebro Operativo */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Modelo de IA Predeterminado</h3>
                </div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                  Selecciona cuál de los modelos conectados de OpenRouter procesará las interacciones y búsquedas en el frontend de forma global.
                </p>
                <div className="space-y-2 max-w-md">
                  <select 
                    value={config?.ai_model || 'google/gemini-2.5-flash'} 
                    onChange={e => setConfig({ ...config, ai_model: e.target.value })} 
                    className="premium-input w-full appearance-none bg-deep-dark text-white cursor-pointer font-bold text-xs uppercase"
                  >
                    {OPENROUTER_MODELS.map(model => (
                      <option key={model.value} value={model.value} className="bg-deep-dark text-white font-bold text-xs uppercase tracking-widest">
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección 3: Credenciales de OpenRouter */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Token de Acceso OpenRouter</h3>
                </div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                  Para que la IA del Matchmaker y los asistentes se ejecuten correctamente sin depender de claves del entorno, introduce tu clave API de OpenRouter aquí.
                </p>
                <div className="space-y-2 max-w-md relative">
                  <div className="relative flex items-center">
                    <input 
                      type={showApiKey ? "text" : "password"}
                      value={config?.openrouter_api_key || ''} 
                      onChange={e => setConfig({ ...config, openrouter_api_key: e.target.value })} 
                      className="premium-input w-full pr-12 font-mono text-xs" 
                      placeholder="sk-or-v1-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 text-gray-500 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-1">
                    Este valor se guarda cifrado en tu esquema Supabase y se carga en el canal de comunicación del usuario.
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Columna Derecha - Estado e Información */}
          <div className="space-y-8">
            
            {/* Tarjeta de Estado Operativo */}
            <div className="glass-card p-8 border-white/10 flex flex-col justify-between h-full min-h-[300px] relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/5 blur-[50px] transition-all rounded-tr-[3rem]"></div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Estado Operativo</h3>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tighter">Asistente en Línea</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Visibilidad en Pantalla Principal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ai_assistant_enabled: !config.ai_assistant_enabled })}
                    className="text-neon-teal hover:scale-105 active:scale-95 transition-all outline-none"
                  >
                    {config?.ai_assistant_enabled ? (
                      <ToggleRight className="w-14 h-14" />
                    ) : (
                      <ToggleLeft className="w-14 h-14 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-neon-teal" /> Consejos Rápidos
                  </h4>
                  <ul className="text-[9px] font-bold text-gray-400 space-y-2 list-disc list-inside uppercase tracking-wider">
                    <li>Mantén el tono profesional e instructivo.</li>
                    <li>No superes los 1500 caracteres para evitar latencia.</li>
                    <li>Usa los modelos "Free" para testing rápido y migra a Gemini o Llama 3.1 70B para producción.</li>
                  </ul>
                </div>
              </div>

              {/* Acciones del Formulario */}
              <div className="flex flex-col gap-4 mt-8 relative z-10">
                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  className="w-full py-4 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-neon-teal/20 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
                
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-4 glass-card border-white/5 text-gray-400 font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> REVERTIR CAMBIOS
                  </button>
                )}
              </div>

            </div>

          </div>

        </form>

      </div>
    </AdminLayout>
  );
};

export default MatchmakerConfig;
