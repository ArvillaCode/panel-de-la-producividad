import React, { useState, useEffect, useCallback } from 'react';
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
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import Draggable from 'react-draggable';

const AdminUsers = () => {
  const { 
    user, 
    profile, 
    loading: authLoading,
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

  // Guard de carga defensivo
  if (authLoading) {
    return (
      <AdminLayout currentPage="users">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-neon-teal/20 border-t-neon-teal animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizando base de datos...</p>
        </div>
      </AdminLayout>
    );
  }

  // Estados para notificaciones
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState('all'); 
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'info' });

  // Paginación y Filtrado Server-side
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTermInput, setSearchTermInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ password: '', confirm: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para Registro de Pago Manual (CFO V1)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    currency: 'USD',
    method: 'wire_transfer',
    description: '',
    paidAt: new Date().toISOString().substring(0, 16)
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    avatar: '',
    plan: 'annual',
    is_legacy_fallback: false,
    force_dates: false
  });

  const [showPassword, setShowPassword] = useState(false);
  
  // Acciones Masivas
  const [selectedRows, setSelectedRows] = useState([]);

  const headerCheckboxRef = React.useRef(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchTermInput);
      setCurrentPage(1);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTermInput]);

  const fetchUsersLocal = useCallback(async () => {
    setIsLoadingUsers(true);
    setError('');
    try {
      let query = supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at, timezone, plan, is_legacy_fallback', { count: 'exact' });

      // Apply search filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Apply role filters
      if (filterRole !== 'all') {
        if (filterRole === 'recent') {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          query = query.gt('created_at', dayAgo);
        } else {
          query = query.eq('role', filterRole);
        }
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error: fetchErr } = await query;

      if (fetchErr) {
        // Fallback para base de datos sin columnas de plan o is_legacy_fallback
        if (fetchErr.code === '42703' || fetchErr.message?.includes('plan') || fetchErr.message?.includes('is_legacy_fallback')) {
          console.warn('[ADMIN_USERS] Fallback columns query...');
          let fallbackQuery = supabase
            .from('profiles')
            .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at, timezone', { count: 'exact' });

          if (searchTerm) {
            fallbackQuery = fallbackQuery.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
          }
          if (filterRole !== 'all') {
            if (filterRole === 'recent') {
              const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              fallbackQuery = fallbackQuery.gt('created_at', dayAgo);
            } else {
              fallbackQuery = fallbackQuery.eq('role', filterRole);
            }
          }
          fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).range(from, to);
          
          const { data: fallbackData, count: fallbackCount, error: fallbackErr } = await fallbackQuery;
          if (fallbackErr) throw fallbackErr;

          const enriched = (fallbackData || []).map(u => ({
            ...u,
            plan: 'annual',
            is_legacy_fallback: false
          }));
          setUsers(enriched);
          setTotalUsers(fallbackCount || 0);
        } else {
          throw fetchErr;
        }
      } else {
        setUsers(data || []);
        setTotalUsers(count || 0);
      }
    } catch (err) {
      console.error('[ADMIN_USERS] Error fetching users server-side:', err);
      setError('Error al cargar usuarios de la base de datos');
      toast.error('Error al sincronizar usuarios');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [searchTerm, filterRole, currentPage, toast]);

  useEffect(() => {
    fetchUsersLocal();
  }, [fetchUsersLocal]);

  useEffect(() => {
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
  }, [location.search, navigate]);

  // Restablecer página si cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole]);

  // Limpiar selección de filas al cambiar de página, rol/filtro o término de búsqueda
  useEffect(() => {
    setSelectedRows([]);
  }, [currentPage, filterRole, searchTerm]);

  const currentUsers = users;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const isAllSelected = currentUsers.length > 0 && currentUsers.every(u => selectedRows.includes(u.id));
  const isSomeButNotAllSelected = selectedRows.length > 0 && !isAllSelected;

  React.useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeButNotAllSelected;
    }
  }, [isSomeButNotAllSelected]);

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

  // Selección rápida por estado 
  const handleSelectByStatus = (status) => {
    const matchingIds = currentUsers
      .filter(u => status === 'active' ? u.status === 'active' : u.status !== 'active')
      .map(u => u.id);

    if (matchingIds.length === 0) {
      toast.error(`No hay usuarios con estado "${status === 'active' ? 'Activo' : 'Offline'}" en la página actual`);
      return;
    }

    const allSelected = matchingIds.every(id => selectedRows.includes(id));

    if (allSelected) {
      setSelectedRows(prev => prev.filter(id => !matchingIds.includes(id)));
      toast.success(`Deseleccionados los usuarios ${status === 'active' ? 'activos' : 'offline'}`);
    } else {
      setSelectedRows(prev => [...new Set([...prev, ...matchingIds])]);
      toast.success(`${matchingIds.length} usuario${matchingIds.length !== 1 ? 's' : ''} ${status === 'active' ? 'activos' : 'offline'} añadidos a la selección`);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      if (!formData.name || !formData.email) {
        throw new Error('El nombre y el email son obligatorios');
      }

      // Generar una contraseña fuerte y aleatoria automáticamente ya que se accede por Magic Link / OTP.
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
      let randomPassword = '';
      randomPassword += 'A'; // Asegurar una mayúscula
      randomPassword += 'a'; // Asegurar una minúscula
      randomPassword += '1'; // Asegurar un número
      randomPassword += '!'; // Asegurar un carácter especial
      for (let i = 0; i < 16; i++) {
        randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const finalPassword = randomPassword.split('').sort(() => 0.5 - Math.random()).join('');

      const result = await adminCreateUser(formData.email, finalPassword, {
        name: formData.name,
        role: formData.role,
        avatar_url: formData.avatar,
        plan: formData.plan,
        is_legacy_fallback: formData.is_legacy_fallback
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
        avatar_url: formData.avatar,
        plan: formData.plan,
        is_legacy_fallback: formData.is_legacy_fallback,
        force_dates: formData.force_dates
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
      toast.error(result.error || 'Error al eliminar usuario');
      setShowDeleteModal(false);
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
      avatar: u.avatar_url || '',
      plan: u.plan || 'annual',
      is_legacy_fallback: u.is_legacy_fallback || false,
      force_dates: false
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
      avatar: '',
      plan: 'annual',
      is_legacy_fallback: false,
      force_dates: false
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
    setShowManualPaymentModal(false);
    setResetPasswordData({ password: '', confirm: '' });
    resetForm();
  };

  const handleOpenManualPayment = (u) => {
    setSelectedUser(u);
    setPaymentFormData({
      amount: '',
      currency: 'USD',
      method: 'wire_transfer',
      description: `Pago manual registrado para plan ${u.plan ? u.plan.toUpperCase() : 'ANUAL'}`,
      paidAt: new Date().toISOString().substring(0, 16)
    });
    setShowManualPaymentModal(true);
  };

  const handleRegisterManualPayment = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    setError('');

    try {
      const amountInCents = Math.round(parseFloat(paymentFormData.amount) * 100);
      if (isNaN(amountInCents) || amountInCents <= 0) {
        throw new Error('El monto ingresado no es válido. Ingrese un valor mayor a cero.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const currentAdminId = session?.user?.id;

      // 1. Registrar pago en la tabla payments
      const { error: payError } = await supabase.from('payments').insert({
        user_id: selectedUser.id,
        amount: amountInCents,
        currency: paymentFormData.currency.toLowerCase(),
        status: 'succeeded',
        source: 'manual',
        payment_method: paymentFormData.method,
        product_name: `Asignación Manual - Plan ${selectedUser.plan ? selectedUser.plan.toUpperCase() : 'ANUAL'}`,
        plan_type: selectedUser.plan || 'annual',
        description: paymentFormData.description || 'Pago manual registrado por el administrador',
        paid_at: new Date(paymentFormData.paidAt).toISOString(),
        created_by: currentAdminId || user?.id,
        is_estimated: false,
        metadata: {
          registered_by_admin_email: user?.email
        }
      });

      if (payError) throw new Error(payError.message);

      // 2. Si el usuario no está activo, activarlo automáticamente
      if (selectedUser.status !== 'active' || !selectedUser.is_approved) {
        const updateResult = await updateUserById(selectedUser.id, {
          status: 'active',
          is_approved: true,
          plan: selectedUser.plan || 'annual'
        });
        if (!updateResult.success) {
          console.warn('[MANUAL PAYMENT] Pago registrado, pero falló la activación automática del usuario:', updateResult.error);
        }
      }

      toast.success('Pago manual registrado y cuenta activada exitosamente');
      setShowManualPaymentModal(false);
      fetchUsersLocal();
    } catch (err) {
      toast.error(err.message || 'Error al registrar pago manual');
    } finally {
      setActionLoading(false);
    }
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
    if (selectedRows.length === 0) return;
    setActionLoading(true);
    try {
      const results = await Promise.all(
        selectedRows.map(userId => updateUserById(userId, { status: 'active', is_approved: true }))
      );
      const successes = results.filter(r => r && r.success).length;
      if (successes > 0) {
        toast.success(`${successes} usuarios activados exitosamente`);
      }
      if (successes < selectedRows.length) {
        const failures = selectedRows.length - successes;
        toast.error(`Error al activar ${failures} usuarios`);
      }
      setSelectedRows([]);
      fetchUsersLocal();
    } catch (err) {
      toast.error('Error en activación masiva');
      setSelectedRows([]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkExpel = async () => {
    if (selectedRows.length === 0) return;

    // Protección estricta del último administrador
    const { count: adminCount, error: adminCountErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminCountErr) {
      toast.error('Error al verificar privilegios administrativos');
      return;
    }

    const selectedAdmins = selectedRows.filter(id => {
      const u = users.find(user => user.id === id);
      return u && u.role === 'admin';
    });

    if (selectedAdmins.length >= adminCount) {
      toast.error('Operación denegada: No puedes expulsar o desactivar a todos los administradores. Debe quedar al menos un administrador activo en el sistema.');
      setSelectedRows([]);
      return;
    }

    setActionLoading(true);
    try {
      const results = await Promise.all(
        selectedRows.map(userId => expelUser(userId))
      );
      const successes = results.filter(r => r && r.success).length;
      if (successes > 0) {
        toast.success(`${successes} usuarios expulsados exitosamente`);
      }
      if (successes < selectedRows.length) {
        const failures = selectedRows.length - successes;
        toast.error(`Error al expulsar ${failures} usuarios`);
      }
      setSelectedRows([]);
      fetchUsersLocal();
    } catch (err) {
      toast.error('Error en expulsión masiva');
      setSelectedRows([]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    // Protección estricta del último administrador
    const { count: adminCount, error: adminCountErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminCountErr) {
      toast.error('Error al verificar privilegios administrativos');
      return;
    }

    const selectedAdmins = selectedRows.filter(id => {
      const u = users.find(user => user.id === id);
      return u && u.role === 'admin';
    });

    if (selectedAdmins.length >= adminCount) {
      toast.error('Operación denegada: No puedes eliminar a todos los administradores. Debe quedar al menos un administrador activo en el sistema.');
      setSelectedRows([]);
      return;
    }

    setActionLoading(true);
    try {
      const results = await Promise.all(
        selectedRows.map(userId => deleteUserById(userId))
      );
      const successes = results.filter(r => r && r.success).length;
      if (successes > 0) {
        toast.success(`${successes} usuarios eliminados exitosamente`);
      }
      if (successes < selectedRows.length) {
        const failures = selectedRows.length - successes;
        toast.error(`Error al eliminar ${failures} usuarios`);
      }
      setSelectedRows([]);
      fetchUsersLocal();
    } catch (err) {
      toast.error('Error en eliminación masiva');
      setSelectedRows([]);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout currentPage="users">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-neon-teal uppercase tracking-[0.2em]">Resumen Administrativo</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              Gestión activa y auditoría de la comunidad de usuarios
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
                <p className="text-5xl font-black text-white italic tracking-tighter neon-glow">{totalUsers}</p>
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
                        value={searchTermInput}
                        onChange={(e) => setSearchTermInput(e.target.value)}
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
            <Draggable bounds="parent" handle=".drag-handle">
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-bottom-10 duration-500">
                    <div className="pointer-events-auto glass-card flex flex-wrap items-center gap-4 px-6 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/20 backdrop-blur-2xl mx-4 rounded-3xl cursor-default">
                        
                        {/* Drag Handle */}
                        <div className="drag-handle cursor-move p-2 -ml-4 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-center group" title="Arrastrar barra">
                            <div className="flex flex-col gap-1">
                                <div className="w-4 h-0.5 bg-white/20 group-hover:bg-white/50 rounded-full transition-colors"></div>
                                <div className="w-4 h-0.5 bg-white/20 group-hover:bg-white/50 rounded-full transition-colors"></div>
                                <div className="w-4 h-0.5 bg-white/20 group-hover:bg-white/50 rounded-full transition-colors"></div>
                            </div>
                        </div>

                        {/* Contador */}
                        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <div className="w-9 h-9 rounded-xl bg-neon-teal/10 flex items-center justify-center text-neon-teal neon-glow shrink-0">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white uppercase italic tracking-tighter whitespace-nowrap">{selectedRows.length} Seleccionados</p>
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Acciones Masivas</p>
                        </div>
                    </div>

                    {/* Filtros Rápidos por Estado */}
                    <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                        <button
                            onClick={() => handleSelectByStatus('active')}
                            title="Añadir todos los usuarios Activos a la selección"
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                        >
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            Activos
                        </button>
                        <button
                            onClick={() => handleSelectByStatus('inactive')}
                            title="Añadir todos los usuarios Offline/Inactivos a la selección"
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                        >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Offline
                        </button>
                    </div>

                    {/* Acciones Masivas */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleBulkApprove}
                            title="Activar / Aprobar Seleccionados"
                            className="p-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <UserCheck className="w-4 h-4" />
                        </button>
                        
                        <button 
                            onClick={handleBulkExpel}
                            title="Expulsar Seleccionados"
                            className="p-2.5 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <UserMinus className="w-4 h-4" />
                        </button>
                        
                        <button 
                            onClick={() => setShowBulkDeleteModal(true)}
                            title="Eliminar Permanentemente"
                            className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button 
                            onClick={() => setSelectedRows([])}
                            title="Limpiar Selección"
                            className="p-2.5 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white rounded-xl transition-all hover:scale-110 active:scale-95"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            </Draggable>
        )}

        {/* Users Table */}
        <div className="glass-card border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-6 py-4">
                                <input 
                                  type="checkbox" 
                                  ref={headerCheckboxRef}
                                  checked={isAllSelected}
                                  onChange={handleSelectAll} 
                                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-teal focus:ring-0 focus:ring-offset-0" 
                                />
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
                                    <div className="flex flex-col gap-1.5 items-start">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'}`}>
                                            {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                                u.plan === 'monthly' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                                                u.plan === 'legacy' ? 'bg-gray-500/10 border-gray-500/20 text-gray-400' : 
                                                u.plan === 'trial' ? 'bg-amber-100 border-amber-200 text-amber-800' : 
                                                'bg-neon-teal/10 border-neon-teal/20 text-neon-teal'
                                            }`}>
                                                {u.plan === 'monthly' ? 'Mensual' : u.plan === 'legacy' ? 'Legacy' : u.plan === 'trial' ? 'TRIAL' : 'Anual'}
                                            </span>
                                            {u.is_legacy_fallback && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="Protección de Reversión Legacy Activa"></span>
                                            )}
                                        </div>
                                    </div>
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
                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                        <button onClick={() => handleOpenManualPayment(u)} title="Registrar Pago Manual" className="p-2.5 glass-card border-white/5 text-green-400 hover:bg-green-500 hover:text-deep-dark transition-all rounded-xl">
                                            <DollarSign className="w-4 h-4" />
                                        </button>
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
                <div className="p-6 pb-32 md:pb-10 border-t border-white/10 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2.5 rounded-xl glass-card border-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalPages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                        
                        if (start > 1) {
                            pages.push(
                                <button key={1} onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-xl font-black transition-all glass-card border-white/5 text-gray-500 hover:text-white">1</button>
                            );
                            if (start > 2) pages.push(<span key="start-ellipsis" className="text-gray-600 font-bold px-1">...</span>);
                        }
                        
                        for (let i = start; i <= end; i++) {
                            pages.push(
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`w-10 h-10 rounded-xl font-black transition-all ${currentPage === i ? 'bg-neon-teal text-deep-dark shadow-lg shadow-neon-teal/20' : 'glass-card border-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    {i}
                                </button>
                            );
                        }
                        
                        if (end < totalPages) {
                            if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="text-gray-600 font-bold px-1">...</span>);
                            pages.push(
                                <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-xl font-black transition-all glass-card border-white/5 text-gray-500 hover:text-white">{totalPages}</button>
                            );
                        }
                        
                        return pages;
                    })()}
                    
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2.5 rounded-xl glass-card border-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Modal Notificar */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-lg border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
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
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-lg border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
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
                        <div className="relative">
                          <input required type="email" disabled={showEditModal} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="premium-input w-full disabled:opacity-40 disabled:cursor-not-allowed" placeholder="user@upfunnel.click" />
                          {showEditModal && (
                            <div className="flex items-center gap-2 mt-2 text-amber-400">
                              <Shield className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Campo bloqueado por seguridad de Supabase Auth</span>
                            </div>
                          )}
                        </div>
                    </div>
                    {/* Acceso por Magic Link / OTP: Contraseña autotramitada en el backend */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Nivel de Acceso</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="premium-input w-full appearance-none">
                            <option value="user">USUARIO ESTÁNDAR</option>
                            <option value="admin">ADMINISTRADOR CORE</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Plan de Suscripción</label>
                        <select value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})} className="premium-input w-full appearance-none">
                            <option value="annual">UPFUNNEL PRO ANUAL ($79.99 USD)</option>
                            <option value="monthly">UPFUNNEL PRO MENSUAL ($14.99 USD)</option>
                            <option value="legacy">ACCESO BÁSICO ANTIGUO (LEGACY)</option>
                            <option value="trial">PRUEBA GRATIS (7 DÍAS)</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 mt-4">
                        <input
                          type="checkbox"
                          id="is_legacy_fallback"
                          checked={formData.is_legacy_fallback}
                          onChange={e => setFormData({...formData, is_legacy_fallback: e.target.checked})}
                          className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-teal focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <label htmlFor="is_legacy_fallback" className="cursor-pointer select-none">
                            <p className="text-xs font-black text-white uppercase tracking-wider">Protección de Reversión Legacy</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Si expira, vuelve al plan Legacy en vez de bloquearse</p>
                        </label>
                    </div>

                    {showEditModal && (
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 mt-4">
                            <input
                              type="checkbox"
                              id="force_dates"
                              checked={formData.force_dates || false}
                              onChange={e => setFormData({...formData, force_dates: e.target.checked})}
                              className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-teal focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <label htmlFor="force_dates" className="cursor-pointer select-none">
                                <p className="text-xs font-black text-white uppercase tracking-wider">Reiniciar fechas del plan</p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Forzar el reinicio de la duración de la prueba o suscripción desde hoy</p>
                            </label>
                        </div>
                    )}
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
        <div className="fixed inset-0 z-[120] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-md border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
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
        <div className="fixed inset-0 z-[120] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
            <div className="relative glass-card p-10 w-full max-w-md text-center border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
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
      {/* Modal Confirmación Eliminación Masiva */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[120] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
          <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={() => setShowBulkDeleteModal(false)}></div>
          <div className="relative glass-card p-10 w-full max-w-md text-center border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic mb-4">¿Eliminar {selectedRows.length} usuarios?</h2>
            <p className="text-gray-500 font-bold mb-10 text-sm leading-relaxed uppercase tracking-wider">
              Esta acción eliminará <span className="text-red-500">{selectedRows.length} usuario{selectedRows.length !== 1 ? 's' : ''}</span> de forma permanente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowBulkDeleteModal(false)} className="flex-1 py-4 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Cancelar</button>
              <button
                onClick={async () => { setShowBulkDeleteModal(false); await handleBulkDelete(); }}
                disabled={actionLoading}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                {actionLoading ? 'Eliminando...' : `Eliminar ${selectedRows.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago Manual (CFO V1) */}
      {showManualPaymentModal && selectedUser && (
        <div className="fixed inset-0 z-[120] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
          <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={closeModals}></div>
          <div className="relative glass-card p-10 w-full max-w-md border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-400 rounded-xl neon-glow">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Cobro Manual</h2>
              </div>
              <button onClick={closeModals} className="p-1 text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-6">
              Auditoría contable para: <span className="text-white font-black">{selectedUser.name || selectedUser.email}</span>
            </p>

            <form onSubmit={handleRegisterManualPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Monto Recibido</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="79.99"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    className="premium-input w-full pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Divisa</label>
                  <select
                    value={paymentFormData.currency}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, currency: e.target.value })}
                    className="premium-input w-full appearance-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="MXN">MXN ($)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Método de Pago</label>
                  <select
                    value={paymentFormData.method}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                    className="premium-input w-full appearance-none cursor-pointer"
                  >
                    <option value="wire_transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="paypal">PayPal</option>
                    <option value="mercadopago">MercadoPago</option>
                    <option value="gohighlevel">GHL Link</option>
                    <option value="hotmart">Hotmart</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha del Pago</label>
                <input
                  required
                  type="datetime-local"
                  value={paymentFormData.paidAt}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paidAt: e.target.value })}
                  className="premium-input w-full cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Notas / Descripción</label>
                <textarea
                  placeholder="Detalles de la transferencia, número de referencia o concepto contable..."
                  value={paymentFormData.description}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                  className="premium-input w-full h-20 resize-none text-xs"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModals} className="flex-1 py-3.5 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-3.5 bg-green-500 text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-green-500/20">
                  {actionLoading ? 'PROCESANDO...' : 'REGISTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
