"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase.js';
import { Plus, Trash2, Save, ArrowLeft, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
  const [loadingModules, setLoadingModules] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [duration, setDuration] = useState('');
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Configuración de R2 (Usando SDK directamente para evitar fallos de conexión externa)
  const r2Client = new S3Client({
    region: "auto",
    endpoint: "https://1fbed4859cc6f03d691ea813a7039210.r2.cloudflarestorage.com",
    forcePathStyle: true, // Forzar estilo de ruta para compatibilidad con R2 en el navegador
    credentials: {
      accessKeyId: "068c7a59fc24c38689120af3f04458db",
      secretAccessKey: "edb3f8f12faa4f7c5074741388eded5975fdc289c7c22a390382a2ae31f2218b",
    },
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoadingModules(true);
      const { data, error } = await supabase
        .from('academy_modules')
        .select('id, title')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) {
        setModules(data);
        if (data.length > 0) setModuleId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching modules:", error.message);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleAddMaterial = () => {
    setMateriales([...materiales, { nombre: '', url: '' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMateriales(materiales.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: keyof Material, value: string) => {
    const newMateriales = [...materiales];
    newMateriales[index][field] = value;
    setMateriales(newMateriales);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Basic Validation
      if (!title || !description || !moduleId) {
        throw new Error('Por favor completa los campos obligatorios (Título, Descripción, Módulo).');
      }

      // Filter out empty materials
      const validMateriales = materiales.filter(m => m.nombre.trim() !== '' && m.url.trim() !== '');

      // Convertir "mm:ss" a segundos
      let duration_seconds = 0;
      if (duration) {
        const parts = duration.split(':');
        if (parts.length === 2) {
          duration_seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 1) {
          duration_seconds = parseInt(parts[0]);
        }
        if (isNaN(duration_seconds)) duration_seconds = 0;
      }

      const newLesson = {
        title,
        description,
        module_id: moduleId,
        video_path: videoPath,
        duration_seconds,
        materiales: validMateriales,
        order_index: 1, // Aseguramos que haya un valor por defecto para no romper el esquema
        is_visible: isVisible
      };

      const { error } = await supabase.from('academy_lessons').insert([newLesson]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Lección publicada exitosamente.' });
      
      // Reset form (manteniendo el moduleId para facilitar publicaciones seguidas)
      setTitle('');
      setDescription('');
      setVideoPath('');
      setDuration('');
      setMateriales([]);
      setIsVisible(true);
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar la lección.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'video/mp4') {
        setMessage({ type: 'error', text: 'Solo se permiten archivos de video .mp4' });
        e.target.value = '';
        return;
      }
      setFileToUpload(file);
      setMessage({ type: '', text: '' });
    }
  };

  const uploadFileToR2 = async (file: File, subfolder: 'videos' | 'materials') => {
    try {
      // Estructura organizada: academy/videos/ o academy/materials/
      const filename = `academy/${subfolder}/${Date.now()}-${file.name}`;
      const command = new PutObjectCommand({
        Bucket: "upfunne-academy",
        Key: filename,
        ContentType: file.type || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Content-Type': file.type || "application/octet-stream"
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Error de red durante la subida al servidor de video.");
      }

      return filename;
    } catch (error) {
      console.error("Error en uploadFileToR2:", error);
      throw error;
    }
  };

  const handleVideoUpload = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const remotePath = await uploadFileToR2(fileToUpload, 'videos');
      setUploadProgress(100);
      setVideoPath(remotePath);
      setMessage({ type: 'success', text: "Video subido correctamente a Cloudflare R2." });
      setFileToUpload(null);
    } catch (err: any) {
      console.error("Error en carga R2:", err);
      let friendlyError = "Error de conexión con el servidor de video.";
      if (err.message === 'Failed to fetch') {
        friendlyError = "Error de red/CORS: Verifica que el bucket R2 permita el origen actual (localhost) en su configuración CORS.";
      }
      setMessage({ type: 'error', text: friendlyError });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'video/mp4') {
        setMessage({ type: 'error', text: 'Solo se permiten archivos de video .mp4' });
        return;
      }
      setFileToUpload(file);
      setMessage({ type: '', text: '' });
    }
  };

  const handleMaterialDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      const tempId = Math.random().toString(36).substr(2, 9);
      // Añadir fila con estado de carga
      setMateriales(prev => [...(prev || []), { nombre: file.name, url: 'Cargando...' }]);
      
      try {
        const remotePath = await uploadFileToR2(file, 'materials');
        setMateriales(prev => prev.map(m => 
          m.nombre === file.name && m.url === 'Cargando...' ? { ...m, url: remotePath } : m
        ));
      } catch (err) {
        setMateriales(prev => prev.map(m => 
          m.nombre === file.name && m.url === 'Cargando...' ? { ...m, url: 'Error en subida' } : m
        ));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Creador de Lecciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
              Añade contenido educativo nuevo a Upfunnel Academy.
            </p>
          </div>
          <Link 
            to="/dashboard/academia" 
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-blue-400 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir a la Academia
          </Link>
        </div>

        {/* Notificaciones */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium border flex flex-col gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {message.type === 'success' ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
              </div>
              {message.text}
            </div>
            {message.type === 'success' && (
              <div className="flex gap-2 pl-7">
                <Link 
                  to="/dashboard/academia" 
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> Ver Resultado
                </Link>
                <button 
                  onClick={() => setMessage({ type: '', text: '' })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs hover:bg-emerald-50 transition-colors"
                >
                  Crear otra lección
                </button>
              </div>
            )}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 lg:p-8 space-y-10">
            
            {/* Sección Básica */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Información Básica
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura los detalles principales de la lección.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Título de la Lección <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Fundamentos de Productividad"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/50 transition-all text-sm placeholder-slate-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Escribe un resumen detallado de lo que se verá en la lección..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/50 transition-all text-sm resize-y placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Módulo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    disabled={loadingModules || modules.length === 0}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingModules ? (
                      <option value="" disabled>Cargando módulos...</option>
                    ) : modules.length === 0 ? (
                      <option value="" disabled>No hay módulos encontrados</option>
                    ) : (
                      <>
                        <option value="" disabled>Selecciona un módulo</option>
                        {(modules || []).map((mod) => (
                          <option key={mod.id} value={mod.id}>{mod.title}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Duración (Opcional)
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ej: 15:30"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm placeholder-slate-400"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                       onClick={() => setIsVisible(!isVisible)}
                       style={{ backgroundColor: isVisible ? '#2563eb' : '#94a3b8' }}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Lección Visible</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Si se desactiva, la lección no aparecerá en la academia para los estudiantes.</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Sección Multimedia con Carga Directa R2 */}
            <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Multimedia (Cloudflare R2)
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sube el video .mp4 directamente a tu bucket.</p>
                </div>
                {videoPath && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 animate-in fade-in zoom-in">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Video Vinculado
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {!videoPath ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="relative group"
                  >
                    <input
                      type="file"
                      accept="video/mp4"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all duration-300
                      ${isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-xl shadow-blue-500/10' 
                        : fileToUpload 
                          ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50'
                      }`}>
                      <div className={`p-3 rounded-xl shadow-sm inline-block mb-3 transition-colors ${isDragging ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      </div>
                      <p className={`text-sm font-semibold transition-colors ${isDragging ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                        {fileToUpload ? fileToUpload.name : isDragging ? "¡Suelta el video aquí!" : "Selecciona o arrastra el video .mp4"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Máximo 100MB recomendado</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                        <Play className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[250px]">
                        {videoPath}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setVideoPath('')}
                      className="text-[10px] font-bold text-red-500 hover:underline uppercase tracking-widest"
                    >
                      Cambiar Video
                    </button>
                  </div>
                )}

                {fileToUpload && !isUploading && !videoPath && (
                  <button
                    type="button"
                    onClick={handleVideoUpload}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Comenzar Carga Multimedia
                  </button>
                )}

                {isUploading && (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      <span>Cargando en R2...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Sección de Materiales (JSONB) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Materiales de Apoyo
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Añade PDFs, enlaces o recursos extra (se guardarán como JSONB).</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Recurso
                </button>
              </div>

              <div 
                className="space-y-3"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleMaterialDrop}
              >
                {materiales.length === 0 && (
                  <div className={`text-center py-12 rounded-2xl border-2 border-dashed transition-all duration-300
                      ${isDragging 
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]' 
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-400">
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {isDragging ? "¡Suelta los archivos aquí!" : "No hay materiales. Arrastra archivos aquí o usa el botón superior."}
                      </p>
                    </div>
                  </div>
                )}
                <div className={`transition-all duration-300 ${isDragging ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  {(materiales || []).map((material, idx) => (
                    <div key={idx} className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-700/60 transition-all hover:bg-white/60 dark:hover:bg-slate-800/60 hover:shadow-xl hover:shadow-blue-500/5 mb-3 last:mb-0">
                      <div className="flex-1 w-full space-y-4 sm:space-y-0 sm:flex sm:gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Nombre del Recurso</label>
                          <input
                            type="text"
                            value={material.nombre}
                            onChange={(e) => handleMaterialChange(idx, 'nombre', e.target.value)}
                            placeholder="Ej. Guía Práctica PDF"
                            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all placeholder-slate-400/50"
                          />
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Enlace / URL</label>
                          <input
                            type="text"
                            value={material.url}
                            onChange={(e) => handleMaterialChange(idx, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all font-mono placeholder-slate-400/50"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        className="shrink-0 p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all w-full sm:w-auto flex justify-center mt-2 sm:mt-0 active:scale-90"
                        title="Eliminar recurso"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Footer del Formulario */}
          <div className="p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all w-full sm:w-auto
                ${loading 
                  ? 'bg-blue-400 dark:bg-blue-600/50 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando en Supabase...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Publicar Lección
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
