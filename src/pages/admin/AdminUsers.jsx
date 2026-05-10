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
  Bell
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
  console.log('>>> AdminUsers component MOUNTED! <<<');
  const { users, deleteUserById, updateUserById, toggleUserStatus, expelUser, user: currentUser, addNotification, broadcastNotification, register, fetchUsers } = useAuth();
  const navigate = useNavigate();

  // Estados para notificaciones
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState('all'); // 'all' o userId
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'info' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    status: 'active',
    avatar: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    let matchesSearch = true;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch = (user.name && user.name.toLowerCase().includes(searchLower)) ||
                      (user.email && user.email.toLowerCase().includes(searchLower));
    }
    let matchesRole = true;
    if (filterRole !== 'all') {
      matchesRole = user.role === filterRole;
    }
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, users.length]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(currentUsers.map(user => user.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (userId) => {
    setSelectedRows(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar los usuarios seleccionados?')) {
      setLoading(true);
      for (const id of selectedRows) {
        if (id !== currentUser?.id) await deleteUserById(id);
      }
      setSelectedRows([]);
      setSuccess('Usuarios eliminados exitosamente');
      setLoading(false);
    }
  };

  const handleBulkToggleStatus = async () => {
    setLoading(true);
    for (const id of selectedRows) {
      if (id !== currentUser?.id) await toggleUserStatus(id);
    }
    setSelectedRows([]);
    setSuccess('Estado de usuarios actualizado');
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error('Todos los campos son obligatorios');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const existingUsers = getAllUsers;
      if (existingUsers.some(user => user.email === formData.email)) {
        throw new Error('Ya existe un usuario con este email');
      }

      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        ...(formData.role === 'user' && {
          startDate: formData.startDate,
          endDate: formData.endDate
        })
      });
      
      if (result.success) {
        setSuccess('Usuario creado exitosamente');
        setShowCreateModal(false);
        resetForm();
      } else {
        throw new Error(result.error || 'Error al crear usuario');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'user',
      status: user.status || 'active',
      avatar: user.avatar || '',
      startDate: user.startDate || new Date().toISOString().split('T')[0],
      endDate: user.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isApproved: user.isApproved || false
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name || !formData.email) {
        throw new Error('Nombre y email son obligatorios');
      }

      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
      }

      const existingUsers = getAllUsers;
      if (existingUsers.some(user => user.email === formData.email && user.id !== selectedUser.id)) {
        throw new Error('Ya existe un usuario con este email');
      }

      const result = await updateUserById(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        ...(formData.avatar && { avatar: formData.avatar }),
        ...(formData.password && { password: formData.password }),
        ...(formData.role === 'user' && {
          startDate: formData.startDate,
          endDate: formData.endDate
        }),
        isApproved: formData.isApproved
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar usuario');
      }
      
      setSuccess('Usuario actualizado exitosamente');
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      if (selectedUser.id === currentUser?.id) {
        setError('No puedes eliminar tu propio usuario');
        return;
      }

      const result = await deleteUserById(selectedUser.id);
      if (!result.success) {
        setError(result.error || 'Error al eliminar usuario');
        return;
      }
      
      setSuccess('Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      status: 'active',
      avatar: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isApproved: false
    });
    setSelectedUser(null);
    setError('');
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowNotifyModal(false);
    resetForm();
  };

  const handleToggleUserStatus = async (user) => {
    const result = await toggleUserStatus(user.id);
    if (!result.success) {
      setError(result.error || 'Error al cambiar estado del usuario');
      return;
    }

    setSuccess(`Usuario ${result.status === 'active' ? 'activado' : 'desactivado'} exitosamente`);
  };

  const handleExpelUser = async (user) => {
    const result = await expelUser(user.id);
    if (!result.success) {
      setError(result.error || 'Error al expulsar usuario');
      return;
    }

    setSuccess('Sesión del usuario expulsada. Podrá iniciar sesión nuevamente si está activo.');
  };

  const handleUpdateUserQuick = async (user, data) => {
    setLoading(true);
    const result = await updateUserById(user.id, { ...user, ...data });
    if (result.success) {
      setSuccess('Usuario actualizado correctamente');
    } else {
      setError(result.error || 'Error al actualizar');
    }
    setLoading(false);
  };

  const renderUserModal = (isEdit = false) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={closeModals}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <button
            onClick={closeModals}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={isEdit ? handleUpdateUser : handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Ingresa el nombre completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña {isEdit && '(dejar vacío para mantener actual)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Mínimo 6 caracteres"
                required={!isEdit}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Confirma la contraseña"
              required={!isEdit || formData.password}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {formData.role === 'user' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha final
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Avatar URL opcional
            </label>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="https://ejemplo.com/avatar.jpg"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModals}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Procesando...' : (isEdit ? 'Actualizar' : 'Crear Usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <AdminLayout currentPage="users">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestión de Usuarios
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Administra los usuarios del sistema
            </p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={async () => {
                console.log("Forzando actualización manual...");
                await fetchUsers();
                alert("Petición enviada. Revisa la consola (F12) para ver si aparecen los usuarios.");
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Refrescar Datos
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Usuario
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <p className="text-green-600 dark:text-green-400">{success}</p>
              <button
                onClick={() => setSuccess('')}
                className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notifications Bar */}
        <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6">
          <div>
            <h3 className="text-purple-800 dark:text-purple-300 font-semibold">Comunicación Directa</h3>
            <p className="text-xs text-purple-600 dark:text-purple-400">Envía alertas a todos los usuarios del sistema</p>
          </div>
          <button
            onClick={() => {
              setNotificationTarget('all');
              setShowNotifyModal(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Bell className="w-4 h-4" /> Enviar Global
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos los roles</option>
                <option value="admin">Administradores</option>
                <option value="user">Usuarios</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedRows.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between animate-fade-in">
            <span className="text-blue-800 dark:text-blue-300 font-medium">
              {selectedRows.length} usuario(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkToggleStatus}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cambiar Estado
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usuarios ({filteredUsers.length})
            </h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || filterRole !== 'all' ? 'No se encontraron usuarios con los filtros aplicados' : 'No hay usuarios registrados'}
              </p>
              {!searchTerm && filterRole === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear primer usuario
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 w-10 text-left">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                        onChange={handleSelectAll}
                        checked={currentUsers.length > 0 && selectedRows.length === currentUsers.length}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aprobación
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                          checked={selectedRows.includes(user.id)}
                          onChange={() => handleSelectRow(user.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name || 'Sin nombre'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          !user.isApproved
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {!user.isApproved ? 'Pendiente' : 'Aprobado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Editar usuario"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`p-1 rounded-md ${
                                  user.status === 'inactive'
                                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                    : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                }`}
                                title={user.status === 'inactive' ? 'Activar usuario' : 'Desactivar usuario'}
                              >
                                {user.status === 'inactive' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                              </button>
                              {!user.isApproved && (
                                <button
                                  onClick={() => handleUpdateUserQuick(user, { isApproved: true })}
                                  className="p-1 rounded-md text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  title="Aprobar usuario"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleExpelUser(user)}
                                className="p-1 rounded-md text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                title="Expulsar sesión"
                              >
                                <LogOut className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setNotificationTarget(user.id);
                                  setShowNotifyModal(true);
                                }}
                                className="p-1 rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                title="Enviar notificación"
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && renderUserModal()}
      {showEditModal && renderUserModal(true)}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={closeModals}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Eliminación
              </h3>
              <button
                onClick={closeModals}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    ¿Estás seguro de que quieres eliminar este usuario?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              
              {selectedUser && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedUser.name || 'Sin nombre'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.email}
                  </p>
                  
                  {/* Aprobación */}
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <input
                      id="isApproved"
                      type="checkbox"
                      checked={formData.isApproved}
                      onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isApproved" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Usuario Aprobado (Permitir acceso al sistema)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envío de Notificaciones */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {notificationTarget === 'all' ? 'Notificación Global' : 'Notificar a Usuario'}
              </h3>
              <button onClick={() => setShowNotifyModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input 
                  type="text" 
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Ej: Mantenimiento del sistema"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
                <textarea 
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24"
                  placeholder="Escribe el mensaje aquí..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
                <select 
                  value={notificationData.type}
                  onChange={(e) => setNotificationData({...notificationData, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="info">Información (Azul)</option>
                  <option value="success">Éxito (Verde)</option>
                  <option value="warning">Advertencia (Amarillo)</option>
                  <option value="error">Crítico (Rojo)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    const finalNotification = { ...notificationData, origin: 'Administración' };
                    if (notificationTarget === 'all') {
                      broadcastNotification(finalNotification);
                    } else {
                      addNotification(notificationTarget, finalNotification);
                    }
                    setShowNotifyModal(false);
                    setNotificationData({ title: '', message: '', type: 'info' });
                    setSuccess('Notificación enviada correctamente');
                  }}
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-200 dark:shadow-none"
                >
                  Enviar Ahora
                </button>
                <button 
                  onClick={() => setShowNotifyModal(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
