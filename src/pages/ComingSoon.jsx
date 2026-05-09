import React from 'react';
import { Bell, MessageCircle, Sparkles, Zap } from 'lucide-react';

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-[#020203] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
        {/* Logo/Icon Area */}
        <div className="mb-10 relative">
          <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative bg-black/40 border border-white/10 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
            <Zap className="w-14 h-14 text-blue-400 fill-blue-400/20 animate-pulse" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-300 text-sm font-medium mb-8 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Lanzamiento v2.5 próximamente
        </div>

        {/* Main Headline with Shimmer Effect */}
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
            Página en construcción
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-400 font-medium mb-12 max-w-2xl leading-relaxed">
          Estamos diseñando la próxima evolución de tu <span className="text-white font-bold">productividad</span>. Falta muy poco para el gran lanzamiento.
        </p>

        {/* Community Call to Action Card */}
        <div className="w-full bg-gradient-to-b from-white/10 to-transparent border border-white/10 p-10 rounded-[40px] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative group">
          <div className="absolute inset-0 bg-blue-500/5 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Únete a nuestra comunidad</h2>
          <p className="text-gray-400 mb-10 text-lg">
            No te quedes fuera. Sé parte del grupo exclusivo y recibe las últimas novedades antes que nadie.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button 
              onClick={() => window.open('https://chat.whatsapp.com/GaH7I3tUJtiHYAP8nvSEfh', '_blank')}
              className="group/btn flex items-center justify-center gap-3 bg-[#25D366] text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-[#128C7E] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-green-500/20"
            >
              <MessageCircle className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
              Unirse a WhatsApp
            </button>
            
            <button 
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Bell className="w-6 h-6 animate-push-bell" />
              Notificarme
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
            <span className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase">upfunel.click • Online</span>
          </div>
        </div>
      </div>

      {/* Subtle Star Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>
    </div>
  );
};

export default ComingSoon;
