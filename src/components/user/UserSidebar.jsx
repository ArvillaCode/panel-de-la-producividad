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
  Shield,
  ShieldCheck,
  Home
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate, useLocation } from 'react-router-dom';
import ReleaseNotesBadge from './ReleaseNotesBadge';

const UserSidebar = ({ 
  activeTab,
  setActiveTab, 
  setShowSettingsModal, 
  setShowNotifications,
  setShowSuggestionModal,
  isMobile = false,
  isCollapsed = false,
  setIsCollapsed,
  onCloseMobile
}) => {
  const { user, profile, logout, notifications, markAllNotificationsAsRead } = useAuth();
  const unreadCount = notifications.filter(n => !n.read).length;
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Dependencia local de fallback para evitar pantallas negras y crashes en build
  const currentActiveTab = activeTab !== undefined && activeTab !== null ? activeTab : (location.pathname === '/' ? 'Todos' : '');

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
    ? "w-full flex flex-col h-[100dvh] bg-deep-dark/95 backdrop-blur-2xl overflow-hidden"
    : `glass-card w-full !rounded-none border-y-0 border-l-0 shadow-2xl flex flex-col h-[100dvh] sticky top-0 border-r border-white/10 transition-all duration-300 overflow-hidden`;

  return (
    <div className={sidebarClasses}>
      {/* Header con Perfil - Fijo */}
      <div className={`p-6 border-b border-slate-100 dark:border-white/10 ${isMobile ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}>
        <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4'}`}>
          <div className="relative group/avatar">
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name || 'U'}&background=00E5FF&color=0E1A2B&font-size=0.4&bold=true`} 
              alt="Avatar" 
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 object-cover" 
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-deep-dark rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-500">
              <h3 className="font-black text-slate-900 dark:text-white truncate text-sm uppercase italic tracking-tighter" title={profile?.name || user?.email?.split('@')[0]}>
                {profile?.name || user?.email?.split('@')[0]}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-3 h-3 text-neon-teal" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                  {profile?.role === 'admin' ? 'Core Admin' : 'Elite User'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Área de Navegación con Scroll Independiente */}
      <div className="flex-grow overflow-y-auto min-h-0 py-6 scrollbar-hide">
        {(!isCollapsed || isMobile) && (
          <div className="px-8 mb-4 text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em]">Sistemas</div>
        )}
        
        <nav className="space-y-2 px-4">
          <button 
            onClick={() => handleAction(() => { if (setActiveTab) setActiveTab('Todos'); navigate('/'); })} 
            title="Explorar Agentes"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 group ${
              currentActiveTab === 'Todos' && location.pathname === '/' ? 'bg-neon-teal text-deep-dark shadow-xl shadow-neon-teal/20 scale-[1.02]' : 'text-slate-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Grid className={`w-5 h-5 ${currentActiveTab === 'Todos' && location.pathname === '/' ? 'text-deep-dark' : 'text-neon-teal'} group-hover:scale-110 group-hover:rotate-12 transition-all flex-shrink-0`} /> 
            {(!isCollapsed || isMobile) && <span className="italic">Explorar</span>}
          </button>

          <button 
            onClick={() => handleAction(() => { if (setActiveTab) setActiveTab('Favoritos'); navigate('/'); })} 
            title="Mis Favoritos"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 group ${
              currentActiveTab === 'Favoritos' && location.pathname === '/' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20 scale-[1.02]' : 'text-slate-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${currentActiveTab === 'Favoritos' && location.pathname === '/' ? 'text-white' : 'text-red-500'} group-hover:scale-110 transition-all flex-shrink-0`} /> 
            {(!isCollapsed || isMobile) && <span className="italic">Favoritos</span>}
          </button>

          <button 
            onClick={() => handleAction(() => navigate('/novedades'))} 
            title="Novedades"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-500 group relative`}
          >
            <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4'}`}>
              <Sparkles className="w-5 h-5 text-amber-500 group-hover:scale-110 group-hover:rotate-12 transition-all flex-shrink-0" /> 
              {(!isCollapsed || isMobile) && <span className="italic">Bitácora</span>}
            </div>
            {(!isCollapsed || isMobile) && <ReleaseNotesBadge />}
          </button>

          <button 
            onClick={() => handleAction(() => {
              // Optimistic UI: we call markAllNotificationsAsRead which updates local state immediately
              if (unreadCount > 0 && markAllNotificationsAsRead) {
                markAllNotificationsAsRead();
              }
              setShowNotifications(prev => !prev);
            })} 
            title="Notificaciones"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-500 group`}
          >
            <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4'}`}>
              <Bell className={`w-5 h-5 text-purple-500 ${unreadCount > 0 ? 'animate-push-bell' : ''} group-hover:scale-110 transition-all flex-shrink-0`} /> 
              {(!isCollapsed || isMobile) && <span className="italic">Alertas</span>}
            </div>
            {(!isCollapsed || isMobile) && unreadCount > 0 && (
              <span className="bg-neon-teal text-deep-dark text-[9px] font-black px-2 py-0.5 rounded-lg min-w-[20px] text-center shadow-lg shadow-neon-teal/20 neon-glow">
                {unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => handleAction(() => setShowSuggestionModal(true))} 
            title="Sugerir Agente"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-500 group`}
          >
            <MessageSquare className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-all flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span className="italic">Propuestas</span>}
          </button>
        </nav>

        {(!isCollapsed || isMobile) && (
          <div className="px-8 mt-10 mb-4 text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em]">Terminal</div>
        )}
        
        <nav className="space-y-2 px-4">
          <button 
            onClick={() => handleAction(() => setShowSettingsModal(true))} 
            title="Ajustes de Interfaz"
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-500 group`}
          >
            <Settings className="w-5 h-5 text-slate-400 dark:text-gray-400 group-hover:rotate-90 transition-transform duration-700 flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span className="italic">Configurar</span>}
          </button>
          
          {profile?.role === 'admin' && (
            <button 
              onClick={() => handleAction(handleGoToAdmin)} 
              title="Panel Administrativo"
              className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-4'} py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-neon-teal/5 text-neon-teal border border-neon-teal/10 hover:bg-neon-teal/10 transition-all duration-500 group`}
            >
              <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-all flex-shrink-0" /> 
              {(!isCollapsed || isMobile) && <span className="italic">Master Admin</span>}
            </button>
          )}
        </nav>
      </div>

      {/* Footer Fijo - Botón Cerrar Sesión y Colapso */}
      <div className={`mt-auto p-4 pb-12 border-t border-slate-100 dark:border-white/10 ${isMobile ? 'bg-slate-50/50 dark:bg-deep-dark/50' : 'bg-transparent'}`}>
        <div className="space-y-3">
          <button 
            onClick={() => handleAction(() => navigate('/'))} 
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-5'} py-4 rounded-2xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-500 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/10 group border border-blue-500/20 backdrop-blur-md`}
            title="Ir a Inicio"
          >
            <Home className="w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span className="italic">Ir a Inicio</span>}
          </button>

          <button 
            onClick={handleLogout} 
            className={`w-full flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-4 px-5'} py-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-500 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/10 group border border-red-500/20 backdrop-blur-md`}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0" /> 
            {(!isCollapsed || isMobile) && <span className="italic">Cerrar Sesión</span>}
          </button>

          {!isMobile && (
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-500 transition-all duration-500 group"
              title={isCollapsed ? "Expandir" : "Contraer"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              ) : (
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[8px] font-black uppercase tracking-[0.3em]">Minimizar</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSidebar;
