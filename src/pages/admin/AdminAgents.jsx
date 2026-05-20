import React, { useState, useEffect } from 'react';
import { 
  Bot, Plus, Search, Edit, Trash2, X, AlertTriangle, Clock, Eye, User, Check, Send, Bell, CheckCircle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/agents';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';


const AdminAgents = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState('agents');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDeleteSuggestionModal, setShowDeleteSuggestionModal] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    description: '',
    avatar: '',
    category: 'Marketing',
    chatLink: '',
    visible: true,
    admin_only: false
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
    
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('action') === 'create') {
      setShowCreateModal(true);
      navigate('/admin/agents', { replace: true });
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.search, navigate]);

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
    const suggestion = suggestions.find(s => s.id === id);
    
    try {
      const { error } = await supabase
        .from('agent_suggestions')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;

      if (suggestion && suggestion.user_id) {
        await sendUserNotification(suggestion.user_id, {
          title: status === 'approved' ? '¡Sugerencia Aprobada! 🎉' : 'Sugerencia Revisada',
          message: status === 'approved' 
            ? `Tu sugerencia para "${suggestion.name}" ha sido aprobada e integrada al sistema.`
            : `Gracias por tu sugerencia "${suggestion.name}". Ha sido revisada por el equipo administrativo.`,
          type: status === 'approved' ? 'success' : 'info'
        });
      }

      toast.success(status === 'approved' ? 'Sugerencia aprobada correctamente' : 'Sugerencia rechazada');
      fetchSuggestions();
    } catch (err) {
      console.error('Error updating suggestion status:', err);
      toast.error('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuggestion = async (id) => {
    setLoadingSuggestions(true);
    setError('');
    
    try {
      const { data, error: deleteError } = await supabase
        .from('agent_suggestions')
        .delete()
        .eq('id', id)
        .select();
      
      if (deleteError) throw deleteError;
      
      if (data && data.length > 0) {
        toast('Sugerencia eliminada correctamente');
        setSuggestions(prev => prev.filter(s => s.id !== id));
      } else {
        setError('No se pudo eliminar: El registro no existe o no tienes permisos.');
      }
    } catch (err) {
      console.error('Error deleting suggestion:', err);
      setError('Error al intentar eliminar la sugerencia');
    } finally {
      setLoadingSuggestions(false);
      setShowDeleteSuggestionModal(false);
      setSuggestionToDelete(null);
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
      if (filterStatus === 'admin_only') {
        filtered = filtered.filter(agent => agent.admin_only === true);
      } else {
        const isVisible = filterStatus === 'active';
        filtered = filtered.filter(agent => agent.visible === isVisible && !agent.admin_only);
      }
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
      toast('Agente creado con éxito');
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
      toast('Agente actualizado con éxito');
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
      toast.success('Agente eliminado exitosamente');
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
    toast.success('Estados actualizados');
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm('¿Eliminar agentes seleccionados?')) return;
    setLoading(true);
    await supabase.from('agents').delete().in('id', selectedRows);
    setSelectedRows([]);
    fetchAgents();
    toast.success('Agentes eliminados');
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
      visible: true,
      admin_only: false
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
      visible: agent.visible ?? true,
      admin_only: agent.admin_only ?? false
    });
    setShowEditModal(true);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAgents = filteredAgents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);

  return (
    <AdminLayout currentPage="agents">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic neon-glow">Gestión de Agentes</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
              {activeAdminTab === 'agents' 
                ? `Centro de control de ${agents.length} unidades operativas`
                : `${suggestions.length} propuestas de la comunidad`}
            </p>
          </div>
          {activeAdminTab === 'agents' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 bg-neon-teal text-deep-dark rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-teal/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Desplegar Agente
            </button>
          )}
        </div>

        {/* Tabs - Premium Glass */}
        <div className="flex gap-4 p-1.5 glass-card !bg-white/5 border-white/10 w-fit">
          <button
            onClick={() => setActiveAdminTab('agents')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeAdminTab === 'agents' ? 'bg-neon-teal text-deep-dark shadow-lg shadow-neon-teal/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            Terminal Activa
          </button>
          <button
            onClick={() => setActiveAdminTab('suggestions')}
            className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeAdminTab === 'suggestions' ? 'bg-neon-teal text-deep-dark shadow-lg shadow-neon-teal/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            Propuestas
            {suggestions.filter(s => s.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                {suggestions.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {activeAdminTab === 'agents' ? (
          <>
            <div className="glass-card p-6 border-white/10 shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-teal transition-colors w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Escanear agente por nombre o especialidad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:ring-2 focus:ring-neon-teal/30 focus:border-neon-teal transition-all outline-none"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-6 py-3 border border-white/10 rounded-xl bg-white/5 text-white font-bold text-xs uppercase tracking-widest focus:ring-2 focus:ring-neon-teal/30 outline-none appearance-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="admin_only">Solo Admin / Borradores</option>
                </select>
              </div>
            </div>

            {selectedRows.length > 0 && (
              <div className="glass-card !bg-neon-teal/10 p-4 rounded-xl flex items-center justify-between border-neon-teal/20 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-neon-teal text-deep-dark rounded-full flex items-center justify-center text-sm font-black shadow-lg shadow-neon-teal/40">
                    {selectedRows.length}
                  </div>
                  <span className="text-neon-teal font-black text-xs uppercase tracking-widest">Unidades seleccionadas</span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleBulkToggleStatus} 
                    className="p-3 glass-card border-white/10 text-neon-teal hover:bg-neon-teal hover:text-deep-dark transition-all"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleBulkDelete} 
                    className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentAgents.map((agent) => (
                <div key={agent.id} className="glass-card p-6 border-white/10 hover:border-neon-teal/50 transition-all duration-500 group relative">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(agent.id)}
                    onChange={() => setSelectedRows(prev => prev.includes(agent.id) ? prev.filter(id => id !== agent.id) : [...prev, agent.id])}
                    className="absolute top-6 right-6 w-5 h-5 rounded-lg border-white/10 bg-white/5 text-neon-teal focus:ring-neon-teal focus:ring-offset-deep-dark"
                  />
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-neon-teal/10 flex items-center justify-center text-neon-teal neon-glow group-hover:scale-110 transition-transform">
                      <Bot className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white truncate uppercase italic tracking-tight">{agent.name}</h3>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest truncate">{agent.specialty}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`inline-flex text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${agent.visible ? 'bg-neon-teal/20 text-neon-teal neon-glow' : 'bg-white/5 text-gray-600'}`}>
                          {agent.visible ? 'Activo' : 'Oculto'}
                        </span>
                        {agent.admin_only && (
                          <span className="inline-flex text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            Borrador / Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3 border-t border-white/5 pt-6">
                    <button onClick={() => handleEditAgent(agent)} className="p-3 glass-card border-white/10 text-neon-teal hover:bg-neon-teal hover:text-deep-dark transition-all rounded-xl"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedAgent(agent); setShowDeleteModal(true); }} className="p-3 glass-card border-white/10 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-12">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-12 h-12 rounded-xl font-black transition-all ${currentPage === i + 1 ? 'bg-neon-teal text-deep-dark shadow-lg shadow-neon-teal/20' : 'glass-card border-white/10 text-gray-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {loadingSuggestions ? (
              <div className="text-center py-32 glass-card border-white/5">
                <div className="premium-spinner mx-auto mb-6"></div>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Sincronizando propuestas...</p>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((sug) => (
                <div key={sug.id} className="glass-card p-8 border-white/10 hover:border-neon-teal/30 transition-all duration-500">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{sug.name}</h3>
                        <span className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full ${
                          sug.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                          sug.status === 'approved' ? 'bg-neon-teal/20 text-neon-teal neon-glow' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {sug.status === 'pending' ? 'Pendiente' : sug.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </span>
                      </div>
                      <p className="text-gray-400 font-medium leading-relaxed max-w-3xl">{sug.description}</p>
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <User className="w-3.5 h-3.5 text-neon-teal" />
                          <span>{sug.profiles?.name || sug.profiles?.email || 'Anonimo'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <Clock className="w-3.5 h-3.5 text-neon-teal" />
                          <span>{new Date(sug.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {sug.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateSuggestionStatus(sug.id, 'approved')}
                            className="w-14 h-14 flex items-center justify-center glass-card border-white/10 text-neon-teal hover:bg-neon-teal hover:text-deep-dark transition-all rounded-2xl shadow-lg"
                          >
                            <CheckCircle className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => handleUpdateSuggestionStatus(sug.id, 'rejected')}
                            className="w-14 h-14 flex items-center justify-center glass-card border-white/10 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-2xl shadow-lg"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          setSuggestionToDelete(sug);
                          setShowDeleteSuggestionModal(true);
                        }}
                        className="w-14 h-14 flex items-center justify-center glass-card border-white/10 text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-2xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-40 glass-card border-white/5 border-dashed">
                <Bot className="w-16 h-16 text-white/5 mx-auto mb-6" />
                <p className="text-xl font-black text-gray-600 uppercase italic">No se detectan propuestas</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar - Premium Glass */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-deep-dark/80 backdrop-blur-xl" onClick={closeModals}></div>
          <div className="relative glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-10 border-white/10 shadow-[0_0_100px_-20px_rgba(0,229,255,0.2)] animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neon-teal/10 rounded-2xl text-neon-teal neon-glow">
                  {showEditModal ? <Edit className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
                    {showEditModal ? 'Modificar Protocolo' : 'Desplegar Nuevo Agente'}
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Configuración técnica de unidad</p>
                </div>
              </div>
              <button onClick={closeModals} className="p-3 glass-card border-white/5 text-gray-500 hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleUpdateAgent : handleCreateAgent} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Nombre Operativo</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="premium-input w-full" placeholder="Ej: Visionary Copywriter" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Especialidad</label>
                  <input required value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="premium-input w-full" placeholder="Ej: SEO & Content Strategy" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Categoría del Núcleo</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="premium-input w-full appearance-none">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Descripción del Algoritmo</label>
                <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="premium-input w-full resize-none" placeholder="Define las capacidades maestras de este agente..." />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Puente de Comunicación (URL)</label>
                <input value={formData.chatLink} onChange={e => setFormData({...formData, chatLink: e.target.value})} className="premium-input w-full" placeholder="https://app.customgpt.ai/..." />
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4 p-5 glass-card !bg-white/5 border-white/10 rounded-2xl">
                  <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.visible} onChange={e => setFormData({...formData, visible: e.target.checked})} id="visible" className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-teal"></div>
                      <span className="ml-4 text-xs font-black text-white uppercase tracking-widest">Activar visibilidad en terminales</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 glass-card !bg-white/5 border-white/10 rounded-2xl">
                  <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.admin_only} onChange={e => setFormData({...formData, admin_only: e.target.checked})} id="admin_only" className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-teal"></div>
                      <span className="ml-4 text-xs font-black text-white uppercase tracking-widest">Solo Administradores (Borrador/Testing)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={closeModals} className="flex-1 py-4 glass-card border-white/10 text-gray-500 font-black uppercase text-xs tracking-[0.3em] hover:text-white hover:bg-white/5 transition-all">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-4 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-teal/20">
                  {loading ? 'Sincronizando...' : (showEditModal ? 'Guardar Cambios' : 'Desplegar Agente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar - Premium */}
      {(showDeleteModal || (showDeleteSuggestionModal && suggestionToDelete)) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
          <div className="relative glass-card p-10 w-full max-w-md text-center border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic italic mb-4">¿Confirmar Purga?</h2>
            <p className="text-gray-500 font-bold mb-10 text-sm leading-relaxed uppercase tracking-wider">
              {showDeleteModal 
                ? `Esta acción eliminará al agente "${selectedAgent?.name}" permanentemente de los servidores.` 
                : `¿Estás seguro de que deseas eliminar la sugerencia para "${suggestionToDelete?.name}"?`}
            </p>
            <div className="flex gap-4">
              <button onClick={closeModals} className="flex-1 py-4 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Abortar</button>
              <button 
                onClick={showDeleteModal ? confirmDeleteAgent : () => handleDeleteSuggestion(suggestionToDelete.id)} 
                disabled={loading || loadingSuggestions} 
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAgents;
