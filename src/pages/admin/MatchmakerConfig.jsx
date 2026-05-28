import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Cpu,
  Activity,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

const OPENROUTER_MODELS = [
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek: DeepSeek V3 (Premium Ultra-Economico)' },
  { value: 'deepseek/deepseek-reasoner', label: 'DeepSeek: DeepSeek R1 (Premium Razonamiento Ultra-Economico)' },
  { value: 'google/gemini-2.5-flash', label: 'Google: Gemini 2.5 Flash (Premium)' },
  { value: 'google/gemini-2.5-pro', label: 'Google: Gemini 2.5 Pro (Premium)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic: Claude 3.5 Sonnet (Premium)' },
  { value: 'openrouter/free', label: 'OpenRouter: Auto Free Router (Free)' },
  { value: 'meta-llama/llama-3-8b-instruct:free', label: 'Meta: Llama 3 8B Instruct (Free)' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta: Llama 3.3 70B Instruct (Free)' },
  { value: 'google/gemma-2-9b-it:free', label: 'Google: Gemma 2 9B IT (Free)' }
];

const DEFAULT_PROMPT =
  'Eres el Asistente Inteligente de Upfunnel y del Panel de la Productividad. Tu mision es actuar exclusivamente como un recomendador o matchmaker de agentes especializados de nuestro catalogo. Identifica la necesidad del usuario y sugiere el mejor agente de la lista de AGENTES ACTIVOS. NUNCA respondas directamente a la pregunta ni resuelvas la consulta del usuario por tu cuenta. Tu unico proposito es derivarlo al agente ideal.';

const DEFAULT_CONFIG = {
  system_prompt: DEFAULT_PROMPT,
  ai_model: 'google/gemini-2.5-flash',
  ai_assistant_enabled: true
};

const sanitizeConfig = (raw = {}) => ({
  system_prompt: raw.system_prompt || raw.ai_system_prompt || DEFAULT_PROMPT,
  ai_model: raw.ai_model || 'google/gemini-2.5-flash',
  ai_assistant_enabled: raw.ai_assistant_enabled !== false
});

const readCachedConfig = () => {
  try {
    const cached = localStorage.getItem('cached_system_config');
    if (cached) return sanitizeConfig(JSON.parse(cached));
  } catch (e) {
    console.warn('[MATCHMAKER_CONFIG] Cache invalida:', e);
  }
  return DEFAULT_CONFIG;
};

const MatchmakerConfig = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(readCachedConfig);
  const [originalConfig, setOriginalConfig] = useState(readCachedConfig);
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('cached_system_config');
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const persistCache = (nextConfig) => {
    try {
      localStorage.setItem('cached_system_config', JSON.stringify(nextConfig));
    } catch (e) {
      console.warn('[MATCHMAKER_CONFIG] No se pudo actualizar cache:', e);
    }
  };

  const fetchConfig = async () => {
    const hasCache = !!localStorage.getItem('cached_system_config');
    if (!hasCache) setLoading(true);
    setError('');

    try {
      const fetchPromise = supabase
        .from('system_config')
        .select('system_prompt, ai_system_prompt, ai_model, ai_assistant_enabled')
        .eq('id', 1)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de conexion con Supabase')), 2000)
      );

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (fetchError) {
        console.warn('[MATCHMAKER_CONFIG] Fallo de consulta a Supabase, aplicando fallback local:', fetchError.message);
        setConfig(DEFAULT_CONFIG);
        setOriginalConfig(DEFAULT_CONFIG);
        return;
      }

      const nextConfig = data ? sanitizeConfig(data) : DEFAULT_CONFIG;
      setConfig(nextConfig);
      setOriginalConfig(nextConfig);
      persistCache(nextConfig);
    } catch (err) {
      console.error('[MATCHMAKER_CONFIG] Excepcion en fetchConfig:', err);
      if (!localStorage.getItem('cached_system_config')) {
        setError('Fallo de red o error critico al conectar con la base de datos.');
        setConfig(DEFAULT_CONFIG);
        setOriginalConfig(DEFAULT_CONFIG);
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
        ai_system_prompt: config.system_prompt,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('system_config')
        .upsert({ id: 1, ...payload }, { onConflict: 'id' });

      if (updateError) throw updateError;

      setOriginalConfig(config);
      persistCache(config);
      toast.success('Configuracion del Matchmaker actualizada con exito');
    } catch (err) {
      console.error('[MATCHMAKER_CONFIG] Save Error:', err);
      setError('Fallo al guardar cambios en Supabase: ' + err.message);
      toast.error('No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
      toast.success('Cambios revertidos al ultimo estado guardado');
    }
  };

  const hasChanges = originalConfig && (
    config.ai_assistant_enabled !== originalConfig.ai_assistant_enabled ||
    config.ai_model !== originalConfig.ai_model ||
    config.system_prompt !== originalConfig.system_prompt
  );

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

  return (
    <AdminLayout currentPage="matchmaker-config">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic neon-glow flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-neon-teal" /> Configuracion Matchmaker
            </h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
              Control centralizado del asistente virtual inteligente
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
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-8 border-white/10 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">System Prompt Maestro</h3>
                </div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                  Este prompt guia el comportamiento global del asistente. Modifica reglas de tono, restricciones y presentacion al usuario.
                </p>
                <div className="space-y-2">
                  <textarea
                    rows="8"
                    value={config.system_prompt || ''}
                    onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                    className="premium-input w-full resize-none font-mono text-xs leading-relaxed"
                    placeholder="Define las instrucciones maestras..."
                    required
                  />
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mt-1">
                    La funcion Edge inyecta automaticamente los agentes visibles al final de la instruccion.
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Modelo de IA Predeterminado</h3>
                </div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                  Selecciona el modelo que usara la funcion Edge para procesar las interacciones del Matchmaker.
                </p>
                <div className="space-y-2 max-w-md">
                  <select
                    value={config.ai_model || 'google/gemini-2.5-flash'}
                    onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                    className="premium-input w-full appearance-none bg-deep-dark text-white cursor-pointer font-bold text-xs uppercase"
                  >
                    {OPENROUTER_MODELS.map((model) => (
                      <option key={model.value} value={model.value} className="bg-deep-dark text-white font-bold text-xs uppercase tracking-widest">
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Credencial OpenRouter</h3>
                </div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">
                  La clave API ya no se guarda ni se muestra en el navegador. Configurala como secreto del backend: OPENROUTER_API_KEY.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card p-8 border-white/10 flex flex-col justify-between h-full min-h-[300px] relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/5 blur-[50px] transition-all rounded-tr-[3rem]"></div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-neon-teal" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider italic">Estado Operativo</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tighter">Asistente en Linea</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Visibilidad en pantalla principal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, ai_assistant_enabled: !config.ai_assistant_enabled })}
                    className="text-neon-teal hover:scale-105 active:scale-95 transition-all outline-none"
                  >
                    {config.ai_assistant_enabled ? (
                      <ToggleRight className="w-14 h-14" />
                    ) : (
                      <ToggleLeft className="w-14 h-14 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-neon-teal" /> Consejos Rapidos
                  </h4>
                  <ul className="text-[9px] font-bold text-gray-400 space-y-2 list-disc list-inside uppercase tracking-wider">
                    <li>Manten el tono profesional e instructivo.</li>
                    <li>No superes los 1500 caracteres para evitar latencia.</li>
                    <li>Usa modelos gratuitos solo para pruebas controladas.</li>
                  </ul>
                </div>
              </div>

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
