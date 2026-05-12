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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import ReleaseNotesBadge from './ReleaseNotesBadge';

const UserSidebar = ({ 
  setActiveTab, 
  setShowSettingsModal, 
  setShowNotifications,
  setShowSuggestionModal,
  isMobile = false,
  isCollapsed = false,
  setIsCollapsed,
  onCloseMobile
}) => {
  const { user, profile, logout, notifications } = useAuth();
  const unreadCount = notifications.filter(n => !n.read).length;
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleGoToAdmin = () => {
    if (onCloseMobile) onCloseMobile();
    navigate('/admin');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAction = (callback) => {
    if (callback) callback();
    if (isMobile && onCloseMobile) onCloseMobile();
  };

  const sidebarClasses = isMobile 
    ? "w-full flex flex-col h-full bg-[#07080d]"
    : `bg-white dark:bg-gray-800 shadow-xl flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`;

  return (
    <div className={sidebarClasses}>
      {/* Header con Perfil */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'bg-gray-800/50' : ''}`}>
        <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
          <img 
            src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Usuario&background=6b7280&color=fff'} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0" 
          />
          {(!isCollapsed || isMobile) && (
            <div className="overflow-hidden">
              <h3 className="font-semibold text-gray-800 dark:text-white truncate text-sm" title={profile?.name || user?.email?.split('@')[0]}>
                {profile?.name || user?.email?.split('@')[0]}
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full inline-block mt-1 font-bold">
                {profile?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {(!isCollapsed || isMobile) && (
          <div className="px-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Menú Principal</div>
        )}
        
        <nav className="space-y-1 px-3">
          <button 
            onClick={() => handleAction(() => setActiveTab('Todos'))} 
            title="Explorar Agentes"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group`}
          >
            <Grid className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span>Explorar Agentes</span>}
          </button>

          <button 
            onClick={() => handleAction(() => setActiveTab('Favoritos'))} 
            title="Mis Favoritos"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group`}
          >
            <Heart className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span>Mis Favoritos</span>}
          </button>

          <button 
            onClick={() => handleAction(() => navigate('/novedades'))} 
            title="Novedades"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between px-3'} py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group relative`}
          >
            <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
              <Sparkles className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform flex-shrink-0" /> 
              {(!isCollapsed || isMobile) && <span>Novedades</span>}
            </div>
            {(!isCollapsed || isMobile) && <ReleaseNotesBadge />}
          </button>

          <button 
            onClick={() => handleAction(() => setShowNotifications(prev => !prev))} 
            title="Notificaciones"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between px-3'} py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group`}
          >
            <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
              <Bell className={`w-5 h-5 text-purple-500 ${unreadCount > 0 ? 'animate-push-bell' : ''} group-hover:scale-110 transition-transform flex-shrink-0`} /> 
              {(!isCollapsed || isMobile) && <span>Notificaciones</span>}
            </div>
            {(!isCollapsed || isMobile) && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => handleAction(() => setShowSuggestionModal(true))} 
            title="Sugerir Agente"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group`}
          >
            <MessageSquare className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span>Sugerir Agente</span>}
          </button>
        </nav>

        {(!isCollapsed || isMobile) && (
          <div className="px-6 mt-8 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ajustes de Cuenta</div>
        )}
        
        <nav className="space-y-1 px-3">
          <button 
            onClick={() => handleAction(() => setShowSettingsModal(true))} 
            title="Configuraciones"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group`}
          >
            <Settings className="w-5 h-5 text-gray-500 group-hover:rotate-90 transition-transform flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span>Ajustes</span>}
          </button>
          
          {profile?.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => handleAction(handleGoToAdmin)} 
                title="Administración"
                className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-semibold text-sm group`}
              >
                <Shield className="w-5 h-5 group-hover:rotate-90 transition-transform flex-shrink-0" /> 
                {(!isCollapsed || isMobile) && <span>Administración</span>}
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Botón Colapsar (Solo Desktop) */}
      {!isMobile && (
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-700">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all"
            title={isCollapsed ? "Expandir" : "Contraer"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      )}

      <div className={`p-4 border-t border-gray-100 dark:border-gray-700 ${isMobile ? 'bg-gray-800/50' : ''}`}>
        <button 
          onClick={handleLogout} 
          className={`w-full flex items-center justify-center ${isCollapsed && !isMobile ? 'px-2' : 'gap-2 px-4'} py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-all font-bold text-sm shadow-sm border border-red-100 dark:border-red-900/30`}
          title="Cerrar Sesión"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" /> 
          {(!isCollapsed || isMobile) && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
