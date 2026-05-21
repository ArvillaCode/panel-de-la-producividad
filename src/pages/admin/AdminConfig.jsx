import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Shield, 
  Database, 
  Globe, 
  Palette,
  Bell,
  Server,
  Check,
  AlertTriangle,
  X,
  ChevronDown,
  Search,
  Bot
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';

const ConfigSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex items-center">
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
    </div>
    <div className="p-6 space-y-4">
      {children}
    </div>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, required = false, min, max, description }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
    />
    {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
  </div>
);

const SelectField = ({ label, value, onChange, options, description }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
  </div>
);

const ToggleField = ({ label, value, onChange, description }) => (
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const TimezoneSelect = ({ value, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const timezones = Intl.supportedValuesOf('timeZone');
  const filteredTz = timezones.filter(tz => tz.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zona Horaria</label>
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700 dark:text-white flex items-center justify-between shadow-sm">
          <Globe className="absolute left-3 w-4 h-4 text-gray-400" />
          <span className="truncate">{value.replace(/_/g, ' ')}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" autoFocus placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredTz.map(tz => (
                <button key={tz} onClick={() => { onChange(tz); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm ${value === tz ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}>
                  {tz.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const OPENROUTER_MODELS = [
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek: DeepSeek V3 (Premium Ultra-Económico)' },
  { value: 'deepseek/deepseek-reasoner', label: 'DeepSeek: DeepSeek R1 (Premium Razonamiento Ultra-Económico)' },
  { value: 'google/gemini-2.5-flash', label: 'Google: Gemini 2.5 Flash' },
  { value: 'google/gemini-2.5-pro', label: 'Google: Gemini 2.5 Pro' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic: Claude 3.5 Sonnet' },
  { value: 'openrouter/free', label: 'OpenRouter: Auto Free Router (Free)' },
  { value: 'meta-llama/llama-3-8b-instruct:free', label: 'Meta: Llama 3 8B Instruct (Free)' },
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta: Llama 3.3 70B Instruct (Free)' },
  { value: 'google/gemma-2-9b-it:free', label: 'Google: Gemma 2 9B IT (Free)' },
];

const AdminConfig = () => {
  const { toggleTheme } = useTheme();
  
  const [config, setConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('systemConfig');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      siteName: 'Panel de Administración',
      siteDescription: 'Sistema de gestión administrativa',
      adminEmail: 'admin@sistema.com',
      timezone: 'America/Mexico_City',
      passwordMinLength: 8,
      requireStrongPassword: true,
      aiAssistantEnabled: true,
      showAcademia: true,
      aiModel: 'google/gemini-2.5-flash'
    };
  });

  const [originalConfig, setOriginalConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('systemConfig');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {
      siteName: 'Panel de Administración',
      siteDescription: 'Sistema de gestión administrativa',
      adminEmail: 'admin@sistema.com',
      timezone: 'America/Mexico_City',
      passwordMinLength: 8,
      requireStrongPassword: true,
      aiAssistantEnabled: true,
      showAcademia: true,
      aiModel: 'google/gemini-2.5-flash'
    };
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('systemConfig');
      return !cached;
    } catch (e) {
      return true;
    }
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
  }, [config, originalConfig]);

  const loadConfig = async () => {
    const hasCache = !!localStorage.getItem('systemConfig');
    if (!hasCache) {
      setLoading(true);
    }
    try {
      const fetchPromise = supabase
        .from('system_config')
        .select('site_name, site_description, admin_email, timezone, password_min_length, require_strong_password, ai_assistant_enabled, show_academia, ai_model')
        .eq('id', 1)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de conexión con Supabase')), 2000)
      );

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (fetchError) {
        console.warn('[ADMIN_CONFIG] Fallo de consulta a Supabase, aplicando fallback local:', fetchError.message);
        const saved = localStorage.getItem('systemConfig');
        if (saved) { 
          const p = JSON.parse(saved); 
          setConfig(p); 
          setOriginalConfig(p); 
        }
        return;
      }

      if (data) {
        const mapped = {
          siteName: data.site_name,
          siteDescription: data.site_description,
          adminEmail: data.admin_email,
          timezone: data.timezone,
          passwordMinLength: data.password_min_length,
          requireStrongPassword: data.require_strong_password,
          aiAssistantEnabled: data.ai_assistant_enabled !== false,
          showAcademia: data.show_academia !== false,
          aiModel: data.ai_model || 'google/gemini-2.5-flash'
        };
        setConfig(mapped);
        setOriginalConfig(mapped);
        try {
          localStorage.setItem('systemConfig', JSON.stringify(mapped));
        } catch (e) {}
      }
    } catch (err) { 
      console.error('[ADMIN_CONFIG] Error cargando configuración:', err);
      const saved = localStorage.getItem('systemConfig');
      if (saved) {
        const p = JSON.parse(saved);
        setConfig(p);
        setOriginalConfig(p);
      } else {
        setError('Error de conexión'); 
      }
    } finally { 
      setLoading(false); 
    }
  };

  const handleConfigChange = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      if (!config.siteName?.trim()) throw new Error('Nombre obligatorio');
      
      const dbData = {
        site_name: config.siteName,
        site_description: config.siteDescription,
        admin_email: config.adminEmail,
        timezone: config.timezone,
        password_min_length: config.passwordMinLength,
        require_strong_password: config.requireStrongPassword,
        ai_assistant_enabled: config.aiAssistantEnabled,
        show_academia: config.showAcademia,
        ai_model: config.aiModel || 'google/gemini-2.5-flash',
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('system_config')
        .upsert({ 
          id: 1, 
          ...dbData 
        }, { onConflict: 'id' });

      if (updateError) {
        console.error('[CONFIG] Save error:', updateError);
        if (updateError.code === '42501') {
          throw new Error('No tienes permisos suficientes (RLS). Asegúrate de ejecutar el script master_db_setup.sql en Supabase.');
        }
        throw new Error(`Error al guardar: ${updateError.message}`);
      }
      
      localStorage.setItem('systemConfig', JSON.stringify(config));
      setOriginalConfig(config);
      setSuccess('Configuración guardada exitosamente');
      
      // Auto-limpiar éxito
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      setError(err.message); 
      setTimeout(() => setError(''), 5000);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <AdminLayout currentPage="config">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión general del sistema</p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            {hasChanges && (
              <button onClick={() => setConfig(originalConfig)} className="inline-flex items-center px-4 py-2 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                <RotateCcw className="w-4 h-4 mr-2" /> Descartar
              </button>
            )}
            <button onClick={handleSaveConfig} disabled={!hasChanges || loading} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
              <Save className="w-4 h-4 mr-2" /> {loading ? '...' : 'Guardar'}
            </button>
          </div>
        </div>

        {success && <div className="p-4 bg-green-50 text-green-700 flex items-center">{success} <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}
        {error && <div className="p-4 bg-red-50 text-red-700 flex items-center">{error} <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button></div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConfigSection title="General" icon={Settings}>
            <InputField label="Nombre" value={config.siteName} onChange={(val) => handleConfigChange('siteName', val)} />
            <InputField label="Descripción" value={config.siteDescription} onChange={(val) => handleConfigChange('siteDescription', val)} />
            <InputField label="Admin Email" type="email" value={config.adminEmail} onChange={(val) => handleConfigChange('adminEmail', val)} />
            <TimezoneSelect value={config.timezone} onChange={(val) => handleConfigChange('timezone', val)} />
          </ConfigSection>

          <ConfigSection title="Seguridad de Acceso" icon={Shield}>
            <InputField label="Mínimo de caracteres" type="number" min={6} max={20} value={config.passwordMinLength} onChange={(val) => handleConfigChange('passwordMinLength', parseInt(val, 10))} />
            <ToggleField label="Exigir Contraseña Fuerte" value={config.requireStrongPassword} onChange={(val) => handleConfigChange('requireStrongPassword', val)} description="Exige letras mayúsculas, minúsculas, números y caracteres especiales al cambiar contraseñas." />
          </ConfigSection>
          
          <ConfigSection title="Inteligencia Artificial y Módulos" icon={Bot}>
            <ToggleField 
              label="Asistente de IA (Matchmaker)" 
              value={config.aiAssistantEnabled} 
              onChange={(val) => handleConfigChange('aiAssistantEnabled', val)}
              description="Activa o desactiva el asistente de IA (Matchmaker) en el panel de usuarios."
            />
            {config.aiAssistantEnabled && (
              <div className="mt-4">
                <SelectField 
                  label="Modelo de Inteligencia Artificial (OpenRouter)"
                  value={config.aiModel}
                  onChange={(val) => handleConfigChange('aiModel', val)}
                  options={OPENROUTER_MODELS}
                  description="Brain operativo global que impulsará las consultas del Matchmaker."
                />
              </div>
            )}
            <div className="mt-4">
              <ToggleField
                label="Mostrar Academia"
                value={config.showAcademia}
                onChange={(val) => handleConfigChange('showAcademia', val)}
                description="Muestra u oculta la opción 'Academia' para los usuarios normales. Los administradores seguirán teniendo acceso total en segundo plano."
              />
            </div>
          </ConfigSection>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminConfig;
