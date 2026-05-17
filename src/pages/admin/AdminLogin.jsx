import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Check,
  Loader2 as Loader
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import RegisterForm from '../../components/RegisterForm';
import { BRANDING } from '../../constants/branding';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    logout,
    profile,
    isAdmin,
    isAuthenticated,
    loading: authLoading
  } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Redireccionar si ya está autenticado y manejar errores de URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlError = params.get('error');
    if (urlError) {
      setError(urlError);
      // Limpiar el parámetro de la URL sin recargar
      window.history.replaceState({}, document.title, location.pathname);
    }

    if (isAuthenticated && !authLoading && profile) {
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else if (!profile.is_approved) {
        navigate('/dashboard/espera-aprobacion', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, profile, authLoading, navigate, location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Email y contraseña son obligatorios');
      }

      console.log('[DEBUG] Intentando iniciar sesión con:', formData.email);

      const result = await login(formData.email, formData.password);

      console.log('[DEBUG] Resultado login:', result);

      if (!result.success) {
        throw new Error(result.error || 'Credenciales incorrectas');
      }

      // Recordar usuario
      if (rememberMe) {
        localStorage.setItem(
          'loginCredentials',
          JSON.stringify({
            email: formData.email,
            rememberMe: true
          })
        );
      } else {
        localStorage.removeItem('loginCredentials');
      }

      setSuccess('Inicio de sesión exitoso');
      // La redirección la hace el useEffect cuando profile/isAdmin estén sincronizados

    } catch (err) {
      console.error('[DEBUG] Error en login form:', err);

      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4 relative overflow-hidden pointer-events-auto">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-6 shadow-2xl shadow-blue-500/10">
              <Shield className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
              Crear Cuenta
            </h2>
            <p className="text-slate-400 font-medium">
              Únete a la matriz de productividad <span className="text-blue-500 font-black">AI</span>
            </p>
          </div>

          <div className="bg-[#0f172a]/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] p-10 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <RegisterForm
              onSuccess={() => setIsRegistering(false)}
              onCancel={() => setIsRegistering(false)}
            />

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <button
                onClick={() => setIsRegistering(false)}
                className="text-slate-400 hover:text-white text-sm font-bold transition-all duration-300"
              >
                ¿Ya tienes cuenta? <span className="text-blue-500 underline underline-offset-4">Inicia sesión aquí</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4 relative overflow-hidden pointer-events-auto">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-white/10 border border-white/20 mb-6 shadow-2xl shadow-white/5 overflow-hidden">
            <img 
              src={BRANDING.logo} 
              alt={BRANDING.name} 
              className="h-20 md:h-24 w-auto object-contain dark:brightness-0 dark:invert"
            />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Iniciar Sesión
          </h1>
          <p className="text-slate-400 font-medium">
            Panel de Productividad <span className="text-blue-500 font-black">AI</span>
          </p>
        </div>

        <div className="bg-[#0f172a]/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] p-10 border border-white/10 relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm flex items-start animate-in slide-in-from-top-2">
              <AlertTriangle className="w-4 h-4 mr-3 mt-0.5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-sm flex items-center animate-in slide-in-from-top-2">
              <CheckCircle className="w-4 h-4 mr-3" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                Email Corporativo
              </label>
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all duration-300 placeholder:text-slate-600"
                  placeholder="admin@ejemplo.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all duration-300 placeholder:text-slate-600"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center group cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 bg-slate-900 border border-white/10 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all duration-300" />
                  <Check className="absolute top-0.5 left-0.5 w-4 h-4 text-white scale-0 peer-checked:scale-100 transition-transform duration-300" />
                </div>
                <span className="ml-3 text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Recordarme</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 group-hover:scale-110 pointer-events-none" />
              <div className="relative flex items-center justify-center py-4 rounded-2xl font-black text-white tracking-widest uppercase text-sm shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]">
                {loading ? <div className="premium-spinner !w-5 !h-5 !border-2" /> : 'Acceder al Sistema'}
              </div>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <button
              onClick={() => setIsRegistering(true)}
              className="group text-slate-400 hover:text-white text-sm font-bold transition-all duration-300"
            >
              ¿Eres nuevo? <span className="text-blue-500 group-hover:underline underline-offset-4 decoration-2">Crea tu cuenta aquí</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;