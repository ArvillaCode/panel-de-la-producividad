import { academyMediaUrl } from '../../../../lib/academyR2Upload.js';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_path: string;
  is_completed: boolean;
  duration: string;
  materiales?: any[];
  is_visible: boolean;
  thumbnail_url?: string;
  video_url?: string;
  thumb_url?: string;
  module_id?: string;
  youtube_id?: string;
  youtube_title?: string;
  youtube_duration_seconds?: number;
  youtube_thumbnail_url?: string;
  require_completion?: boolean;
  minimum_watch_percent?: number;
}

export function parseLessonMaterials(materiales: any): any[] {
  if (Array.isArray(materiales)) return materiales;
  if (typeof materiales !== 'string') return [];

  try {
    const parsed = JSON.parse(materiales);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatAcademyLesson(lesson: any): Lesson {
  const videoPath = String(lesson.video_path || '').trim();
  const thumbnailUrl = String(lesson.thumbnail_url || '').trim();

  let isCompleted = false;
  try {
    const completedLessons = JSON.parse(localStorage.getItem('academy_completed') || '[]');
    isCompleted = Array.isArray(completedLessons) && completedLessons.includes(String(lesson.id));
  } catch (e) {
    console.error('Error reading academy_completed:', e);
  }

  return {
    ...lesson,
    video_path: videoPath,
    thumbnail_url: thumbnailUrl,
    materiales: parseLessonMaterials(lesson.materiales),
    is_completed: isCompleted,
    duration: lesson.youtube_duration_seconds 
      ? formatDuration(lesson.youtube_duration_seconds)
      : "Video",
    video_url: academyMediaUrl(videoPath),
    thumb_url: academyMediaUrl(thumbnailUrl),
    youtube_id: lesson.youtube_id || undefined,
    youtube_title: lesson.youtube_title || undefined,
    youtube_duration_seconds: lesson.youtube_duration_seconds || undefined,
    youtube_thumbnail_url: lesson.youtube_thumbnail_url || undefined,
    require_completion: !!lesson.require_completion,
    minimum_watch_percent: lesson.minimum_watch_percent ?? 90
  };
}

export function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // Google Drive
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/embed?id=${match[1]}`;
    }
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) || url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0`;
    }
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/([0-9]+)/) || url.match(/player\.vimeo\.com\/video\/([0-9]+)/);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }

  return null;
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(String(url || '').trim());
}

export function looksLikeDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(String(url || '').trim());
}

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // 1. Si es exactamente un ID de 11 caracteres válido
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  // 2. Extraer de iframe src si está presente (evitando ReDoS usando index y substring simple)
  let urlToParse = trimmed;
  if (trimmed.toLowerCase().includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      urlToParse = srcMatch[1];
    } else {
      return null;
    }
  }
  
  // 3. Regex simple y eficiente para extraer el ID del video (Complejidad O(N))
  // Soporta: watch?v=, youtu.be/, embed/, shorts/
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = urlToParse.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}
