import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Memorizar isAuthenticated e isAdmin para evitar re-renders innecesarios
  const isAuthenticated = useMemo(() => !!user, [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  // Log de diagnóstico detallado cada vez que cambian los estados clave
  useEffect(() => {
    console.log("[AUTH-DIAGNOSTIC]", {
      email: user?.email || 'null',
      role: user?.role || 'null',
      isAuthenticated,
      isAdmin,
      loading
    });
  }, [user, isAuthenticated, isAdmin, loading]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
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
    } catch (e) {
      console.error("[DEBUG] Error fetchUsers:", e.message);
    }
  }, []);

  const syncUserSession = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      return;
    }

    try {
      // 1. Obtener perfil de la base de datos
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error("[DEBUG] Error al cargar perfil:", error.message);
      }

      // 2. Construir objeto de usuario unificado
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
    } catch (e) {
      console.error("[DEBUG] Error en syncUserSession:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          await syncUserSession(session);
        }
      } catch (e) {
        console.error("[DEBUG] Error initAuth:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[DEBUG] Auth Event:", event);
      
      if (mounted) {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUsers([]);
          setLoading(false);
        } else {
          setLoading(true);
          await syncUserSession(session);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserSession]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const register = async (email, password, name, role = 'user', startDate, endDate) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          name,
          role,
          status: 'active',
          start_date: startDate || null,
          end_date: endDate || null,
          is_approved: true
        });
      }

      return { success: true, message: 'Usuario registrado exitosamente.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUsers([]);
      window.location.href = '/login';
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const value = {
    user,
    users,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    fetchUsers,
    getNotifications: () => notifications,
    addNotification: (uId, n) => setNotifications(prev => [...prev, { ...n, id: Date.now(), timestamp: new Date().toISOString() }]),
    markNotificationAsRead: (id) => {},
    markAllNotificationsAsRead: () => {},
    getUnreadNotificationsCount: () => 0,
    updateUser: async () => ({ success: true }),
    changePassword: async () => ({ success: true }),
    suggestAgent: () => {},
    expelUser: async (id) => {
      await supabase.from('profiles').update({ status: 'inactive' }).eq('id', id);
      fetchUsers();
    },
    deleteUserById: async (id) => {
      await supabase.from('profiles').delete().eq('id', id);
      fetchUsers();
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
