import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BRANDING } from '../../constants/branding';
import { supabase } from '../../lib/supabase';
import ParticlesBackground from '../../components/ui/ParticlesBackground';
import TechVisualizer from '../../components/ui/TechVisualizer';

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

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      
      if (urlError) {
        setError(urlError);
        if (urlError.toLowerCase().includes('token') || urlError.toLowerCase().includes('sesion') || urlError.toLowerCase().includes('expirada')) {
          localStorage.clear();
          sessionStorage.clear();
        }
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (err) {}

    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=magiclink'))) {
      setIsProcessingMagicLink(true);
    }
  }, []);

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
    } catch (err) {}
  }, [isAuthenticated, isAdmin, profile, user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin/login`
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Error al conectar con Google');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!email || !email.includes('@')) throw new Error('Ingresa un email válido');
      const result = await loginWithOtp(email);
      if (!result.success) throw new Error(result.error || 'Error al enviar el código');
      
      setSuccess('Enlace enviado. Revisa tu bandeja de entrada (y spam).');
      setStep('magiclink');
    } catch (err) {
      setError(err.message || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center relative overflow-hidden pointer-events-auto">
      <div className="flex w-full h-screen">
        
        {/* Lado Izquierdo: Formulario de Login */}
        <div className="w-full lg:w-5/12 flex flex-col justify-center items-center p-8 md:p-16 z-20 bg-[#02040a]/90 backdrop-blur-xl border-r border-white/5 relative">
          
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="mb-12 text-center lg:text-left">
              <div className="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-2xl overflow-hidden">
                <img 
                  src={BRANDING.logo} 
                  alt={BRANDING.name} 
                  className="h-12 w-auto object-contain dark:brightness-0 dark:invert"
                />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">
                Bienvenido al Panel
              </h1>
              <p className="text-slate-400 font-medium">
                Ingresa para gestionar <span className="text-blue-500 font-black">Inteligencia Artificial</span>
              </p>
            </div>

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
              </div>
            ) : step === 'email' ? (
              <div className="space-y-6">
                
                {/* Botón de Google */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white hover:bg-gray-100 text-gray-900 rounded-2xl font-bold transition-all shadow-lg active:scale-95 group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest">O usa tu correo</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                {/* Formulario de Email */}
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                      Email Corporativo
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors group-focus-within:text-blue-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        className="w-full bg-[#0a0f1c]/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                        placeholder="tucorreo@ejemplo.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative group rounded-2xl border-2 border-indigo-500/50 hover:border-blue-500/80 transition-colors duration-300 overflow-hidden mt-4 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 group-hover:from-blue-600/20 group-hover:to-indigo-600/20 transition-colors duration-300" />
                      <div className="relative flex items-center justify-center py-4 font-black text-white tracking-widest uppercase text-sm transition-colors duration-300">
                        {loading ? <div className="premium-spinner !w-5 !h-5 !border-2" /> : 'Enviarme Magic Link'}
                      </div>
                    </button>
                  </form>
              </div>
            ) : (
              <div className="space-y-6 text-center animate-in slide-in-from-right-4 duration-500">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Revisa tu correo</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Hemos enviado un <strong className="text-white">enlace mágico</strong> a <br/>
                  <span className="text-blue-400 font-medium">{email}</span>
                </p>
                <div className="pt-6 mt-6 border-t border-white/5">
                  <button onClick={() => { setStep('email'); setError(''); setSuccess(''); }} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                     Usar otro correo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Visual Espectacular */}
        <div className="hidden lg:flex w-7/12 relative bg-[#02040a] flex-col justify-between p-12 overflow-hidden items-center">
          
          {/* Partículas de Fondo */}
          <ParticlesBackground />

          {/* Gradientes Decorativos */}
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

          {/* Contenido Visual Interactivo */}
          <div className="relative z-10 w-full max-w-lg mt-auto mb-auto">
            <TechVisualizer />
          </div>

          <div className="relative z-10 w-full text-center">
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
              Plataforma Segura • {new Date().getFullYear()}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
