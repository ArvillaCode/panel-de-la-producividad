import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';


const AuthContext = createContext();

const OWN_PROFILE_FIELDS = ['name', 'avatar_url', 'timezone'];
const pickAllowedFields = (data, allowedFields) =>
  Object.fromEntries(Object.entries(data || {}).filter(([key]) => allowedFields.includes(key)));
const withTimeout = (request, message, timeout = 8000) => {
  let timer;
  return Promise.race([
    Promise.resolve(request),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeout);
    })
  ]).finally(() => clearTimeout(timer));
};

// Función centralizada para el cálculo de fechas de suscripción de todos los planes
export const calculatePlanDates = (plan, startDate = new Date()) => {
  const endDate = new Date(startDate);
  
  if (plan === 'legacy') {
    return {
      start_date: startDate.toISOString(),
      end_date: null
    };
  } else if (plan === 'trial') {
    endDate.setDate(endDate.getDate() + 7); // 7 días para trial
  } else if (plan === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1); // 1 mes para mensual
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 año para anual
  }

  return {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString()
  };
};

export const AuthProvider = ({ children }) => {
  // La sesion persistida se valida contra Supabase antes de autorizar rutas.
  // Un perfil cacheado nunca debe conservar acceso tras eliminar una cuenta.
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);
  const [profileLoadError, setProfileLoadError] = useState(null);
  const sessionSyncSequenceRef = useRef(0);
  const activeSessionUserIdRef = useRef(null);

  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'core_admin';
  const isEditor = profile?.role === 'editor' || isAdmin;
  const isSupport = profile?.role === 'support' || isEditor;

  const hasPremiumAccess = useMemo(() => {
    if (!profile) return false;

    const plan = profile.plan?.toLowerCase();
    const isAdmin = profile.role === 'admin' || profile.role === 'core_admin';

    const validPremiumPlan =
      plan === 'annual' ||
      plan === 'monthly' ||
      plan === 'trial';

    const isApproved =
      profile.is_approved === true ||
      profile.status === 'active';

    const isExpired =
      profile.end_date &&
      new Date(profile.end_date) < new Date();

    return isAdmin || (validPremiumPlan && isApproved && !isExpired);
  }, [profile]);

  const logAction = useCallback(async (action, entity, entityId = null, details = {}) => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        entity,
        entity_id: entityId?.toString(),
        details
      }]);
    } catch (e) {
      console.error('[AUDIT] Log error:', e);
    }
  }, [user]);

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

        const savedReadIds = JSON.parse(localStorage.getItem(`read_notifications_${user.id}`) || '[]');

        // Filtrar notificaciones: 
        // 1. Las personales (user_id === user.id) se muestran siempre.
        // 2. Las globales (is_broadcast) solo si se crearon después de que el usuario se registró.
        const userCreatedAt = profile?.created_at || user?.created_at || user?.user_metadata?.created_at;

        const filteredData = (data || []).filter(n => {
          if (n.user_id === user.id) return true;
          if (n.is_broadcast && userCreatedAt) {
            return new Date(n.created_at) > new Date(userCreatedAt);
          }
          return n.is_broadcast; // Fallback si no hay fecha de creación
        });

        const enrichedNotifications = filteredData.map(n => ({
          ...n,
          read: n.read || savedReadIds.includes(n.id)
        }));

        setNotifications(enrichedNotifications);
      }
    } catch (err) {
      console.error('[AUTH] Fetch notifications error:', err);
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at, timezone, plan, is_legacy_fallback')
        .order('created_at', { ascending: false });

      if (!error) {
        setUsers(data || []);
      } else if (error.code === '42703' || error.message?.includes('plan') || error.message?.includes('is_legacy_fallback')) {
        // Fallback seguro si la base de datos no tiene las columnas del plan aún
        console.warn('[AUTH] La base de datos no tiene las columnas plan/is_legacy_fallback. Ejecutando consulta de compatibilidad...');
        const { data: legacyData, error: legacyError } = await supabase
          .from('profiles')
          .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at, timezone')
          .order('created_at', { ascending: false });

        if (!legacyError) {
          const enriched = (legacyData || []).map(u => ({
            ...u,
            plan: 'annual', // valor por defecto
            is_legacy_fallback: false // valor por defecto
          }));
          setUsers(enriched);
        } else {
          console.error('[AUTH] Error al consultar perfiles con fallback:', legacyError.message);
        }
      } else {
        console.error('[AUTH] Error al consultar perfiles:', error.message);
      }
    } catch (err) {
      console.error('[AUTH] Fetch users exception:', err);
    }
  }, []);

  const fetchSystemConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_public_system_config');

      if (!error) {
        const publicConfig = Array.isArray(data) ? data[0] : data;

        if (publicConfig) {
          setSystemConfig({
            maxLoginAttempts: publicConfig.max_login_attempts,
            passwordMinLength: publicConfig.password_min_length,
            requireStrongPassword: publicConfig.require_strong_password,
            showAcademia: publicConfig.show_academia !== false,
            aiAssistantEnabled: publicConfig.ai_assistant_enabled !== false
          });
        } else {
          setSystemConfig({
            maxLoginAttempts: 5,
            passwordMinLength: 8,
            requireStrongPassword: true,
            showAcademia: true,
            aiAssistantEnabled: true
          });
        }
      } else {
        console.warn('[AUTH] Public system config unavailable:', error.message);
      }
    } catch (err) {
      console.error('[AUTH] Fetch system config error:', err);
    }
  }, []);

  const syncUserSession = useCallback(async (session) => {
    const syncSequence = ++sessionSyncSequenceRef.current;
    const isStaleSync = () => syncSequence !== sessionSyncSequenceRef.current;

    try {
      if (!session) {
        activeSessionUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setUsers([]);
        setNotifications([]);
        setProfileLoadError(null);
        setLoading(false);
        return;
      }

      const currentUser = session.user;
      if (activeSessionUserIdRef.current !== currentUser.id) {
        activeSessionUserIdRef.current = currentUser.id;
        setLoading(true);
        setProfile(null);
        setUsers([]);
        setNotifications([]);
        setSystemConfig(null);
        setProfileLoadError(null);
      }
      setUser(currentUser);

      // 2. Realizar la petición de red a Supabase para revalidar los datos
      const fetchProfilePromise = async () => {
        try {
          const fetchPromise = supabase
            .from('profiles')
            .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at, timezone, plan, is_legacy_fallback')
            .eq('id', currentUser.id)
            .single();

          const result = await withTimeout(fetchPromise, 'Profile fetch timeout');
          if (isStaleSync()) return;
          let profileData = result.data;
          let profileError = result.error;

          // Fallback seguro si faltan las columnas de plan en base de datos
          if (profileError && (profileError.code === '42703' || profileError.message?.includes('plan') || profileError.message?.includes('is_legacy_fallback'))) {
            console.warn('[AUTH] Perfil falló por columnas inexistentes. Reintentando consulta de compatibilidad...');
            const compatResult = await withTimeout(
              supabase
                .from('profiles')
                .select('id, email, name, role, avatar_url, status, is_approved, start_date, end_date, created_at, timezone')
                .eq('id', currentUser.id)
                .single(),
              'Profile compatibility fetch timeout'
            );

            if (isStaleSync()) return;

            if (!compatResult.error && compatResult.data) {
              profileData = {
                ...compatResult.data,
                plan: 'annual',
                is_legacy_fallback: false
              };
              profileError = null;
            }
          }

          if (profileError || !profileData) {
            const isNotFoundError = profileError && (
              profileError.code === 'PGRST116' ||
              profileError.message?.includes('PGRST116')
            );

            if (isNotFoundError) {
              console.warn('[AUTH] El perfil ya no existe. Revocando la sesion local.');
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.startsWith('cached_profile_')) {
                  localStorage.removeItem(key);
                }
              });
              setProfile(null);
              setUser(null);
              setProfileLoadError(null);
              activeSessionUserIdRef.current = null;
              setLoading(false);
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?error=CuentaEliminada';
              }
              return;
            }

            // Verificar si es un error de autenticación
            const isAuthError = profileError && (
              profileError.status === 401 ||
              profileError.message?.toLowerCase().includes('jwt') ||
              profileError.message?.toLowerCase().includes('unauthorized') ||
              profileError.message?.toLowerCase().includes('invalid token') ||
              profileError.message?.toLowerCase().includes('signature')
            );

            if (isAuthError) {
              console.warn('[AUTH] Detectado token de sesión inválido o expirado. Cerrando sesión...');
              // Limpiar solo keys de Supabase, no todo localStorage (evita perder preferencias)
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.startsWith('cached_profile_')) {
                  localStorage.removeItem(key);
                }
              });
              sessionStorage.clear();
              await supabase.auth.signOut();
              activeSessionUserIdRef.current = null;
              setUser(null);
              setProfile(null);
              setLoading(false);
              window.location.href = '/login?error=SesionExpirada';
              return;
            }

            console.error('[AUTH] No se pudo validar el perfil:', profileError);
            setProfile(null);
            setProfileLoadError('No pudimos validar tu acceso con el servidor. Reintenta en unos segundos.');
            return;
          }

          // Validación de acceso
          let status = profileData.status || 'pending';
          const userIsAdmin = profileData.role === 'admin' || profileData.role === 'core_admin';
          let isExpired = profileData.end_date ? new Date(profileData.end_date) < new Date() : false;
          
          // Reversión automática incondicional a Plan Legacy si expira y tiene fallback activo
          if (isExpired && profileData.is_legacy_fallback && !userIsAdmin) {
            try {
              console.log(`[AUTH] [LEGACY-REVERSION] Expiró plan de ${currentUser.email}. Revirtiendo a plan legacy de forma automática.`);
              
              const { error: legacyError } = await withTimeout(
                supabase.rpc('apply_legacy_fallback'),
                'Legacy fallback timeout'
              );
              if (legacyError) throw legacyError;
              
              // Modificar datos locales para evitar bloqueos visuales en sesión actual
              profileData.plan = 'legacy';
              profileData.end_date = null;
              profileData.status = 'active';
              status = 'active';
              isExpired = false;
            } catch (err) {
              console.error('[AUTH] Error crítico en flujo de reversión legacy:', err);
            }
          }

          if (!userIsAdmin && (status === 'rejected' || status === 'inactive' || isExpired)) {
            let reason = 'Tu cuenta no tiene acceso permitido.';
            if (status === 'rejected') reason = 'Tu solicitud de acceso fue denegada.';
            if (status === 'inactive') reason = 'Tu cuenta ha sido desactivada temporalmente.';
            if (isExpired) reason = 'Tu suscripción ha expirado. Contacta a soporte para renovar.';

            console.warn(`[AUTH] Acceso denegado a ${currentUser.email}: ${reason}`);
            activeSessionUserIdRef.current = null;
            setProfile(null);
            setUser(null);
            await supabase.auth.signOut();
            window.location.href = `/login?error=${encodeURIComponent(reason)}`;
            return;
          }

          // Guardar en caché y actualizar estado si ha cambiado
          localStorage.setItem(`cached_profile_${currentUser.id}`, JSON.stringify(profileData));
          setProfileLoadError(null);
          setProfile(profileData);

          if (userIsAdmin) {
            fetchUsers();
          }

        } catch (err) {
          if (isStaleSync()) return;
          console.warn('[AUTH] Error en revalidación de perfil en segundo plano:', err.message);
          setProfile(null);
          setProfileLoadError('La validacion de tu sesion tardo demasiado o fallo. Comprueba tu conexion y reintenta.');
        } finally {
          if (!isStaleSync()) setLoading(false);
        }
      };

      await fetchProfilePromise();

    } catch (e) {
      if (isStaleSync()) return;
      console.error('[AUTH] Critical sync error:', e);
      setLoading(false);
    }
  }, [fetchUsers]);

  // Mantener una referencia mutable y actualizada de syncUserSession para evitar bucles de re-suscripción
  const syncUserSessionRef = useRef(syncUserSession);
  useEffect(() => {
    syncUserSessionRef.current = syncUserSession;
  }, [syncUserSession]);

  // 1. Cargar configuración inicial (SOLO UNA VEZ)
  useEffect(() => {
    if (!user) return;

    fetchSystemConfig();
  }, [fetchSystemConfig, user?.id]);

  // 2. Inicializar autenticación y listener (SOLO UNA VEZ al montar)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          'Initial session fetch timeout'
        );
        
        if (error) {
          console.warn('[AUTH] Error en sesión inicial:', error.message);
          
          // Si el refresh token es inválido o no existe, limpiamos localstorage de tokens corruptos
          if (error.message?.includes('Refresh Token') || error.status === 400 || error.message?.includes('invalid_grant')) {
            console.warn('[AUTH] Detectado token corrupto/expirado, limpiando sesión...');
            // Limpiar keys específicas de supabase auth de localStorage
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            });
            await supabase.auth.signOut();
            
            // Redirigir al login si no estamos ya en él
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login?error=SesionExpirada';
            }
          }
          setLoading(false);
          return;
        }

        if (session) {
          await syncUserSessionRef.current(session);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[AUTH] Critical initial session fetch error:', err);
        setProfileLoadError('No pudimos validar tu sesion con el servidor. Reintenta en unos segundos.');
        setLoading(false);
      }
    };

    initializeAuth();

    let authSyncTimer;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH] Evento auth: ${event}`);
      clearTimeout(authSyncTimer);

      if (event === 'SIGNED_OUT' || !session) {
        sessionSyncSequenceRef.current += 1;
        activeSessionUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setUsers([]);
        setNotifications([]);
        setProfileLoadError(null);
        setLoading(false);
        return;
      }

      // Evita ejecutar consultas de Supabase dentro del callback de auth.
      authSyncTimer = setTimeout(() => {
        syncUserSessionRef.current(session).catch((err) => {
          console.error('[AUTH] Excepción crítica capturada en onAuthStateChange:', err);
          setProfileLoadError('No pudimos validar tu acceso con el servidor. Reintenta en unos segundos.');
          setLoading(false);
        });
      }, 0);
    });

    return () => {
      clearTimeout(authSyncTimer);
      if (subscription) subscription.unsubscribe();
    };
  }, []); // Array de dependencias vacío para registrar el listener EXACTAMENTE UNA VEZ

  // Detectar revocaciones mientras la aplicacion permanece abierta. El gate RLS
  // bloquea los datos inmediatamente; esta revalidacion tambien expulsa la UI.
  useEffect(() => {
    if (!user) return;

    let checking = false;
    const revalidateAccess = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          'Session revalidation timeout'
        );
        await syncUserSessionRef.current(session);
      } catch (err) {
        console.warn('[AUTH] No se pudo revalidar la sesion:', err.message);
        setProfileLoadError('No pudimos revalidar tu acceso con el servidor. Reintenta en unos segundos.');
      } finally {
        checking = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidateAccess();
    };

    window.addEventListener('focus', revalidateAccess);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const accessInterval = setInterval(revalidateAccess, 30000);

    return () => {
      window.removeEventListener('focus', revalidateAccess);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(accessInterval);
    };
  }, [user?.id]);

  // 3. Intervalo de notificaciones (separado)
  useEffect(() => {
    if (!user) return;

    fetchNotifications(); // Carga inicial
    const notifInterval = setInterval(() => {
      // Solo refrescar si no estamos en el dashboard admin para no causar parpadeos
      if (!window.location.pathname.includes('/admin')) {
        fetchNotifications();
      }
    }, 60000); // Aumentado a 1 minuto para mayor estabilidad

    return () => clearInterval(notifInterval);
  }, [user, fetchNotifications]);

  const loginWithOtp = async (email) => {
    console.log(`[AUTH] Solicitando Magic Link para: ${email}`);

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Solo permite login de usuarios ya registrados
        emailRedirectTo: window.location.origin + '/login'
      }
    });
    return { success: !error, error: error?.message };
  };

  const verifyOtpCode = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'magiclink' });
    return { success: !error, error: error?.message, data };
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { success: !error, error: error?.message };
  };

  const logout = async () => {
    if (user) {
      localStorage.removeItem(`cached_profile_${user.id}`);
    }
    await supabase.auth.signOut();
    activeSessionUserIdRef.current = null;
    setUser(null);
    setProfile(null);
    setProfileLoadError(null);
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
          error: 'Seguridad insuficiente: La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un carácter especial.'
        };
      }
    }

    return { valid: true };
  };

  const register = async (email, password, metadata = {}) => {
    const validation = validatePassword(password);
    if (!validation.valid) return { success: false, error: validation.error };
    const safeMetadata = pickAllowedFields(metadata, ['name', 'avatar_url', 'timezone']);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: safeMetadata }
    });
    return { success: !error, error: error?.message };
  };

  const updateUser = async (data) => {
    if (!user) return { success: false, error: 'Sesión no activa' };
    const safeData = pickAllowedFields(data, OWN_PROFILE_FIELDS);
    if (Object.keys(safeData).length === 0) return { success: false, error: 'No hay campos editables para actualizar' };

    const { error } = await supabase.from('profiles').update(safeData).eq('id', user.id);
    if (!error) {
      setProfile(prev => {
        const next = { ...prev, ...safeData };
        try {
          localStorage.setItem(`cached_profile_${user.id}`, JSON.stringify(next));
        } catch (e) {
          console.error('[AUTH] Error guardando perfil actualizado en caché:', e);
        }
        return next;
      });
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

    const activePlan = finalData.plan || targetUser?.plan || 'annual';
    const planChanged = finalData.plan && finalData.plan !== targetUser?.plan;

    // Si se está activando al usuario o cambió su plan
    if (data.status === 'active' || data.is_approved === true || planChanged) {
      if (data.status !== 'inactive' && data.status !== 'rejected') {
        finalData.status = 'active';
        finalData.is_approved = true;
      }

      // Si no tiene fechas, cambió el plan o se forzan las fechas
      if (!targetUser?.start_date || !targetUser?.end_date || planChanged || data.force_dates) {
        const dates = calculatePlanDates(activePlan);
        finalData.start_date = dates.start_date;
        finalData.end_date = dates.end_date;
        console.log(`[AUTH] Asignando fechas (${activePlan}) para ${id}: ${finalData.start_date} a ${finalData.end_date}`);
      }
    }

    const { force_dates, ...rpcPatch } = finalData;
    const { error } = await supabase.rpc('admin_update_profile', {
      target_user_id: id,
      profile_patch: rpcPatch
    });
    if (!error) {
      fetchUsers();
      // Si el usuario editado es el actual usuario logueado, actualizamos su perfil local y su caché
      if (id === user?.id) {
        setProfile(prev => {
          const next = { ...prev, ...finalData };
          try {
            localStorage.setItem(`cached_profile_${user.id}`, JSON.stringify(next));
          } catch (e) {
            console.error('[AUTH] Error guardando perfil actualizado por ID en caché:', e);
          }
          return next;
        });
      }
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

    const { error } = await supabase.rpc('admin_delete_profile', {
      target_user_id: id
    });
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

  const markNotificationAsRead = async (notificationId) => {
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) return;

    // Actualizar estado local inmediatamente
    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);

    // Persistir en localStorage por seguridad extra
    const savedReadIds = JSON.parse(localStorage.getItem(`read_notifications_${user.id}`) || '[]');
    if (!savedReadIds.includes(notificationId)) {
      savedReadIds.push(notificationId);
      localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(savedReadIds));
    }

    if (!notif.is_broadcast) {
      // Si es personal, actualizamos en la base de datos
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('[AUTH] Error marking notification as read:', error);
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
          is_broadcast: true,
          origin: notif.origin || 'Sistema'
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
          is_broadcast: false,
          origin: notif.origin || 'Sistema'
        }]);
    } catch (e) {
      console.error('[AUTH] Send notification error:', e);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const validation = validatePassword(newPassword);
    if (!validation.valid) return { success: false, error: validation.error };

    // Verificar la contraseña actual antes de permitir el cambio
    if (user?.email) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (reauthError) {
        return { success: false, error: 'La contraseña actual no es correcta' };
      }
    }

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
      const safeMetadata = pickAllowedFields(metadata, OWN_PROFILE_FIELDS);

      // Creamos un cliente de Supabase temporal aislado sin persistencia de sesión
      // para evitar que reescriba el localStorage del administrador activo.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      const { data, error } = await tempSupabase.auth.signUp({
        email,
        password,
        options: { data: safeMetadata }
      });

      if (error) throw error;

      // Actualizar el perfil recién creado en Supabase con los privilegios seleccionados
      if (data.user?.id) {
        // Esperamos un brevísimo momento para asegurar que el trigger de DB handle_new_user_profile() haya terminado
        await new Promise(resolve => setTimeout(resolve, 600));

        await updateUserById(data.user.id, {
          role: metadata.role || 'user',
          plan: metadata.plan || 'annual',
          is_legacy_fallback: metadata.is_legacy_fallback || false,
          status: 'active',
          is_approved: true,
          force_dates: true // Forzar asignación de fechas iniciales válidas según el plan
        });
      }

      // Actualizar lista de usuarios para ver al nuevo
      setTimeout(() => fetchUsers(), 1500);

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const expelUser = async (id) => {
    return updateUserById(id, { status: 'inactive', is_approved: false });
  };

  const resetUserPassword = async (userId, newPassword) => {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const { error } = await supabase.rpc('reset_user_password', {
        target_user_id: userId,
        new_password: newPassword
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
    hasPremiumAccess,
    notifications,
    systemConfig,
    profileLoadError,
    login,
    loginWithOtp,
    verifyOtpCode,
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
    resetUserPassword,
    logAction
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
