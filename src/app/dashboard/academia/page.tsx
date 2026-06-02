import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useToast } from '../../../context/ToastContext';
import {
  PlayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DownloadIcon,
  Plus,
  X,
  Image as ImageIcon,
  Save,
  Trash2,
  Lock,
  Pencil,
  Settings,
  Gem,
  Copy
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { uploadToAcademyR2, academyMediaUrl } from '../../../lib/academyR2Upload.js';

// --- IMPORTS MODULARES ---
import { Course, Module, fetchCourses, fetchModulesAndLessons, saveCourse, saveGlobalAcademySettings, deleteCourse, deleteLesson, deleteModule, updateLesson } from './services/academyService';
import { Lesson, formatAcademyLesson, getEmbedUrl, isHttpUrl, looksLikeDirectVideoUrl, extractYouTubeId } from './utils/mediaUtils';
import { useAcademyPermissions } from './hooks/useAcademyPermissions';
import { useAcademyProgress } from './hooks/useAcademyProgress';
import { useAcademyDragDrop } from './hooks/useAcademyDragDrop';

import { AcademyPlayer } from './components/AcademyPlayer';
import { CourseCard, CATEGORY_COLORS } from './components/CourseCard';
import { LessonSidebar } from './components/LessonSidebar';
import { AdminActionsMenu } from './components/AdminActionsMenu';

const ACADEMY_CATEGORIES = ["General", "Inteligencia Artificial", "Automatización", "Marketing", "Ventas", "Estrategia"];

export default function AcademyDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- ESTADOS ---
  const [view, setView] = useState<'courses' | 'lessons'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [showOnlyPremium, setShowOnlyPremium] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [videoError, setVideoError] = useState(false);

  // --- MODO EDICIÓN ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoPath, setEditVideoPath] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [isUploadingEditThumb, setIsUploadingEditThumb] = useState(false);
  const [isUploadingEditVideo, setIsUploadingEditVideo] = useState(false);
  const [editMateriales, setEditMateriales] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // YouTube specific edit states
  const [editYouTubeId, setEditYouTubeId] = useState('');
  const [editYouTubeTitle, setEditYouTubeTitle] = useState('');
  const [editYouTubeDurationSeconds, setEditYouTubeDurationSeconds] = useState<number>(0);
  const [editYouTubeThumbnailUrl, setEditYouTubeThumbnailUrl] = useState('');
  const [editRequireCompletion, setEditRequireCompletion] = useState(false);
  const [editMinimumWatchPercent, setEditMinimumWatchPercent] = useState<number>(90);

  // User lesson progress state (from Supabase academy_progress)
  const [activeLessonProgress, setActiveLessonProgress] = useState<{
    last_watched_seconds: number;
    max_watched_seconds: number;
    completed: boolean;
  } | null>(null);

  // --- ESTADOS CREACIÓN CURSO ---
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new-course') {
      setIsCourseModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [courseForm, setCourseForm] = useState({ title: '', description: '', thumbnail_url: '', category: 'General', is_premium: false, is_published: true });
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- ESTADOS AJUSTES ACADEMIA ---
  const [isAcademySettingsModalOpen, setIsAcademySettingsModalOpen] = useState(false);
  const [academySettingsForm, setAcademySettingsForm] = useState({ title: '', description: '', logo: '' });
  const [isSavingAcademySettings, setIsSavingAcademySettings] = useState(false);

  // --- CONFIRM MODAL ---
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: () => {} });

  const requestConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  // --- HOOKS DE RESPONSABILIDAD ---
  const { isAdmin, profile, hasPremiumAccess, canAccessCourse } = useAcademyPermissions();
  const { getCompletedLessons, markLessonAsCompleted } = useAcademyProgress();

  const {
    draggedModuleId,
    draggedLesson,
    handleModuleDragStart,
    handleModuleDragOver,
    handleModuleDrop,
    handleLessonDragStart,
    handleLessonDragOver,
    handleLessonDrop
  } = useAcademyDragDrop(
    modules,
    setModules,
    selectedCourse?.id || null,
    activeLesson,
    isAdmin,
    isEditMode
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (course.slug === 'global-academy-settings') return false;
      if (course.is_published === false && !isAdmin) return false;
      if (course.is_premium && !hasPremiumAccess) return false;
      if (showOnlyPremium) return course.is_premium;
      return selectedCategory === 'Todas' || course.category === selectedCategory;
    });
  }, [courses, selectedCategory, showOnlyPremium, hasPremiumAccess, isAdmin]);

  // --- MANEJADORES ---
  const handleSaveAcademySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAcademySettings(true);
    try {
      const slug = 'global-academy-settings';
      const globalSettingsCourse = courses.find(c => c.slug === slug);
      
      const saved = await saveGlobalAcademySettings(
        academySettingsForm.title,
        academySettingsForm.description,
        academySettingsForm.logo,
        globalSettingsCourse
      );

      if (globalSettingsCourse) {
        setCourses(prev => prev.map(c => c.id === globalSettingsCourse.id ? saved : c));
      } else {
        setCourses(prev => [...prev, saved]);
      }
      setIsAcademySettingsModalOpen(false);
      toast.success("Configuración global de academia guardada correctamente.");
    } catch (error: any) {
      console.error(error);
      toast.error(`Error al guardar configuración: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSavingAcademySettings(false);
    }
  };

  const uploadThumbnail = async (file: File) => {
    try {
      setUploadProgress(10);
      const filename = await uploadToAcademyR2(file, 'courses');
      setUploadProgress(100);
      setCourseForm(prev => ({ ...prev, thumbnail_url: filename }));
    } catch (error: any) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al subir miniatura");
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.description) {
      toast.error("Completa los campos");
      return;
    }

    setIsCreatingCourse(true);
    try {
      const saved = await saveCourse(courseForm, editingCourseId);

      if (editingCourseId) {
        setCourses(prev => prev.map(c => c.id === editingCourseId ? saved : c));
        if (selectedCourse?.id === editingCourseId) {
          setSelectedCourse(saved);
        }
        toast.success("Curso editado con éxito.");
      } else {
        setCourses(prev => [...prev, saved]);
        toast.success("Curso creado con éxito.");
      }

      setIsCourseModalOpen(false);
      setEditingCourseId(null);
      setCourseForm({ title: '', description: '', thumbnail_url: '', category: 'General', is_premium: false, is_published: true });
    } catch (error: any) {
      console.error(error);
      toast.error(`Error al guardar curso: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleEditCourseClick = (course: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      thumbnail_url: course.thumbnail_url || '',
      category: course.category || 'General',
      is_premium: course.is_premium || false,
      is_published: course.is_published !== false
    });
    setIsCourseModalOpen(true);
  };

  const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm("¿Estás seguro de borrar este curso? Se eliminarán todos sus módulos y lecciones.", async () => {
      try {
        await deleteCourse(id);
        setCourses(courses.filter(c => c.id !== id));
        if (selectedCourse?.id === id) {
          setView('courses');
          setSelectedCourse(null);
        }
        toast.success("Curso borrado correctamente.");
      } catch (error) {
        toast.error("Error al borrar curso");
      }
    });
  };

  const handleDeleteLesson = async (id: string, moduleId: string) => {
    requestConfirm("¿Borrar esta lección?", async () => {
      try {
        await deleteLesson(id);
        setModules(prev => prev.map(mod => {
          if (mod.id === moduleId) {
            return { ...mod, lessons: mod.lessons.filter(l => l.id !== id) };
          }
          return mod;
        }));
        if (activeLesson?.id === id) setActiveLesson(null);
        toast.success("Lección borrada correctamente.");
      } catch (error) {
        toast.error("Error al borrar lección");
      }
    });
  };

  const handleDeleteModule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm("¿Borrar este módulo y todas sus lecciones?", async () => {
      try {
        await deleteModule(id);
        setModules(prev => prev.filter(m => m.id !== id));
        toast.success("Módulo borrado correctamente.");
      } catch (error) {
        toast.error("Error al borrar módulo");
      }
    });
  };

  const handleUpdateLesson = async () => {
    if (!activeLesson) return;
    
    requestConfirm("¿Estás seguro de que deseas guardar los cambios en esta lección?", async () => {
      setIsSaving(true);
      try {
        const payload = {
          title: editTitle,
          description: editDescription,
          video_path: editVideoPath,
          thumbnail_url: editThumbnailUrl,
          materiales: editMateriales,
          youtube_id: editYouTubeId || null,
          youtube_title: editYouTubeTitle || null,
          youtube_duration_seconds: editYouTubeDurationSeconds ? Number(editYouTubeDurationSeconds) : null,
          youtube_thumbnail_url: editYouTubeThumbnailUrl || null,
          require_completion: editRequireCompletion,
          minimum_watch_percent: Number(editMinimumWatchPercent)
        };

        await updateLesson(activeLesson.id, payload);

        setModules(prev => prev.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(l => l.id === activeLesson.id ? {
            ...l,
            ...payload,
            video_url: editVideoPath ? academyMediaUrl(editVideoPath) : '',
            thumb_url: editThumbnailUrl ? academyMediaUrl(editThumbnailUrl) : ''
          } : l)
        })));

        setActiveLesson(prev => prev ? ({
          ...prev,
          ...payload,
          video_url: editVideoPath ? academyMediaUrl(editVideoPath) : '',
          thumb_url: editThumbnailUrl ? academyMediaUrl(editThumbnailUrl) : ''
        }) : null);

        setIsEditMode(false);
        toast.success("Lección actualizada correctamente.");
      } catch (error) {
        console.error(error);
        toast.error("Error al guardar lección");
      } finally {
        setIsSaving(false);
      }
    });
  };

  useEffect(() => {
    if (activeLesson) {
      setEditTitle(activeLesson.title || '');
      setEditDescription(activeLesson.description || '');
      setEditVideoPath(activeLesson.video_path || '');
      setEditThumbnailUrl(activeLesson.thumbnail_url || '');
      setEditMateriales(Array.isArray(activeLesson.materiales) ? activeLesson.materiales : []);
      
      setEditYouTubeId(activeLesson.youtube_id || '');
      setEditYouTubeTitle(activeLesson.youtube_title || '');
      setEditYouTubeDurationSeconds(activeLesson.youtube_duration_seconds || 0);
      setEditYouTubeThumbnailUrl(activeLesson.youtube_thumbnail_url || '');
      setEditRequireCompletion(!!activeLesson.require_completion);
      setEditMinimumWatchPercent(activeLesson.minimum_watch_percent ?? 90);
      
      setVideoError(false);
    }
  }, [activeLesson]);

  // Fetch progress from database for the active lesson
  useEffect(() => {
    const fetchActiveProgress = async () => {
      if (!activeLesson) {
        setActiveLessonProgress(null);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prog } = await supabase
            .from('academy_progress')
            .select('completed, last_watched_seconds, max_watched_seconds')
            .eq('user_id', user.id)
            .eq('lesson_id', activeLesson.id)
            .maybeSingle();
          if (prog) {
            setActiveLessonProgress({
              completed: !!prog.completed,
              last_watched_seconds: prog.last_watched_seconds || 0,
              max_watched_seconds: prog.max_watched_seconds || 0
            });
          } else {
            setActiveLessonProgress({
              completed: false,
              last_watched_seconds: 0,
              max_watched_seconds: 0
            });
          }
        }
      } catch (e) {
        console.error("Error fetching active progress:", e);
      }
    };
    fetchActiveProgress();
  }, [activeLesson]);

  // 1. Cargar cursos al montar el componente (y cuando cambie el rol de admin)
  useEffect(() => {
    let hasCached = false;
    try {
      const cached = localStorage.getItem('cached_academy_courses');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCourses(parsed);
          setIsLoading(false);
          hasCached = true;
        }
      }
    } catch (e) {
      console.warn('[ACADEMY_CACHE] Error reading cached courses:', e);
    }

    const fetchCoursesData = async () => {
      try {
        if (!hasCached) {
          setIsLoading(true);
        }
        const coursesData = await fetchCourses(isAdmin);
        setCourses(coursesData);
        try {
          localStorage.setItem('cached_academy_courses', JSON.stringify(coursesData));
        } catch (e) {}
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoursesData();
  }, [isAdmin]);

  // 2. Sincronizar el estado de la vista con la URL reactivamente
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const courseIdFromUrl = params.get('course');

    if (!courseIdFromUrl) {
      setView('courses');
      setSelectedCourse(null);
      setModules([]);
      setActiveLesson(null);
    } else {
      setView('lessons');
      if (courses.length > 0) {
        const matchedCourse = courses.find(c => String(c.id) === courseIdFromUrl);
        if (matchedCourse && (!selectedCourse || selectedCourse.id !== matchedCourse.id)) {
          setSelectedCourse(matchedCourse);
        }
      }
    }
  }, [location.search, courses]);

  // 3. Cargar módulos y lecciones cuando el curso seleccionado esté activo
  useEffect(() => {
    const fetchLessonsData = async () => {
      if (!selectedCourse) return;
      
      if (!canAccessCourse(selectedCourse)) {
        toast.error("Este curso premium no está disponible en tu plan Acceso Básico Legacy.");
        navigate('/dashboard/academia', { replace: true });
        setSelectedCourse(null);
        setView('courses');
        return;
      }
      
      let hasCached = false;
      try {
        const cachedKey = `cached_academy_lessons_${selectedCourse.id}`;
        const cachedData = localStorage.getItem(cachedKey);
        if (cachedData) {
          const { modules: cachedModules, activeLesson: cachedActive } = JSON.parse(cachedData);
          if (Array.isArray(cachedModules) && cachedModules.length > 0) {
            setModules(cachedModules);
            if (cachedActive) {
              setActiveLesson(cachedActive);
            }
            setIsLoading(false);
            hasCached = true;
          }
        }
      } catch (e) {
        console.warn('[ACADEMY_CACHE] Error reading cached lessons:', e);
      }

      try {
        if (!hasCached) {
          setIsLoading(true);
          setModules([]);
          setActiveLesson(null);
        }
        setVideoError(false);

        const [modulesData, allLessons] = await fetchModulesAndLessons(selectedCourse.id, isAdmin);

        // Fetch db progress for active user to merge
        let dbProgressMap = new Map();
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: progressData } = await supabase
              .from('academy_progress')
              .select('lesson_id, completed, last_watched_seconds, max_watched_seconds')
              .eq('user_id', user.id);
            if (progressData) {
              progressData.forEach((p: any) => dbProgressMap.set(String(p.lesson_id), p));
            }
          }
        } catch (pe) {
          console.error("Error fetching academy_progress:", pe);
        }

        const visibleLessons = (allLessons || [])
          .filter((lesson: any) => isAdmin || lesson.is_visible !== false)
          .map((lesson: any) => {
            const formatted = formatAcademyLesson(lesson);
            const dbProg = dbProgressMap.get(String(formatted.id));
            if (dbProg) {
              formatted.is_completed = formatted.is_completed || dbProg.completed;
              // Sincronizar localStorage si el progreso en DB está completado
              if (dbProg.completed) {
                try {
                  const localCompleted = JSON.parse(localStorage.getItem('academy_completed') || '[]');
                  if (!localCompleted.includes(formatted.id)) {
                    localCompleted.push(formatted.id);
                    localStorage.setItem('academy_completed', JSON.stringify(localCompleted));
                  }
                } catch (le) {}
              }
            }
            return formatted;
          });

        const lessonsByModuleId = new Map<string, Lesson[]>();
        visibleLessons.forEach((lesson) => {
          const moduleId = lesson.module_id ? String(lesson.module_id) : '';
          if (!moduleId) return;
          const moduleLessons = lessonsByModuleId.get(moduleId) || [];
          moduleLessons.push(lesson);
          lessonsByModuleId.set(moduleId, moduleLessons);
        });

        const formattedModules: Module[] = (modulesData || []).map((mod: any) => ({
          id: mod.id,
          title: mod.title,
          lessons: lessonsByModuleId.get(String(mod.id)) || []
        }));

        const knownModuleIds = new Set((modulesData || []).map((m: any) => String(m.id)));
        const orphanLessons = visibleLessons.filter((lesson) => !lesson.module_id || !knownModuleIds.has(String(lesson.module_id)));
        if (orphanLessons.length > 0) {
          formattedModules.push({
            id: `course-${selectedCourse.id}-content`,
            title: 'Contenido del curso',
            lessons: orphanLessons
          });
        }

        setModules(formattedModules);

        const params = new URLSearchParams(location.search);
        const lessonIdFromUrl = params.get('lesson');
        let foundLesson = null;
        let foundModuleId = null;

        if (lessonIdFromUrl) {
          for (const mod of formattedModules) {
            const matchedLes = mod.lessons.find(l => String(l.id) === lessonIdFromUrl);
            if (matchedLes) {
              foundLesson = matchedLes;
              foundModuleId = mod.id;
              break;
            }
          }
        }

        const firstModuleWithLessons = formattedModules.find((mod) => mod.lessons.length > 0);
        let activeToSet = null;

        if (foundLesson) {
          activeToSet = foundLesson;
          setExpandedModules({ [foundModuleId!]: true });
        } else if (firstModuleWithLessons) {
          activeToSet = firstModuleWithLessons.lessons[0];
          setExpandedModules({ [firstModuleWithLessons.id]: true });
        } else {
          activeToSet = null;
          setExpandedModules({});
        }

        setActiveLesson(activeToSet);

        try {
          const cachedKey = `cached_academy_lessons_${selectedCourse.id}`;
          localStorage.setItem(cachedKey, JSON.stringify({
            modules: formattedModules,
            activeLesson: activeToSet
          }));
        } catch (e) {}

      } catch (error) {
        console.error("Error loading lessons:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessonsData();
  }, [selectedCourse, isAdmin, profile?.plan, navigate]);

  // Cargar progreso completado desde localStorage
  useEffect(() => {
    if (modules.length === 0) return;
    const completedLessons = getCompletedLessons();
    if (completedLessons.length === 0) return;
    setModules(prev => prev.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(l => completedLessons.includes(l.id) ? { ...l, is_completed: true } : l)
    })));
    if (activeLesson && completedLessons.includes(activeLesson.id)) {
      setActiveLesson(prev => prev ? { ...prev, is_completed: true } : null);
    }
  }, [modules.length > 0]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleLessonSelect = (lesson: Lesson) => {
    if (isEditMode && activeLesson) {
      const hasUnsavedChanges = 
        editTitle !== (activeLesson.title || '') ||
        editDescription !== (activeLesson.description || '') ||
        editVideoPath !== (activeLesson.video_path || '') ||
        editThumbnailUrl !== (activeLesson.thumbnail_url || '') ||
        editYouTubeId !== (activeLesson.youtube_id || '') ||
        editYouTubeTitle !== (activeLesson.youtube_title || '') ||
        editYouTubeDurationSeconds !== (activeLesson.youtube_duration_seconds || 0) ||
        editYouTubeThumbnailUrl !== (activeLesson.youtube_thumbnail_url || '') ||
        editRequireCompletion !== (!!activeLesson.require_completion) ||
        editMinimumWatchPercent !== (activeLesson.minimum_watch_percent ?? 90) ||
        JSON.stringify(editMateriales) !== JSON.stringify(activeLesson.materiales || []);

      if (hasUnsavedChanges) {
        requestConfirm("Tienes cambios sin guardar en la lección actual. ¿Estás seguro de que quieres cambiar de lección y perder estos cambios?", () => {
          setActiveLesson(lesson);
          const params = new URLSearchParams(location.search);
          params.set('lesson', lesson.id);
          navigate(`/dashboard/academia?${params.toString()}`);
        });
        return;
      }
    }
    setActiveLesson(lesson);
    const params = new URLSearchParams(location.search);
    params.set('lesson', lesson.id);
    navigate(`/dashboard/academia?${params.toString()}`);
  };

  const markAsCompleted = () => {
    if (!activeLesson) return;
    markLessonAsCompleted(
      activeLesson.id,
      selectedCourse?.id || null,
      modules,
      activeLesson,
      setModules,
      setActiveLesson
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* BREADCRUMB */}
        <nav className="mb-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 overflow-x-auto flex-nowrap scrollbar-hide" aria-label="Breadcrumb">
          <button
            onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/')}
            className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="font-semibold hidden sm:inline">Inicio</span>
          </button>

          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>

          {view === 'lessons' ? (
            <button
              onClick={() => {
                const hasUnsavedChanges =
                  activeLesson &&
                  (editTitle !== activeLesson.title ||
                   editDescription !== activeLesson.description ||
                   editVideoPath !== activeLesson.video_path ||
                   editThumbnailUrl !== activeLesson.thumbnail_url ||
                   editYouTubeId !== (activeLesson.youtube_id || '') ||
                   editYouTubeTitle !== (activeLesson.youtube_title || '') ||
                   editYouTubeDurationSeconds !== (activeLesson.youtube_duration_seconds || 0) ||
                   editYouTubeThumbnailUrl !== (activeLesson.youtube_thumbnail_url || '') ||
                   editRequireCompletion !== (!!activeLesson.require_completion) ||
                   editMinimumWatchPercent !== (activeLesson.minimum_watch_percent ?? 90) ||
                   JSON.stringify(editMateriales) !== JSON.stringify(activeLesson.materiales || []));

                if (isEditMode && hasUnsavedChanges) {
                  requestConfirm("Tienes cambios sin guardar en la lección actual. ¿Estás seguro de que quieres salir y perder estos cambios?", () => {
                    navigate('/dashboard/academia');
                  });
                } else {
                  navigate('/dashboard/academia');
                }
              }}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
            >
              <svg className="w-4 h-4 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span className="font-semibold">Academia</span>
            </button>
          ) : (
            <span className="font-semibold text-blue-600 dark:text-blue-400 shrink-0">Academia</span>
          )}

          {view === 'lessons' && selectedCourse && (
            <>
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>

              {activeLesson ? (
                <button
                  onClick={() => navigate(`/dashboard/academia?course=${selectedCourse.id}`)}
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 min-w-0"
                >
                  <svg className="w-4 h-4 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  <span className="font-semibold truncate max-w-[100px] sm:max-w-[200px]">{selectedCourse.title}</span>
                </button>
              ) : (
                <span className="font-semibold truncate max-w-[100px] sm:max-w-[250px] shrink-0">{selectedCourse.title}</span>
              )}

              {activeLesson && (
                <>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[100px] sm:max-w-[200px] shrink-0">{activeLesson.title}</span>
                </>
              )}
            </>
          )}
        </nav>

        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {(() => {
            const globalSettings = courses.find(c => c.slug === 'global-academy-settings');
            const aTitle = globalSettings?.title || 'UpFunnel Academy';
            const aDesc = globalSettings?.description || 'Domina el Panel de la Productividad con nuestros recursos y cursos premium.';
            const aLogo = globalSettings?.thumbnail_url || null;

            return (
              <>
                {view === 'courses' && aLogo && (
                  <img src={aLogo} alt={aTitle} className="h-10 md:h-12 w-auto object-contain mr-2" />
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                    {view === 'courses' ? aTitle : (selectedCourse?.title || 'Cargando curso...')}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mt-1">
                    {view === 'courses' ? aDesc : (selectedCourse?.description || 'Cargando detalles del curso...')}
                  </p>
                </div>
              </>
            );
          })()}

          {/* MENÚ DE ACCIONES EXCLUSIVO DE ADMIN */}
          <AdminActionsMenu
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
            onSettingsClick={() => {
              const globalSettings = courses.find(c => c.slug === 'global-academy-settings');
              setAcademySettingsForm({
                title: globalSettings?.title || 'UpFunnel Academy',
                description: globalSettings?.description || 'Domina el Panel de la Productividad con nuestros recursos y cursos premium.',
                logo: globalSettings?.thumbnail_url || ''
              });
              setIsAcademySettingsModalOpen(true);
            }}
            onAddCourseClick={() => {
              setEditingCourseId(null);
              setCourseForm({ title: '', description: '', thumbnail_url: '', category: 'General', is_premium: false, is_published: true });
              setIsCourseModalOpen(true);
            }}
          />
        </div>

        {/* FILTROS POR CATEGORÍA */}
        {view === 'courses' && (
          <div className="mb-10 relative">
            <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar scroll-px-1"
              style={{ maskImage: 'linear-gradient(to right, black 0, black calc(100% - 28px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 28px), transparent 100%)' }}>
              <button
                onClick={() => { setSelectedCategory('Todas'); setShowOnlyPremium(false); }}
                className={`shrink-0 px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap
                  ${(selectedCategory === 'Todas' && !showOnlyPremium)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  }`}
              >
                Todas
              </button>

              <button
                onClick={() => { setShowOnlyPremium(true); setSelectedCategory('Todas'); }}
                className={`shrink-0 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2
                  ${showOnlyPremium
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/20'
                    : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'
                  }`}
              >
                <Gem className="w-4 h-4" /> Cursos Premium
              </button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2 shrink-0" />

              {ACADEMY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowOnlyPremium(false); }}
                  className={`shrink-0 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap
                    ${(selectedCategory === cat && !showOnlyPremium)
                      ? `${CATEGORY_COLORS[cat] || 'bg-blue-600'} text-white shadow-lg`
                      : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VISTA DE CURSOS */}
        {view === 'courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isLoading && courses.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                  <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-full" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isAdmin={isAdmin}
                  isEditMode={isEditMode}
                  onSelect={() => navigate(`/dashboard/academia?course=${course.id}`)}
                  onEditClick={handleEditCourseClick}
                  onDeleteClick={handleDeleteCourse}
                />
              ))
            )}
          </div>
        )}

        {/* VISTA DE LECCIONES */}
        {view === 'lessons' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">

            {/* SIDEBAR DE LECCIONES Y MÓDULOS */}
            <LessonSidebar
              modules={modules}
              activeLesson={activeLesson}
              expandedModules={expandedModules}
              onToggleModule={toggleModule}
              onLessonSelect={handleLessonSelect}
              isAdmin={isAdmin}
              isEditMode={isEditMode}
              onDeleteModule={handleDeleteModule}
              onDeleteLesson={handleDeleteLesson}
              isLoading={isLoading}
              draggedModuleId={draggedModuleId}
              draggedLesson={draggedLesson}
              handleModuleDragStart={handleModuleDragStart}
              handleModuleDragOver={handleModuleDragOver}
              handleModuleDrop={handleModuleDrop}
              handleLessonDragStart={handleLessonDragStart}
              handleLessonDragOver={handleLessonDragOver}
              handleLessonDrop={handleLessonDrop}
            />

            {/* ÁREA DE CONTENIDO (REPRODUCTOR + DETALLES + MODO EDICIÓN) */}
            <div className="flex-1 w-full order-1 lg:order-2 flex flex-col gap-6">
              <AcademyPlayer
                activeLesson={activeLesson}
                videoError={videoError}
                setVideoError={setVideoError}
                onNavigateBack={() => navigate('/dashboard/academia')}
                activeLessonProgress={activeLessonProgress}
                onProgressUpdate={(prog) => {
                  setActiveLessonProgress(prog);
                  if (prog.completed && !activeLesson.is_completed) {
                    // Marcar como completada en la interfaz del estudiante
                    setModules(prev => prev.map(mod => ({
                      ...mod,
                      lessons: mod.lessons.map(l => l.id === activeLesson.id ? { ...l, is_completed: true } : l)
                    })));
                    setActiveLesson(prev => prev ? { ...prev, is_completed: true } : null);
                  }
                }}
                nextLesson={(() => {
                  if (!activeLesson || modules.length === 0) return null;
                  let foundActive = false;
                  for (const mod of modules) {
                    for (const lesson of (mod.lessons || [])) {
                      if (foundActive) return lesson;
                      if (lesson.id === activeLesson.id) foundActive = true;
                    }
                  }
                  return null;
                })()}
              />

              {activeLesson && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                  {!isEditMode ? (
                    <>
                      {(() => {
                        const isCompletionDisabled = activeLesson.require_completion && 
                          (!activeLessonProgress || 
                           (activeLessonProgress.max_watched_seconds / (activeLesson.youtube_duration_seconds || 1)) * 100 < (activeLesson.minimum_watch_percent || 90));
                        
                        return (
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div>
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">{activeLesson.title}</h2>
                              <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-widest">CLASE MULTIMEDIA SECUENCIAL</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <button
                                onClick={markAsCompleted}
                                disabled={activeLesson.is_completed || isCompletionDisabled}
                                className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeLesson.is_completed ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : isCompletionDisabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-95'}`}
                              >
                                {activeLesson.is_completed ? '✓ Completada con Éxito' : 'Marcar como Completada'}
                              </button>
                              {isCompletionDisabled && !activeLesson.is_completed && (
                                <p className="text-[10px] text-red-500 font-semibold text-right max-w-[200px]">
                                  Requiere ver el {activeLesson.minimum_watch_percent}% del video.
                                  (Visto: {Math.min(100, Math.floor((activeLessonProgress?.max_watched_seconds || 0) / (activeLesson.youtube_duration_seconds || 1) * 100))}%)
                                </p>
                              )}
                            </div>
                          </div>
                        );
                       })()}
                      
                      <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8 prose dark:prose-invert max-w-none whitespace-pre-line">
                        {activeLesson.description || 'Esta lección no contiene descripción adicional.'}
                      </div>

                      {activeLesson.materiales && activeLesson.materiales.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                          <h4 className="text-xs font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">Materiales y Recursos Adicionales</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeLesson.materiales.map((mat: any, idx: number) => (
                              <a
                                key={idx}
                                href={mat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-850 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border border-slate-100 dark:border-slate-800 rounded-xl transition-all group"
                              >
                                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                                  <DownloadIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{mat.name || 'Descargar Recurso'}</p>
                                  <p className="text-[10px] text-slate-400 truncate">Enlace externo seguro</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // PANEL DE MODO EDICIÓN DIRECTO
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Panel de Configuración de Clase</h3>
                          <p className="text-xs text-slate-400 mt-1">Los cambios se guardarán localmente antes de sincronizarlos de forma definitiva.</p>
                        </div>
                        <button
                          onClick={() => setIsEditMode(false)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Título de la Lección</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Descripción Detallada</label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed"
                          />
                        </div>
                                     <div className="bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Configuración del Video (Híbrido)</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Opción A: Archivo Cloudflare R2 (Ruta)</label>
                                  <input
                                    type="text"
                                    value={editVideoPath}
                                    onChange={(e) => {
                                      setEditVideoPath(e.target.value);
                                      if (e.target.value) {
                                        setEditYouTubeId('');
                                      }
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                                    placeholder="Ej: academy/videos/archivo.mp4"
                                  />
                                </div>
    
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Opción B: Enlace o Código Embed de YouTube</label>
                                  <input
                                    type="text"
                                    value={editYouTubeId ? `https://youtube.com/watch?v=${editYouTubeId}` : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        setEditVideoPath('');
                                      }
                                      const id = extractYouTubeId(val);
                                      setEditYouTubeId(id || val);
                                    }}
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                                    placeholder="Pega URL (watch, shorts, embed) o <iframe>"
                                  />
                                  {editYouTubeId && (
                                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">
                                      ID detectado: {editYouTubeId}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
    
                            {/* Configuración de Metadatos de YouTube & Reglas Académicas (Solo si hay YouTube ID) */}
                            {editYouTubeId && (
                              <div className="bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-1">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Metadatos de YouTube</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Título de Referencia YouTube</label>
                                    <input
                                      type="text"
                                      value={editYouTubeTitle}
                                      onChange={(e) => setEditYouTubeTitle(e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                                      placeholder="Ej: Introducción a la Automatización"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Duración (Segundos)</label>
                                    <input
                                      type="number"
                                      value={editYouTubeDurationSeconds || ''}
                                      onChange={(e) => setEditYouTubeDurationSeconds(Number(e.target.value))}
                                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                                      placeholder="Ej: 360 (6 min)"
                                    />
                                  </div>
                                  <div className="md:col-span-3">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Miniatura YouTube Alternativa (URL)</label>
                                    <input
                                      type="text"
                                      value={editYouTubeThumbnailUrl}
                                      onChange={(e) => setEditYouTubeThumbnailUrl(e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                                      placeholder="Dejar en blanco para autodetectar de img.youtube.com"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
    
                            <div className="bg-slate-50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Restricciones Académicas & Miniatura</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Requerir Visualización</span>
                                    <span className="text-[9px] font-medium text-slate-400">Bloquea marcado manual hasta ver el mínimo</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEditRequireCompletion(!editRequireCompletion)}
                                    className={`w-12 h-6 rounded-full p-1 transition-all duration-350 flex items-center ${editRequireCompletion ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                                  >
                                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                  </button>
                                </div>
    
                                {editRequireCompletion ? (
                                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col justify-center animate-in slide-in-from-right-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visualización Mínima: {editMinimumWatchPercent}%</label>
                                    <input
                                      type="range"
                                      min="10"
                                      max="100"
                                      value={editMinimumWatchPercent}
                                      onChange={(e) => setEditMinimumWatchPercent(Number(e.target.value))}
                                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col justify-center">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Miniatura Personalizada (R2)</label>
                                    <input
                                      type="text"
                                      value={editThumbnailUrl}
                                      onChange={(e) => setEditThumbnailUrl(e.target.value)}
                                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                                      placeholder="Ej: academy/thumbnails/portada.jpg"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                        {/* SECCIÓN MATERIALES */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                          <label className="block text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center justify-between">
                            Materiales Adicionales
                            <button
                              onClick={() => setEditMateriales([...editMateriales, { name: '', url: '' }])}
                              className="text-blue-500 hover:text-blue-600 font-black text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Añadir Material
                            </button>
                          </label>

                          <div className="space-y-3">
                            {editMateriales.map((mat, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 animate-in fade-in">
                                <input
                                  type="text"
                                  placeholder="Nombre del recurso"
                                  value={mat.name}
                                  onChange={(e) => {
                                    const next = [...editMateriales];
                                    next[idx].name = e.target.value;
                                    setEditMateriales(next);
                                  }}
                                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                                />
                                <input
                                  type="text"
                                  placeholder="Enlace URL (https://...)"
                                  value={mat.url}
                                  onChange={(e) => {
                                    const next = [...editMateriales];
                                    next[idx].url = e.target.value;
                                    setEditMateriales(next);
                                  }}
                                  className="flex-2 px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                                />
                                <button
                                  onClick={() => setEditMateriales(editMateriales.filter((_, i) => i !== idx))}
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button
                          onClick={() => setIsEditMode(false)}
                          className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleUpdateLesson}
                          disabled={isSaving}
                          className="px-8 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>{isSaving ? 'Guardando...' : 'Guardar Lección'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE AJUSTES GENERALES ACADEMIA */}
      {isAcademySettingsModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                <span>Ajustes Generales de Academia</span>
              </h3>
              <button onClick={() => setIsAcademySettingsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAcademySettings} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Nombre de Academia</label>
                <input
                  type="text"
                  required
                  value={academySettingsForm.title}
                  onChange={(e) => setAcademySettingsForm({ ...academySettingsForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Descripción General de Bienvenida</label>
                <textarea
                  required
                  value={academySettingsForm.description}
                  onChange={(e) => setAcademySettingsForm({ ...academySettingsForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">URL del Logotipo / Logo Path</label>
                <input
                  type="text"
                  value={academySettingsForm.logo}
                  onChange={(e) => setAcademySettingsForm({ ...academySettingsForm, logo: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  placeholder="Ej: https://... o academy/banners/logo.png"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAcademySettingsModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAcademySettings}
                  className="flex-1 py-3 px-8 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm"
                >
                  {isSavingAcademySettings ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSavingAcademySettings ? 'Guardando...' : 'Guardar Ajustes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN DE CURSO */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <span>{editingCourseId ? 'Editar Curso Existente' : 'Crear Nuevo Curso'}</span>
              </h3>
              <button onClick={() => { setIsCourseModalOpen(false); setEditingCourseId(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Título del Curso</label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="Ej: Automatización con Zapier"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Descripción del Curso</label>
                <textarea
                  required
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Describe de qué trata el curso y qué aprenderán..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Categoría del Curso</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                  >
                    {ACADEMY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/20 p-4 border border-slate-100 dark:border-slate-800 rounded-xl justify-between shrink-0">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">¿Curso Premium?</span>
                    <span className="text-[9px] font-medium text-slate-400">Sólo planes de pago</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, is_premium: !courseForm.is_premium })}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${courseForm.is_premium ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/20 p-4 border border-slate-100 dark:border-slate-800 rounded-xl justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">¿Publicado / Visible?</span>
                  <span className="text-[9px] font-medium text-slate-400">Si está inactivo, sólo admins podrán visualizarlo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCourseForm({ ...courseForm, is_published: !courseForm.is_published })}
                  className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${courseForm.is_published ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Imagen de Portada (Thumbnail)</label>
                
                <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 mb-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 italic">Ruta o URL externa</label>
                  <input 
                    type="text" 
                    value={courseForm.thumbnail_url} 
                    onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })} 
                    placeholder="Ej: https://..."
                    className="w-full px-4 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div className="relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadThumbnail(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`p-8 border-2 border-dashed rounded-3xl text-center transition-all ${courseForm.thumbnail_url ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>
                    {courseForm.thumbnail_url ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                        <img src={academyMediaUrl(courseForm.thumbnail_url)} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Click para subir imagen</p>
                      </div>
                    )}
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-3xl z-20">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-blue-600">{uploadProgress}%</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCourseModalOpen(false);
                    setEditingCourseId(null);
                  }}
                  className="flex-1 py-3 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCourse || !courseForm.title}
                  className="flex-2 py-3 px-8 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm"
                >
                  {isCreatingCourse ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {isCreatingCourse ? 'Guardando...' : (editingCourseId ? 'Guardar Cambios' : 'Crear Curso')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN CUSTOM */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirmación</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {confirmDialog.message}
              </p>
              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                    confirmDialog.onConfirm();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all text-sm"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
