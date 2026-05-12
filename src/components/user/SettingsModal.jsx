import React, { useState } from 'react';
import { X, User, Lock, Moon, Sun, Globe, Check, AlertCircle, Camera, Shield, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

const SettingsModal = ({ onClose }) => {
  const { user, profile, updateUser, changePassword, actionLoading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  
  const [activeTab, setActiveTab] = useState('perfil');
  const [profileData, setProfileData] = useState({
    name: profile?.name || '',
    avatar: profile?.avatar_url || '',
    timezone: profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const timezones = Intl.supportedValuesOf('timeZone');
  const filteredTz = timezones.filter(tz => tz.toLowerCase().includes(tzSearch.toLowerCase()));

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'seguridad', label: 'Seguridad', icon: Lock },
    { id: 'apariencia', label: 'Apariencia', icon: Moon },
    { id: 'idioma', label: 'Zona Horaria', icon: Globe },
    { id: 'suscripcion', label: 'Suscripción', icon: Shield }
  ];

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return setMessage({ text: 'Selecciona una imagen válida', type: 'error' });
    }
    if (file.size > 2 * 1024 * 1024) {
      return setMessage({ text: 'La imagen no debe superar los 2MB', type: 'error' });
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfileData({ ...profileData, avatar: publicUrl });
      setMessage({ text: '¡Imagen cargada! Haz clic en "Guardar Perfil" para aplicar.', type: 'success' });
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setMessage({ text: 'Error al subir la imagen', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setMessage({ text: '', type: '' });
    const result = await updateUser({
      name: profileData.name,
      avatar_url: profileData.avatar,
      timezone: profileData.timezone
    });
    if (result.success) {
      setMessage({ text: 'Perfil actualizado correctamente', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Error al actualizar', type: 'error' });
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (passwords.next !== passwords.confirm) {
      return setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
    }
    const result = await changePassword(passwords.current, passwords.next);
    if (result.success) {
      setMessage({ text: 'Contraseña actualizada correctamente', type: 'success' });
      setPasswords({ current: '', next: '', confirm: '' });
    } else {
      setMessage({ text: result.error || 'Error al actualizar', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ajustes de Cuenta</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          {/* Tabs Sidebar */}
          <div className="w-full md:w-56 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700 p-4 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto">
            {message.text && (
              <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            {activeTab === 'perfil' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-600/20 group-hover:border-blue-600 transition-all shadow-xl bg-gray-100 dark:bg-gray-700">
                      {profileData.avatar ? (
                        <img src={profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                      <Upload className="w-4 h-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                  <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Toca para cambiar foto (Máx 2MB)</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nombre de Usuario</label>
                    <input 
                      type="text" 
                      value={profileData.name} 
                      onChange={e => setProfileData({...profileData, name: e.target.value})}
                      className="w-full px-5 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={actionLoading || uploadingAvatar}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'seguridad' && (
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Contraseña Actual</label>
                  <input 
                    type="password" 
                    value={passwords.current} 
                    onChange={e => setPasswords({...passwords, current: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Nueva Contraseña</label>
                  <input 
                    type="password" 
                    value={passwords.next} 
                    onChange={e => setPasswords({...passwords, next: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Confirmar Nueva Contraseña</label>
                  <input 
                    type="password" 
                    value={passwords.confirm} 
                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Actualizando...' : 'ACTUALIZAR CONTRASEÑA'}
                </button>
              </form>
            )}

            {activeTab === 'apariencia' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white">Modo Oscuro</h4>
                      <p className="text-sm text-gray-500">Cambia entre el tema claro y oscuro</p>
                    </div>
                    <button 
                      onClick={toggleTheme}
                      className={`w-16 h-8 rounded-full transition-all relative ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${isDark ? 'left-9' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => !isDark && toggleTheme()}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${isDark ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent bg-gray-100 dark:bg-gray-900'}`}
                  >
                    <Moon className={`w-8 h-8 ${isDark ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">Oscuro</span>
                  </button>
                  <button 
                    onClick={() => isDark && toggleTheme()}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${!isDark ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-gray-100 dark:bg-gray-900'}`}
                  >
                    <Sun className={`w-8 h-8 ${!isDark ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">Claro</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'idioma' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Buscar Zona Horaria</label>
                  <div className="relative mb-4">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Ej: Mexico, Madrid, Bogota..."
                      value={tzSearch}
                      onChange={e => setTzSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm"
                    />
                  </div>
                  
                  <div className="max-h-[200px] overflow-y-auto pr-2 space-y-1 scrollbar-thin">
                    {filteredTz.map(tz => (
                      <button
                        key={tz}
                        onClick={() => setProfileData({...profileData, timezone: tz})}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                          profileData.timezone === tz 
                            ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {tz.replace(/_/g, ' ')}
                      </button>
                    ))}
                    {filteredTz.length === 0 && (
                      <p className="text-center py-4 text-xs text-gray-500">No se encontraron resultados</p>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500 italic">Esto ajustará cómo se muestran las fechas y horas en tus registros.</p>
                </div>
                <button 
                  onClick={handleSaveProfile}
                  disabled={actionLoading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'GUARDAR ZONA HORARIA'}
                </button>
              </div>
            )}

            {activeTab === 'suscripcion' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest opacity-70">Estado del Plan</p>
                      <h4 className="text-2xl font-black">Plan SaaS Premium 🚀</h4>
                    </div>
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase border border-white/10">
                      Activo
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Inicio</p>
                      <p className="text-sm font-bold">
                        {profile?.start_date ? new Date(profile.start_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Vencimiento</p>
                      <p className="text-sm font-bold">
                        {profile?.end_date ? new Date(profile.end_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    Beneficios de tu Suscripción
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Acceso ilimitado a los 50+ agentes especializados</li>
                    <li>• Actualizaciones semanales de modelos y lógica</li>
                    <li>• Soporte prioritario 24/7</li>
                    <li>• Panel de administración personalizado</li>
                  </ul>
                </div>

                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Sistema de Recurrencia Anual Automatizado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
