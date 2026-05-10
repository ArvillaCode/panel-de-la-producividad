import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Shield, 
  Database, 
  Mail, 
  Globe, 
  Palette,
  Bell,
  Lock,
  Server,
  Check,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Search
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

// Componentes de utilidad fuera para evitar pérdida de foco
const ConfigSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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

const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false, min, max, description }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
    />
    {description && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    )}
  </div>
);

const SelectField = ({ label, value, onChange, options, description }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {description && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    )}
  </div>
);

const ToggleField = ({ label, value, onChange, description }) => (
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// Componente de Zona Horaria Filtrable
const TimezoneSelect = ({ value, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const timezones = Intl.supportedValuesOf('timeZone');
  
  const filteredTz = timezones.filter(tz => 
    tz.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Zona Horaria
      </label>
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700 dark:text-white flex items-center justify-between shadow-sm"
        >
          <Globe className="absolute left-3 w-4 h-4 text-gray-400" />
          <span className="truncate">{value.replace(/_/g, ' ')}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar ciudad o región..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {filteredTz.length > 0 ? (
                filteredTz.map(tz => (
                  <button
                    key={tz}
                    onClick={() => {
                      onChange(tz);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                      value === tz 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tz.replace(/_/g, ' ')}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';

const AdminConfig = () => {
  const { theme, toggleTheme } = useTheme();
  
  const [config, setConfig] = useState({
    // Configuración general
    siteName: 'Panel de Administración',
    siteDescription: 'Sistema de gestión administrativa',
    adminEmail: 'admin@sistema.com',
    timezone: 'America/Mexico_City',
    language: 'es',
    
    // Configuración de seguridad
    sessionTimeout: 30,
    maxLoginAttempts: 3,
    passwordMinLength: 8,
    requireStrongPassword: true,
    enableTwoFactor: false,
    
    // Configuración de notificaciones
    emailNotifications: true,
    systemAlerts: true,
    userRegistrationNotify: true,
    
    // Configuración de base de datos
    backupFrequency: 'daily',
    retentionDays: 30,
    autoBackup: true,
    
    // Configuración de tema
    defaultTheme: 'dark',
    allowUserThemeChange: true,
    
    // Configuración del servidor
    maintenanceMode: false,
    debugMode: false,
    logLevel: 'info'
  });

  const [originalConfig, setOriginalConfig] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    const configChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(configChanged);
  }, [config, originalConfig]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      // 1. Intentar cargar desde Supabase
      const { data, error: fetchError } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (fetchError) {
        console.warn('[CONFIG] No se pudo cargar de DB, usando locales:', fetchError.message);
        // Fallback a localStorage si existe
        const savedConfig = localStorage.getItem('systemConfig');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
          setOriginalConfig(parsed);
        } else {
          setOriginalConfig(config);
        }
        return;
      }

      if (data) {
        // Mapear snake_case de DB a camelCase de State
        const mappedConfig = {
          siteName: data.site_name,
          siteDescription: data.site_description,
          adminEmail: data.admin_email,
          timezone: data.timezone,
          language: data.language,
          sessionTimeout: data.session_timeout,
          maxLoginAttempts: data.max_login_attempts,
          passwordMinLength: data.password_min_length,
          requireStrongPassword: data.require_strong_password,
          enableTwoFactor: data.enable_two_factor,
          emailNotifications: data.email_notifications,
          systemAlerts: data.system_alerts,
          userRegistrationNotify: data.user_registration_notify,
          backupFrequency: data.backup_frequency,
          retentionDays: data.retention_days,
          autoBackup: data.auto_backup,
          defaultTheme: data.default_theme,
          allowUserThemeChange: data.allow_user_theme_change,
          maintenanceMode: data.maintenance_mode,
          debugMode: data.debug_mode,
          logLevel: data.log_level
        };
        setConfig(mappedConfig);
        setOriginalConfig(mappedConfig);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validaciones básicas
      if (!config.siteName.trim()) throw new Error('El nombre del sitio es obligatorio');
      if (!config.adminEmail.trim()) throw new Error('El email del administrador es obligatorio');
      
      // Mapear camelCase a snake_case para la DB
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
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('system_config')
        .upsert({ id: 1, ...dbData });

      if (updateError) throw updateError;
      
      // Sincronizar también con localStorage como redundancia rápida
      localStorage.setItem('systemConfig', JSON.stringify(config));
      setOriginalConfig(config);
      setSuccess('Configuración guardada permanentemente en la base de datos');
      
    } catch (err) {
      setError(err.message || 'Error al guardar en la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
    setConfig(originalConfig);
    setError('');
    setSuccess('');
  };


  return (
    <AdminLayout currentPage="config">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configuración del Sistema
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Administra la configuración general del sistema
            </p>
          </div>
          
          <div className="flex space-x-3 mt-4 sm:mt-0">
            {hasChanges && (
              <button
                onClick={handleResetConfig}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Descartar
              </button>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={!hasChanges || loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <p className="text-green-600 dark:text-green-400">{success}</p>
              <button
                onClick={() => setSuccess('')}
                className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {hasChanges && (
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-yellow-600 dark:text-yellow-400">
                Tienes cambios sin guardar. No olvides guardar tu configuración.
              </p>
            </div>
          </div>
        )}

        {/* Configuration Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuración General */}
          <ConfigSection title="Configuración General" icon={Settings}>
            <InputField
              label="Nombre del Sitio"
              value={config.siteName}
              onChange={(value) => handleConfigChange('general', 'siteName', value)}
              placeholder="Panel de Administración"
              required
            />
            
            <InputField
              label="Descripción"
              value={config.siteDescription}
              onChange={(value) => handleConfigChange('general', 'siteDescription', value)}
              placeholder="Descripción del sistema"
            />
            
            <InputField
              label="Email del Administrador"
              type="email"
              value={config.adminEmail}
              onChange={(value) => handleConfigChange('general', 'adminEmail', value)}
              placeholder="admin@sistema.com"
              required
            />
            
            <TimezoneSelect 
              value={config.timezone} 
              onChange={(val) => handleConfigChange('general', 'timezone', val)} 
            />
            
            <div className="space-y-1">
              <SelectField
                label="Idioma del Sistema"
                value={config.language}
                onChange={(value) => {
                  handleConfigChange('general', 'language', value);
                  if (value === 'en') {
                    setSuccess('Language changed to English (Interface only)');
                  } else {
                    setSuccess('Idioma cambiado a Español');
                  }
                }}
                options={[
                  { value: 'es', label: 'Español (Castellano)' },
                  { value: 'en', label: 'English (United States)' },
                  { value: 'fr', label: 'Français' },
                  { value: 'pt', label: 'Português' }
                ]}
                description="Nota: Algunas partes del panel pueden requerir recarga para aplicar el idioma."
              />
            </div>
          </ConfigSection>

          {/* Configuración de Seguridad */}
          <ConfigSection title="Seguridad" icon={Shield}>
            <InputField
              label="Tiempo de Sesión (minutos)"
              type="number"
              value={config.sessionTimeout}
              onChange={(value) => handleConfigChange('sessionTimeout', parseInt(value))}
              min="5"
              max="480"
              description="Tiempo antes de cerrar sesión automáticamente"
            />
            
            <InputField
              label="Máximo Intentos de Login"
              type="number"
              value={config.maxLoginAttempts}
              onChange={(value) => handleConfigChange('maxLoginAttempts', parseInt(value))}
              min="3"
              max="10"
              description="Número de intentos antes de bloquear la cuenta"
            />
            
            <InputField
              label="Longitud Mínima de Contraseña"
              type="number"
              value={config.passwordMinLength}
              onChange={(value) => handleConfigChange('passwordMinLength', parseInt(value))}
              min="4"
              max="50"
            />
            
            <ToggleField
              label="Requerir Contraseña Fuerte"
              value={config.requireStrongPassword}
              onChange={(value) => handleConfigChange('requireStrongPassword', value)}
              description="Requiere mayúsculas, minúsculas, números y símbolos"
            />
            
            <ToggleField
              label="Autenticación de Dos Factores"
              value={config.enableTwoFactor}
              onChange={(value) => handleConfigChange('enableTwoFactor', value)}
              description="Habilitar 2FA para mayor seguridad"
            />
          </ConfigSection>

          {/* Configuración de Notificaciones */}
          <ConfigSection title="Notificaciones" icon={Bell}>
            <ToggleField
              label="Notificaciones por Email"
              value={config.emailNotifications}
              onChange={(value) => handleConfigChange('emailNotifications', value)}
              description="Enviar notificaciones importantes por email"
            />
            
            <ToggleField
              label="Alertas del Sistema"
              value={config.systemAlerts}
              onChange={(value) => handleConfigChange('systemAlerts', value)}
              description="Mostrar alertas en tiempo real"
            />
            
            <ToggleField
              label="Notificar Nuevos Registros"
              value={config.userRegistrationNotify}
              onChange={(value) => handleConfigChange('userRegistrationNotify', value)}
              description="Notificar cuando se registre un nuevo usuario"
            />
          </ConfigSection>

          {/* Configuración de Base de Datos */}
          <ConfigSection title="Base de Datos" icon={Database}>
            <SelectField
              label="Frecuencia de Respaldo"
              value={config.backupFrequency}
              onChange={(value) => handleConfigChange('backupFrequency', value)}
              options={[
                { value: 'hourly', label: 'Cada hora' },
                { value: 'daily', label: 'Diario' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'monthly', label: 'Mensual' }
              ]}
            />
            
            <InputField
              label="Días de Retención"
              type="number"
              value={config.retentionDays}
              onChange={(value) => handleConfigChange('retentionDays', parseInt(value))}
              min="1"
              max="365"
              description="Días para mantener los respaldos"
            />
            
            <ToggleField
              label="Respaldo Automático"
              value={config.autoBackup}
              onChange={(value) => handleConfigChange('autoBackup', value)}
              description="Realizar respaldos automáticamente"
            />
          </ConfigSection>

          {/* Configuración de Tema */}
          <ConfigSection title="Apariencia" icon={Palette}>
            <SelectField
              label="Tema por Defecto"
              value={config.defaultTheme}
              onChange={(value) => handleConfigChange('defaultTheme', value)}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Oscuro' },
                { value: 'system', label: 'Automático (Sistema)' }
              ]}
            />
            
            <ToggleField
              label="Permitir Cambio de Tema"
              value={config.allowUserThemeChange}
              onChange={(value) => handleConfigChange('allowUserThemeChange', value)}
              description="Permitir a los usuarios cambiar el tema"
            />
            
            <div className="pt-2">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Palette className="w-4 h-4 mr-2" />
                Cambiar Tema Actual
              </button>
            </div>
          </ConfigSection>

          {/* Configuración del Servidor */}
          <ConfigSection title="Servidor" icon={Server}>
            <ToggleField
              label="Modo Mantenimiento"
              value={config.maintenanceMode}
              onChange={(value) => handleConfigChange('maintenanceMode', value)}
              description="Deshabilitar acceso público al sistema"
            />
            
            <ToggleField
              label="Modo Debug"
              value={config.debugMode}
              onChange={(value) => handleConfigChange('debugMode', value)}
              description="Mostrar información de depuración"
            />
            
            <SelectField
              label="Nivel de Logs"
              value={config.logLevel}
              onChange={(value) => handleConfigChange('logLevel', value)}
              options={[
                { value: 'error', label: 'Solo Errores' },
                { value: 'warn', label: 'Advertencias y Errores' },
                { value: 'info', label: 'Información General' },
                { value: 'debug', label: 'Debug Completo' }
              ]}
            />
          </ConfigSection>
        </div>

        {/* Status Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Estado del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Sistema Operativo</p>
              <p className="text-xs text-green-500 dark:text-green-300">Funcionando correctamente</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Base de Datos</p>
              <p className="text-xs text-blue-500 dark:text-blue-300">Conectada</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Seguridad</p>
              <p className="text-xs text-purple-500 dark:text-purple-300">Protegido</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminConfig;