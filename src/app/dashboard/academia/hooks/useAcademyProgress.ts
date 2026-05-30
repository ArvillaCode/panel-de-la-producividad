import { useState, useCallback } from 'react';
import { useToast } from '../../../../context/ToastContext';

export function useAcademyProgress() {
  const { toast } = useToast();

  const getCompletedLessons = useCallback((): string[] => {
    try {
      const completed = localStorage.getItem('academy_completed');
      if (completed) {
        const parsed = JSON.parse(completed);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error reading completed lessons from localStorage:', e);
    }
    return [];
  }, []);

  const markLessonAsCompleted = useCallback((lessonId: string, selectedCourseId: string | null, modules: any[], activeLesson: any, setModules: any, setActiveLesson: any) => {
    if (!lessonId) return;
    
    const completedLessons = getCompletedLessons();
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
      localStorage.setItem('academy_completed', JSON.stringify(completedLessons));
    }

    const updatedModules = (modules || []).map(mod => ({
      ...mod,
      lessons: (mod.lessons || []).map(les =>
        les.id === lessonId ? { ...les, is_completed: true } : les
      )
    }));
    setModules(updatedModules);

    const nextActiveLesson = activeLesson ? { ...activeLesson, is_completed: true } : null;
    setActiveLesson(nextActiveLesson);

    // Sincronizar caché local
    if (selectedCourseId) {
      try {
        const cachedKey = `cached_academy_lessons_${selectedCourseId}`;
        localStorage.setItem(cachedKey, JSON.stringify({
          modules: updatedModules,
          activeLesson: nextActiveLesson
        }));
      } catch (e) {
        console.warn('Error updating local cache in progress hook:', e);
      }
    }

    toast.success("Lección marcada como completada");
  }, [getCompletedLessons, toast]);

  return {
    getCompletedLessons,
    markLessonAsCompleted
  };
}
