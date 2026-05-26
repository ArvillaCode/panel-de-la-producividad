import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.jsx';
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
  Gem
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { uploadToAcademyR2, academyMediaUrl } from '../../../lib/academyR2Upload.js';

// --- INTERFACES ---
interface Lesson {
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

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  category: string;
  is_premium: boolean;
  is_published?: boolean;
  slug?: string;
}

// --- CONSTANTES GLOBALES ---
const CATEGORY_COLORS: Record<string, string> = {
  "General": "bg-slate-500",
  "Inteligencia Artificial": "bg-purple-600",
  "Automatización": "bg-blue-600",
  "Marketing": "bg-pink-600",
  "Ventas": "bg-emerald-600",
  "Estrategia": "bg-amber-600",
  "Premium": "bg-gradient-to-r from-indigo-600 to-purple-600"
};

const ACADEMY_CATEGORIES = ["General", "Inteligencia Artificial", "Automatización", "Marketing", "Ventas", "Estrategia"];

function parseLessonMaterials(materiales: unknown) {
  if (Array.isArray(materiales)) return materiales;
  if (typeof materiales !== 'string') return [];

  try {
    const parsed = JSON.parse(materiales);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatAcademyLesson(lesson: any): Lesson {
  const videoPath = String(lesson.video_path || '').trim();
  const thumbnailUrl = String(lesson.thumbnail_url || '').trim();

  return {
    ...lesson,
    video_path: videoPath,
    thumbnail_url: thumbnailUrl,
    materiales: parseLessonMaterials(lesson.materiales),
    is_completed: false,
    duration: "Video",
    video_url: academyMediaUrl(videoPath),
    thumb_url: academyMediaUrl(thumbnailUrl)
  };
}

// --- HELPER PARA DETECTAR Y OBTENER URL DE INCRUSTACIÓN (GOOGLE DRIVE, YOUTUBE, VIMEO) ---
function getEmbedUrl(url: string) {
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

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(String(url || '').trim());
}

function looksLikeDirectVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(String(url || '').trim());
}

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
  const { isAdmin, profile, systemConfig, loading } = useAuth();
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
  const [showAdminMenu, setShowAdminMenu] = useState(false);

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

  const filteredCourses = useMemo(() => (
    courses.filter((course) => {
      if (course.slug === 'global-academy-settings') return false;
      if (showOnlyPremium) return course.is_premium;
      return selectedCategory === 'Todas' || course.category === selectedCategory;
    })
  ), [courses, selectedCategory, showOnlyPremium]);

  const handleSaveAcademySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAcademySettings(true);
    try {
      const slug = 'global-academy-settings';
      const globalSettingsCourse = courses.find(c => c.slug === slug);
      
      if (globalSettingsCourse) {
        const { error } = await supabase
          .from('academy_courses')
          .update({ title: academySettingsForm.title, description: academySettingsForm.description, thumbnail_url: academySettingsForm.logo })
          .eq('id', globalSettingsCourse.id);
        if (error) throw error;
        
        setCourses(prev => prev.map(c => c.id === globalSettingsCourse.id ? { ...c, title: academySettingsForm.title, description: academySettingsForm.description, thumbnail_url: academySettingsForm.logo } : c));
      } else {
        const { data, error } = await supabase
          .from('academy_courses')
          .insert([{ title: academySettingsForm.title, description: academySettingsForm.description, thumbnail_url: academySettingsForm.logo, slug, category: 'System', is_published: false }])
          .select();
        if (error) throw error;
        setCourses(prev => [...prev, data[0]]);
      }
      setIsAcademySettingsModalOpen(false);
    } catch (error) {
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
    } catch (error) {
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
      const slug = courseForm.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (editingCourseId) {
        const { data, error } = await supabase
          .from('academy_courses')
          .update({ ...courseForm, slug })
          .eq('id', editingCourseId)
          .select();

        if (error) throw error;
        setCourses(prev => prev.map(c => c.id === editingCourseId ? data[0] : c));
        if (selectedCourse?.id === editingCourseId) {
          setSelectedCourse(data[0]);
        }
      } else {
        const { data, error } = await supabase
          .from('academy_courses')
          .insert([{ ...courseForm, slug }])
          .select();

        if (error) throw error;
        setCourses(prev => [...prev, data[0]]);
      }

      setIsCourseModalOpen(false);
      setEditingCourseId(null);
      setCourseForm({ title: '', description: '', thumbnail_url: '', category: 'General', is_premium: false, is_published: true });
    } catch (error) {
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
        const { error } = await supabase.from('academy_courses').delete().eq('id', id);
        if (error) throw error;
        setCourses(courses.filter(c => c.id !== id));
        if (selectedCourse?.id === id) {
          setView('courses');
          setSelectedCourse(null);
        }
      } catch (error) {
        toast.error("Error al borrar curso");
      }
    });
  };

  const handleDeleteLesson = async (id: string, moduleId: string) => {
    requestConfirm("¿Borrar esta lección?", async () => {

    try {
      const { error } = await supabase.from('academy_lessons').delete().eq('id', id);
      if (error) throw error;

      setModules(prev => prev.map(mod => {
        if (mod.id === moduleId) {
          return { ...mod, lessons: mod.lessons.filter(l => l.id !== id) };
        }
        return mod;
      }));

      if (activeLesson?.id === id) setActiveLesson(null);
    } catch (error) {
      toast.error("Error al borrar lección");
    }
    });
  };

  const handleDeleteModule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    requestConfirm("¿Borrar este módulo y todas sus lecciones?", async () => {

    try {
      const { error } = await supabase.from('academy_modules').delete().eq('id', id);
      if (error) throw error;
      setModules(prev => prev.filter(m => m.id !== id));
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
      const { error } = await supabase
        .from('academy_lessons')
        .update({
          title: editTitle,
          description: editDescription,
          video_path: editVideoPath,
          thumbnail_url: editThumbnailUrl,
          materiales: editMateriales
        })
        .eq('id', activeLesson.id);

      if (error) throw error;

      const updatedLesson = {
        title: editTitle,
        description: editDescription,
        video_path: editVideoPath,
        thumbnail_url: editThumbnailUrl,
        materiales: Array.isArray(editMateriales) ? editMateriales : []
      };

      // Actualizar estado local
      setModules(prev => prev.map(mod => ({
        ...mod,
        lessons: mod.lessons.map(l => l.id === activeLesson.id ? {
          ...l,
          ...updatedLesson,
          video_url: editVideoPath ? academyMediaUrl(editVideoPath) : '',
          thumb_url: editThumbnailUrl ? academyMediaUrl(editThumbnailUrl) : ''
        } : l)
      })));

      setActiveLesson(prev => prev ? ({
        ...prev,
        ...updatedLesson,
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
      setVideoError(false);
    }
  }, [activeLesson]);

  // --- INTEGRACIÓN SUPABASE ---
  // 1. Cargar cursos al montar el componente (y cuando cambie el rol de admin)
  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('academy_courses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          query = query.or('is_published.is.true,is_published.is.null');
        }

        const { data: coursesData, error: coursesError } = await query;

        if (!coursesError && coursesData) {
          setCourses(coursesData);
        } else if (coursesError) {
          throw coursesError;
        }
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
      try {
        setIsLoading(true);
        setModules([]);
        setActiveLesson(null);
        setVideoError(false);

        const { data: modulesData, error: modulesError } = await supabase
          .from('academy_modules')
          .select('id, title, order_index, created_at')
          .eq('course_id', selectedCourse.id)
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });

        if (modulesError) throw modulesError;

        const moduleIds = (modulesData || []).map((mod: any) => mod.id);
        const lessonsById = new Map<string, any>();

        if (moduleIds.length > 0) {
          const { data: lessonsByModule, error: lessonsByModuleError } = await supabase
            .from('academy_lessons')
            .select('id, title, description, video_path, order_index, materiales, is_visible, thumbnail_url, module_id, course_id')
            .in('module_id', moduleIds)
            .order('order_index', { ascending: true });

          if (lessonsByModuleError) throw lessonsByModuleError;
          (lessonsByModule || []).forEach((lesson: any) => lessonsById.set(String(lesson.id), lesson));
        }

        const { data: lessonsByCourse, error: lessonsByCourseError } = await supabase
          .from('academy_lessons')
          .select('id, title, description, video_path, order_index, materiales, is_visible, thumbnail_url, module_id, course_id')
          .eq('course_id', selectedCourse.id)
          .order('order_index', { ascending: true });

        if (lessonsByCourseError) throw lessonsByCourseError;
        (lessonsByCourse || []).forEach((lesson: any) => lessonsById.set(String(lesson.id), lesson));

        const visibleLessons = Array.from(lessonsById.values())
          .filter((lesson: any) => isAdmin || lesson.is_visible !== false)
          .map(formatAcademyLesson);

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

        const knownModuleIds = new Set(moduleIds.map(String));
        const orphanLessons = visibleLessons.filter((lesson) => !lesson.module_id || !knownModuleIds.has(String(lesson.module_id)));
        if (orphanLessons.length > 0) {
          formattedModules.push({
            id: `course-${selectedCourse.id}-content`,
            title: 'Contenido del curso',
            lessons: orphanLessons
          });
        }

        setModules(formattedModules);

        // Auto-seleccionar lección desde la URL
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
        if (foundLesson) {
          setActiveLesson(foundLesson);
          setExpandedModules({ [foundModuleId!]: true });
        } else if (firstModuleWithLessons) {
          setActiveLesson(firstModuleWithLessons.lessons[0]);
          setExpandedModules({ [firstModuleWithLessons.id]: true });
        } else {
          setActiveLesson(null);
          setExpandedModules({});
        }
      } catch (error) {
        console.error("Error loading lessons:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessonsData();
  }, [selectedCourse, isAdmin]);

  // Cargar progreso completado desde localStorage
  useEffect(() => {
    if (modules.length === 0) return;
    const completedLessons = JSON.parse(localStorage.getItem('academy_completed') || '[]');
    if (completedLessons.length === 0) return;
    setModules(prev => prev.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(l => completedLessons.includes(l.id) ? { ...l, is_completed: true } : l)
    })));
    if (activeLesson && completedLessons.includes(activeLesson.id)) {
      setActiveLesson(prev => prev ? { ...prev, is_completed: true } : null);
    }
  }, [modules.length > 0]);

  // --- HANDLERS ---
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
    const completedLessons = JSON.parse(localStorage.getItem('academy_completed') || '[]');
    if (!completedLessons.includes(activeLesson.id)) {
      completedLessons.push(activeLesson.id);
      localStorage.setItem('academy_completed', JSON.stringify(completedLessons));
    }
    setModules(prev => (prev || []).map(mod => ({
      ...mod,
      lessons: (mod.lessons || []).map(les =>
        les.id === activeLesson.id ? { ...les, is_completed: true } : les
      )
    })));
    setActiveLesson(prev => prev ? ({ ...prev, is_completed: true }) : null);
    toast.success("Lección marcada como completada");
  };

  const isAcademiaEnabled = systemConfig?.showAcademia !== false || isAdmin || profile?.role === 'admin';

  if (!loading && !isAcademiaEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <div className="glass-card border border-white/10 p-10 rounded-3xl max-w-md w-full text-center shadow-2xl relative overflow-hidden backdrop-blur-xl bg-white/5">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>

          <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>

          <h2 className="text-2xl font-black tracking-tight mb-3 uppercase italic">
            Módulo Desactivado
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            La academia se encuentra actualmente en mantenimiento o actualización de contenidos por parte de la administración. Vuelve a intentarlo más tarde.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to={isAdmin ? "/admin/dashboard" : "/"}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              {isAdmin ? 'Panel Maestro' : 'Ir al Inicio'}
            </Link>

            {isAdmin && (
              <>
                {/* Botones visibles en desktop + botón "..." en mobile */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => {
                      const globalSettings = courses.find(c => c.slug === 'global-academy-settings');
                      setAcademySettingsForm({
                        title: globalSettings?.title || 'UpFunnel Academy',
                        description: globalSettings?.description || 'Domina el Panel de la Productividad con nuestros recursos y cursos premium.',
                        logo: globalSettings?.thumbnail_url || ''
                      });
                      setIsAcademySettingsModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
                    title="Ajustes de Academia"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Ajustes</span>
                  </button>

                  <Link
                    to="/dashboard/academia/admin"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Creador de Contenido
                  </Link>

                  <button
                    onClick={() => {
                      if (isEditMode && activeLesson) {
                        const hasUnsavedChanges = 
                          editTitle !== (activeLesson.title || '') ||
                          editDescription !== (activeLesson.description || '') ||
                          editVideoPath !== (activeLesson.video_path || '') ||
                          editThumbnailUrl !== (activeLesson.thumbnail_url || '') ||
                          JSON.stringify(editMateriales) !== JSON.stringify(activeLesson.materiales || []);

                        if (hasUnsavedChanges) {
                          requestConfirm("Tienes cambios sin guardar en la lección actual. ¿Estás seguro de que quieres salir del modo edición y perder estos cambios?", () => {
                            setIsEditMode(!isEditMode);
                          });
                          return;
                        }
                      }
                      setIsEditMode(!isEditMode);
                    }}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${isEditMode ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
                    {isEditMode ? 'Modo Edición Activo' : 'Modo Edición'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingCourseId(null);
                      setCourseForm({ title: '', description: '', thumbnail_url: '', category: 'General', is_premium: false, is_published: true });
                      setIsCourseModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir Curso
                  </button>
                </div>

                {/* Botón menú hamburguesa solo mobile */}
                <div className="sm:hidden relative">
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    title="Opciones de administración"
                  >
                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                  {showAdminMenu && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => { setShowAdminMenu(false); setIsAcademySettingsModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Ajustes
                      </button>
                      <Link
                        to="/dashboard/academia/admin"
                        onClick={() => setShowAdminMenu(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                      >
                        <Save className="w-4 h-4" /> Creador de Contenido
                      </Link>
                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          if (isEditMode && activeLesson) {
                            const hasUnsavedChanges = 
                              editTitle !== (activeLesson.title || '') ||
                              editDescription !== (activeLesson.description || '') ||
                              editVideoPath !== (activeLesson.video_path || '') ||
                              editThumbnailUrl !== (activeLesson.thumbnail_url || '') ||
                              JSON.stringify(editMateriales) !== JSON.stringify(activeLesson.materiales || []);
                            if (hasUnsavedChanges) {
                              requestConfirm("Tienes cambios sin guardar...", () => setIsEditMode(!isEditMode));
                              return;
                            }
                          }
                          setIsEditMode(!isEditMode);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${isEditMode ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        {isEditMode ? 'Desactivar Edición' : 'Modo Edición'}
                      </button>
                      <hr className="my-1 border-slate-100 dark:border-slate-800" />
                      <button
                        onClick={() => { setShowAdminMenu(false); setEditingCourseId(null); setCourseForm({ title: '', description: '', thumbnail_url: '', category: 'General', is_premium: false, is_published: true }); setIsCourseModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Añadir Curso
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
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
            {isLoading ? (
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
                <div
                  key={course.id}
                  onClick={() => {
                    navigate(`/dashboard/academia?course=${course.id}`);
                  }}
                  className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer hover:-translate-y-2 active:scale-[0.98] active:shadow-md"
                >
                    <div className="aspect-[16/9] relative overflow-hidden">
                      {(() => {
                        const src = academyMediaUrl(course.thumbnail_url);
                        const fallback = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800';
                        return (
                          <img
                            src={src || fallback}
                            alt={course.title}
                            onError={(e) => {
                              if ((e.target as HTMLImageElement).src !== fallback) {
                                (e.target as HTMLImageElement).src = fallback;
                              }
                            }}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        );
                      })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 ${CATEGORY_COLORS[course.category] || 'bg-slate-600'} backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg`}>
                        {course.category || 'General'}
                      </span>
                    </div>

                    {isAdmin && isEditMode && (
                      <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <button
                          onClick={(e) => handleEditCourseClick(course, e)}
                          className="p-2 bg-blue-500/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
                          title="Editar Curso"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCourse(course.id, e)}
                          className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
                          title="Borrar Curso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-500 transition-colors">{course.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{course.description}</p>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest">Mastery Level</span>
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-sm">
                        Entrar <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )))}
          </div>
        )}

        {/* LAYOUT DE LECCIONES */}
        {view === 'lessons' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">

            {/* SIDEBAR */}
            <div className="w-full lg:w-[380px] shrink-0 order-2 lg:order-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-auto lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h2 className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  Contenido del curso
                  <span className="text-xs font-normal text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
                    {(modules || []).reduce((acc, m) => acc + (m.lessons || []).length, 0)} lecciones
                  </span>
                </h2>
              </div>

              <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                      <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
                    </div>
                    <div className="space-y-2 pt-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                      <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
                      <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
                    </div>
                  </div>
                ) : (
                  (modules || []).map((module) => {
                    const isExpanded = expandedModules[module.id];
                    const moduleLessons = module.lessons || [];
                    const moduleLessonsCompleted = moduleLessons.filter(l => l.is_completed).length;
                    const progress = Math.round((moduleLessonsCompleted / moduleLessons.length) * 100) || 0;

                    return (
                      <div key={module.id} className="mb-2">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full flex flex-col p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                {module.title}
                              </span>
                              {isAdmin && isEditMode && (
                                <button
                                  onClick={(e) => handleDeleteModule(module.id, e)}
                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <ChevronDownIcon
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                          <div className="flex items-center gap-2 w-full">
                            <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 w-8 text-right">
                              {progress}%
                            </span>
                          </div>
                        </button>

                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden flex flex-col gap-1 px-2 pb-3">
                            {(module.lessons || []).map((lesson, lIdx) => {
                              const isActive = activeLesson?.id === lesson.id;
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => handleLessonSelect(lesson)}
                                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200
                                  ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm border border-blue-100 dark:border-blue-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}`}
                                >
                                  <div className="shrink-0 mt-0.5">
                                    {lesson.is_completed ? (
                                      <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    ) : isActive ? (
                                      <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <PlayIcon className="w-3 h-3" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{lIdx + 1}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                    <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                      {lesson.title}
                                    </p>
                                    {isAdmin && isEditMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteLesson(lesson.id, module.id);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }))}
              </div>
            </div>

            {/* ÁREA DE CONTENIDO */}
            <div className="flex-1 w-full order-1 lg:order-2 flex flex-col gap-6">
              {isLoading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="w-full bg-slate-200 dark:bg-slate-850 rounded-3xl aspect-video"></div>
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-5/6"></div>
                  </div>
                </div>
              ) : !activeLesson ? (
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
                    onClick={() => navigate('/dashboard/academia')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Volver a Cursos
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center">
                    {(() => {
                      const finalUrl = activeLesson.video_url || academyMediaUrl(activeLesson.video_path);
                      const embedUrl = getEmbedUrl(finalUrl);
                      const isExternalVideo = isHttpUrl(activeLesson.video_path || '');
                      const shouldFrameExternalUrl = isExternalVideo && !looksLikeDirectVideoUrl(finalUrl);

                      if (!finalUrl) {
                        return (
                          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-full text-center">
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
                          <iframe
                            key={activeLesson.id}
                            title={activeLesson.title || 'Video de la leccion'}
                            src={embedUrl || finalUrl}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            referrerPolicy="strict-origin-when-cross-origin"
                            sandbox="allow-scripts allow-same-origin allow-popups"
                            allowFullScreen
                          />
                        );
                      }

                      if (videoError) {
                        const isExternalVideo = isHttpUrl(activeLesson.video_path || '');
                        return (
                          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/90 rounded-2xl w-full h-full text-center">
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
                        <video
                          key={activeLesson.id}
                          src={finalUrl}
                          preload="metadata"
                          poster={activeLesson.thumb_url || academyMediaUrl(activeLesson.thumbnail_url)}
                          controls
                          controlsList="nodownload"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('[ACADEMY_VIDEO_ERROR]', {
                              src: e.currentTarget.currentSrc || e.currentTarget.src,
                              original: activeLesson.video_path
                            });
                            setVideoError(true);
                          }}
                          onTimeUpdate={(e) => {
                            const video = e.currentTarget;
                            // Guardar el segundo actual en localStorage
                            localStorage.setItem(`lesson-time-${activeLesson.id}`, String(video.currentTime));
                          }}
                          onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            const savedTime = localStorage.getItem(`lesson-time-${activeLesson.id}`);
                            if (savedTime && parseFloat(savedTime) > 1) {
                              video.currentTime = parseFloat(savedTime);
                            }
                          }}
                        />
                      );
                    })()}
                  </div>
                  
                  {/* Alerta amigable para Google Drive */}
                  {activeLesson && activeLesson.video_path && (activeLesson.video_path.includes('drive.google.com') || activeLesson.video_path.includes('docs.google.com')) && (
                    <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                      <span className="text-sm shrink-0">💡</span>
                      <span className="leading-relaxed">
                        <strong>Tip de Google Drive:</strong> Si visualizas un error de acceso o la pantalla negra en el reproductor, asegúrate de compartir el archivo en tu Drive de forma pública como <strong>"Cualquier persona con el enlace puede ver"</strong>.
                      </span>
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative">
                    {isEditMode ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div>
                          <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Título de la Lección</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Enlace del Video o Ruta (Google Drive, YouTube o R2)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editVideoPath}
                              onChange={(e) => setEditVideoPath(e.target.value)}
                              className="flex-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                              placeholder="Ej: https://drive.google.com/... o academy/videos/video.mp4"
                            />
                            <input
                              type="file"
                              accept="video/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploadingEditVideo(true);
                                try {
                                  const filename = await uploadToAcademyR2(file, 'videos');
                                  setEditVideoPath(filename);
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Error al subir video");
                                } finally {
                                  setIsUploadingEditVideo(false);
                                }
                              }}
                              className="hidden"
                              id="edit-video-input"
                            />
                            <label
                              htmlFor="edit-video-input"
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 flex items-center justify-center transition-all whitespace-nowrap"
                            >
                              {isUploadingEditVideo ? 'Subiendo...' : 'Subir'}
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Ruta o URL de la Miniatura</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editThumbnailUrl}
                              onChange={(e) => setEditThumbnailUrl(e.target.value)}
                              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                              placeholder="Ej: academy/thumbnails/miniatura.jpg o URL externa"
                            />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setIsUploadingEditThumb(true);
                                try {
                                  const filename = await uploadToAcademyR2(file, 'thumbnails');
                                  setEditThumbnailUrl(filename);
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Error al subir miniatura");
                                } finally {
                                  setIsUploadingEditThumb(false);
                                }
                              }}
                              className="hidden"
                              id="edit-thumb-input"
                            />
                            <label
                              htmlFor="edit-thumb-input"
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 flex items-center justify-center transition-all"
                            >
                              {isUploadingEditThumb ? 'Subiendo...' : 'Subir'}
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Descripción</label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={6}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Materiales y Recursos</label>
                          {(Array.isArray(editMateriales) ? editMateriales : []).map((m, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                              <input 
                                type="text" placeholder="Nombre (Ej: Guía en PDF)" 
                                value={m.nombre || ''} 
                                onChange={(e) => {
                                  const nm = [...(Array.isArray(editMateriales) ? editMateriales : [])]; nm[idx] = { ...nm[idx], nombre: e.target.value }; setEditMateriales(nm);
                                }}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                              />
                              <input 
                                type="text" placeholder="URL del recurso" 
                                value={m.url || ''} 
                                onChange={(e) => {
                                  const nm = [...(Array.isArray(editMateriales) ? editMateriales : [])]; nm[idx] = { ...nm[idx], url: e.target.value }; setEditMateriales(nm);
                                }}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                              />
                              <button type="button" onClick={() => setEditMateriales((Array.isArray(editMateriales) ? editMateriales : []).filter((_, i) => i !== idx))} className="px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all" title="Eliminar recurso">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            type="button"
                            onClick={() => setEditMateriales([...(Array.isArray(editMateriales) ? editMateriales : []), {nombre: '', url: ''}])}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 mt-2"
                          >
                            <Plus className="w-3 h-3" /> Añadir Recurso
                          </button>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => setIsEditMode(false)}
                            className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleUpdateLesson}
                            disabled={isSaving}
                            className="px-8 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all flex items-center gap-2"
                          >
                            {isSaving ? 'Guardando...' : (
                              <>
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => navigate(`/dashboard/academia?course=${selectedCourse?.id}`)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors active:scale-95"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            Volver a Cursos
                          </button>
                          <span className="text-xs text-slate-400">{modules.reduce((acc, m) => acc + m.lessons.length, 0)} lecciones</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{activeLesson.title}</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                          {activeLesson.description || ''}
                        </p>
                        <div className="mt-6 flex items-center gap-3">
                          <button
                            onClick={markAsCompleted}
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                              activeLesson.is_completed
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                            }`}
                          >
                            <CheckCircleIcon className="w-5 h-5" />
                            {activeLesson.is_completed ? 'Completada' : 'Marcar como completada'}
                          </button>
                        </div>
                      </>
                    )}

                    {(Array.isArray(activeLesson.materiales) && activeLesson.materiales.length > 0) && (
                      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase mb-4">Materiales de apoyo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeLesson.materiales.map((material: any, idx: number) => (
                            <a key={idx} href={material.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-blue-50/50 transition-colors">
                              <DownloadIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-sm font-medium truncate">{material.nombre}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante para índice de lecciones en mobile */}
      {view === 'lessons' && (
        <button
          onClick={() => {
            const sidebar = document.querySelector('.lg\\:w-\\[380px\\]');
            if (sidebar) sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="lg:hidden fixed bottom-6 right-6 z-50 min-w-[56px] min-h-[56px] bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center active:scale-90 transition-transform"
          title="Ver índice de lecciones"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
      )}

      {/* MODAL AJUSTES ACADEMIA */}
      {isAcademySettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 custom-scrollbar">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg sm:text-xl font-bold">Ajustes de la Academia</h2>
              <button onClick={() => setIsAcademySettingsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAcademySettings} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Título de la Academia</label>
                <input
                  type="text"
                  value={academySettingsForm.title}
                  onChange={(e) => setAcademySettingsForm({ ...academySettingsForm, title: e.target.value })}
                  placeholder="Ej: UpFunnel Academy"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Descripción / Subtítulo</label>
                <textarea
                  value={academySettingsForm.description}
                  onChange={(e) => setAcademySettingsForm({ ...academySettingsForm, description: e.target.value })}
                  placeholder="Domina el Panel con nuestros cursos..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">URL del Logo (Opcional)</label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={academySettingsForm.logo}
                    onChange={(e) => setAcademySettingsForm({ ...academySettingsForm, logo: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Puedes subir tu logo a R2 usando el botón de crear curso y copiar aquí la URL generada, o pegar la URL de cualquier imagen.</p>
              </div>

              {academySettingsForm.logo && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center">
                  <img src={academyMediaUrl(academySettingsForm.logo)} alt="Preview Logo" className="max-h-16 object-contain" />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAcademySettingsModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAcademySettings || !academySettingsForm.title}
                  className="flex-2 py-3 px-8 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isSavingAcademySettings ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSavingAcademySettings ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREACIÓN CURSO */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 custom-scrollbar">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg sm:text-xl font-bold">{editingCourseId ? 'Editar Curso' : 'Crear Nuevo Curso'}</h2>
              <button onClick={() => {
                setIsCourseModalOpen(false);
                setEditingCourseId(null);
              }} className="p-3 min-w-[44px] min-h-[44px] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Título del Curso</label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="Ej: Master en Automatización"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-500">Descripción</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={3}
                  placeholder="Explica de qué trata este curso..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-500">Categoría</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all cursor-pointer"
                  >
                    {ACADEMY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-500">Tipo de Acceso</label>
                  <button
                    type="button"
                    onClick={() => setCourseForm({ ...courseForm, is_premium: !courseForm.is_premium })}
                    className={`w-full px-4 py-3 rounded-2xl border transition-all flex items-center justify-between
                      ${courseForm.is_premium
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                  >
                    <span className="text-sm font-semibold">{courseForm.is_premium ? '💎 Premium' : 'Gratis / General'}</span>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${courseForm.is_premium ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${courseForm.is_premium ? 'right-1' : 'left-1'}`} />
                    </div>
                  </button>
                </div>
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
                  className="flex-1 py-3 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCourse || !courseForm.title}
                  className="flex-2 py-3 px-8 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
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
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                    confirmDialog.onConfirm();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
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
