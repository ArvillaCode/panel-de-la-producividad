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
    duration: "Video",
    video_url: academyMediaUrl(videoPath),
    thumb_url: academyMediaUrl(thumbnailUrl)
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
