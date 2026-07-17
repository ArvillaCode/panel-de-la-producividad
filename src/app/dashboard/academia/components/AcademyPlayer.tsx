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
  const [isPlayingState, setIsPlayingState] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [thumbnailSrc, setThumbnailSrc] = useState<string>('');
  const [triggeredPercentages, setTriggeredPercentages] = useState<number[]>([]);

  // Custom Controls States
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(70);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const playerRef = useRef<any>(null); // YouTube Player Instance
  const videoRef = useRef<HTMLVideoElement>(null); // R2 Video Element Ref
  const progressTimerRef = useRef<any>(null); // Time tracking interval
  const lastSavedTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null); // Fullscreen container

  // Refs para evitar stale closures en efectos
  // NOTA: usar null en lugar de funciones aun no definidas (evita Temporal Dead Zone)
  const saveProgressRef = useRef<any>(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const activeLessonRef = useRef(activeLesson);
  const activeLessonProgressRef = useRef(activeLessonProgress);
  const setVideoErrorRef = useRef(setVideoError);
  const logAnalyticsEventRef = useRef<any>(null);
  const playerVolumeRef = useRef(playerVolume);
  const playerMutedRef = useRef(playerMuted);
  useEffect(() => { saveProgressRef.current = saveProgress; }, [saveProgress]);
  useEffect(() => { onProgressUpdateRef.current = onProgressUpdate; }, [onProgressUpdate]);
  useEffect(() => { activeLessonRef.current = activeLesson; }, [activeLesson]);
  useEffect(() => { activeLessonProgressRef.current = activeLessonProgress; }, [activeLessonProgress]);
  useEffect(() => { setVideoErrorRef.current = setVideoError; }, [setVideoError]);
  useEffect(() => { logAnalyticsEventRef.current = logAnalyticsEvent; }, [logAnalyticsEvent]);
  useEffect(() => { playerVolumeRef.current = playerVolume; }, [playerVolume]);
  useEffect(() => { playerMutedRef.current = playerMuted; }, [playerMuted]);

  // Helper: Format duration seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Resetear estados al cambiar de lección
  useEffect(() => {
    if (!activeLesson) return;
    setIsPlaying(false);
    setIsPlayingState(false);
    setShowOverlay(false);
    setVideoUnavailable(false);
    setTriggeredPercentages([]);
    setPlayerCurrentTime(0);
    setPlayerDuration(0);
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
        setThumbnailSrc(`https://img.youtube.com/vi/${activeLesson.youtube_id}/hqdefault.jpg`);
      } else if (thumbnailSrc.includes('hqdefault.jpg') && activeLesson.thumbnail_url) {
        setThumbnailSrc(academyMediaUrl(activeLesson.thumbnail_url));
      } else {
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

    checkMilestones(percent, currentSeconds);
  };

  // Respaldo síncrono para beforeunload (sessionStorage es síncrono, navigator.sendBeacon no)
  const saveProgressToSessionStorage = (currentTime: number, duration: number) => {
    if (!activeLessonRef.current?.id) return;
    try {
      const currentSeconds = Math.floor(currentTime);
      const previousMax = activeLessonProgressRef.current?.max_watched_seconds || 0;
      sessionStorage.setItem(`pending_progress_${activeLessonRef.current.id}`, JSON.stringify({
        last_watched_seconds: currentSeconds,
        max_watched_seconds: Math.max(previousMax, currentSeconds),
        duration: Math.floor(duration),
        completed: false,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error saving progress to sessionStorage:', e);
    }
  };

  // Flush pending progress from sessionStorage on mount
  useEffect(() => {
    if (!activeLesson?.id) return;
    const pending = sessionStorage.getItem(`pending_progress_${activeLesson.id}`);
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data.timestamp && Date.now() - data.timestamp < 30000) {
          saveProgress(data.last_watched_seconds, data.duration || 0);
        }
        sessionStorage.removeItem(`pending_progress_${activeLesson.id}`);
      } catch (e) {
        sessionStorage.removeItem(`pending_progress_${activeLesson.id}`);
      }
    }
  }, [activeLesson?.id]);

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
            logAnalyticsEventRef.current('video_started');

            // Forzar play explícito (el autoplay vía URL suele ser bloqueado por navegadores)
            try {
              playerRef.current.playVideo();
            } catch (e) {
              console.warn('YouTube playVideo() en onReady falló:', e);
            }
            
            if (activeLessonProgressRef.current && activeLessonProgressRef.current.last_watched_seconds > 0) {
              playerRef.current.seekTo(activeLessonProgressRef.current.last_watched_seconds, true);
            }

            // Sync volume setting
            playerRef.current.setVolume(playerVolumeRef.current);
            if (playerMutedRef.current) playerRef.current.mute();

            // Limpiar intervalo previo antes de crear uno nuevo
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            // Intervalo de alta frecuencia (250ms) para barra de progreso suave
            progressTimerRef.current = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const currentTime = playerRef.current.getCurrentTime();
                const duration = playerRef.current.getDuration();
                setPlayerCurrentTime(currentTime);
                setPlayerDuration(duration);

                // UPSERT cada 15 segundos
                const currentSec = Math.floor(currentTime);
                if (currentSec !== lastSavedTimeRef.current && currentSec % 15 === 0) {
                  saveProgressRef.current(currentTime, duration);
                }
              }
            }, 250);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === 1) { // PLAYING
              setIsPlayingState(true);
              setShowOverlay(false);
              logAnalyticsEventRef.current('video_resumed', `At: ${Math.floor(playerRef.current.getCurrentTime())}s`);
            } else if (state === 2) { // PAUSED
              setIsPlayingState(false);
              setShowOverlay(true);
              const currentTime = playerRef.current.getCurrentTime();
              const duration = playerRef.current.getDuration();
              logAnalyticsEventRef.current('video_paused', `At: ${Math.floor(currentTime)}s`);
              saveProgressRef.current(currentTime, duration);
            } else if (state === 0) { // ENDED
              setIsPlayingState(false);
              setShowOverlay(true);
              const duration = playerRef.current.getDuration();
              saveProgressRef.current(duration, duration, true);
            }
          },
          onError: (event: any) => {
            const errorCode = event.data;
            if ([100, 101, 150].includes(errorCode)) {
              setVideoUnavailable(true);
              logAnalyticsEventRef.current('video_missing', `Error Code: ${errorCode}`);
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
          saveProgressRef.current(currentTime, duration);
        } catch (e) {}
        playerRef.current.destroy();
      }
      playerRef.current = null;
    };
  }, [activeLesson?.id, isPlaying]);

  // Escucha del estado de Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 6. Sincronización al descargar la página (Page Unload)
  useEffect(() => {
    const handleUnload = () => {
      if (activeLessonRef.current?.youtube_id && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        saveProgressToSessionStorage(currentTime, duration);
      } else if (!activeLessonRef.current?.youtube_id && videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        saveProgressToSessionStorage(currentTime, duration);
      }
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []); // Vacío porque usamos refs para evitar stale closures

  // R2 Video Event Handlers
  const handleR2Play = () => {
    setIsPlayingState(true);
    logAnalyticsEvent('video_started');
    
    // Limpiar intervalo previo para evitar duplicados
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      if (videoRef.current) {
        const current = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        setPlayerCurrentTime(current);
        setPlayerDuration(dur);

        const currentSec = Math.floor(current);
        if (currentSec !== lastSavedTimeRef.current && currentSec % 15 === 0) {
          saveProgress(current, dur);
        }
      }
    }, 250);
  };

  const handleR2Pause = () => {
    setIsPlayingState(false);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (videoRef.current) {
      logAnalyticsEvent('video_paused', `At: ${Math.floor(videoRef.current.currentTime)}s`);
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleR2Ended = () => {
    setIsPlayingState(false);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (videoRef.current) {
      logAnalyticsEvent('video_completed');
      saveProgress(videoRef.current.duration, videoRef.current.duration, true);
    }
  };

  const handleR2LoadedMetadata = () => {
    if (videoRef.current) {
      setPlayerDuration(videoRef.current.duration);
      if (activeLessonProgress && activeLessonProgress.last_watched_seconds > 0) {
        videoRef.current.currentTime = activeLessonProgress.last_watched_seconds;
      }
    }
  };

  // --- CONTROLES CUSTOMIZADOS ACCIONES ---
  const togglePlayPause = () => {
    if (activeLesson?.youtube_id && playerRef.current) {
      if (isPlayingState) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } else if (!activeLesson?.youtube_id && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPlayerCurrentTime(val);
    if (activeLesson?.youtube_id && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(val, true);
    } else if (!activeLesson?.youtube_id && videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setPlayerVolume(vol);
    setPlayerMuted(vol === 0);
    if (activeLesson?.youtube_id && playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(vol);
      if (vol > 0) playerRef.current.unMute();
    } else if (!activeLesson?.youtube_id && videoRef.current) {
      videoRef.current.volume = vol / 100;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    const targetMuted = !playerMuted;
    setPlayerMuted(targetMuted);
    if (activeLesson?.youtube_id && playerRef.current) {
      if (targetMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(playerVolume);
      }
    } else if (!activeLesson?.youtube_id && videoRef.current) {
      videoRef.current.muted = targetMuted;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleResumeFromOverlay = () => {
    togglePlayPause();
    setShowOverlay(false);
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

  const finalUrl = activeLesson.video_url || academyMediaUrl(activeLesson.video_path);
  const embedUrl = getEmbedUrl(finalUrl);
  const isExternalVideo = isHttpUrl(activeLesson.video_path || '');
  const shouldFrameExternalUrl = isExternalVideo && !looksLikeDirectVideoUrl(finalUrl) && !activeLesson.youtube_id;

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

  return (
    <div 
      ref={containerRef}
      id="player-container"
      className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center border border-slate-200 dark:border-slate-800 group"
    >
      {renderPrefetch()}

      {/* --- CASO 1: YOUTUBE PLAYER INTEGRADO --- */}
      {activeLesson.youtube_id && (
        <div className="w-full h-full relative overflow-hidden">
          {!isPlaying ? (
            <div 
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 cursor-pointer flex items-center justify-center z-30"
            >
              {thumbnailSrc ? (
                <img 
                  src={thumbnailSrc} 
                  alt={activeLesson.title} 
                  onError={handleThumbnailError}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-6">
                  <h4 className="text-sm font-bold text-white mb-1">{activeLesson.title}</h4>
                  <p className="text-xs text-slate-500 max-w-xs">{activeLesson.description || 'Lección de la Academia'}</p>
                </div>
              )}
              
              <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/50 transition-colors duration-300" />
              
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-blue-600/90 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform group-hover:scale-110 active:scale-90 group-hover:bg-blue-600 shadow-blue-600/30">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>

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
            <div className="w-full h-full relative overflow-hidden">
              {/* iframe con recorte inteligente CSS para eliminar título de YouTube (arriba) y branding (abajo) */}
              <div className="absolute w-[108%] h-[116%] top-[-8%] left-[-4%] pointer-events-none z-0">
                <iframe
                  id="yt-player-frame"
                  key={activeLesson.id}
                  title={activeLesson.title || 'Video de la lección'}
                  src={`https://www.youtube.com/embed/${activeLesson.youtube_id}?enablejsapi=1&autoplay=1&rel=0&controls=0&modestbranding=1&iv_load_policy=3`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-autoplay"
                  allowFullScreen
                />
              </div>

              {/* Capa de interacción transparente para interceptar clicks y evitar enlaces de YouTube */}
              <div 
                className="absolute inset-0 z-10 cursor-pointer" 
                onClick={togglePlayPause} 
              />

              {/* Custom Controls Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="w-full flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={playerDuration || 100}
                    value={playerCurrentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlayPause} className="text-white hover:text-blue-500 transition-colors">
                      {isPlayingState ? (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                    
                    <span className="text-xs font-mono text-slate-350">
                      {formatDuration(playerCurrentTime)} / {formatDuration(playerDuration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group/volume">
                      <button onClick={toggleMute} className="text-white hover:text-blue-500 transition-colors">
                        {playerMuted || playerVolume === 0 ? (
                          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z"/></svg>
                        ) : (
                          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"/></svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={playerMuted ? 0 : playerVolume}
                        onChange={handleVolumeChange}
                        className="w-0 group-hover/volume:w-16 h-1 bg-slate-650 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all duration-300 focus:outline-none"
                      />
                    </div>

                    <button onClick={toggleFullscreen} className="text-white hover:text-blue-500 transition-colors">
                      {isFullscreen ? (
                        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6M9 15v4.5M9 15H4.5M9 15l-6 6m12-6v4.5M15 15h4.5M15 15l6 6"/></svg>
                      ) : (
                        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom LMS Overlay (En pausa o finalizado) */}
              {showOverlay && (
                <div 
                  className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="max-w-md space-y-4">
                    {activeLessonProgress?.completed ? (
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-450">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-455">
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
      )}

      {/* --- CASO 2: EMBEDS EXTERNOS COMPATIBLES (Drive, Vimeo, etc.) --- */}
      {shouldFrameExternalUrl && (
        <div className="w-full h-full relative">
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
      )}

      {/* --- CASO 3: ARCHIVOS LOCALES CLOUDFLARE R2 --- */}
      {!activeLesson.youtube_id && !shouldFrameExternalUrl && (
        <div className="w-full h-full relative">
          {videoError ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-full text-center border border-slate-800">
              <span className="text-3xl mb-3">⚠️</span>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Video no encontrado</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                {isExternalVideo
                  ? 'La URL externa no respondió como un video reproducible. Revisa que sea un enlace público directo al archivo.'
                  : 'El archivo multimedia aún no se ha subido o no existe en el balde de Cloudflare.'}
              </p>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <video
                ref={videoRef}
                key={activeLesson.id}
                src={finalUrl}
                preload="metadata"
                poster={activeLesson.thumb_url || academyMediaUrl(activeLesson.thumbnail_url)}
                className="w-full h-full object-contain"
                onPlay={handleR2Play}
                onPause={handleR2Pause}
                onEnded={handleR2Ended}
                onLoadedMetadata={handleR2LoadedMetadata}
                onError={() => setVideoError(true)}
              />

              {/* Custom Controls Bar for R2 Video on Hover */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="w-full flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={playerDuration || 100}
                    value={playerCurrentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={togglePlayPause} className="text-white hover:text-blue-500 transition-colors">
                      {isPlayingState ? (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                    
                    <span className="text-xs font-mono text-slate-350">
                      {formatDuration(playerCurrentTime)} / {formatDuration(playerDuration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group/volume">
                      <button onClick={toggleMute} className="text-white hover:text-blue-500 transition-colors">
                        {playerMuted || playerVolume === 0 ? (
                          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V5.25z"/></svg>
                        ) : (
                          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"/></svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={playerMuted ? 0 : playerVolume}
                        onChange={handleVolumeChange}
                        className="w-0 group-hover/volume:w-16 h-1 bg-slate-650 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all duration-300 focus:outline-none"
                      />
                    </div>

                    <button onClick={toggleFullscreen} className="text-white hover:text-blue-500 transition-colors">
                      {isFullscreen ? (
                        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6M9 15v4.5M9 15H4.5M9 15l-6 6m12-6v4.5M15 15h4.5M15 15l6 6"/></svg>
                      ) : (
                        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
