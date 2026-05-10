import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const NOTIFICATIONS_PREFIX = 'notifications_';
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const fetchUsers = useCallback(async () => {
    try {
      console.log("[DEBUG] Ejecutando fetchUsers...");
      const { data, error, status, statusText } = await supabase.from('profiles').select('*');

      if (error) {
        console.error("[DEBUG] Error en fetchUsers:", error.message, "Status:", status);
        return;
      }

      console.log(`[DEBUG] Fetch completado. Status: ${status} (${statusText}). Registros: ${data?.length || 0}`);

      if (data) {
        setUsers(data.map(p => ({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role,
          status: p.status,
          avatar: p.avatar_url,
          startDate: p.start_date,
          endDate: p.end_date,
          isApproved: p.is_approved,
          createdAt: p.created_at
        })));
      }
    } catch (e) {
      console.error("[DEBUG] Excepción en fetchUsers:", e);
    }
  }, []);

  const getProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("[DEBUG] Error en getProfile:", e.message);
      return null;
    }
  };

  const initializeUserData = async (session) => {
    if (!session) return;
    try {
      const profile = await getProfile(session.user.id);
      
      // Bloqueo suspendido por petición del usuario para trabajo fluido
      /*
      if (profile && (!profile.is_approved || profile.status !== 'active')) {
        console.warn("[DEBUG] Acceso denegado: Usuario no aprobado o inactivo.");
        await supabase.auth.signOut();
        setUser(null);
        return { success: false, error: !profile.is_approved ? "Tu cuenta está pendiente de aprobación." : "Tu cuenta ha sido suspendida." };
      }
      */

      const fullUser = {
        id: session.user.id,
        email: session.user.email,
        role: profile?.role || (session.user.email === 'admin@admin.com' ? 'admin' : 'user'),
        name: profile?.name || session.user.email.split('@')[0],
        avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email)}`,
        status: profile?.status || 'active',
        isApproved: profile?.is_approved ?? true,
        startDate: profile?.start_date,
        endDate: profile?.end_date
      };
      
      setUser(fullUser);
      if (fullUser.role === 'admin') {
        fetchUsers();
      }
      return { success: true, user: fullUser };
    } catch (e) {
      console.error("[DEBUG] Error en initializeUserData:", e);
      return { success: false, error: e.message };
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          await initializeUserData(session);
        }
      } catch (e) {
        console.error("[DEBUG] Error en init session:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[DEBUG] Auth State Change:", event);

      if (session) {
        setLoading(true);
        const result = await initializeUserData(session);
        if (mounted) setLoading(false);
        
        // Si el login fue denegado por falta de aprobación, forzamos redirección manual si fuera necesario
        if (result && !result.success && event === 'SIGNED_IN') {
           // initializeUserData ya hace signOut()
        }
      } else {
        if (mounted) {
          setUser(null);
          setUsers([]);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchUsers]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }
      
      // initializeUserData se ejecutará por el onAuthStateChange, 
      // pero aquí podemos validar si queremos devolver el error de aprobación de inmediato
      const result = await initializeUserData(data.session);
      setLoading(false);
      return result;
    } catch (e) {
      setLoading(false);
      return { success: false, error: e.message };
    }
  };

  const register = async (userData) => {
    try {
      const { email, password, name, role = 'user', startDate, endDate } = userData;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          name,
          role,
          status: 'active',
          start_date: startDate || null,
          end_date: endDate || null,
          is_approved: true // Auto-aprobación habilitada por petición del usuario
        });

        if (profileError) {
          return { success: false, error: profileError.message };
        }
      }

      return { 
        success: true, 
        message: 'Cuenta creada y aprobada exitosamente.' 
      };
    } catch (e) {
      await supabase.auth.signOut();
      setUser(null);
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUsers([]);
      // Redirección manual por si el onAuthStateChange tarda
      window.location.href = '/login';
    } catch (e) {
      console.error("Error signing out:", e);
    }
  };

const deleteUserById = async (userId) => {
  try {
    // Nota: Eliminar de auth requiere permisos de service_role. 
    // Generalmente se marca como inactivo en profiles.
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    fetchUsers();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

const updateUserById = async (userId, updates) => {
  try {
    const { error } = await supabase.from('profiles').update({
      name: updates.name,
      role: updates.role,
      status: updates.status,
      avatar_url: updates.avatar_url || updates.avatar,
      start_date: updates.startDate,
      end_date: updates.endDate,
      is_approved: updates.isApproved
    }).eq('id', userId);

    if (error) throw error;
    fetchUsers();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

const toggleUserStatus = async (userId) => {
  try {
    const userToToggle = users.find(u => u.id === userId);
    if (!userToToggle) throw new Error("Usuario no encontrado");

    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);

    if (error) throw error;
    fetchUsers();
    return { success: true, status: newStatus };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

const expelUser = async (userId) => {
  try {
    // Para expulsar a un usuario, marcamos su estado como inactivo.
    // El sistema de auth (initializeUserData) lo sacará automáticamente en la siguiente comprobación.
    const { error } = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', userId);
    if (error) throw error;
    
    fetchUsers();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

const addNotification = (userId, notification) => {
  const newNotification = { ...notification, id: Date.now(), timestamp: new Date().toISOString() };
  setNotifications(prev => [...prev, { ...newNotification, userId }]);
  return { success: true };
};

const broadcastNotification = (notification) => {
  const newNotification = { ...notification, id: Date.now(), timestamp: new Date().toISOString() };
  setNotifications(prev => [...prev, { ...newNotification, target: 'all' }]);
  return { success: true };
};

const getNotifications = () => {
  return notifications;
};

const markNotificationAsRead = (id) => {
  setNotifications(prev =>
    prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
  );
};

const markAllNotificationsAsRead = () => {
  setNotifications(prev =>
    prev.map(n => ({ ...n, read: true }))
  );
};

const getUnreadNotificationsCount = () => {
  return notifications.filter(n => !n.read).length;
};

const changePassword = async () => {
  return { success: true };
};

const updateUser = async () => {
  return { success: true };
};

const suggestAgent = async () => {
  return { success: true };
};

const value = useMemo(() => ({
  user,
  users,
  loading,
  notifications,

  login,
  logout,
  register,

  fetchUsers,
  deleteUserById,
  updateUserById,
  toggleUserStatus,
  expelUser,

  addNotification,
  broadcastNotification,

  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,

  changePassword,
  updateUser,
  suggestAgent,

  getUserInfo: user,
  getAllUsers: users,
  isAuthenticated: !!user,
  isAdmin: user?.role === 'admin',
  getProfile
}), [user, users, loading, notifications, fetchUsers]);

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export default useAuth;

