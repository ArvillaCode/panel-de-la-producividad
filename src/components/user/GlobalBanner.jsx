import React, { useState, useEffect, useRef } from 'react';
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
  const [imageError, setImageError] = useState(false);
  const loadSequenceRef = useRef(0);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (!isAuthenticated || !profile?.id || isAdmin || isAdminRoute) {
      setBanner(null);
      setIsVisible(false);
      return;
    }

    let cancelled = false;
    let preloadImage = null;

    const prepareBanner = async (data, sequence) => {
      if (cancelled || sequence !== loadSequenceRef.current) return;
      if (!data?.image_url) {
        setBanner(null);
        setIsVisible(false);
        return;
      }

      const version = data.display_version || data.activated_at || data.created_at || 1;
      const shownKey = `banner_shown_${data.id}_${version}`;
      if (localStorage.getItem(shownKey) === 'true') {
        setBanner(null);
        setIsVisible(false);
        return;
      }

      setImageError(false);
      setIsVisible(false);
      preloadImage = new Image();
      preloadImage.decoding = 'async';
      preloadImage.src = data.image_url;

      try {
        if (typeof preloadImage.decode === 'function') {
          await preloadImage.decode();
        } else {
          await new Promise((resolve, reject) => {
            preloadImage.onload = resolve;
            preloadImage.onerror = reject;
          });
        }
      } catch (error) {
        if (!cancelled && sequence === loadSequenceRef.current) {
          console.error('[BANNER] Error al precargar la imagen:', data.image_url, error);
          setImageError(true);
          setBanner(null);
        }
        return;
      }

      if (cancelled || sequence !== loadSequenceRef.current) return;
      setBanner({ ...data, shownKey });
      setIsVisible(true);
      localStorage.setItem(shownKey, 'true');
    };

    const getBanner = async () => {
      const sequence = ++loadSequenceRef.current;
      let result = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('activated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Compatibilidad durante el despliegue previo a la migracion de banners.
      if (result.error?.code === '42703' || result.error?.message?.includes('activated_at')) {
        result = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      if (cancelled || sequence !== loadSequenceRef.current) return;
      if (result.error) {
        console.error('[BANNER] Error consultando banner activo:', result.error);
        return;
      }
      await prepareBanner(result.data, sequence);
    };

    getBanner();

    const channel = supabase
      .channel(`global-banner-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'banners'
      }, getBanner)
      .subscribe();

    window.addEventListener('focus', getBanner);

    return () => {
      cancelled = true;
      loadSequenceRef.current += 1;
      if (preloadImage) preloadImage.src = '';
      window.removeEventListener('focus', getBanner);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, isAdmin, isAdminRoute, profile?.id]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isAuthenticated || !isVisible || !banner || imageError) return null;

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-black/85 sm:backdrop-blur-sm animate-in fade-in duration-300 motion-reduce:animate-none pointer-events-auto"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Promocion"
    >
      <div 
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0b0c10] shadow-2xl border border-white/10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out motion-reduce:animate-none"
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
               localStorage.removeItem(banner.shownKey);
               setImageError(true);
               setIsVisible(false);
             }}
          />
          
          {/* Close Button */}
          <button 
           onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors z-10 border border-white/10"
            aria-label="Cerrar promocion"
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
