import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from 'react-router-dom';

const isValidHttpsUrl = (url) => {
  if (!url) return false;
  try { return new URL(url).protocol === 'https:'; }
  catch { return false; }
};

const GlobalBanner = () => {
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const [banner, setBanner] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [imageError, setImageError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Si no está autenticado, es admin o está en rutas de administración, no mostrar
    if (!isAuthenticated || isAdmin || profile?.role === 'admin' || location.pathname.startsWith('/admin')) {
      return;
    }

    let timer;

    const getBanner = async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const bannerShownKey = `banner_shown_${data.id}`;
        if (localStorage.getItem(bannerShownKey) === 'true') {
          return; // Ya se mostró en este dispositivo
        }

        setBanner(data);
        // Timer de 3 segundos para mostrar
        timer = setTimeout(() => {
          setIsVisible(true);
          setHasShown(true);
          localStorage.setItem(bannerShownKey, 'true');
        }, 3000);
      }
    };

    if (!hasShown) {
      getBanner();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated, hasShown, isAdmin, profile, location.pathname]);

  const handleClose = () => {
    setIsVisible(false);
  };

  // REGLA DE ORO: Si no hay banner, no debe ser visible o hay un error de imagen, NO RENDERIZAR NADA.
  // Esto evita que el div "fixed inset-0" bloquee los clics.
  if (!isAuthenticated || !isVisible || !banner || imageError) return null;

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500 pointer-events-auto"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-4xl glass-card overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-white/10 animate-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Content */}
        <div className="relative group aspect-[2/1] sm:aspect-[2.5/1]">
          <img 
            src={banner.image_url} 
            alt="Promoción Especial" 
            className="w-full h-full object-cover"
            onError={() => {
              console.error('[BANNER] Error al cargar la imagen promocional:', banner.image_url);
              setImageError(true);
            }}
          />
          
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all z-10 border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Action Overlay (if link exists and is valid https) */}
          {isValidHttpsUrl(banner.link_url) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
              <a 
                href={banner.link_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-fit px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl flex items-center gap-3 hover:scale-105 transition-all shadow-2xl"
              >
                Aprovechar Ahora
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Mobile Tap Indicator */}
          {isValidHttpsUrl(banner.link_url) && (
            <a 
              href={banner.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="md:hidden absolute inset-0 z-0"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalBanner;
