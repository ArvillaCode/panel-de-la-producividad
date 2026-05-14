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

const AdminConfig = () => {
  const { toggleTheme } = useTheme();
  
  const [config, setConfig] = useState({
    siteName: 'Panel de Administración',
    siteDescription: 'Sistema de gestión administrativa',
    adminEmail: 'admin@sistema.com',
    timezone: 'America/Mexico_City',
    language: 'es',
    sessionTimeout: 30,
    maxLoginAttempts: 3,
    passwordMinLength: 8,
    requireStrongPassword: true,
    enableTwoFactor: false,
    emailNotifications: true,
    systemAlerts: true,
    userRegistrationNotify: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    autoBackup: true,
    defaultTheme: 'dark',
    allowUserThemeChange: true,
    maintenanceMode: false,
    debugMode: false,
    logLevel: 'info',
    aiAssistantEnabled: true
  });

  const [originalConfig, setOriginalConfig] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
  }, [config, originalConfig]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('system_config').select('*').eq('id', 1).maybeSingle();
      if (fetchError) {
        const saved = localStorage.getItem('systemConfig');
        if (saved) { const p = JSON.parse(saved); setConfig(p); setOriginalConfig(p); }
        return;
      }
      if (data) {
        const mapped = {
          siteName: data.site_name, siteDescription: data.site_description, adminEmail: data.admin_email,
          timezone: data.timezone, language: data.language, sessionTimeout: data.session_timeout,
          maxLoginAttempts: data.max_login_attempts, passwordMinLength: data.password_min_length,
          requireStrongPassword: data.require_strong_password, enableTwoFactor: data.enable_two_factor,
          emailNotifications: data.email_notifications, systemAlerts: data.system_alerts,
          userRegistrationNotify: data.user_registration_notify, backupFrequency: data.backup_frequency,
          retentionDays: data.retention_days, autoBackup: data.auto_backup, defaultTheme: data.default_theme,
          allowUserThemeChange: data.allow_user_theme_change, maintenanceMode: data.maintenance_mode,
          debugMode: data.debug_mode, logLevel: data.log_level,
          aiAssistantEnabled: data.ai_assistant_enabled !== false // Default to true
        };
        setConfig(mapped); setOriginalConfig(mapped);
      }
    } catch (err) { setError('Error de conexión'); } finally { setLoading(false); }
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
        language: config.language,
        session_timeout: config.sessionTimeout,
        max_login_attempts: config.maxLoginAttempts,
        password_min_length: config.passwordMinLength,
        require_strong_password: config.requireStrongPassword,
        enable_two_factor: config.enableTwoFactor,
        email_notifications: config.emailNotifications,
        system_alerts: config.systemAlerts,
        user_registration_notify: config.userRegistrationNotify,
        backup_frequency: config.backupFrequency,
        retention_days: config.retentionDays,
        auto_backup: config.autoBackup,
        default_theme: config.defaultTheme,
        allow_user_theme_change: config.allowUserThemeChange,
        maintenance_mode: config.maintenanceMode,
        debug_mode: config.debugMode,
        log_level: config.logLevel,
        ai_assistant_enabled: config.aiAssistantEnabled,
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

          <ConfigSection title="Seguridad" icon={Shield}>
            <InputField label="Sesión (min)" type="number" value={config.sessionTimeout} onChange={(val) => handleConfigChange('sessionTimeout', parseInt(val, 10))} />
            <InputField label="Intentos Login" type="number" value={config.maxLoginAttempts} onChange={(val) => handleConfigChange('maxLoginAttempts', parseInt(val, 10))} />
            <ToggleField label="Contraseña Fuerte" value={config.requireStrongPassword} onChange={(val) => handleConfigChange('requireStrongPassword', val)} />
            <ToggleField label="2FA" value={config.enableTwoFactor} onChange={(val) => handleConfigChange('enableTwoFactor', val)} />
          </ConfigSection>

          <ConfigSection title="Notificaciones" icon={Bell}>
            <ToggleField label="Email" value={config.emailNotifications} onChange={(val) => handleConfigChange('emailNotifications', val)} />
            <ToggleField label="Alertas" value={config.systemAlerts} onChange={(val) => handleConfigChange('systemAlerts', val)} />
          </ConfigSection>

          <ConfigSection title="Apariencia" icon={Palette}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Alternar entre tema claro y oscuro</p>
              <button onClick={toggleTheme} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-bold flex items-center transition-colors">
                <Palette className="w-4 h-4 mr-2" />
                Cambiar Tema
              </button>
            </div>
          </ConfigSection>

          <ConfigSection title="Servidor" icon={Server}>
            <ToggleField label="Mantenimiento" value={config.maintenanceMode} onChange={(val) => handleConfigChange('maintenanceMode', val)} />
            <ToggleField label="Debug" value={config.debugMode} onChange={(val) => handleConfigChange('debugMode', val)} />
          </ConfigSection>

          <ConfigSection title="Base de Datos" icon={Database}>
            <SelectField label="Respaldo" value={config.backupFrequency} onChange={(val) => handleConfigChange('backupFrequency', val)} options={[{value: 'daily', label: 'Diario'}, {value: 'weekly', label: 'Semanal'}]} />
            <InputField label="Retención (días)" type="number" value={config.retentionDays} onChange={(val) => handleConfigChange('retentionDays', parseInt(val, 10))} />
          </ConfigSection>
          
          <ConfigSection title="Inteligencia Artificial" icon={Bot}>
            <ToggleField 
              label="Asistente Gemini" 
              value={config.aiAssistantEnabled} 
              onChange={(val) => handleConfigChange('aiAssistantEnabled', val)}
              description="Activa o desactiva el asistente de IA (Matchmaker) en el panel de usuarios."
            />
          </ConfigSection>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminConfig;