import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  LogOut,
  Play,
  Pause,
  X,
  Check,
  AlertTriangle,
  User,
  Mail,
  Shield,
  Calendar,
  Bell,
  Send,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  UserMinus,
  Eraser,
  Download,
  RotateCcw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminUsers = () => {
  const { 
    user, 
    profile, 
    users, 
    loading: authLoading,
    fetchUsers,
    deleteUserById, 
    updateUserById, 
    toggleUserStatus, 
    broadcastNotification,
    sendUserNotification,
    register,
    adminCreateUser,
    resetUserPassword,
    expelUser
  } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados para notificaciones
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState('all'); 
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'info' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirm: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    avatar: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Acciones Masivas
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchUsers();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModals();
    };
    window.addEventListener('keydown', handleKeyDown);
    
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('action') === 'create') {
      setShowCreateModal(true);
      navigate('/admin/users', { replace: true });
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchUsers, location.search, navigate]);

  const filteredUsers = users.filter(user => {
    let matchesSearch = true;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = (user.name && user.name.toLowerCase().includes(searchLower)) ||
                      (user.email && user.email.toLowerCase().includes(searchLower));
    }
    
    let matchesRole = true;
    if (filterRole !== 'all') {
      if (filterRole === 'recent') {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        matchesRole = new Date(user.created_at) > dayAgo;
      } else {
        matchesRole = user.role === filterRole;
      }
    }
    return matchesSearch && matchesRole;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, users.length]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleSelectAll = () => {
    const selectableIds = currentUsers.map(u => u.id);
    const allOnPageSelected = selectableIds.every(id => selectedRows.includes(id));

    if (allOnPageSelected && selectableIds.length > 0) {
      setSelectedRows(prev => prev.filter(id => !selectableIds.includes(id)));
    } else {
      setSelectedRows(prev => [...new Set([...prev, ...selectableIds])]);
    }
  };

  const handleSelectRow = (userId) => {
    setSelectedRows(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error('Todos los campos son obligatorios');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      const result = await adminCreateUser(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        avatar_url: formData.avatar
      });
      
      if (result.success) {
        toast.success('Usuario creado exitosamente');
        setShowCreateModal(false);
        resetForm();
      } else {
        throw new Error(result.error || 'Error al crear usuario');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      const result = await updateUserById(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatar_url: formData.avatar
      });

      if (!result.success) throw new Error(result.error || 'Error al actualizar');
      
      toast.success('Usuario actualizado exitosamente');
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    setActionLoading(true);
    const result = await deleteUserById(selectedUser.id);
    if (result.success) {
      toast.success('Usuario eliminado');
      setShowDeleteModal(false);
    } else {
      setError(result.error);
    }
    setActionLoading(false);
  };

  const handleEditUser = (u) => {
    setSelectedUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      password: '',
      confirmPassword: '',
      role: u.role || 'user',
      avatar: u.avatar_url || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = (u) => {
    setSelectedUser(u);
    setShowDeleteModal(true);
  };

  const handleResetPassword = (u) => {
    setSelectedUser(u);
    setResetPasswordData({ password: '', confirm: '' });
    setShowResetModal(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUser) return;
    if (resetPasswordData.password !== resetPasswordData.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setActionLoading(true);
    const result = await resetUserPassword(selectedUser.id, resetPasswordData.password);
    if (result.success) {
      toast.success('Contraseña actualizada');
      setShowResetModal(false);
      setResetPasswordData({ password: '', confirm: '' });
    } else {
      toast.error(result.error || 'No se pudo resetear la contraseña');
    }
    setActionLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      avatar: ''
    });
    setSelectedUser(null);
    setError('');
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowResetModal(false);
    setShowNotifyModal(false);
    setResetPasswordData({ password: '', confirm: '' });
    resetForm();
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    try {
        if (notificationTarget === 'all') {
            await broadcastNotification(notificationData);
        } else {
            await sendUserNotification(notificationTarget, notificationData);
        }
        toast.success('Notificación enviada');
        setShowNotifyModal(false);
    } catch (err) {
        toast.error('Error al enviar notificación');
    } finally {
        setActionLoading(false);
    }
  };
  
  const handleBulkApprove = async () => {
    setActionLoading(true);
    try {
      for (const userId of selectedRows) {
        await updateUserById(userId, { status: 'active', is_approved: true });
      }
      toast.success(`${selectedRows.length} usuarios activados`);
      setSelectedRows([]);
      fetchUsers();
    } catch (err) {
      toast.error('Error en activación masiva');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkExpel = async () => {
    setActionLoading(true);
    try {
      for (const userId of selectedRows) {
        await expelUser(userId);
      }
      toast.success(`${selectedRows.length} usuarios expulsados`);
      setSelectedRows([]);
      fetchUsers();
    } catch (err) {
      toast.error('Error en expulsión masiva');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setActionLoading(true);
    try {
      for (const userId of selectedRows) {
        await deleteUserById(userId);
      }
      toast.success(`${selectedRows.length} usuarios eliminados`);
      setSelectedRows([]);
      fetchUsers();
    } catch (err) {
      toast.error('Error en eliminación masiva');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout currentPage="users">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic neon-glow">Gestión de Usuarios</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
              Control de acceso y privilegios de la comunidad
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 bg-neon-teal text-deep-dark rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-teal/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Quick Stats & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 glass-card p-8 border-white/10 !bg-gradient-to-br from-white/5 to-neon-teal/5 flex flex-col md:flex-row items-center justify-between gap-8 relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/10 blur-[60px] group-hover:bg-neon-teal/20 transition-all rounded-tr-[3rem]"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-neon-teal/10 flex items-center justify-center text-neon-teal neon-glow">
                        <Bell className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Comunicación Directa</h3>
                        <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Envía alertas globales o individuales</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative z-10 shrink-0 pr-4 sm:pr-0">
                    <select
                        value={notificationTarget}
                        onChange={(e) => setNotificationTarget(e.target.value)}
                        className="w-full sm:w-56 premium-input py-2 text-xs font-black uppercase tracking-widest shrink-0"
                    >
                        <option value="all">🚀 Global</option>
                        {users.filter(u => u.status === 'active').map(u => (
                            <option key={u.id} value={u.id}>👤 {u.name || u.email.split('@')[0]}</option>
                        ))}
                    </select>
                    <button 
                        onClick={() => setShowNotifyModal(true)}
                        className="w-full sm:w-fit px-6 pr-8 sm:pr-6 py-3 bg-neon-teal text-deep-dark rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-neon-teal/20 flex items-center gap-2 shrink-0"
                    >
                        <Send className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">{notificationTarget === 'all' ? 'Broadcast' : 'Directo'}</span>
                    </button>
                </div>
            </div>
            
            <div className="glass-card p-8 border-white/10 flex flex-col justify-center text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">Población Total</p>
                <p className="text-5xl font-black text-white italic tracking-tighter neon-glow">{users.length}</p>
                <p className="text-[10px] font-bold text-neon-teal uppercase mt-2">Sincronizado</p>
            </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-6 border-white/10">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-teal transition-colors w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Escanear base de datos por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:ring-2 focus:ring-neon-teal/30 focus:border-neon-teal transition-all outline-none"
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-6 py-3 border border-white/10 rounded-xl bg-white/5 text-white font-bold text-xs uppercase tracking-widest outline-none appearance-none cursor-pointer"
                >
                    <option value="all">Todos los Roles</option>
                    <option value="admin">Administradores</option>
                    <option value="user">Usuarios</option>
                    <option value="recent">Recientes (24h)</option>
                </select>
            </div>
        </div>

        {/* Selected Rows Bulk Actions - Premium Minimalist Glass */}
        {selectedRows.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-bottom-10 duration-500">
                <div className="glass-card flex items-center gap-6 px-8 py-4 shadow-2xl border-slate-100 dark:border-white/20 backdrop-blur-2xl">
                    <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-neon-teal/10 flex items-center justify-center text-neon-teal neon-glow">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{selectedRows.length} Seleccionados</p>
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Acciones Masivas</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleBulkApprove}
                            title="Aceptar Todos"
                            className="p-3 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95 group relative"
                        >
                            <UserCheck className="w-5 h-5" />
                        </button>
                        
                        <button 
                            onClick={handleBulkExpel}
                            title="Expulsar Todos"
                            className="p-3 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <UserMinus className="w-5 h-5" />
                        </button>
                        
                        <button 
                            onClick={handleBulkDelete}
                            title="Eliminar Permanente"
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        
                        <button 
                            onClick={() => setSelectedRows([])}
                            title="Limpiar Selección"
                            className="p-3 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Users Table */}
        <div className="glass-card border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-6 py-4">
                                <input type="checkbox" onChange={handleSelectAll} className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-teal" />
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Identidad</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Privilegios</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Estado</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Actividad</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {currentUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedRows.includes(u.id)}
                                        onChange={() => handleSelectRow(u.id)}
                                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-teal" 
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-neon-teal/10 flex items-center justify-center text-neon-teal font-black text-sm border border-neon-teal/20">
                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-xl object-cover" /> : (u.name || 'A').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-white truncate uppercase tracking-tighter">{u.name || 'Sin nombre'}</p>
                                            <p className="text-[10px] font-bold text-gray-500 truncate">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'}`}>
                                        {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                            {u.status === 'active' ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleResetPassword(u)} title="Resetear contraseña" className="p-2.5 glass-card border-white/5 text-amber-400 hover:bg-amber-500 hover:text-deep-dark transition-all rounded-xl">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleEditUser(u)} className="p-2.5 glass-card border-white/5 text-neon-teal hover:bg-neon-teal hover:text-deep-dark transition-all rounded-xl">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteUser(u)} className="p-2.5 glass-card border-white/5 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="p-6 border-t border-white/10 flex justify-center gap-3">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-10 h-10 rounded-xl font-black transition-all ${currentPage === i + 1 ? 'bg-neon-teal text-deep-dark' : 'glass-card border-white/5 text-gray-500 hover:text-white'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Modal Notificar */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-lg border-white/10 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neon-teal/10 rounded-2xl text-neon-teal neon-glow">
                            <Send className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Lanzar Alerta</h2>
                    </div>
                    <button onClick={closeModals} className="p-2 text-gray-500 hover:text-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Título de la Notificación</label>
                        <input required value={notificationData.title} onChange={e => setNotificationData({...notificationData, title: e.target.value})} className="premium-input w-full" placeholder="Ej: Actualización Importante" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Mensaje del Sistema</label>
                        <textarea required rows="4" value={notificationData.message} onChange={e => setNotificationData({...notificationData, message: e.target.value})} className="premium-input w-full resize-none" placeholder="Escribe el mensaje detallado..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Prioridad</label>
                            <select value={notificationData.type} onChange={e => setNotificationData({...notificationData, type: e.target.value})} className="premium-input w-full appearance-none">
                                <option value="info">INFO</option>
                                <option value="success">SUCCESS</option>
                                <option value="warning">WARNING</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={actionLoading} className="w-full py-4 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-neon-teal/20 hover:scale-105 transition-all">
                                {actionLoading ? 'ENVIANDO...' : 'EJECUTAR'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-lg border-white/10 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neon-teal/10 rounded-2xl text-neon-teal neon-glow">
                            <User className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{showEditModal ? 'Editar Perfil' : 'Alta de Usuario'}</h2>
                    </div>
                    <button onClick={closeModals} className="p-2 text-gray-500 hover:text-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={showEditModal ? handleUpdateUser : handleCreateUser} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nombre Completo</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="premium-input w-full" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Email Corporativo</label>
                        <input required type="email" disabled={showEditModal} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="premium-input w-full disabled:opacity-50" placeholder="user@upfunnel.click" />
                    </div>
                    {!showEditModal && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Contraseña</label>
                                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="premium-input w-full" placeholder="******" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Confirmar</label>
                                <input required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="premium-input w-full" placeholder="******" />
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nivel de Acceso</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="premium-input w-full appearance-none">
                            <option value="user">USUARIO ESTÁNDAR</option>
                            <option value="admin">ADMINISTRADOR CORE</option>
                        </select>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={closeModals} className="flex-1 py-4 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Cancelar</button>
                        <button type="submit" disabled={actionLoading} className="flex-1 py-4 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-neon-teal/20">
                            {actionLoading ? 'PROCESANDO...' : 'GUARDAR'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Modal Reset contraseña */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-md border-white/10 shadow-2xl animate-in zoom-in-95">
                <h2 className="text-2xl font-black text-white uppercase italic mb-2">Nueva contraseña</h2>
                <p className="text-gray-500 text-sm mb-6">Usuario: <span className="text-white font-bold">{selectedUser.email}</span></p>
                <div className="space-y-4">
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={resetPasswordData.password}
                      onChange={(e) => setResetPasswordData({ ...resetPasswordData, password: e.target.value })}
                      className="premium-input w-full"
                    />
                    <input
                      type="password"
                      placeholder="Confirmar contraseña"
                      value={resetPasswordData.confirm}
                      onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirm: e.target.value })}
                      className="premium-input w-full"
                    />
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={closeModals} className="flex-1 py-4 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Cancelar</button>
                    <button onClick={confirmResetPassword} disabled={actionLoading} className="flex-1 py-4 bg-amber-500 text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest">
                      {actionLoading ? 'PROCESANDO...' : 'ACTUALIZAR'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-md text-center border-white/10 shadow-2xl animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-500/10">
                    <AlertTriangle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase italic mb-4">¿Confirmar Baja?</h2>
                <p className="text-gray-500 font-bold mb-10 text-sm leading-relaxed uppercase tracking-wider">
                    Esta acción eliminará permanentemente al usuario <span className="text-red-500">"{selectedUser?.name || selectedUser?.email}"</span>. Se perderá todo su historial.
                </p>
                <div className="flex gap-4">
                    <button onClick={closeModals} className="flex-1 py-4 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Cancelar</button>
                    <button onClick={confirmDeleteUser} disabled={actionLoading} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
                        CONFIRMAR
                    </button>
                </div>
            </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
