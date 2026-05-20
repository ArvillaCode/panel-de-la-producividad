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
  Sparkles,
  Activity,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BRANDING } from '../../constants/branding';

const AdminLayout = ({ children, currentPage = 'dashboard' }) => {
  const { logout, user, profile, loading, notifications, systemConfig } = useAuth();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
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
    if (path === '/admin/matchmaker-config') return 'matchmaker-config';
    if (path.startsWith('/dashboard/academia')) return 'academia';
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
      id: 'matchmaker-config',
      name: 'Matchmaker',
      icon: Sparkles,
      path: '/admin/matchmaker-config',
      description: 'Ajustes del bot'
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
    },
    {
      id: 'banners',
      name: 'Banners',
      icon: ImageIcon,
      path: '/admin/banners',
      description: 'Publicidad global'
    },
    {
      id: 'academia',
      name: 'Academia',
      icon: GraduationCap,
      path: '/dashboard/academia/admin',
      description: 'Gestión educativa'
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
    <div className="min-h-[100dvh] h-[100dvh] bg-deep-dark flex overflow-hidden spatial-grid">
      {/* Sidebar - Premium Glass */}
      <div className={`fixed inset-y-0 left-0 z-[70] glass-card !rounded-none border-y-0 border-l-0 shadow-2xl transform transition-all duration-300 ease-in-out flex flex-col h-[100dvh] ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:fixed lg:inset-y-0 border-r border-white/10 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        
        {/* Logo/Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
            <img 
              src={BRANDING.logo} 
              alt={BRANDING.name} 
              className={`h-10 w-auto object-contain transition-all duration-300 ${isCollapsed ? 'mx-auto' : ''} dark:invert brightness-110`}
            />
            {!isCollapsed && (
              <span className="text-xl font-black text-white tracking-tighter italic neon-glow">
                {BRANDING.name.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl glass-card border-white/10 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-6 border-b border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? '' : 'space-x-4'}`}>
            <div className="relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border-2 border-neon-teal shadow-lg shadow-neon-teal/20 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-neon-teal text-deep-dark rounded-xl flex items-center justify-center font-black flex-shrink-0 shadow-lg shadow-neon-teal/20">
                    {(profile?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-deep-dark rounded-full"></div>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-black text-white truncate">
                  {profile?.name || 'Administrador'}
                </p>
                <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-neon-teal" />
                    <p className="text-[10px] font-bold text-neon-teal uppercase tracking-widest truncate">
                      Core Admin
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {menuItems.filter(item => {
            // La sección de Gestión de Usuarios es una excepción global y debe ser incondicionalmente visible y operativa
            if (item.id === 'users') {
              return true;
            }
            if (item.id === 'academia') {
              return true; // El admin siempre ve la opción de Academia en el panel administrativo
            }
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = actualCurrentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleNavigation(item.path);
                }}
                title={isCollapsed ? item.name : ""}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-4 px-4'} py-3.5 rounded-2xl text-left transition-all duration-300 group ${
                  isActive
                    ? 'bg-neon-teal text-deep-dark shadow-xl shadow-neon-teal/20 font-black'
                    : 'text-gray-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-deep-dark' : 'text-neon-teal'}`} />
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-sm font-black truncate uppercase tracking-tighter">{item.name}</p>
                    <p className={`text-[10px] font-bold truncate opacity-60 ${isActive ? 'text-deep-dark' : 'text-gray-400'}`}>{item.description}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 pb-12 border-t border-white/10 space-y-2 mt-auto">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-3 rounded-xl glass-card border-white/5 text-gray-500 hover:text-white transition-all"
            title={isCollapsed ? "Expandir" : "Contraer"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-4 px-4'} py-3 rounded-xl text-neon-teal hover:bg-white/5 transition-all font-bold text-sm`}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Panel de Usuario</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-4 px-4'} py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 flex flex-col h-screen transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Top Bar - Minimal Glass */}
        <header className="h-20 flex items-center px-8 border-b border-white/10 backdrop-blur-md bg-deep-dark/30 relative z-40">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-3 rounded-xl glass-card border-white/10 text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-neon-teal animate-pulse"></div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                      {menuItems.find(item => item.id === actualCurrentPage)?.name || 'Terminal de Control'}
                    </h1>
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">
                  {menuItems.find(item => item.id === actualCurrentPage)?.description || 'Sincronizado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
               <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado del Sistema</span>
                  <span className="text-xs font-bold text-neon-teal">OPERATIVO 100%</span>
               </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-10 flex-1 overflow-x-hidden overflow-y-auto relative z-0">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;