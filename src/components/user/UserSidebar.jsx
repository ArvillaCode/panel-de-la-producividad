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
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNavigate } from 'react-router-dom';

const UserSidebar = ({ 
  setActiveTab, 
  setShowProfileModal, 
  setShowPasswordModal, 
  setShowNotifications,
  setShowSuggestModal,
  getUnreadNotificationsCount
}) => {
  const { user, logout } = useAuth();
  const unreadCount = getUnreadNotificationsCount();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-xl hidden md:flex flex-col h-screen sticky top-0 border-r border-gray-200 dark:border-gray-700 shrink-0">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <img src={user?.avatar || 'https://ui-avatars.com/api/?name=Usuario&background=6b7280&color=fff'} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" />
          <div className="overflow-hidden">
            <h3 className="font-semibold text-gray-800 dark:text-white truncate" title={user?.displayName || user?.name || user?.username}>
              {user?.displayName || user?.name || user?.username}
            </h3>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full inline-block mt-1">
              {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menú Principal</div>
        <nav className="space-y-1 px-3">
          <button onClick={() => setActiveTab('Todos')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Grid className="w-5 h-5 text-blue-500" /> Explorar Agentes
          </button>
          <button onClick={() => setActiveTab('Favoritos')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Heart className="w-5 h-5 text-red-500" /> Mis Favoritos
          </button>
          {/* Mis Conversaciones oculto por petición del usuario */}
          <button onClick={() => setShowSuggestModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MessageSquare className="w-5 h-5 text-green-500" /> Sugerir Agente
          </button>
          <button onClick={() => setShowNotifications(prev => !prev)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className={`w-5 h-5 text-purple-500 ${unreadCount > 0 ? 'animate-push-bell' : ''}`} /> Notificaciones
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>

        <div className="px-4 mt-8 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ajustes de Cuenta</div>
        <nav className="space-y-1 px-3">
          <button onClick={() => setShowProfileModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <User className="w-5 h-5 text-purple-500" /> Personalizar Avatar
          </button>
          <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Lock className="w-5 h-5 text-gray-500" /> Seguridad (Contraseña)
          </button>
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-500" />} Apariencia
          </button>
          
          {user?.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={handleGoToAdmin} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium">
                <Settings className="w-5 h-5" /> Panel de Administración
              </button>
            </div>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors font-medium">
          <LogOut className="w-5 h-5" /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default UserSidebar;
