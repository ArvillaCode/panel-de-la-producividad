import React from 'react';
import { PlayIcon } from 'lucide-react';
import { getEmbedUrl, isHttpUrl, looksLikeDirectVideoUrl, Lesson } from '../utils/mediaUtils';
import { academyMediaUrl } from '../../../../lib/academyR2Upload.js';

interface AcademyPlayerProps {
  activeLesson: Lesson | null;
  videoError: boolean;
  setVideoError: (error: boolean) => void;
  onNavigateBack: () => void;
}

export const AcademyPlayer: React.FC<AcademyPlayerProps> = ({
  activeLesson,
  videoError,
  setVideoError,
  onNavigateBack
}) => {
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
  const shouldFrameExternalUrl = isExternalVideo && !looksLikeDirectVideoUrl(finalUrl);

  if (!finalUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-[350px] sm:h-[450px] text-center">
        <span className="text-3xl mb-3">⚠</span>
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Medio sin configurar</h4>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Esta lección no tiene una URL directa o la URL de medios de la academia no está configurada en el despliegue.
        </p>
      </div>
    );
  }

  if (embedUrl || shouldFrameExternalUrl) {
    return (
      <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center">
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

  if (videoError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-[350px] sm:h-[450px] text-center">
        <span className="text-3xl mb-3">⚠️</span>
        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Video no encontrado</h4>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          {isExternalVideo
            ? 'La URL externa no respondió como un video reproducible. Revisa que sea un enlace público directo al archivo o a un reproductor compatible.'
            : 'El archivo multimedia aún no se ha subido o no existe en el balde de Cloudflare. Edita la lección para vincular el archivo correcto.'}
        </p>
        {activeLesson.video_path && (
          <a
            href={activeLesson.video_path}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-xs font-bold text-blue-300 hover:text-blue-200 underline underline-offset-4"
          >
            Abrir enlace original
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center">
      <video
        key={activeLesson.id}
        src={finalUrl}
        preload="metadata"
        poster={activeLesson.thumb_url || academyMediaUrl(activeLesson.thumbnail_url)}
        controls
        controlsList="nodownload"
        className="w-full h-full object-contain"
        onError={() => setVideoError(true)}
      />
    </div>
  );
};
