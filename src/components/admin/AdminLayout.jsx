import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Bot, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home,
  Shield,
  Bell,
  Moon,
  Sun,
  Sparkles,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

const AdminLayout = ({ children, currentPage = 'dashboard' }) => {
  const { logout, user, profile, loading, notifications } = useAuth();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    return saved === 'true';
  });

  // Persistir estado del sidebar
  React.useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  // Determinar la página actual basada en la URL
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/dashboard') return 'dashboard';
    if (path === '/admin/users') return 'users';
    if (path === '/admin/agents') return 'agents';
    if (path === '/admin/config') return 'config';
    if (path === '/admin/releases') return 'releases';
    if (path === '/admin/logs') return 'logs';
    return 'dashboard';
  };

  const actualCurrentPage = getCurrentPage();

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: Home,
      path: '/admin',
      description: 'Panel principal'
    },
    {
      id: 'users',
      name: 'Usuarios',
      icon: Users,
      path: '/admin/users',
      description: 'Gestión de usuarios'
    },
    {
      id: 'agents',
      name: 'Agentes',
      icon: Bot,
      path: '/admin/agents',
      description: 'Configuración de agentes'
    },
    {
      id: 'config',
      name: 'Configuración',
      icon: Settings,
      path: '/admin/config',
      description: 'Configuración del sistema'
    },
    {
      id: 'releases',
      name: 'Novedades',
      icon: Sparkles,
      path: '/admin/releases',
      description: 'Gestión de actualizaciones'
    },
    {
      id: 'logs',
      name: 'Historial',
      icon: Activity,
      path: '/admin/logs',
      description: 'Log de actividad'
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        
        {/* Logo/Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                Admin Panel
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {(profile?.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {profile?.name || 'Administrador'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || 'admin@sistema.com'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = actualCurrentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleNavigation(item.path);
                }}
                title={isCollapsed ? item.name : ""}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isCollapsed ? "Expandir" : "Contraer"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!isCollapsed && <span className="ml-3 text-sm font-medium">Contraer Menú</span>}
          </button>

          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
            title={isCollapsed ? "Ir al Panel Usuario" : ""}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Panel de Usuario</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
            title={isCollapsed ? "Cerrar Sesión" : ""}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen lg:ml-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {menuItems.find(item => item.id === actualCurrentPage)?.name || 'Panel de Administración'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {menuItems.find(item => item.id === actualCurrentPage)?.description || 'Gestiona tu sistema'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Profile info removed for minimalist header */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 relative z-0 pointer-events-auto">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;