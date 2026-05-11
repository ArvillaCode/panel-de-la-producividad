import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Cliente especial para que el admin cree usuarios sin perder su sesión
const tempAuthClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);

  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin' || user?.email === 'admin@admin.com';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},is_broadcast.eq.true`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error) {
        // Cargar IDs de notificaciones leídas desde localStorage para las de difusión (broadcast)
        // Esto evita que "se desmarquen" al recargar, ya que el registro en DB es compartido
        const readBroadcastIds = JSON.parse(localStorage.getItem(`read_notifications_${user.id}`) || '[]');
        
        const enhancedNotifications = (data || []).map(notif => ({
          ...notif,
          // Si es difusión, usamos el estado local. Si es personal, usamos el de la DB.
          read: notif.is_broadcast ? readBroadcastIds.includes(notif.id) : notif.read
        }));
        
        setNotifications(enhancedNotifications);
      }
    } catch (err) {
      console.error('[AUTH] Fetch notifications error:', err);
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at')
        .order('created_at', { ascending: false });
      
      if (!error) setUsers(data || []);
    } catch (err) {
      console.error('[AUTH] Fetch users error:', err);
    }
  }, []);

  const fetchSystemConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (!error && data) {
        setSystemConfig({
          maxLoginAttempts: data.max_login_attempts,
          passwordMinLength: data.password_min_length,
          requireStrongPassword: data.require_strong_password
        });
      }
    } catch (err) {
      console.error('[AUTH] Fetch system config error:', err);
    }
  }, []);

  const syncUserSession = useCallback(async (session) => {
    try {
      if (!session) {
        setUser(null);
        setProfile(null);
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('[AUTH] Profile sync error:', profileError.message);
        setProfile({ id: currentUser.id, email: currentUser.email, role: 'user' });
      } else {
        // 1. Determinar estados de acceso
        const isApproved = profileData.is_approved === true;
        const status = profileData.status || 'pending';
        const userIsAdmin = profileData.role === 'admin' || currentUser.email === 'admin@admin.com';
        const isExpired = profileData.end_date ? new Date(profileData.end_date) < new Date() : false;

        console.log(`[AUTH] Sync for ${currentUser.email}: Admin=${userIsAdmin}, Approved=${isApproved}, Status=${status}, Expired=${isExpired}`);

        // 2. Validación forzosa de acceso (excepto para admins)
        if (!userIsAdmin && (status !== 'active' || !isApproved || isExpired)) {
          let reason = 'Tu cuenta no tiene acceso permitido.';
          if (status === 'pending') reason = 'Tu cuenta está pendiente de aprobación por un administrador.';
          if (status === 'rejected') reason = 'Tu solicitud fue denegada.';
          if (status === 'inactive') reason = 'Tu cuenta fue expulsada o desactivada.';
          if (isExpired) reason = 'Tu suscripción ha expirado.';

          console.warn(`[AUTH] Acceso denegado: ${reason}`);
          
          // Limpiar estados locales inmediatamente para evitar flashes
          setProfile(null);
          setUser(null);
          setLoading(false); // Detener loading antes de redirigir

          // Cerrar sesión en Supabase
          await supabase.auth.signOut();
          
          // Redirigir con mensaje
          window.location.href = `/login?error=${encodeURIComponent(reason)}`;
          return;
        }

        setProfile(profileData);
      }

      // Cargar lista si es admin
      if (profileData?.role === 'admin' || currentUser.email === 'admin@admin.com') {
        fetchUsers();
      }

    } catch (e) {
      console.error('[AUTH] Critical sync error:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // Failsafe para el estado de carga infinito
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        console.warn('[AUTH] Safety timeout: forzando loading=false para evitar spinner infinito');
        setLoading(false);
      }, 6000); // 6 segundos de margen
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // 1. Cargar configuración inicial (SOLO UNA VEZ)
  useEffect(() => {
    fetchSystemConfig();
  }, [fetchSystemConfig]);

  // 2. Inicializar autenticación y listener (SOLO UNA VEZ)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await syncUserSession(session);
        else setLoading(false);
      } catch (err) {
        console.error('[AUTH] Initial session fetch error:', err);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserSession(session);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [syncUserSession]);

  // 3. Intervalo de notificaciones (separado)
  useEffect(() => {
    if (!user) return;
    
    fetchNotifications(); // Carga inicial
    const notifInterval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(notifInterval);
  }, [user, fetchNotifications]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { success: !error, error: error?.message };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  const validatePassword = (password) => {
    const minLength = systemConfig?.passwordMinLength || 8;
    const requireStrong = systemConfig?.requireStrongPassword ?? true;

    if (password.length < minLength) {
      return { valid: false, error: `La contraseña debe tener al menos ${minLength} caracteres.` };
    }

    if (requireStrong) {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return { 
          valid: false, 
          error: 'La contraseña debe incluir mayúsculas, minúsculas, números y un carácter especial.' 
        };
      }
    }

    return { valid: true };
  };

  const register = async (email, password, metadata = {}) => {
    const validation = validatePassword(password);
    if (!validation.valid) return { success: false, error: validation.error };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    return { success: !error, error: error?.message };
  };

  const updateUser = async (data) => {
    if (!user) return { success: false, error: 'Sesión no activa' };
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
    if (!error) {
      setProfile(prev => ({ ...prev, ...data }));
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  const updateUserById = async (id, data) => {
    // Protección del último administrador (Regla 8)
    const targetUser = users.find(u => u.id === id);
    const adminCount = users.filter(u => u.role === 'admin').length;

    if (targetUser?.role === 'admin' && adminCount <= 1) {
      const isDowngrading = data.role === 'user';
      const isExpelling = data.status === 'inactive' || data.status === 'rejected' || data.is_approved === false;
      
      if (isDowngrading || isExpelling) {
        return { success: false, error: 'No puedes eliminar, expulsar, denegar o degradar al último administrador del sistema.' };
      }
    }

    // Lógica de fechas automáticas al aceptar (Regla 4)
    let finalData = { ...data };
    
    // Si se está activando al usuario
    if (data.status === 'active' || data.is_approved === true) {
      // Si no tiene fechas, asignamos 1 año por defecto desde hoy
      if (!targetUser?.start_date || !targetUser?.end_date || data.force_dates) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        finalData.start_date = startDate.toISOString();
        finalData.end_date = endDate.toISOString();
        console.log(`[AUTH] Asignando fechas automáticas para ${id}: ${finalData.start_date} a ${finalData.end_date}`);
      }
    }

    const { error } = await supabase.from('profiles').update(finalData).eq('id', id);
    if (!error) {
      fetchUsers();
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  const deleteUser = async (id) => {
    // Protección del último administrador
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'No puedes eliminar al último administrador del sistema.' };
      }
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      await fetchUsers();
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  const deleteUserById = deleteUser;

  const toggleUserStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const isApproved = nextStatus === 'active';
    return updateUserById(id, { status: nextStatus, is_approved: isApproved });
  };

  const markNotificationAsRead = async (id) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    // Si es una notificación de difusión, persistimos la lectura localmente
    if (notif.is_broadcast) {
      const storageKey = `read_notifications_${user?.id}`;
      const readBroadcastIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      if (!readBroadcastIds.includes(id)) {
        readBroadcastIds.push(id);
        localStorage.setItem(storageKey, JSON.stringify(readBroadcastIds));
      }
      
      // Actualizar estado local inmediatamente
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } else {
      // Si es personal, actualizamos en la base de datos
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    
    // 1. Marcar personales en DB
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id);
    
    // 2. Marcar difusión en LocalStorage
    const storageKey = `read_notifications_${user.id}`;
    const allBroadcastIds = notifications
      .filter(n => n.is_broadcast)
      .map(n => n.id);
    
    const readBroadcastIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedReadIds = [...new Set([...readBroadcastIds, ...allBroadcastIds])];
    localStorage.setItem(storageKey, JSON.stringify(updatedReadIds));

    // 3. Actualizar estado local
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const broadcastNotification = async (notif) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          is_broadcast: true
        }])
        .select();
      
      if (!error && data) {
        fetchNotifications();
      }
    } catch (e) {
      console.error('[AUTH] Broadcast error:', e);
    }
  };

  const sendUserNotification = async (userId, notif) => {
    try {
      await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          is_broadcast: false
        }]);
    } catch (e) {
      console.error('[AUTH] Send notification error:', e);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const validation = validatePassword(newPassword);
    if (!validation.valid) return { success: false, error: validation.error };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { success: !error, error: error?.message || 'Error al cambiar contraseña' };
  };

  const suggestAgent = async (data) => {
    try {
      const { error } = await supabase
        .from('agent_suggestions')
        .insert([{
          user_id: user.id,
          name: data.name,
          description: data.description,
          status: 'pending'
        }]);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[AUTH] Suggest agent error:', err);
      return { success: false, error: err.message };
    }
  };

  const adminCreateUser = async (email, password, metadata = {}) => {
    try {
      const validation = validatePassword(password);
      if (!validation.valid) return { success: false, error: validation.error };

      // Usar el cliente temporal que NO guarda sesión localmente
      const { data, error } = await tempAuthClient.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      
      if (error) throw error;
      
      // Actualizar lista de usuarios para ver al nuevo (con pequeño delay por trigger de Supabase)
      setTimeout(() => fetchUsers(), 1500);
      
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const expelUser = async (id) => {
    return updateUserById(id, { status: 'inactive', is_approved: false });
  };

  const resetUserPassword = async (userId) => {
    try {
      const { error } = await supabase.rpc('reset_user_password', {
        target_user_id: userId,
        new_password: 'CommonUser.123'
      });
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[AUTH] Reset password error:', err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    profile,
    users,
    loading,
    isAuthenticated,
    isAdmin,
    notifications,
    login,
    logout,
    register,
    updateUser,
    updateUserById,
    deleteUserById,
    toggleUserStatus,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    broadcastNotification,
    changePassword,
    suggestAgent,
    expelUser,
    fetchUsers,
    fetchNotifications,
    adminCreateUser,
    sendUserNotification,
    resetUserPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
