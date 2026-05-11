import React, { useState } from 'react';
import { X, User, Lock, Moon, Sun, Globe, Check, AlertCircle, Camera, Shield } from 'lucide-react';
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

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'seguridad', label: 'Seguridad', icon: Lock },
    { id: 'apariencia', label: 'Apariencia', icon: Moon },
    { id: 'idioma', label: 'Zona Horaria', icon: Globe }
  ];

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
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <img 
                      src={profileData.avatar || 'https://ui-avatars.com/api/?name=User'} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-xl object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 text-center">Recomendado: Imagen cuadrada de 256x256px</p>
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
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">URL del Avatar</label>
                    <input 
                      type="text" 
                      value={profileData.avatar} 
                      onChange={e => setProfileData({...profileData, avatar: e.target.value})}
                      className="w-full px-5 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      placeholder="https://..."
                    />
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={actionLoading}
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
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Zona Horaria del Sistema</label>
                  <select 
                    value={profileData.timezone}
                    onChange={e => setProfileData({...profileData, timezone: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  >
                    {Intl.supportedValuesOf('timeZone').map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                  <p className="mt-3 text-xs text-gray-500">Esto ajustará cómo se muestran las fechas y horas en tus registros.</p>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
