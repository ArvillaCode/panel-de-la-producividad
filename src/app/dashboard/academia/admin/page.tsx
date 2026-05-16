"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase.js';
import { Plus, Trash2, Save, ArrowLeft, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadToAcademyR2, academyMediaUrl } from '../../../../lib/academyR2Upload.js';

interface Module {
  id: string;
  title: string;
}

interface Material {
  nombre: string;
  url: string;
}

export default function LessonCreator() {
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Upload States (Video)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  
  // Upload States (Thumbnail)
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  // Recargar módulos cuando cambia el curso seleccionado
  useEffect(() => {
    if (courseId) {
      fetchModules(courseId);
    }
  }, [courseId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('academy_courses')
        .select('id, title')
        .order('created_at', { ascending: true });

      if (data) {
        // Deduplicar cursos por título para evitar confusiones
        const uniqueCourses: any[] = [];
        const seenTitles = new Set();
        data.forEach(c => {
          if (!seenTitles.has(c.title)) {
            seenTitles.add(c.title);
            uniqueCourses.push(c);
          }
        });
        setCourses(uniqueCourses);
        if (uniqueCourses.length > 0) setCourseId(uniqueCourses[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const fetchModules = async (selectedCourseId: string) => {
    try {
      const { data, error } = await supabase
        .from('academy_modules')
        .select('id, title')
        .eq('course_id', selectedCourseId)
        .order('created_at', { ascending: true });

      if (data) {
        setModules(data);
        if (data.length > 0) setModuleId(data[0].id);
        else setModuleId('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateModule = async () => {
    if (!newModuleName || !courseId) {
      alert("Selecciona un curso e ingresa un nombre para el módulo");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('academy_modules')
        .insert([{ 
          title: newModuleName, 
          course_id: courseId, 
          order_index: modules.length + 1 
        }])
        .select();

      if (error) {
        console.error("Error creating module:", error);
        alert(`Error al crear módulo: ${error.message}`);
        return;
      }

      if (data) {
        setModules(prev => [...prev, data[0]]);
        setModuleId(data[0].id);
        setNewModuleName('');
        setIsCreatingModule(false);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error crítico: ${error.message}`);
    }
  };

  const uploadFileToR2 = async (file: File, subfolder: string) => {
    try {
      const filename = await uploadToAcademyR2(file, subfolder);
      console.log("Upload success:", filename);
      return filename;
    } catch (error: any) {
      console.error("Error en uploadFileToR2:", error);
      alert(error?.message || 'Error de subida. Verifica VITE_R2_PRESIGN_URL y el Worker.');
      throw error;
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingThumb(true);
    setThumbProgress(20);
    try {
      const remotePath = await uploadFileToR2(file, 'thumbnails');
      setThumbProgress(100);
      setThumbnailUrl(remotePath);
    } catch (err) {
      console.error("Error subiendo miniatura:", err);
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const handleSave = async () => {
    if (!title || !moduleId || !courseId) {
      setMessage({ type: 'error', text: 'Completa los campos obligatorios (Título, Módulo, Curso).' });
      return;
    }

    if (isUploading) {
      setMessage({ type: 'error', text: 'Espera a que el video termine de subirse.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Contar lecciones actuales para el order_index
      const { count } = await supabase
        .from('academy_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', moduleId);

      const newLesson = {
        title,
        description,
        module_id: moduleId,
        video_path: videoPath,
        thumbnail_url: thumbnailUrl,
        materiales,
        is_visible: isVisible,
        order_index: (count || 0) + 1,
        course_id: courseId
      };

      const { error } = await supabase.from('academy_lessons').insert([newLesson]);
      if (error) throw error;

      setMessage({ type: 'success', text: 'Lección creada exitosamente.' });
      setTimeout(() => navigate('/dashboard/academia'), 1500);
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: `Error al guardar: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'video/mp4') {
      setFileToUpload(file);
      handleVideoUpload(file);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const remotePath = await uploadFileToR2(file, 'videos');
      setUploadProgress(100);
      setVideoPath(remotePath);
    } catch (err) {
      console.error("Error subiendo video:", err);
      alert("Error al subir el video. Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Creador de Contenido</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Sube cursos y lecciones nuevas a Upfunne Academy.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard/academia?action=new-course')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Nuevo Curso
            </button>
            <Link to="/admin/dashboard" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:text-blue-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Panel Maestro
            </Link>
            <Link to="/dashboard/academia" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 transition-colors">
              <Play className="w-4 h-4" /> Vista Usuario
            </Link>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 lg:p-8 space-y-10">
            
            {/* Info Básica */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Configuración General</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Título de la Lección *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Descripción *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Asignar a Curso *</label>
                  <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Módulo del Curso *</label>
                    <button 
                      type="button"
                      onClick={() => setIsCreatingModule(!isCreatingModule)}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      {isCreatingModule ? "Cancelar" : "+ Nuevo Módulo"}
                    </button>
                  </div>
                  
                  {isCreatingModule ? (
                    <div className="flex gap-2 animate-in slide-in-from-top-1">
                      <input
                        type="text"
                        placeholder="Nombre del módulo..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 focus:outline-none"
                        value={newModuleName}
                        onChange={(e) => setNewModuleName(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleCreateModule}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30"
                      >
                        Crear
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={moduleId} 
                      onChange={(e) => setModuleId(e.target.value)} 
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="">{modules.length === 0 ? 'No hay módulos en este curso' : 'Selecciona un módulo'}</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 italic">Ruta de archivo (Opcional / Debug)</label>
              <input 
                type="text" 
                value={videoPath} 
                onChange={(e) => setVideoPath(e.target.value)} 
                placeholder=" academy/videos/nombre-del-archivo.mp4"
                className="w-full px-4 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            {/* Multimedia & Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Video Principal</h3>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleVideoDrop}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <input 
                    type="file" 
                    accept="video/mp4" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFileToUpload(file);
                        handleVideoUpload(file);
                      }
                    }} 
                    className="hidden" 
                    id="video-input" 
                  />
                  <label htmlFor="video-input" className="cursor-pointer">
                    <div className="mb-2 text-blue-600 font-bold">{fileToUpload ? fileToUpload.name : videoPath ? "Video Vinculado" : "Click o arrastra .mp4"}</div>
                  </label>
                  {fileToUpload && !isUploading && (
                    <button type="button" onClick={async () => {
                      setIsUploading(true);
                      try {
                        const path = await uploadFileToR2(fileToUpload, 'videos');
                        setVideoPath(path);
                        setFileToUpload(null);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsUploading(false);
                      }
                    }} className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full">Subir Video</button>
                  )}
                  {isUploading && <div className="text-xs text-blue-500 animate-pulse">Subiendo...</div>}
                </div>
              </div>

              {/* Thumbnail */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Miniatura (Portada)</h3>
                <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                  }} className="hidden" id="thumb-input" />
                  <label htmlFor="thumb-input" className="cursor-pointer">
                    {thumbnailUrl ? (
                      <img src={academyMediaUrl(thumbnailUrl)} className="w-full aspect-video object-cover rounded-lg" />
                    ) : (
                      <div className="py-4 text-slate-400">Click para subir JPG/PNG</div>
                    )}
                  </label>
                  {isUploadingThumb && <div className="text-xs text-blue-500 animate-pulse">Subiendo imagen...</div>}
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                {loading ? 'Guardando...' : 'Publicar Contenido'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Re-declaración de la constante para evitar errores si se usa en el render