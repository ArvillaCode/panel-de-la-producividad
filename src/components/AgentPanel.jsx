import React, { useState, useMemo, useEffect } from 'react';
import { Search, Grid, List, Star, Sun, Moon, Heart, Settings, LogIn, LogOut, Bell, X, User, Lock, Camera, Check, AlertTriangle, Info, MessageSquare, ChevronLeft, ChevronRight, Clock, Menu, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { agents as defaultAgents, categories } from '../data/agents';
import AgentCard from './AgentCard.jsx';
import AgentCompactCard from './AgentCompactCard.jsx';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import UserSidebar from './user/UserSidebar';
import { supabase } from '../lib/supabase';

const AgentPanel = () => {
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationDetailModal, setShowNotificationDetailModal] = useState(false);
  const [suggestData, setSuggestData] = useState({ name: '', description: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('user-sidebar-collapsed');
    return saved === 'true';
  });

  // Persistir estado del sidebar
  useEffect(() => {
    localStorage.setItem('user-sidebar-collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Sistema de Toasts (Push Notifications)
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

  const { toggleFavorite, isFavorite, getFavoriteAgents } = useFavorites();
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    profile,
    notifications: userNotifications,
    loading: authLoading,
    isAuthenticated,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateUser,
    changePassword,
    suggestAgent
  } = useAuth();

  const navigate = useNavigate();

  // Close with Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileModal(false);
        setShowPasswordModal(false);
        setShowSuggestModal(false);
        setShowNotificationDetailModal(false);
        setIsMobileMenuOpen(false);
        setIsCategoryDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Lógica de alertas de membresía
  // Lógica de membresía deshabilitada por esquema de base de datos actual

  const [profileFormData, setProfileFormData] = useState({ name: '', avatar: '' });

  useEffect(() => {
    if (showProfileModal && user) {
      setProfileFormData({
        name: profile?.name || user?.email?.split('@')[0] || '',
        avatar: profile?.avatar_url || ''
      });
    }
  }, [showProfileModal, user]);

  const handleSaveProfile = async () => {
    try {
      const result = await updateUser({
        name: profileFormData.name,
        avatar_url: profileFormData.avatar
      });
      if (result.success || !result.error) {
        setShowProfileModal(false);
        addToast('Perfil actualizado correctamente');
      } else {
        alert(result.error || 'Error al actualizar perfil');
      }
    } catch (error) {
      alert('Error al actualizar perfil');
    }
  };

  const handleSavePassword = async (currentPassword, newPassword) => {
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setShowPasswordModal(false);
        addToast('Contraseña actualizada correctamente');
      } else {
        alert(result.error || 'Error al actualizar contraseña');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      setLoadingAgents(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching agents from Supabase:', error.message);
        setAgents(defaultAgents); // Fallback a locales en caso de error
      } else {
        setAgents(data || []);
      }
      setLoadingAgents(false);
    };

    fetchAgents();
  }, []);

  const tabs = categories;

  const filteredAndSortedAgents = useMemo(() => {
    let filtered;
    if (activeTab === 'Favoritos') {
      filtered = getFavoriteAgents(agents).filter(agent => agent.visible !== false);
    } else {
      filtered = agents.filter(agent => {
        const isVisible = agent.visible !== false;
        const matchesCategory = activeTab === 'Todos' || agent.category === activeTab;
        return isVisible && matchesCategory;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(agent =>
        (agent.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'specialty': return (a.specialty || '').localeCompare(b.specialty || '');
        case 'category': return (a.category || '').localeCompare(b.category || '');
        default: return 0;
      }
    });
  }, [agents, searchTerm, activeTab, sortBy, getFavoriteAgents]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedAgents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedAgents.length / itemsPerPage);

  // Reset page to 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1);
    setIsCategoryDropdownOpen(false);
  }, [searchTerm, activeTab, sortBy]);

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif) => {
    markNotificationAsRead(notif.id);
    setSelectedNotification(notif);
    setShowNotificationDetailModal(true);
  };

  const PaginationControls = ({ className = "" }) => (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors border border-gray-200 dark:border-gray-600"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-2">
        Pág. <span className="text-blue-600 dark:text-blue-400 font-bold">{currentPage}</span> de {totalPages}
      </span>

      <button
        onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors border border-gray-200 dark:border-gray-600"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center gap-6">
        <div className="premium-spinner"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Sincronizando panel premium...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Toast Notifications Overlay */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-full duration-300 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 pointer-events-auto">
            {toast.type === 'success' ? <Check className="w-4 h-4 text-green-500" /> : <Info className="w-4 h-4 text-blue-500" />}
            <span className="text-sm font-medium text-gray-800 dark:text-white">{toast.message}</span>
          </div>
        ))}
      </div>

      {isAuthenticated && (
        <>
          {/* Sidebar de Escritorio (LG+) */}
          <aside 
            className={`hidden lg:flex fixed left-0 top-0 h-screen z-40 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}
          >
            <UserSidebar
              setActiveTab={setActiveTab}
              setShowProfileModal={setShowProfileModal}
              setShowPasswordModal={setShowPasswordModal}
              setShowNotifications={setShowNotifications}
              setShowSuggestModal={setShowSuggestModal}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />
          </aside>

          {/* Drawer de Móvil (Móvil/Tablet < LG) */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <aside className="relative h-full w-[280px] bg-[#07080d] border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
                <UserSidebar
                  isMobile={true}
                  setActiveTab={setActiveTab}
                  setShowProfileModal={setShowProfileModal}
                  setShowPasswordModal={setShowPasswordModal}
                  setShowNotifications={setShowNotifications}
                  setShowSuggestModal={setShowSuggestModal}
                  onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
              </aside>
            </div>
          )}
        </>
      )}

      {/* Contenido Principal */}
      <main className={`flex-1 w-full min-h-screen relative z-0 transition-all duration-300 ${isAuthenticated ? (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''}`}>
        <div className="max-w-7xl mx-auto p-3 sm:p-6 min-h-full relative">
          {/* Desktop Top Bar (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center justify-between mb-8 pb-4 border-b border-gray-100/50 dark:border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-xl tracking-tight dark:text-white uppercase italic">
                AI<span className="text-blue-600">PANEL</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-white hover:scale-105 transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />}
              </button>
            </div>
          </div>

          {/* Header Mobile Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-4 px-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-white"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />}
              </button>
            </div>
          </div>
          {/* Header */}
          <div className="mb-10 md:mb-16 text-center md:text-left">
            <div className="hidden md:block mb-6">
              <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">
                ¡Hola, {profile?.name || user?.email?.split('@')[0] || 'Líder'}! 👋
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                Has recuperado <span className="text-blue-600 dark:text-blue-400 font-bold">4.2 horas</span> esta semana. ¿Qué delegaremos hoy?
              </p>
            </div>

            <h1 className="text-5xl md:text-7xl font-black mb-6 md:mb-8 tracking-tighter leading-[0.95]">
              <span className="block text-gray-900 dark:text-white">Panel de</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                Agentes Premium
              </span>
            </h1>
            
            <div className="max-w-2xl">
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-4">
                Selecciona uno de tus agentes especializados para comenzar a optimizar tus tareas diarias.
              </p>
            </div>
          </div>

          {/* Controls - Glassmorphism Effect */}
          <div className="bg-white/70 dark:bg-gray-800/70 rounded-3xl shadow-2xl p-5 md:p-8 mb-8 md:mb-12 border border-white/20 dark:border-gray-700/30 backdrop-blur-2xl transition-all duration-500 hover:shadow-blue-500/5">
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                  <input
                    type="text"
                    placeholder="Buscar agentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 md:py-3.5 text-sm md:text-base border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white/50 dark:bg-gray-900/50 dark:text-white transition-all outline-none shadow-inner"
                  />
                </div>

                <div className="flex w-full sm:w-auto gap-3 items-center">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2.5 md:py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="name">Nombre</option>
                    <option value="specialty">Especialidad</option>
                    <option value="category">Categoría</option>
                  </select>

                  <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Grid className="w-4 h-4 md:w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <List className="w-4 h-4 md:w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs & Top Pagination */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t md:border-t-0 md:border-b border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pb-1">
                {/* Mobile Category Dropdown */}
                <div className="md:hidden w-full relative">
                  <button
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-white"
                  >
                    <span className="flex items-center gap-2">
                      Categoría: <span className="text-blue-600 dark:text-blue-400">{activeTab}</span>
                    </span>
                    <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-90' : '-rotate-90'}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {['Todos', 'Favoritos', ...tabs.filter(t => t !== 'Todos')].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => { setActiveTab(tab); setCurrentPage(1); setIsCategoryDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${activeTab === tab
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop Tabs */}
                <div className="hidden md:flex flex-wrap gap-1 overflow-x-auto scrollbar-hide">
                  {['Todos', 'Favoritos', ...tabs.filter(t => t !== 'Todos')].map((tab) => {
                    let count = 0;
                    if (tab === 'Todos') count = agents.filter(a => a.visible !== false).length;
                    else if (tab === 'Favoritos') count = getFavoriteAgents(agents).filter(a => a.visible !== false).length;
                    else count = agents.filter(a => a.category === tab && a.visible !== false).length;

                    return (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        {tab === 'Favoritos' && <Star className={`w-3.5 h-3.5 ${activeTab === tab ? 'fill-blue-600' : ''}`} />}
                        {tab}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-bold">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="w-full md:w-auto flex justify-center">
                    <PaginationControls className="bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agents Grid/List */}
          {filteredAndSortedAgents.length > 0 ? (
            <>
              <div className={viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8"
                : "flex flex-col gap-3 md:gap-4 mb-8"
              }>
                {currentItems.map((agent) => (
                  viewMode === 'grid' ? (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onChatClick={() => window.open(agent.chatLink, '_blank')}
                      isFavorite={isFavorite(agent.id)}
                      onToggleFavorite={() => toggleFavorite(agent.id)}
                    />
                  ) : (
                    <AgentCompactCard
                      key={agent.id}
                      agent={agent}
                      onChatClick={() => window.open(agent.chatLink, '_blank')}
                      isFavorite={isFavorite(agent.id)}
                      onToggleFavorite={() => toggleFavorite(agent.id)}
                    />
                  )
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8 pb-10 px-4">
                  <PaginationControls className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-full sm:w-auto justify-between sm:justify-center" />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 dark:text-gray-400">No se encontraron agentes que coincidan con tu búsqueda.</p>
            </div>
          )}
        </div>
      </main>

      {/* Notifications Sidebar */}
      {showNotifications && (
        <div className="fixed inset-0 z-[120] flex justify-end" onClick={() => setShowNotifications(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-none" />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-gray-800 shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  Notificaciones {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                </h2>
                <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {userNotifications.length > 0 ? userNotifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${notif.read ? 'bg-gray-50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700 opacity-70' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-500 shadow-sm'}`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${notif.type === 'error' ? 'bg-red-100 text-red-600' : notif.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{notif.title}</p>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                    <Bell className="w-12 h-12 mb-3" />
                    <p className="text-gray-500">No tienes notificaciones</p>
                  </div>
                )}
              </div>
              <button onClick={markAllNotificationsAsRead} className="w-full py-2.5 mt-4 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-200">Marcar todas como leídas</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {showNotificationDetailModal && selectedNotification && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowNotificationDetailModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-out" onClick={e => e.stopPropagation()}>
            <div className={`h-2 w-full ${selectedNotification.type === 'error' ? 'bg-red-500' : selectedNotification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${selectedNotification.type === 'error' ? 'bg-red-50' : selectedNotification.type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'} dark:bg-opacity-10`}>
                  <Bell className={`w-8 h-8 ${selectedNotification.type === 'error' ? 'text-red-500' : selectedNotification.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                </div>
                <button onClick={() => setShowNotificationDetailModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedNotification.title}</h3>

              <div className="flex flex-wrap gap-4 mb-8 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4" />
                  {new Date(selectedNotification.timestamp).toLocaleDateString()} {new Date(selectedNotification.timestamp).toLocaleTimeString()}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                  <User className="w-4 h-4" />
                  Origen: <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedNotification.origin || 'Sistema / Soporte'}</span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-600">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              <button
                onClick={() => setShowNotificationDetailModal(false)}
                className="w-full mt-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals (Profile, Password, Suggest) */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Personalizar Perfil</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Personalizado (Interno)</label>
                <input type="text" value={profileFormData.name} onChange={e => setProfileFormData({ ...profileFormData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de Avatar</label>
                <input
                  type="text"
                  value={profileFormData.avatar}
                  onChange={e => setProfileFormData({ ...profileFormData, avatar: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://ejemplo.com/avatar.jpg"
                />
                <p className="text-xs text-gray-400 mt-1">Pega el enlace a una imagen (Unsplash, UI Avatars, etc.)</p>
              </div>
              <button onClick={handleSaveProfile} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Cambiar Contraseña</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const current = e.target.current.value;
              const next = e.target.next.value;
              const confirm = e.target.confirm.value;
              if (next !== confirm) return alert('Las contraseñas no coinciden');
              handleSavePassword(current, next);
            }} className="space-y-4">
              <input name="current" type="password" placeholder="Contraseña Actual" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input name="next" type="password" placeholder="Nueva Contraseña" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <input name="confirm" type="password" placeholder="Confirmar Nueva Contraseña" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors">Actualizar Contraseña</button>
            </form>
          </div>
        </div>
      )}

      {showSuggestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSuggestModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Sugerir Nuevo Agente</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre del Agente" value={suggestData.name} onChange={e => setSuggestData({ ...suggestData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <textarea placeholder="Descripción / Función" value={suggestData.description} onChange={e => setSuggestData({ ...suggestData, description: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white h-32" />
              <button onClick={() => { suggestAgent(suggestData); setShowSuggestModal(false); addToast('Sugerencia enviada'); }} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition-colors">Enviar Sugerencia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPanel;
