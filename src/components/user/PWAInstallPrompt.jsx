import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Detectar si la app ya está instalada (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isStandalone) {
      return; // No mostrar si ya es una app instalada
    }

    const handleBeforeInstallPrompt = (e) => {
      // Evitar que el navegador muestre su propio aviso por defecto
      e.preventDefault();
      // Guardar el evento para dispararlo luego
      setDeferredPrompt(e);
      // Mostrar nuestro aviso personalizado después de 5 segundos de navegación
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt nativo del navegador
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó la instalación');
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 z-[3000] animate-in slide-in-from-bottom-10 duration-700">
      <div className="glass-card p-6 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/5 blur-[40px] -mr-16 -mt-16 rounded-full" />
        
        <div className="relative flex items-start gap-4">
          <div className="p-3 bg-neon-teal/10 rounded-2xl text-neon-teal neon-glow flex-shrink-0">
            <Smartphone className="w-6 h-6 md:hidden" />
            <Monitor className="w-6 h-6 hidden md:block" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-black text-white uppercase tracking-tight italic">
              Instalar Panel de Agentes
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 leading-relaxed">
              Accede más rápido desde tu pantalla de inicio y mejora tu productividad.
            </p>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-neon-teal text-deep-dark py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-teal/20"
              >
                Instalar Ahora
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="px-4 py-2 bg-white/5 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Luego
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="absolute -top-2 -right-2 p-2 text-gray-600 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
