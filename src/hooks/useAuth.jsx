import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); 
  const [notifications, setNotifications] = useState([]);

  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin' || user?.email === 'admin@admin.com';

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

  const syncUserSession = useCallback(async (session) => {
    try {
      if (!session) {
        setUser(null);
        setProfile(null);
        setLoading(false);
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
        console.warn('[AUTH] Profile not found or error, using default role:', profileError.message);
        setProfile({ id: currentUser.id, email: currentUser.email, role: 'user' });
      } else {
        // 1. Determinar estados de acceso
        const isApproved = profileData.is_approved === true;
        const status = profileData.status || 'pending';
        const userIsAdmin = profileData.role === 'admin' || currentUser.email === 'admin@admin.com';
        const isExpired = profileData.end_date ? new Date(profileData.end_date) < new Date() : false;

        console.log('[AUTH] Access Check:', { userIsAdmin, status, isApproved, isExpired });

        // 2. Validación de acceso
        if (!userIsAdmin && (status !== 'active' || !isApproved || isExpired)) {
          let reason = 'Tu cuenta no tiene acceso permitido.';
          if (status === 'pending' || !isApproved) reason = 'Tu cuenta está pendiente de aprobación por un administrador.';
          if (status === 'rejected') reason = 'Tu solicitud fue denegada.';
          if (status === 'inactive') reason = 'Tu cuenta ha sido desactivada.';
          if (isExpired) reason = 'Tu suscripción ha expirado.';

          console.warn(`[AUTH] Acceso denegado para ${currentUser.email}: ${reason}`);
          
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          window.location.href = `/login?error=${encodeURIComponent(reason)}`;
          return;
        }

        setProfile(profileData);
      }

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
        setLoading(false);
      }, 6000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await syncUserSession(session);
      } catch (err) {
        console.error('[AUTH] Initial session fetch error:', err);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Evitar sincronizar si es un evento de SIGN_UP y ya somos admin (previene cerrar sesión al admin)
      if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED' || _event === 'INITIAL_SESSION') {
        syncUserSession(session);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [syncUserSession]);

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

  const register = async (email, password, metadata = {}) => {
    try {
      // Usar un cliente temporal sin persistencia para no cerrar la sesión del admin actual
      const { createClient } = await import('@supabase/supabase-js');
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });

      if (error) throw error;
      
      // Intentar crear el perfil manualmente para asegurar que exista inmediatamente
      if (data.user) {
        await supabase.from('profiles').insert([{
          id: data.user.id,
          email: email,
          name: metadata.name || '',
          role: metadata.role || 'user',
          status: 'pending',
          is_approved: false
        }]);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
    if (data.status === 'active' && data.is_approved === true) {
      if (!targetUser?.start_date || !targetUser?.end_date) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        finalData.start_date = startDate.toISOString();
        finalData.end_date = endDate.toISOString();
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

  const markNotificationAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const broadcastNotification = (notif) => {
    // Nota: Esto es local por ahora, requiere tabla 'global_notifications' para persistencia real
    setNotifications(prev => [...prev, { 
      ...notif, 
      id: Date.now(), 
      timestamp: new Date().toISOString(), 
      read: false,
      isBroadcast: true
    }]);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { success: !error, error: error?.message || 'Error al cambiar contraseña' };
  };

  const suggestAgent = (data) => {
    console.warn('[AUTH] suggestAgent: Tabla de sugerencias no configurada en Supabase.');
    return { success: false, error: 'Funcionalidad de sugerencias en mantenimiento (Tabla no configurada)' };
  };

  const expelUser = async (id) => {
    return updateUserById(id, { status: 'inactive', is_approved: false });
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
    fetchUsers
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
