import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Mail,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  Check,
  Loader2 as Loader
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { BRANDING } from '../../constants/branding';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    loginWithOtp,
    verifyOtpCode,
    profile,
    isAdmin,
    isAuthenticated,
    user,
    loading: authLoading
  } = useAuth();

  const [step, setStep] = useState('email'); // 'email' o 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Manejar errores de URL una sola vez al montar y limpiar tokens corruptos si aplica
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      
      if (urlError) {
        setError(urlError);
        if (urlError.toLowerCase().includes('token') || urlError.toLowerCase().includes('sesion') || urlError.toLowerCase().includes('expirada')) {
          console.warn('[AUTH-LOGIN] Detectado error de sesión en URL. Purgando caché local defensivamente...');
          localStorage.clear();
          sessionStorage.clear();
        }
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (err) {
      console.error('[AUTH-LOGIN] Error en montaje inicial de verificación defensiva:', err);
    }

    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=magiclink'))) {
      setIsProcessingMagicLink(true);
    }
  }, []);

  // 2. Redireccionar si ya está autenticado
  useEffect(() => {
    try {
      if (isAuthenticated && !authLoading && profile) {
        const userRole = profile?.role;
        const isUserAdmin = isAdmin || userRole === 'admin' || userRole === 'core_admin';
        
        if (isUserAdmin) {
          navigate('/admin/dashboard', { replace: true });
        } else if (!profile.is_approved) {
          navigate('/dashboard/espera-aprobacion', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      console.error('[AUTH-LOGIN] Error en redireccionamiento de sesión:', err);
    }
  }, [isAuthenticated, isAdmin, profile, user, authLoading, navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!email || !email.includes('@')) {
        throw new Error('Ingresa un email válido');
      }

      console.log('[DEBUG] Solicitando OTP para:', email);
      const result = await loginWithOtp(email);

      if (!result.success) {
        throw new Error(result.error || 'Error al enviar el código de verificación');
      }

      setSuccess('Enlace enviado. Revisa tu bandeja de entrada (y spam) y haz clic en el Magic Link.');
      setStep('magiclink');
    } catch (err) {
      console.error('[DEBUG] Error en envío OTP:', err);
      setError(err.message || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!otp || otp.length !== 6) {
        throw new Error('El código debe tener 6 dígitos');
      }

      console.log('[DEBUG] Verificando OTP para:', email);
      const result = await verifyOtpCode(email, otp);

      if (!result.success) {
        throw new Error(result.error || 'Código incorrecto o expirado');
      }

      setSuccess('¡Verificación exitosa! Entrando al sistema...');
      // La redirección la hace el useEffect cuando profile/isAdmin estén sincronizados
    } catch (err) {
      console.error('[DEBUG] Error en verificación OTP:', err);
      setError(err.message || 'Error al verificar el código');
      setLoading(false);
    }
  };

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

          {isProcessingMagicLink ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="premium-spinner !w-12 !h-12 !border-4"></div>
              <h2 className="text-xl font-bold text-white tracking-wide animate-pulse">Verificando acceso seguro...</h2>
              <p className="text-sm text-slate-400">Por favor, espera mientras confirmamos tu sesión.</p>
            </div>
          ) : step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                  Email Corporativo
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all duration-300 placeholder:text-slate-600"
                    placeholder="tucorreo@ejemplo.com"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-500 ml-1 mt-2">No necesitas contraseña. Te enviaremos un código seguro de 6 dígitos.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 group-hover:scale-110 pointer-events-none" />
                <div className="relative flex items-center justify-center py-4 rounded-2xl font-black text-white tracking-widest uppercase text-sm shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]">
                  {loading ? <div className="premium-spinner !w-5 !h-5 !border-2" /> : 'Recibir Enlace'}
                </div>
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center animate-in slide-in-from-right-4 duration-500">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Revisa tu correo</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                Hemos enviado un <strong className="text-white">enlace mágico</strong> a <br/>
                <span className="text-blue-400 font-medium">{email}</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Haz clic en el enlace del correo para iniciar sesión automáticamente.
              </p>
              
              <div className="pt-6 mt-6 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => {
                    setStep('email');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                >
                   Usar otro correo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
