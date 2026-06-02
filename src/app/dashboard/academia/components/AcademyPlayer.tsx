import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, RotateCcw, AlertTriangle, Play, CheckCircle } from 'lucide-react';
import { getEmbedUrl, isHttpUrl, looksLikeDirectVideoUrl, Lesson } from '../utils/mediaUtils';
import { academyMediaUrl } from '../../../../lib/academyR2Upload.js';
import { supabase } from '../../../../lib/supabase.js';

interface AcademyPlayerProps {
  activeLesson: Lesson | null;
  videoError: boolean;
  setVideoError: (error: boolean) => void;
  onNavigateBack: () => void;
  activeLessonProgress: { last_watched_seconds: number; max_watched_seconds: number; completed: boolean } | null;
  onProgressUpdate: (prog: { last_watched_seconds: number; max_watched_seconds: number; completed: boolean }) => void;
  nextLesson?: Lesson | null;
}

// Global script loading states
let ytScriptLoading = false;
let ytScriptLoaded = false;

export const AcademyPlayer: React.FC<AcademyPlayerProps> = ({
  activeLesson,
  videoError,
  setVideoError,
  onNavigateBack,
  activeLessonProgress,
  onProgressUpdate,
  nextLesson
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [thumbnailSrc, setThumbnailSrc] = useState<string>('');
  const [triggeredPercentages, setTriggeredPercentages] = useState<number[]>([]);
  
  const playerRef = useRef<any>(null); // YouTube player instance
  const videoRef = useRef<HTMLVideoElement>(null); // HTML5 R2 video instance
  const progressTimerRef = useRef<any>(null); // Periodic sync timer
  const lastSavedTimeRef = useRef<number>(0);

  // 1. Resetear estados al cambiar de lección
  useEffect(() => {
    if (!activeLesson) return;
    setIsPlaying(false);
    setShowOverlay(false);
    setVideoUnavailable(false);
    setTriggeredPercentages([]);
    lastSavedTimeRef.current = 0;

    // Configurar la cascada de miniaturas
    if (activeLesson.youtube_id) {
      setThumbnailSrc(`https://img.youtube.com/vi/${activeLesson.youtube_id}/maxresdefault.jpg`);
    } else {
      setThumbnailSrc(activeLesson.thumb_url || academyMediaUrl(activeLesson.thumbnail_url));
    }
  }, [activeLesson?.id]);

  // 2. Manejador de fallbacks para miniaturas
  const handleThumbnailError = () => {
    if (activeLesson?.youtube_id) {
      if (thumbnailSrc.includes('maxresdefault.jpg')) {
        // Fallback 1: hqdefault (garantizada por YouTube)
        setThumbnailSrc(`https://img.youtube.com/vi/${activeLesson.youtube_id}/hqdefault.jpg`);
      } else if (thumbnailSrc.includes('hqdefault.jpg') && activeLesson.thumbnail_url) {
        // Fallback 2: miniatura subida en la academia
        setThumbnailSrc(academyMediaUrl(activeLesson.thumbnail_url));
      } else {
        // Fallback 3: limpiar y usar fallback de CSS
        setThumbnailSrc('');
      }
    } else {
      setThumbnailSrc('');
    }
  };

  // 3. Logger de Analíticas en Supabase
  const logAnalyticsEvent = async (eventName: string, eventValue?: string) => {
    if (!activeLesson) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('academy_analytics_events')
        .insert([{
          user_id: user.id,
          lesson_id: activeLesson.id,
          event_name: eventName,
          event_value: eventValue || null,
          created_at: new Date().toISOString()
        }]);
    } catch (e) {
      console.error("Error logging analytics event:", e);
    }
  };

  // 4. Guardado de Progreso en la base de datos (UPSERT)
  const saveProgress = async (currentTime: number, duration: number, forceCompleted = false) => {
    if (!activeLesson) return;
    
    const currentSeconds = Math.floor(currentTime);
    const totalDuration = Math.floor(duration || activeLesson.youtube_duration_seconds || 0);
    
    if (currentSeconds === lastSavedTimeRef.current && !forceCompleted) return;
    lastSavedTimeRef.current = currentSeconds;

    const percent = totalDuration > 0 ? (currentSeconds / totalDuration) * 100 : 0;
    
    // Determinar si cumple la condición de completado
    let isCompleted = forceCompleted;
    if (activeLesson.require_completion) {
      if (percent >= (activeLesson.minimum_watch_percent || 90)) {
        isCompleted = true;
      }
    } else if (forceCompleted || percent >= 98) {
      isCompleted = true;
    }

    const previousMax = activeLessonProgress?.max_watched_seconds || 0;
    const newMax = Math.max(previousMax, currentSeconds);
    const finalCompleted = activeLessonProgress?.completed || isCompleted;

    // Actualizar el estado local del padre para sincronía visual
    onProgressUpdate({
      last_watched_seconds: currentSeconds,
      max_watched_seconds: newMax,
      completed: finalCompleted
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('academy_progress')
          .upsert({
            user_id: user.id,
            lesson_id: activeLesson.id,
            last_watched_seconds: currentSeconds,
            max_watched_seconds: newMax,
            completed: finalCompleted,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,lesson_id' });
      }
    } catch (e) {
      console.error("Error updating progress in Supabase:", e);
    }

    // Comprobación y registro de hitos de analítica (25%, 50%, 75%, 100%)
    checkMilestones(percent, currentSeconds);
  };

  // Evaluar hitos de analítica
  const checkMilestones = (percent: number, seconds: number) => {
    const milestones = [25, 50, 75, 100];
    milestones.forEach(m => {
      if (percent >= m && !triggeredPercentages.includes(m)) {
        setTriggeredPercentages(prev => [...prev, m]);
        
        let eventName = '';
        if (m === 25) eventName = 'video_25_percent';
        else if (m === 50) eventName = 'video_50_percent';
        else if (m === 75) eventName = 'video_75_percent';
        else if (m === 100) eventName = 'video_completed';

        logAnalyticsEvent(eventName, `Time: ${seconds}s, Percent: ${Math.floor(percent)}%`);
      }
    });
  };

  // 5. Ciclo de vida y eventos del script de YouTube API
  useEffect(() => {
    if (!activeLesson?.youtube_id || !isPlaying) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      playerRef.current = new window.YT.Player('yt-player-frame', {
        events: {
          onReady: () => {
            logAnalyticsEvent('video_started');
            
            // Si hay un progreso guardado anterior, posicionarlo ahí
            if (activeLessonProgress && activeLessonProgress.last_watched_seconds > 0) {
              playerRef.current.seekTo(activeLessonProgress.last_watched_seconds, true);
            }

            // Iniciar temporizador de sincronización (cada 15 segundos)
            progressTimerRef.current = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const currentTime = playerRef.current.getCurrentTime();
                const duration = playerRef.current.getDuration();
                saveProgress(currentTime, duration);
              }
            }, 15000);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: 0 (ENDED), 1 (PLAYING), 2 (PAUSED)
            const state = event.data;
            if (state === 1) { // PLAYING
              setShowOverlay(false);
              logAnalyticsEvent('video_resumed', `At: ${Math.floor(playerRef.current.getCurrentTime())}s`);
            } else if (state === 2) { // PAUSED
              setShowOverlay(true);
              const currentTime = playerRef.current.getCurrentTime();
              const duration = playerRef.current.getDuration();
              logAnalyticsEvent('video_paused', `At: ${Math.floor(currentTime)}s`);
              saveProgress(currentTime, duration);
            } else if (state === 0) { // ENDED
              setShowOverlay(true);
              const duration = playerRef.current.getDuration();
              saveProgress(duration, duration, true);
            }
          },
          onError: (event: any) => {
            const errorCode = event.data;
            console.error("YouTube Iframe API error code:", errorCode);
            if ([100, 101, 150].includes(errorCode)) {
              setVideoUnavailable(true);
              logAnalyticsEvent('video_missing', `Error Code: ${errorCode}`);
            }
          }
        }
      });
    };

    if (!window.YT) {
      if (!ytScriptLoading) {
        ytScriptLoading = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          ytScriptLoaded = true;
          initPlayer();
        };
      }
    } else {
      initPlayer();
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          saveProgress(currentTime, duration);
        } catch (e) {}
        playerRef.current.destroy();
      }
      playerRef.current = null;
    };
  }, [activeLesson?.id, isPlaying]);

  // 6. Sincronización al descargar la página (Page Unload)
  useEffect(() => {
    const handleUnload = () => {
      if (activeLesson?.youtube_id && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        saveProgress(currentTime, duration);
      } else if (!activeLesson?.youtube_id && videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        saveProgress(currentTime, duration);
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [activeLesson?.id]);

  // 7. Eventos de Reproductor R2 (HTML5 Video)
  const handleR2Play = () => {
    logAnalyticsEvent('video_started');
    
    // Iniciar temporizador de sincronización para R2
    progressTimerRef.current = setInterval(() => {
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 15000);
  };

  const handleR2Pause = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (videoRef.current) {
      logAnalyticsEvent('video_paused', `At: ${Math.floor(videoRef.current.currentTime)}s`);
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleR2Ended = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (videoRef.current) {
      logAnalyticsEvent('video_completed');
      saveProgress(videoRef.current.duration, videoRef.current.duration, true);
    }
  };

  // Reanudar desde el overlay
  const handleResumeFromOverlay = () => {
    if (activeLesson?.youtube_id && playerRef.current && typeof playerRef.current.playVideo === 'function') {
      playerRef.current.playVideo();
      setShowOverlay(false);
    }
  };

  if (!activeLesson) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-400">
          <PlayIcon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Selecciona una lección
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Elige un módulo y una lección del panel lateral para comenzar.
        </p>
        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver a Cursos
        </button>
      </div>
    );
  }

  // Rutas finales
  const finalUrl = activeLesson.video_url || academyMediaUrl(activeLesson.video_path);
  const embedUrl = getEmbedUrl(finalUrl);
  const isExternalVideo = isHttpUrl(activeLesson.video_path || '');
  const shouldFrameExternalUrl = isExternalVideo && !looksLikeDirectVideoUrl(finalUrl) && !activeLesson.youtube_id;

  // Renderizar la visualización de prefetch inteligente del siguiente video (sin cargar iframe)
  const renderPrefetch = () => {
    if (!nextLesson) return null;
    if (nextLesson.youtube_id) {
      return (
        <>
          <link rel="prefetch" href={`https://img.youtube.com/vi/${nextLesson.youtube_id}/maxresdefault.jpg`} />
          <link rel="prefetch" href={`https://img.youtube.com/vi/${nextLesson.youtube_id}/hqdefault.jpg`} />
        </>
      );
    }
    if (nextLesson.thumbnail_url) {
      return (
        <link rel="prefetch" href={academyMediaUrl(nextLesson.thumbnail_url)} />
      );
    }
    return null;
  };

  // Pantalla de error si no hay medios configurados
  if (!finalUrl && !activeLesson.youtube_id) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-[350px] sm:h-[450px] text-center border border-slate-800">
        <span className="text-3xl mb-3">⚠</span>
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Medio sin configurar</h4>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Esta lección no tiene una URL directa, ID de YouTube o la URL de medios de la academia no está configurada.
        </p>
      </div>
    );
  }

  // Pantalla de error para video eliminado o no disponible
  if (videoUnavailable) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-[350px] sm:h-[450px] text-center border border-slate-800">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Contenido no disponible</h4>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Este contenido no está disponible temporalmente. Por favor, contacta al administrador de la academia.
        </p>
      </div>
    );
  }

  // --- RENDERIZACIÓN CASO 1: YOUTUBE EMBED MODULE ---
  if (activeLesson.youtube_id) {
    return (
      <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center border border-slate-200 dark:border-slate-800">
        {renderPrefetch()}
        
        {/* Lazy Loading Click-to-Play Placeholder */}
        {!isPlaying ? (
          <div 
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 cursor-pointer group flex items-center justify-center"
          >
            {thumbnailSrc ? (
              <img 
                src={thumbnailSrc} 
                alt={activeLesson.title} 
                onError={handleThumbnailError}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              // Fallback visual CSS premium si falla la descarga de imágenes
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-6">
                <h4 className="text-sm font-bold text-white mb-1">{activeLesson.title}</h4>
                <p className="text-xs text-slate-500 max-w-xs">{activeLesson.description || 'Lección de la Academia'}</p>
              </div>
            )}
            
            {/* Máscara oscura y botón interactivo */}
            <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/50 transition-colors duration-300" />
            
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-blue-600/90 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform group-hover:scale-110 active:scale-90 group-hover:bg-blue-600 shadow-blue-600/30">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>

            {/* Metadatos en pantalla antes de reproducir */}
            <div className="absolute bottom-4 left-4 right-4 text-left pointer-events-none">
              <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">{activeLesson.youtube_title || activeLesson.title}</h3>
              {activeLesson.youtube_duration_seconds && (
                <span className="inline-block mt-1 text-[10px] sm:text-xs bg-slate-900/80 px-2 py-0.5 rounded text-slate-300 font-bold backdrop-blur-sm">
                  Duración: {Math.floor(activeLesson.youtube_duration_seconds / 60)} min
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Renderizado del Iframe Seguro de YouTube */
          <div className="w-full h-full relative">
            <iframe
              id="yt-player-frame"
              key={activeLesson.id}
              title={activeLesson.title || 'Video de la lección'}
              src={`https://www.youtube.com/embed/${activeLesson.youtube_id}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allowFullScreen
            />

            {/* Custom LMS Overlay (Evita Fuga de Atención al Pausar o Terminar) */}
            {showOverlay && (
              <div 
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-w-md space-y-4">
                  {activeLessonProgress?.completed ? (
                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400">
                      <Play className="w-6 h-6 ml-0.5" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                      {activeLessonProgress?.completed ? 'Clase Completada con Éxito' : 'Clase en Pausa'}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1 leading-tight">{activeLesson.title}</h3>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    {!activeLessonProgress?.completed && (
                      <button
                        onClick={handleResumeFromOverlay}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
                      >
                        Continuar Clase
                      </button>
                    )}
                    {nextLesson && (
                      <button
                        onClick={() => {
                          setShowOverlay(false);
                          setIsPlaying(false);
                          // Navegar a la siguiente clase simulando click en el sidebar
                          const element = document.getElementById(`lesson-link-${nextLesson.id}`);
                          if (element) element.click();
                        }}
                        className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
                      >
                        Siguiente Lección
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- RENDERIZACIÓN CASO 2: EMBEDS EXTERNOS COMPATIBLES (Drive, Vimeo, etc.) ---
  if (embedUrl || shouldFrameExternalUrl) {
    return (
      <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center border border-slate-200 dark:border-slate-800">
        {renderPrefetch()}
        <iframe
          key={activeLesson.id}
          title={activeLesson.title || 'Video de la lección'}
          src={embedUrl || finalUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups"
          allowFullScreen
        />
      </div>
    );
  }

  // --- RENDERIZACIÓN CASO 3: ARCHIVOS LOCALES EN CLOUDFLARE R2 ---
  if (videoError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-[350px] sm:h-[450px] text-center border border-slate-800">
        <span className="text-3xl mb-3">⚠️</span>
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Video no encontrado</h4>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          {isExternalVideo
            ? 'La URL externa no respondió como un video reproducible. Revisa que sea un enlace público directo al archivo.'
            : 'El archivo multimedia aún no se ha subido o no existe en el balde de Cloudflare.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center border border-slate-200 dark:border-slate-800">
      {renderPrefetch()}
      <video
        ref={videoRef}
        key={activeLesson.id}
        src={finalUrl}
        preload="metadata"
        poster={activeLesson.thumb_url || academyMediaUrl(activeLesson.thumbnail_url)}
        controls
        controlsList="nodownload"
        className="w-full h-full object-contain"
        onPlay={handleR2Play}
        onPause={handleR2Pause}
        onEnded={handleR2Ended}
        onError={() => setVideoError(true)}
      />
    </div>
  );
};
