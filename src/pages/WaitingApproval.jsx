import React from 'react';
import { ShieldCheck, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const WaitingApproval = () => {
  const { logout, profile, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />

      <div className="max-w-xl w-full text-center space-y-12 relative z-10">
        {/* Animated Icon Container */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-ping" />
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-full border border-white/10 shadow-2xl">
              <ShieldCheck className="w-16 h-16 text-blue-400 animate-in zoom-in duration-700" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
            ACCESO EN <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">REVISIÓN</span>
          </h1>
          
          <div className="space-y-4">
            <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed px-4">
              Tu acceso al <span className="text-white font-bold tracking-wide">Panel de Agentes</span> está en revisión. 
            </p>
            <p className="text-gray-500 text-base md:text-lg bg-white/5 border border-white/5 p-6 rounded-3xl backdrop-blur-md italic">
              "Gabriel validará tu cuenta manualmente para habilitar tus herramientas de automatización."
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-colors group">
            <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Estado</h3>
            <p className="text-white font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Pendiente de Aprobación
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-colors group">
            <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Usuario</h3>
            <p className="text-white font-semibold truncate">
              {profile?.email || user?.email}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => window.open('https://wa.me/message/YOUR_WHATSAPP_LINK', '_blank')}
            className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Contactar a Gabriel
          </button>
          
          <button 
            onClick={logout}
            className="w-full sm:w-auto px-8 py-4 bg-transparent text-gray-400 font-bold rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>

        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.3em] pt-12">
          ArVilla Digital &copy; 2026 • Premium Ecosystem
        </p>
      </div>
    </div>
  );
};

export default WaitingApproval;
