import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  Activity,
  Zap,
  Clock,
  Settings,
  Eye,
  BarChart3,
  User
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/agents';
import { useAuth } from '../../hooks/useAuth';

const AdminAgents = () => {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('agents');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    description: '',
    avatar: '',
    category: 'Marketing',
    chatLink: '',
    visible: true
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [selectedRows, setSelectedRows] = useState([]);

  const { broadcastNotification, sendUserNotification } = useAuth();

  useEffect(() => {
    fetchAgents();
    fetchSuggestions();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModals();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    const { data, error } = await supabase
      .from('agent_suggestions')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false });

    if (!error) {
      setSuggestions(data || []);
    }
    setLoadingSuggestions(false);
  };

  const handleUpdateSuggestionStatus = async (id, status) => {
    setLoading(true);
    setError('');
    
    // Encontrar la sugerencia antes de actualizar para tener el user_id
    const suggestion = suggestions.find(s => s.id === id);
    
    try {
      const { error } = await supabase
        .from('agent_suggestions')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;

      // Notificar al usuario (Regla 10)
      if (suggestion && suggestion.user_id) {
        await sendUserNotification(suggestion.user_id, {
          title: status === 'approved' ? '¡Sugerencia Aprobada! 🎉' : 'Sugerencia Revisada',
          message: status === 'approved' 
            ? `Tu sugerencia para "${suggestion.name}" ha sido aprobada e integrada al sistema.`
            : `Gracias por tu sugerencia "${suggestion.name}". Ha sido revisada por el equipo administrativo.`,
          type: status === 'approved' ? 'success' : 'info'
        });
      }

      setSuccess(`Sugerencia ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`);
      fetchSuggestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuggestion = async (id) => {
    if (!window.confirm('¿Eliminar esta sugerencia permanentemente?')) return;
    
    setLoadingSuggestions(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('agent_suggestions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess('Sugerencia eliminada correctamente');
      fetchSuggestions();
    } catch (err) {
      console.error('Error deleting suggestion:', err);
      setError('No se pudo eliminar la sugerencia');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    filterAgents();
    setCurrentPage(1);
  }, [agents, searchTerm, filterStatus]);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      setError('Error al cargar agentes de Supabase');
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  };

  const filterAgents = () => {
    const normalizeText = (text) => (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    let filtered = agents;
    if (searchTerm) {
      const term = normalizeText(searchTerm).trim();
      filtered = filtered.filter(agent => 
        normalizeText(agent.name).includes(term) ||
        normalizeText(agent.specialty).includes(term)
      );
    }
    if (filterStatus !== 'all') {
      const isVisible = filterStatus === 'active';
      filtered = filtered.filter(agent => agent.visible === isVisible);
    }
    setFilteredAgents(filtered);
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('agents').insert([formData]).select();
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Agente creado exitosamente');
      
      // Notificación global de novedad (Regla 10)
      await broadcastNotification({
        title: '🚀 ¡Nuevo Agente Disponible!',
        message: `Se ha añadido a "${formData.name}" especializado en ${formData.specialty}. ¡Pruébalo ahora!`,
        type: 'success'
      });

      setShowCreateModal(false);
      resetForm();
      fetchAgents();
    }
    setLoading(false);
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('agents')
      .update(formData)
      .eq('id', selectedAgent.id);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Agente actualizado exitosamente');
      setShowEditModal(false);
      resetForm();
      fetchAgents();
    }
    setLoading(false);
  };

  const confirmDeleteAgent = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', selectedAgent.id);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Agente eliminado exitosamente');
      setShowDeleteModal(false);
      fetchAgents();
    }
    setLoading(false);
  };

  const handleBulkToggleStatus = async () => {
    setLoading(true);
    for (const id of selectedRows) {
      const agent = agents.find(a => a.id === id);
      await supabase.from('agents').update({ visible: !agent.visible }).eq('id', id);
    }
    setSelectedRows([]);
    fetchAgents();
    setSuccess('Estados actualizados');
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm('¿Eliminar agentes seleccionados?')) return;
    setLoading(true);
    await supabase.from('agents').delete().in('id', selectedRows);
    setSelectedRows([]);
    fetchAgents();
    setSuccess('Agentes eliminados');
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      specialty: '',
      description: '',
      avatar: '',
      category: 'Marketing',
      chatLink: '',
      visible: true
    });
    setSelectedAgent(null);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    resetForm();
  };

  const handleEditAgent = (agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name || '',
      specialty: agent.specialty || '',
      description: agent.description || '',
      avatar: agent.avatar || '',
      category: agent.category || 'Marketing',
      chatLink: agent.chatLink || '',
      visible: agent.visible ?? true
    });
    setShowEditModal(true);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAgents = filteredAgents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);

  return (
    <AdminLayout currentPage="agents">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Agentes</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {activeAdminTab === 'agents' 
                ? `Administra tu catálogo de ${agents.length} agentes IA`
                : `Revisa las ${suggestions.length} sugerencias enviadas por usuarios`}
            </p>
          </div>
          {activeAdminTab === 'agents' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Crear Agente
            </button>
          )}
        </div>

        {/* Tabs de Administración */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveAdminTab('agents')}
            className={`pb-4 text-sm font-bold transition-all border-b-2 px-2 ${activeAdminTab === 'agents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Agentes Activos
          </button>
          <button
            onClick={() => setActiveAdminTab('suggestions')}
            className={`pb-4 text-sm font-bold transition-all border-b-2 px-2 flex items-center gap-2 ${activeAdminTab === 'suggestions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Sugerencias de Usuarios
            {suggestions.filter(s => s.status === 'pending').length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                {suggestions.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {success && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-600 dark:text-green-400">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4 text-green-600" /></button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4 text-red-600" /></button>
          </div>
        )}

        {activeAdminTab === 'agents' ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar agente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
            </div>

            {selectedRows.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between border border-blue-200">
                <span className="text-blue-800 dark:text-blue-300">{selectedRows.length} seleccionados</span>
                <div className="flex gap-2">
                  <button onClick={handleBulkToggleStatus} className="px-3 py-1.5 bg-white border rounded-lg text-sm">Alternar Estado</button>
                  <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm">Eliminar</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentAgents.map((agent) => (
                <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-5 relative">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(agent.id)}
                    onChange={() => setSelectedRows(prev => prev.includes(agent.id) ? prev.filter(id => id !== agent.id) : [...prev, agent.id])}
                    className="absolute top-4 right-4 rounded"
                  />
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{agent.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{agent.specialty}</p>
                      <span className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full ${agent.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {agent.visible ? 'Activo' : 'Oculto'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                    <button onClick={() => handleEditAgent(agent)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedAgent(agent); setShowDeleteModal(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {loadingSuggestions ? (
              <div className="text-center py-20">
                <div className="premium-spinner mx-auto mb-4"></div>
                <p className="text-gray-500">Cargando sugerencias...</p>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((sug) => (
                <div key={sug.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{sug.name}</h3>
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                          sug.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          sug.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {sug.status === 'pending' ? 'Pendiente' : sug.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{sug.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{sug.profiles?.name || sug.profiles?.email || 'Usuario desconocido'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(sug.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sug.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateSuggestionStatus(sug.id, 'approved')}
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                            title="Aprobar"
                          >
                            <Check className="w-4 h-4" /> Aprobar
                          </button>
                          <button 
                            onClick={() => handleUpdateSuggestionStatus(sug.id, 'rejected')}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                            title="Rechazar"
                          >
                            <X className="w-4 h-4" /> Rechazar
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleDeleteSuggestion(sug.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 dark:text-gray-400">No hay sugerencias todavía.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {(showCreateModal || showEditModal) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={closeModals}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 shadow-2xl border border-gray-200 dark:border-gray-700 relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 rounded-xl">
                  {showEditModal ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {showEditModal ? 'Editar Agente' : 'Nuevo Agente'}
                </h2>
              </div>
              <button 
                onClick={closeModals}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={showEditModal ? handleUpdateAgent : handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nombre del Agente</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                  placeholder="Ej: Marketing Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Especialidad</label>
                <input 
                  required 
                  value={formData.specialty} 
                  onChange={e => setFormData({...formData, specialty: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                  placeholder="Ej: Estrategia y SEO"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Categoría</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Descripción Detallada</label>
                <textarea 
                  rows="3" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none" 
                  placeholder="Describe las capacidades del agente..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Link del Chat (iframe/url)</label>
                <input 
                  value={formData.chatLink} 
                  onChange={e => setFormData({...formData, chatLink: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700/50 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" 
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                <input 
                  type="checkbox" 
                  checked={formData.visible} 
                  onChange={e => setFormData({...formData, visible: e.target.checked})} 
                  id="visible"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="visible" className="text-sm font-medium text-gray-700 dark:text-gray-300">Visible para los usuarios en el panel</label>
              </div>
              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={closeModals} 
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Procesando...' : (showEditModal ? 'Guardar Cambios' : 'Crear Agente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">¿Eliminar Agente?</h2>
            <p className="text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={closeModals} className="flex-1 py-2 border rounded-lg">Cancelar</button>
              <button onClick={confirmDeleteAgent} disabled={loading} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAgents;
