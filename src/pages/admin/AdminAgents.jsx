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
  BarChart3
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/agents';

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

  useEffect(() => {
    fetchAgents();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModals();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    let filtered = agents;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(agent => 
        (agent.name || '').toLowerCase().includes(searchLower) ||
        (agent.specialty || '').toLowerCase().includes(searchLower)
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
    const { error } = await supabase.from('agents').insert([formData]);
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Agente creado exitosamente');
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
            <p className="text-gray-600 dark:text-gray-400 mt-1">Administra tu catálogo de {agents.length} agentes IA</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Crear Agente
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
      </div>

      {/* Modal Crear/Editar */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{showEditModal ? 'Editar Agente' : 'Nuevo Agente'}</h2>
              <button onClick={closeModals}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={showEditModal ? handleUpdateAgent : handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Especialidad</label>
                <input required value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link del Chat</label>
                <input value={formData.chatLink} onChange={e => setFormData({...formData, chatLink: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.visible} onChange={e => setFormData({...formData, visible: e.target.checked})} id="visible" />
                <label htmlFor="visible" className="text-sm font-medium">Visible en el panel</label>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModals} className="flex-1 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Guardando...' : (showEditModal ? 'Actualizar' : 'Crear')}
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
