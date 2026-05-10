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
        .select('id, email, name, role, avatar_url, status, is_approved, created_at')
        .order('created_at', { ascending: false });
      
      if (!error) setUsers(data || []);
    } catch (err) {
      console.error('[AUTH] Fetch users error:', err);
    }
  }, []);

  const syncUserSession = useCallback(async (session) => {
    try {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url, status, is_approved, created_at')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('[AUTH] Profile sync error:', profileError.message);
        setProfile({ id: currentUser.id, email: currentUser.email, role: 'user' });
      } else {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserSession(session);
    });

    return () => subscription.unsubscribe();
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
    // Protección del último administrador
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.role === 'admin' && data.role === 'user') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'No se puede degradar al último administrador del sistema.' };
      }
    }

    const { error } = await supabase.from('profiles').update(data).eq('id', id);
    if (!error) {
      fetchUsers();
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  const deleteUserById = async (id) => {
    // Protección del último administrador
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'No se puede eliminar al último administrador del sistema.' };
      }
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      fetchUsers();
      return { success: true };
    }
    return { success: false, error: error.message };
  };

  const toggleUserStatus = async (id, currentStatus) => {
    // Protección del último administrador (no desactivar si es el único admin)
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'No se puede desactivar al último administrador del sistema.' };
      }
    }

    console.warn('[AUTH] toggleUserStatus: Columna "status" no existe en Supabase.');
    return { success: false, error: 'Funcionalidad no disponible (Esquema limitado)' };
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
    console.warn('[AUTH] expelUser: Columna "status" no existe en Supabase.');
    return { success: false, error: 'Funcionalidad no disponible (Esquema limitado)' };
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
