import React from 'react';
import { 
  Grid, 
  Heart, 
  Bell, 
  User, 
  Lock, 
  Sun, 
  Moon, 
  Settings, 
  LogOut,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import ReleaseNotesBadge from './ReleaseNotesBadge';

const UserSidebar = ({ 
  setActiveTab, 
  setShowProfileModal, 
  setShowPasswordModal, 
  setShowNotifications,
  setShowSuggestModal,
  isMobile = false
}) => {
  const { user, profile, logout, notifications } = useAuth();
  const unreadCount = notifications.filter(n => !n.read).length;
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarClasses = isMobile 
    ? "w-full flex flex-col h-full bg-transparent"
    : "w-64 bg-white dark:bg-gray-800 shadow-xl hidden md:flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-gray-700 shrink-0";

  return (
    <div className={sidebarClasses}>
      <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
        <div className="flex items-center gap-3">
          <img src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Usuario&background=6b7280&color=fff'} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" />
          <div className="overflow-hidden">
            <h3 className="font-semibold text-gray-800 dark:text-white truncate text-sm" title={profile?.name || user?.email?.split('@')[0]}>
              {profile?.name || user?.email?.split('@')[0]}
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full inline-block mt-1 font-bold">
              {profile?.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <div className="px-4 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Menú Principal</div>
        <nav className="space-y-1 px-3">
          <button onClick={() => setActiveTab('Todos')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
            <Grid className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" /> 
            <span>Explorar Agentes</span>
          </button>
          <button onClick={() => setActiveTab('Favoritos')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
            <Heart className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" /> 
            <span>Mis Favoritos</span>
          </button>
          <button onClick={() => navigate('/novedades')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group relative">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" /> 
              <span>Novedades</span>
            </div>
            <ReleaseNotesBadge />
          </button>
          <button onClick={() => setShowNotifications(prev => !prev)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
            <div className="flex items-center gap-3">
              <Bell className={`w-4 h-4 text-purple-500 ${unreadCount > 0 ? 'animate-push-bell' : ''} group-hover:scale-110 transition-transform`} /> 
              <span>Notificaciones</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>

        <div className="px-4 mt-8 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ajustes de Cuenta</div>
        <nav className="space-y-1 px-3">
          <button onClick={() => setShowProfileModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
            <User className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" /> 
            <span>Personalizar Avatar</span>
          </button>
          <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
            <Lock className="w-4 h-4 text-gray-500 group-hover:scale-110 transition-transform" /> 
            <span>Seguridad (Contraseña)</span>
          </button>
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
            {isDark ? <Sun className="w-4 h-4 text-yellow-500 group-hover:rotate-45 transition-transform" /> : <Moon className="w-4 h-4 text-slate-500 group-hover:-rotate-12 transition-transform" />} 
            <span>Apariencia</span>
          </button>
          
          {profile?.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleGoToAdmin} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-semibold text-sm group">
                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform" /> 
                <span>Panel de Administración</span>
              </button>
            </div>
          )}
        </nav>
      </div>

      <div className={`p-4 border-t border-gray-100 dark:border-gray-700 mt-auto ${isMobile ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-all font-bold text-sm shadow-sm border border-red-100 dark:border-red-900/30">
          <LogOut className="w-4 h-4" /> 
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
