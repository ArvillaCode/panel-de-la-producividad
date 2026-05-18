"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth.jsx';
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
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

// --- HELPER PARA DETECTAR Y OBTENER URL DE INCRUSTACIÓN (GOOGLE DRIVE, YOUTUBE, VIMEO) ---
function getEmbedUrl(url: string) {
  if (!url) return null;
  
  // Google Drive
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
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

export default function AcademyDashboard() {
  // --- ESTADOS ---
  const [view, setView] = useState<'courses' | 'lessons'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('course') ? 'lessons' : 'courses';
    }
    return 'courses';
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [showOnlyPremium, setShowOnlyPremium] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin, profile, systemConfig, loading } = useAuth();
  
  // --- MODO EDICIÓN ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVideoPath, setEditVideoPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const location = window.location;

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
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadThumbnail = async (file: File) => {
    try {
      setUploadProgress(10);
      const filename = await uploadToAcademyR2(file, 'courses');
      setUploadProgress(100);
      setCourseForm(prev => ({ ...prev, thumbnail_url: filename }));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error al subir miniatura");
    } finally {
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.description) return alert("Completa los campos");
    
    setIsCreatingCourse(true);
    try {
      // Generar slug automáticamente
      const slug = courseForm.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data, error } = await supabase
        .from('academy_courses')
        .insert([{ ...courseForm, slug }])
        .select();

      if (error) throw error;
      
      setCourses(prev => [...prev, data[0]]);
      setIsCourseModalOpen(false);
      setCourseForm({ title: '', description: '', thumbnail_url: '', category: 'General' });
    } catch (error) {
      console.error(error);
      console.error("Error creating course:", error);
      alert(`Error al crear curso: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de borrar este curso? Se eliminarán todos sus módulos y lecciones.")) return;
    
    try {
      const { error } = await supabase.from('academy_courses').delete().eq('id', id);
      if (error) throw error;
      setCourses(courses.filter(c => c.id !== id));
      if (selectedCourse?.id === id) {
        setView('courses');
        setSelectedCourse(null);
      }
    } catch (error) {
      alert("Error al borrar curso");
    }
  };

  const handleDeleteLesson = async (id: string, moduleId: string) => {
    if (!confirm("¿Borrar esta lección?")) return;
    
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
      alert("Error al borrar lección");
    }
  };

  const handleDeleteModule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Borrar este módulo y todas sus lecciones?")) return;
    
    try {
      const { error } = await supabase.from('academy_modules').delete().eq('id', id);
      if (error) throw error;
      setModules(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      alert("Error al borrar módulo");
    }
  };

  const handleUpdateLesson = async () => {
    if (!activeLesson) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('academy_lessons')
        .update({
          title: editTitle,
          description: editDescription,
          video_path: editVideoPath
        })
        .eq('id', activeLesson.id);

      if (error) throw error;
      
      // Actualizar estado local
      setModules(prev => prev.map(mod => ({
        ...mod,
        lessons: mod.lessons.map(l => l.id === activeLesson.id ? { 
          ...l, 
          title: editTitle, 
          description: editDescription, 
          video_path: editVideoPath,
          video_url: editVideoPath ? academyMediaUrl(editVideoPath) : ''
        } : l)
      })));
      
      setActiveLesson(prev => ({ 
        ...prev, 
        title: editTitle, 
        description: editDescription, 
        video_path: editVideoPath,
        video_url: editVideoPath ? academyMediaUrl(editVideoPath) : ''
      }));
      
      setIsEditMode(false);
      alert("Lección actualizada correctamente.");
    } catch (error) {
      alert("Error al actualizar lección");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (activeLesson) {
      setEditTitle(activeLesson.title || '');
      setEditDescription(activeLesson.description || '');
      setEditVideoPath(activeLesson.video_path || '');
    }
  }, [activeLesson]);

  // --- INTEGRACIÓN SUPABASE ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 1. Fetch Cursos
        const { data: coursesData, error: coursesError } = await supabase
          .from('academy_courses')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!coursesError && coursesData) {
          setCourses(coursesData);
          
          // --- AUTO-SELECCIONAR CURSO DESDE URL EN EL PRIMER LOAD ---
          const params = new URLSearchParams(window.location.search);
          const courseIdFromUrl = params.get('course');
          if (courseIdFromUrl && !selectedCourse) {
            const matchedCourse = coursesData.find(c => String(c.id) === courseIdFromUrl);
            if (matchedCourse) {
              setSelectedCourse(matchedCourse);
              setView('lessons');
              setIsLoading(false);
              return; // Detener para que el cambio de selectedCourse dispare el siguiente useEffect de carga
            }
          }
        }

        // Si hay un curso seleccionado, cargamos sus lecciones
        if (selectedCourse) {
          let query = supabase
            .from('academy_modules')
            .select(`
              id, title,
              academy_lessons ( id, title, description, video_path, order_index, materiales, is_visible, thumbnail_url )
            `)
            .eq('course_id', selectedCourse.id);

          if (!isAdmin) {
            // Filtros adicionales si aplica
          }

          const { data, error } = await query
            .order('order_index', { ascending: true })
            .order('order_index', { referencedTable: 'academy_lessons', ascending: true });
          
          if (!error && data) {
            // Fusionar módulos por Título para no perder lecciones de duplicados
            const modulesMap = new Map();
            
            data.forEach((mod: any) => {
              const existing = modulesMap.get(mod.title);
              const lessons = (mod.academy_lessons || []).map((lesson: any) => ({
                ...lesson,
                is_completed: false,
                duration: "Video",
                video_url: lesson.video_path ? academyMediaUrl(lesson.video_path) : '',
                thumb_url: lesson.thumbnail_url ? academyMediaUrl(lesson.thumbnail_url) : ''
              }));

              if (existing) {
                existing.lessons = [...existing.lessons, ...lessons];
              } else {
                modulesMap.set(mod.title, {
                  id: mod.id,
                  title: mod.title,
                  lessons: lessons
                });
              }
            });

            const formattedModules = Array.from(modulesMap.values()).map(mod => ({
              ...mod,
              lessons: mod.lessons.filter((l: any) => isAdmin || l.is_visible !== false)
                .map((lesson: any) => ({
                    ...lesson,
                    video_url: lesson.video_path ? academyMediaUrl(lesson.video_path) : '',
                    thumb_url: lesson.thumbnail_url ? academyMediaUrl(lesson.thumbnail_url) : ''
                  }))
            }));
            
            setModules(formattedModules);
            
            // --- AUTO-SELECCIONAR LECCIÓN DESDE URL ---
            const params = new URLSearchParams(window.location.search);
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

            if (foundLesson) {
              setActiveLesson(foundLesson);
              setExpandedModules({ [foundModuleId!]: true });
            } else if (formattedModules[0]?.lessons.length > 0) {
              setActiveLesson(formattedModules[0].lessons[0]);
              setExpandedModules({ [formattedModules[0].id]: true });
            }
          }
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCourse, isAdmin]);

  // --- HANDLERS ---
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleLessonSelect = (lesson: Lesson) => {
    setActiveLesson(lesson);
    const params = new URLSearchParams(window.location.search);
    params.set('lesson', lesson.id);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const markAsCompleted = () => {
    setModules(prev => (prev || []).map(mod => ({
      ...mod,
      lessons: (mod.lessons || []).map(les =>
        les.id === activeLesson?.id ? { ...les, is_completed: true } : les
      )
    })));
    if (activeLesson) setActiveLesson(prev => prev ? ({ ...prev, is_completed: true }) : null);
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

        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {view === 'lessons' && (
                <button 
                  onClick={() => { 
                    setView('courses'); 
                    setSelectedCourse(null); 
                    setModules([]); 
                    setActiveLesson(null); 
                    window.history.pushState({}, '', window.location.pathname);
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
              )}
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {view === 'courses' ? 'Upfunne Academy' : (selectedCourse?.title || 'Cargando curso...')}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
              {view === 'courses' 
                ? 'Domina el Panel de la Productividad con nuestros recursos y cursos premium.' 
                : (selectedCourse?.description || 'Cargando detalles del curso...')}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <Link 
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Dashboard Principal
              </Link>
              
              <Link 
                to="/dashboard/academia/admin"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Creador de Contenido
              </Link>

              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${isEditMode ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
                {isEditMode ? 'Modo Edición Activo' : 'Modo Edición'}
              </button>

              <button 
                onClick={() => setIsCourseModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                Añadir Curso
              </button>
            </div>
          )}
        </div>

        {/* FILTROS POR CATEGORÍA */}
        {view === 'courses' && (
          <div className="mb-10 flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
            <button
              onClick={() => { setSelectedCategory('Todas'); setShowOnlyPremium(false); }}
              className={`px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap
                ${(selectedCategory === 'Todas' && !showOnlyPremium)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
            >
              Todas
            </button>

            <button
              onClick={() => { setShowOnlyPremium(true); setSelectedCategory('Todas'); }}
              className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2
                ${showOnlyPremium 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/20' 
                  : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'
                }`}
            >
              <span>💎</span> Cursos Premium
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2 shrink-0" />

            {ACADEMY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setShowOnlyPremium(false); }}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap
                  ${(selectedCategory === cat && !showOnlyPremium)
                    ? `${CATEGORY_COLORS[cat] || 'bg-blue-600'} text-white shadow-lg` 
                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* VISTA DE CURSOS */}
        {view === 'courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {(courses.length > 0 
              ? courses.filter(c => {
                  if (showOnlyPremium) return c.is_premium;
                  return selectedCategory === 'Todas' || c.category === selectedCategory;
                })
              : [
              { id: '1', title: 'Curso de Automatización', description: 'Aprende a automatizar tus flujos con IA.', thumbnail_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800', category: 'Automatización', is_premium: true },
              { id: '2', title: 'Marketing con IA', description: 'Estrategias avanzadas de marketing digital.', thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800', category: 'Marketing', is_premium: false },
              { id: '3', title: 'Inteligencia Artificial', description: 'Fundamentos y aplicaciones de la IA moderna.', thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800', category: 'Inteligencia Artificial', is_premium: true }
            ].filter(c => {
              if (showOnlyPremium) return c.is_premium;
              return selectedCategory === 'Todas' || c.category === selectedCategory;
            })).map((course) => (
              <div 
                key={course.id}
                onClick={() => { 
                  setSelectedCourse(course); 
                  setView('lessons'); 
                  window.history.pushState({}, '', `${window.location.pathname}?course=${course.id}`);
                }}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer hover:-translate-y-2"
              >
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img 
                    src={course.thumbnail_url?.startsWith('http') ? course.thumbnail_url : academyMediaUrl(course.thumbnail_url)} 
                    alt={course.title}
                    onError={(e) => {
                      // Fallback elegante
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800';
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 ${CATEGORY_COLORS[course.category] || 'bg-slate-600'} backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg`}>
                      {course.category || 'General'}
                    </span>
                  </div>

                  {isAdmin && isEditMode && (
                    <button 
                      onClick={(e) => handleDeleteCourse(course.id, e)}
                      className="absolute top-4 right-4 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-all z-10"
                      title="Borrar Curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
            ))}
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

                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col gap-1 px-2 pb-3">
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
                })}
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
                </div>
              ) : (
                <>
                  <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center">
                    {(() => {
                      const finalUrl = activeLesson.video_url || academyMediaUrl(activeLesson.video_path);
                      const embedUrl = getEmbedUrl(finalUrl);
                      
                      if (embedUrl) {
                        return (
                          <iframe 
                            key={activeLesson.id}
                            src={embedUrl} 
                            className="w-full h-full border-0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          />
                        );
                      }
                      
                      return (
                        <video 
                          key={activeLesson.id} 
                          controls 
                          controlsList="nodownload" 
                          className="w-full h-full object-contain"
                          onTimeUpdate={(e) => {
                            const video = e.currentTarget;
                            // Guardar el segundo actual en localStorage
                            localStorage.setItem(`lesson-time-${activeLesson.id}`, String(video.currentTime));
                          }}
                          onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            const savedTime = localStorage.getItem(`lesson-time-${activeLesson.id}`);
                            if (savedTime) {
                              video.currentTime = parseFloat(savedTime);
                            }
                          }}
                        >
                          <source src={finalUrl} type="video/mp4" />
                        </video>
                      );
                    })()}
                  </div>
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
                          <input 
                            type="text" 
                            value={editVideoPath} 
                            onChange={(e) => setEditVideoPath(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            placeholder="Ej: https://drive.google.com/... o academy/videos/video.mp4"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 block">Descripción (HTML permitido)</label>
                          <textarea 
                            value={editDescription} 
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={6}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
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
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{activeLesson.title}</h2>
                        <div 
                          className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line"
                          dangerouslySetInnerHTML={{ __html: activeLesson.description || '' }}
                        />
                      </>
                    )}

                    {(activeLesson.materiales && activeLesson.materiales.length > 0) && (
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

      {/* MODAL CREACIÓN CURSO */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 custom-scrollbar">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold">Crear Nuevo Curso</h2>
              <button onClick={() => setIsCourseModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="p-6 space-y-6">
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
                  onClick={() => setIsCourseModalOpen(false)}
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
                  {isCreatingCourse ? 'Creando...' : 'Crear Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}