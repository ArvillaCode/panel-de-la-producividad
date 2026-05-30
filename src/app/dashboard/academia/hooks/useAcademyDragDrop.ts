import { useState } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { updateModulesOrder, updateLessonsOrder } from '../services/academyService';

export function useAcademyDragDrop(
  modules: any[],
  setModules: React.Dispatch<React.SetStateAction<any[]>>,
  selectedCourseId: string | null,
  activeLesson: any,
  isAdmin: boolean,
  isEditMode: boolean
) {
  const { toast } = useToast();
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<{ id: string; moduleId: string } | null>(null);

  const handleModuleDragStart = (e: React.DragEvent, id: string) => {
    if (!isAdmin || !isEditMode) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedModuleId(id);
  };

  const handleModuleDragOver = (e: React.DragEvent, id: string) => {
    if (!isAdmin || !isEditMode || draggedModuleId === id) return;
    e.preventDefault();
  };

  const handleModuleDrop = async (e: React.DragEvent, targetId: string) => {
    if (!isAdmin || !isEditMode || !draggedModuleId || draggedModuleId === targetId) return;
    e.preventDefault();
    
    const activeModules = [...modules];
    const dragIdx = activeModules.findIndex(m => m.id === draggedModuleId);
    const dropIdx = activeModules.findIndex(m => m.id === targetId);
    
    if (dragIdx !== -1 && dropIdx !== -1) {
      const [draggedItem] = activeModules.splice(dragIdx, 1);
      activeModules.splice(dropIdx, 0, draggedItem);
      
      const updatedModules = activeModules.map((m, idx) => ({
        ...m,
        order_index: idx + 1
      }));
      setModules(updatedModules);

      // Sincronizar caché local
      if (selectedCourseId) {
        try {
          const cachedKey = `cached_academy_lessons_${selectedCourseId}`;
          localStorage.setItem(cachedKey, JSON.stringify({
            modules: updatedModules,
            activeLesson: activeLesson
          }));
        } catch (e) {
          console.warn('Error updating local cache in module drag hook:', e);
        }
      }
      
      try {
        await updateModulesOrder(updatedModules);
        toast.success("Orden de módulos actualizado");
      } catch (err) {
        console.error("Error updating modules order:", err);
        toast.error("Error al guardar el nuevo orden de módulos");
      }
    }
    setDraggedModuleId(null);
  };

  const handleLessonDragStart = (e: React.DragEvent, lessonId: string, mId: string) => {
    if (!isAdmin || !isEditMode) return;
    e.dataTransfer.setData('text/plain', lessonId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLesson({ id: lessonId, moduleId: mId });
  };

  const handleLessonDragOver = (e: React.DragEvent, lessonId: string, mId: string) => {
    if (!isAdmin || !isEditMode || !draggedLesson) return;
    if (draggedLesson.moduleId === mId && draggedLesson.id !== lessonId) {
      e.preventDefault();
    }
  };

  const handleLessonDrop = async (e: React.DragEvent, targetLessonId: string, mId: string) => {
    if (!isAdmin || !isEditMode || !draggedLesson || draggedLesson.moduleId !== mId || draggedLesson.id === targetLessonId) return;
    e.preventDefault();
    
    const updatedModules = modules.map(m => {
      if (m.id !== mId) return m;
      
      const activeLessons = [...(m.lessons || [])];
      const dragIdx = activeLessons.findIndex(l => l.id === draggedLesson.id);
      const dropIdx = activeLessons.findIndex(l => l.id === targetLessonId);
      
      if (dragIdx !== -1 && dropIdx !== -1) {
        const [draggedItem] = activeLessons.splice(dragIdx, 1);
        activeLessons.splice(dropIdx, 0, draggedItem);
        
        const reorderedLessons = activeLessons.map((l, idx) => ({
          ...l,
          order_index: idx + 1
        }));
        
        (async () => {
          try {
            await updateLessonsOrder(reorderedLessons);
          } catch (err) {
            console.error("Error updating lessons order:", err);
            toast.error("Error al guardar el nuevo orden de lecciones");
          }
        })();
        
        return {
          ...m,
          lessons: reorderedLessons
        };
      }
      return m;
    });
    
    setModules(updatedModules);

    // Sincronizar caché local
    if (selectedCourseId) {
      try {
        const cachedKey = `cached_academy_lessons_${selectedCourseId}`;
        localStorage.setItem(cachedKey, JSON.stringify({
          modules: updatedModules,
          activeLesson: activeLesson
        }));
      } catch (e) {
        console.warn('Error updating local cache in lesson drag hook:', e);
      }
    }

    setDraggedLesson(null);
    toast.success("Orden de lecciones actualizado");
  };

  return {
    draggedModuleId,
    draggedLesson,
    handleModuleDragStart,
    handleModuleDragOver,
    handleModuleDrop,
    handleLessonDragStart,
    handleLessonDragOver,
    handleLessonDrop
  };
}
