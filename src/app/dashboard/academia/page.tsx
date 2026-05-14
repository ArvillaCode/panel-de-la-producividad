"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useAuth } from '../../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

// --- ICONOS INLINE (SVG) ---
// Usamos iconos nativos para no requerir dependencias externas (Lucide/Heroicons)
const PlayIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
  </svg>
);

const DownloadIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
  </svg>
);



// --- TIPOS ---
interface Lesson {
  id: string;
  title: string;
  description: string;
  video_path: string;
  is_completed?: boolean; // El "?" lo hace opcional por ahora
  duration?: string;      // El "?" lo hace opcional por ahora
  materiales?: { nombre: string; url: string }[]; // Cambiamos 'name' por 'nombre'
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

// --- MOCK DATA (Simulando respuesta estructurada de Supabase) ---
const mockModules: Module[] = [
  {
    id: "mod-1",
    title: "Módulo 1: Fundamentos de la Plataforma",
    lessons: [
      {
        id: "les-1",
        title: "Bienvenida e Introducción",
        description: "En este video te daremos un recorrido general sobre qué es Upfunne Academy y cómo sacar el máximo provecho de tu plataforma para aumentar la productividad de tu equipo.",
        video_path: "videos/test.mp4", // Esta será la ruta que viene de DB (academy_lessons)
        is_completed: true,
        duration: "04:15",
        materiales: [
          { nombre: "Guía de inicio rápido (PDF)", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ]
      },
      {
        id: "les-2",
        title: "Configuración Inicial del Perfil",
        description: "Aprende a ajustar tus preferencias personales y a subir tu avatar utilizando nuestro sistema de almacenamiento seguro.",
        video_path: "videos/test2.mp4",
        is_completed: false,
        duration: "08:30",
        materiales: []
      }
    ]
  },
  {
    id: "mod-2",
    title: "Módulo 2: Herramientas Avanzadas",
    lessons: [
      {
        id: "les-3",
        title: "Gestión de Múltiples Tenants",
        description: "Descubre la arquitectura de nuestra plataforma SaaS multi-tenant y cómo gestionar varios espacios de trabajo de manera eficiente y segura.",
        video_path: "videos/test3.mp4",
        is_completed: false,
        duration: "12:45",
        materiales: [
          { nombre: "Diagrama de Arquitectura (PNG)", url: "https://via.placeholder.com/800x600.png?text=Diagrama+de+Arquitectura" },
          { nombre: "Checklist de configuración (PDF)", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
        ]
      }
    ]
  }
];

// --- CONSTANTES GLOBALES ---
const CLOUDFLARE_WORKER_URL = "https://rough-silence-cf74.arvilladigital12.workers.dev/?key=";

export default function AcademyDashboard() {
  // --- ESTADOS ---
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAuth();

  // --- INTEGRACIÓN SUPABASE ---
  useEffect(() => {
    const fetchAcademyData = async () => {
      try {
        // Fetch módulos y lecciones (usando joins de Supabase)
        // Sin límites y con ordenación para asegurar los datos más frescos
        let query = supabase
          .from('academy_modules')
          .select(`
            id, title,
            academy_lessons ( id, title, description, video_path, order_index, materiales, is_visible )
          `);

        // Si no es admin, filtramos solo los módulos visibles
        if (!isAdmin) {
          query = query.eq('is_visible', true);
        }

        const { data, error } = await query
          .order('order_index', { ascending: true })
          .order('order_index', { referencedTable: 'academy_lessons', ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Formateamos los datos para que coincidan con las interfaces locales
          const formattedModules = (data || []).map((mod: any) => ({
            id: mod.id,
            title: mod.title,
            lessons: (mod.academy_lessons || [])
              .filter((lesson: any) => isAdmin || lesson.is_visible !== false) // Admins ven todo, estudiantes solo visibles
              .map((lesson: any) => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                video_path: lesson.video_path,
                is_completed: false,
                duration: "Video",
                materiales: lesson.materiales || []
              }))
          }));
          
          setModules(formattedModules);
          if (formattedModules[0].lessons.length > 0) {
            setActiveLesson(formattedModules[0].lessons[0]);
          }
          setExpandedModules({ [formattedModules[0].id]: true });
        }
      } catch (error) {
        console.error("Error cargando la academia:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAcademyData();
  }, []);

  // --- HANDLERS ---
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleLessonSelect = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  const markAsCompleted = () => {
    // Aquí iría el update a Supabase:
    // const supabase = createClientComponentClient();
    // await supabase.from('academy_lesson_progress').upsert({ lesson_id: activeLesson.id, user_id: mi_usuario_id, is_completed: true })

    // Actualización optimista del UI local:
    setModules(prev => (prev || []).map(mod => ({
      ...mod,
      lessons: (mod.lessons || []).map(les =>
        les.id === activeLesson?.id ? { ...les, is_completed: true } : les
      )
    })));
    if (activeLesson) setActiveLesson(prev => prev ? ({ ...prev, is_completed: true }) : null);
  };

  // Generación dinámica de la URL del video a través del Edge Worker de Cloudflare
  const activeVideoUrl = activeLesson ? `${CLOUDFLARE_WORKER_URL}${activeLesson.video_path}` : '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Upfunne Academy
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
              Domina el Panel de la Productividad con nuestros recursos y cursos premium.
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
                <Plus className="w-4 h-4" />
                Subir Lección
              </Link>
            </div>
          )}
        </div>

        {/* LAYOUT PRINCIPAL: Sidebar + Contenido */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* SIDEBAR (MÓDULOS Y LECCIONES) */}
          <div className="w-full lg:w-[380px] shrink-0 order-2 lg:order-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-auto lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                Contenido del curso
                <span className="text-xs font-normal text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
                  {(modules || []).reduce((acc, m) => acc + (m.lessons || []).length, 0)} lecciones
                </span>
              </h2>
            </div>

            <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
              {(modules || []).map((module) => {
                const isExpanded = expandedModules[module.id];
                const moduleLessons = module.lessons || [];
                const moduleLessonsCompleted = moduleLessons.filter(l => l.is_completed).length;
                const progress = Math.round((moduleLessonsCompleted / moduleLessons.length) * 100) || 0;

                return (
                  <div key={module.id} className="mb-2">
                    {/* Module Header (Accordion Toggle) */}
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex flex-col p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="font-medium text-slate-900 dark:text-white text-sm pr-4">
                          {module.title}
                        </span>
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

                    {/* Lessons List */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                        }`}
                    >
                      <div className="flex flex-col gap-1 px-2 pb-3">
                        {(module.lessons || []).map((lesson, lIdx) => {
                          const isActive = activeLesson?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => handleLessonSelect(lesson)}
                              className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200
                                ${isActive
                                  ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm border border-blue-100 dark:border-blue-800/50'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                }`}
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
                                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                      {lIdx + 1}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                                  }`}>
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-500 font-medium">
                                    {lesson.duration}
                                  </span>
                                </div>
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

          {/* ÁREA PRINCIPAL (VIDEO Y DETALLES) */}
          <div className="flex-1 w-full order-1 lg:order-2 flex flex-col gap-6">

            {!activeLesson ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <PlayIcon className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {isLoading ? 'Sincronizando contenido...' : 'No hay lecciones publicadas'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                  {isLoading 
                    ? 'Estamos conectando con Upfunne Academy para traerte lo último.' 
                    : 'Aún no se han añadido lecciones a este módulo.'}
                </p>
              </div>
            ) : (
              <>
                {/* Reproductor de Video */}
                <div className="w-full bg-black rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 aspect-video relative group flex items-center justify-center">
                  <video
                    key={activeLesson.id}
                    controls
                    controlsList="nodownload"
                    className="w-full h-full object-contain"
                  >
                    <source src={`${CLOUDFLARE_WORKER_URL}${activeLesson.video_path}`} type="video/mp4" />
                    Tu navegador no soporta video.
                  </video>
                </div>

                {/* Detalles de la lección */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">

                    {/* Textos y descripciones */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {activeLesson.is_completed && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Completada
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        {activeLesson.title}
                      </h2>
                      <div 
                        className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl text-sm md:text-base whitespace-pre-line [&>a]:text-blue-600 [&>a]:dark:text-blue-400 [&>a:hover]:underline [&>ul]:list-disc [&>ul]:ml-5 [&>ol]:list-decimal [&>ol]:ml-5 [&>strong]:text-slate-900 [&>strong]:dark:text-white"
                        dangerouslySetInnerHTML={{ __html: activeLesson.description || '' }}
                      />
                    </div>

                    {/* Acciones principales */}
                    <div className="shrink-0 flex flex-col gap-3 md:w-56">
                      <button
                        onClick={markAsCompleted}
                        disabled={activeLesson.is_completed}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                          ${activeLesson.is_completed
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                          }`}
                      >
                        {activeLesson.is_completed ? 'Lección Completada' : 'Marcar como completada'}
                      </button>
                    </div>

                  </div>

                  {/* Recursos de Apoyo */}
                  {(activeLesson.materiales || []).length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                        Materiales de apoyo
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(activeLesson.materiales || []).map((material: any, idx: number) => (
                          <a
                            key={idx}
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group"
                          >
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <DownloadIcon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                              {material.nombre}
                            </span>
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
      </div>
    </div>
  );
}