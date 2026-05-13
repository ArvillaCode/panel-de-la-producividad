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
import SettingsModal from './user/SettingsModal';
import SuggestionModal from './user/SuggestionModal';
import AgentGuide from './user/AgentGuide';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationDetailModal, setShowNotificationDetailModal] = useState(false);
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
    isAdmin,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateUser,
    changePassword,
    suggestAgent
  } = useAuth();

  const dailyMessages = useMemo(() => [
    "¡Es momento de brillar! Tu potencial es ilimitado.",
    "Hoy es un gran día para conquistar tus metas.",
    "La productividad es el puente hacia tus sueños.",
    "Cada paso cuenta. ¡Sigue adelante con determinación!",
    "Tu enfoque hoy determinará tus resultados mañana.",
    "Haz que hoy sea el día en que todo cambie.",
    "La disciplina es la base del éxito profesional.",
    "¡Atrévete a ser extraordinario hoy!",
    "Pequeños avances diarios suman grandes resultados.",
    "Tu creatividad no tiene límites. ¡Explótala!",
    "La constancia vence lo que la dicha no alcanza.",
    "Hoy es una nueva oportunidad para ser mejor.",
    "El éxito es la suma de pequeños esfuerzos repetidos.",
    "Confía en tu proceso y mantén la vista en la meta.",
    "¡Eres capaz de lograr todo lo que te propongas!",
    "La mejor forma de predecir el futuro es creándolo.",
    "No cuentes los días, haz que los días cuenten.",
    "Tu trabajo duro inspirará a otros hoy.",
    "La excelencia no es un acto, sino un hábito.",
    "Desafía tus límites y descubre tu grandeza.",
    "El éxito no llega a ti, tú vas hacia él.",
    "Cada desafío es una oportunidad disfrazada.",
    "Tu pasión es tu mayor combustible. ¡Úsala!",
    "Manten la mente clara y el corazón valiente.",
    "La innovación nace de la curiosidad y el enfoque.",
    "¡Hazlo con pasión o no lo hagas!",
    "Tus sueños no tienen fecha de vencimiento.",
    "La victoria pertenece a los que nunca se rinden.",
    "Cree en ti mismo tanto como nosotros creemos en ti.",
    "¡Hoy es el día para ser la mejor versión de ti!",
    "El futuro pertenece a quienes creen en la belleza de sus sueños."
  ], []);

  const motivationalMessage = useMemo(() => {
    const today = new Date();
    return dailyMessages[today.getDate() % dailyMessages.length];
  }, [dailyMessages]);

  const navigate = useNavigate();

  // Close with Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowSettingsModal(false);
        setShowSuggestionModal(false);
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

  const openModal = (modalSetter) => {
    // Cerrar todo lo demás para evitar conflictos de z-index y overlays
    setShowNotifications(false);
    setIsMobileMenuOpen(false);
    setIsCategoryDropdownOpen(false);
    if (typeof modalSetter === 'function') modalSetter(true);
  };

  const handleAgentClick = async (agent) => {
    // Abrir chat
    if (agent.chatLink) {
      window.open(agent.chatLink, '_blank');
      
      // Incrementar interacciones en Supabase (silenciosamente)
      try {
        const currentInteractions = (agent.total_interactions || agent.totalInteractions || 0) + 1;
        await supabase
          .from('agents')
          .update({ total_interactions: currentInteractions })
          .eq('id', agent.id)
          .maybeSingle();
        
        // Actualizar estado local
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, total_interactions: currentInteractions } : a));
      } catch (e) {
        console.warn('[INTERACTIONS] Error incrementing:', e);
      }
    }
  };

  useEffect(() => {
    const fetchAgents = async () => {
      setLoadingAgents(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('id', { ascending: false }); // Mostrar los más nuevos primero

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

  const normalizeText = (text) => 
    (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
      const term = normalizeText(searchTerm).trim();
      filtered = filtered.filter(agent =>
        normalizeText(agent.name).includes(term) ||
        normalizeText(agent.specialty).includes(term) ||
        normalizeText(agent.description).includes(term)
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
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        disabled={currentPage === 1}
        className="p-2.5 rounded-xl hover:bg-neon-teal hover:text-deep-dark disabled:opacity-20 transition-all border border-white/10"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center px-4 py-2 glass-card !bg-white/5 border-white/10 shadow-inner">
        <span className="text-[10px] font-black text-gray-500 uppercase mr-2 tracking-widest">Pág.</span>
        <span className="text-sm font-black neon-text">{currentPage}</span>
        <span className="text-[10px] font-bold text-gray-500 mx-2">/</span>
        <span className="text-sm font-bold text-gray-300">{totalPages}</span>
      </div>

      <button
        onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        disabled={currentPage === totalPages}
        className="p-2.5 rounded-xl hover:bg-neon-teal hover:text-deep-dark disabled:opacity-20 transition-all border border-white/10"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-deep-dark flex flex-col items-center justify-center gap-8 spatial-grid">
        <div className="premium-spinner"></div>
        <div className="text-center space-y-2">
          <p className="neon-text text-xl font-black tracking-widest animate-pulse uppercase">Iniciando Núcleo</p>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.3em]">Cargando experiencia premium...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-deep-dark spatial-grid">
      {/* Toast Notifications Overlay */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="glass-card flex items-center gap-3 px-5 py-4 shadow-2xl animate-in slide-in-from-right-full duration-300 border-white/10 pointer-events-auto">
            {toast.type === 'success' ? <Check className="w-5 h-5 text-neon-teal neon-glow" /> : <Info className="w-5 h-5 text-blue-500" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white">{toast.message}</span>
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
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setShowSettingsModal={() => openModal(setShowSettingsModal)}
              setShowSuggestionModal={() => openModal(setShowSuggestionModal)}
              setShowNotifications={(val) => openModal(setShowNotifications)}
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
              <aside className="relative h-full w-[280px] bg-deep-dark border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
                <UserSidebar
                  isMobile={true}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setShowSettingsModal={() => openModal(setShowSettingsModal)}
                  setShowSuggestionModal={() => openModal(setShowSuggestionModal)}
                  setShowNotifications={(val) => openModal(setShowNotifications)}
                  onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
              </aside>
            </div>
          )}
        </>
      )}

      {/* Contenido Principal */}
      <main className={`flex-1 w-full min-h-screen relative z-10 transition-all duration-300 ${isAuthenticated ? (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-8 min-h-full relative">
          {/* Header Mobile Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-6 px-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-3 glass-card border-white/10 text-gray-700 dark:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <img 
                src="https://krtthtzljlyewlngaklo.supabase.co/storage/v1/object/public/images/Sin%20fondo%20letras%20negras.png" 
                alt="Logo" 
                className="h-10 w-auto object-contain dark:invert brightness-110"
              />
            </div>
          </div>

          {/* Header */}
          <div className="mb-10 md:mb-16 animate-fade-in-up">
            <div className="hidden md:flex items-center gap-4 mb-6">
              <div className="px-4 py-1.5 glass-card !bg-neon-teal/10 border-neon-teal/20 text-neon-teal text-[10px] font-black uppercase tracking-[0.2em] neon-glow">
                Sistema Operativo Premium
              </div>
              <div className="h-px w-24 bg-white/10" />
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-400 tracking-tight">
                  {motivationalMessage.split('!')[0]}! <span className="neon-text">{profile?.name || user?.email?.split('@')[0]}</span>
                </h2>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-gray-900 dark:text-white">
                  DOMINA TU <span className="neon-text">PRODUCTIVIDAD</span>
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-xl">
                  {motivationalMessage.split('!')[1] || "Eleva tu flujo de trabajo con la flota de agentes IA más avanzada del sector."}
                </p>
              </div>
            </div>
          </div>

          {/* Controls - Premium Glass */}
          <div className="glass-card p-6 md:p-10 mb-10 md:mb-16 border-white/10 animate-fade-in-up [animation-delay:200ms]">
            <div className="flex flex-col gap-6 md:gap-8">
                <div className="flex flex-col sm:flex-row w-full gap-4 items-center">
                  <div className="relative w-full sm:flex-1 max-w-lg group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-neon-teal transition-colors w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar agentes por nombre o especialidad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 text-sm border border-white/10 rounded-2xl focus:ring-2 focus:ring-neon-teal/50 focus:border-neon-teal bg-white/5 dark:bg-black/20 dark:text-white transition-all outline-none shadow-2xl"
                    />
                  </div>

                  {isAdmin && (
                    <button 
                      onClick={() => window.location.href = '/admin'}
                      className="hidden md:flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold transition-all hover:bg-blue-500 shadow-xl shadow-blue-600/20"
                    >
                      <Shield className="w-4 h-4" />
                      Panel Admin
                    </button>
                  )}
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
                      title="Vista de Cuadrícula"
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Grid className="w-4 h-4 md:w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      title="Vista de Lista"
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
                      {['Todos', ...tabs.filter(t => t !== 'Todos')].map((tab) => (
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
                  {['Todos', ...tabs.filter(t => t !== 'Todos')].map((tab) => {
                    let count = 0;
                    if (tab === 'Todos') count = agents.filter(a => a.visible !== false).length;
                    else count = agents.filter(a => a.category === tab && a.visible !== false).length;

                    return (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'border-transparent text-gray-500 hover:text-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                          }`}
                      >
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

            {/* Agents Grid/List */}
          {loadingAgents ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="premium-spinner"></div>
              <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Cargando agentes especializados...</p>
            </div>
          ) : filteredAndSortedAgents.length > 0 ? (
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
                      onChatClick={() => handleAgentClick(agent)}
                      isFavorite={isFavorite(agent.id)}
                      onToggleFavorite={() => toggleFavorite(agent.id)}
                    />
                  ) : (
                    <AgentCompactCard
                      key={agent.id}
                      agent={agent}
                      onChatClick={() => handleAgentClick(agent)}
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
        <div className="fixed inset-0 z-[999] flex justify-end" onClick={() => setShowNotifications(false)}>
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
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                            {(() => {
                              const d = new Date(notif.created_at || notif.timestamp);
                              return isNaN(d.getTime()) ? 'Reciente' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </span>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowNotificationDetailModal(false)}>
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
                  {(() => {
                    const d = new Date(selectedNotification.created_at || selectedNotification.timestamp);
                    return isNaN(d.getTime()) ? 'Fecha no disponible' : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  })()}
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

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      <SuggestionModal 
        isOpen={showSuggestionModal} 
        onClose={() => setShowSuggestionModal(false)} 
      />

      {/* Agente Guía (Matchmaker) */}
      <AgentGuide />
    </div>
  );
};

export default AgentPanel;
