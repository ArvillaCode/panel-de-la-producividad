import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Trash2, 
  Plus, 
  Upload, 
  Check, 
  AlertCircle, 
  Eye, 
  X,
  RefreshCcw,
  Layout
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { uploadToAcademyR2, academyMediaUrl } from '../../lib/academyR2Upload';

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const TARGET_BANNER_BYTES = 300 * 1024;
const MAX_BANNER_BYTES = 500 * 1024;

const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.')),
    'image/webp',
    quality
  );
});

const optimizeBannerImage = async (file) => {
  if (file.type === 'image/webp' && file.size <= TARGET_BANNER_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: true });
  let scale = Math.min(1, 1600 / bitmap.width, 900 / bitmap.height);
  let quality = 0.84;
  let blob = null;

  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await canvasToBlob(canvas, quality);

      if (blob.size <= TARGET_BANNER_BYTES) break;
      if (quality > 0.6) quality -= 0.08;
      else {
        scale *= 0.82;
        quality = 0.76;
      }
    }
  } finally {
    bitmap.close();
  }

  if (!blob || blob.size > MAX_BANNER_BYTES) {
    throw new Error('La imagen no pudo optimizarse por debajo de 500 KB. Usa un diseño mas simple.');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'banner';
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
};

const AdminBanners = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [formData, setFormData] = useState({
    image_url: '',
    link_url: '',
    is_active: true
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar banners');
    } else {
      setBanners(data || []);
    }
    setLoading(false);
  };

  const convertToDirectImageUrl = (url) => {
    if (!url) return '';
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const driveMatch = url.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return url;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Usa JPG, PNG o WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('La imagen original supera el limite de 12 MB.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const optimizedFile = await optimizeBannerImage(file);
      const remotePath = await uploadToAcademyR2(optimizedFile, 'banners');
      const publicUrl = academyMediaUrl(remotePath);

      setFormData(current => ({ ...current, image_url: publicUrl }));
      setImageError(false);
      toast.success(`Imagen optimizada a ${Math.ceil(optimizedFile.size / 1024)} KB y cargada en R2`);
    } catch (err) {
      console.error('Detailed Cloudflare R2 Error:', err);
      toast.error('Error al subir a R2: ' + (err.message || 'Error desconocido de storage'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      setImageError(true);
      return toast.error('El diseño del banner (imagen o URL) es obligatorio.');
    }

    if (formData.link_url && !formData.link_url.startsWith('https://')) {
      return toast.error('El enlace debe ser una URL HTTPS segura.');
    }

    const { error } = await supabase
      .from('banners')
      .insert([formData]);

    if (error) {
      console.error('Detailed Supabase Database Error:', error);
      toast.error('Error al guardar: ' + (error.message || 'Error desconocido de base de datos'));
    } else {
      toast.success('Banner creado exitosamente');
      setShowModal(false);
      setFormData({ image_url: '', link_url: '', is_active: true });
      setImageError(false);
      fetchBanners();
    }
  };

  const toggleBannerStatus = async (id, currentStatus) => {
    if (updatingId !== null) return;
    const nextStatus = !currentStatus;
    setUpdatingId(id);
    setBanners(current => current.map(banner =>
      banner.id === id ? { ...banner, is_active: nextStatus } : banner
    ));

    const { error } = await supabase
      .from('banners')
      .update({ is_active: nextStatus })
      .eq('id', id);

    if (error) {
      setBanners(current => current.map(banner =>
        banner.id === id ? { ...banner, is_active: currentStatus } : banner
      ));
      toast.error('Error al actualizar estado');
    } else {
      toast.success(nextStatus ? 'Banner activado' : 'Banner desactivado');
    }
    setUpdatingId(null);
  };

  const deleteBanner = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Banner eliminado');
      fetchBanners();
    }
  };

  return (
    <AdminLayout currentPage="banners">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic neon-glow">Gestión de Banners</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">
              Anuncios y promociones globales del panel
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-6 py-3 bg-neon-teal text-deep-dark rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-teal/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Crear Banner
          </button>
        </div>

        {/* Recommended Specs Banner */}
        <div className="glass-card p-6 border-white/10 !bg-blue-600/5 flex items-start gap-4">
          <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase italic tracking-tighter">Especificaciones Recomendadas</h3>
            <p className="text-gray-400 text-sm mt-1">
              Para una visualización perfecta en todas las pantallas, usa imágenes de <span className="text-blue-400 font-bold">1200x600px</span>. 
              La imagen se convierte automaticamente a WebP y se optimiza para abrir apenas este lista.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="premium-spinner"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(banners || []).map((banner) => (
              <div key={banner.id} className="glass-card overflow-hidden group border-white/10 flex flex-col">
                <div className="relative aspect-[2/1] bg-white/5 overflow-hidden">
                   <img
                     src={banner.image_url}
                     alt="Banner Preview"
                     className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                     loading="lazy"
                     decoding="async"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => { const u = banner.image_url; if (u && u.startsWith('https://')) window.open(u, '_blank', 'noopener,noreferrer'); }}
                      className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-all"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteBanner(banner.id)}
                      className="p-3 bg-red-500/20 backdrop-blur-md rounded-xl text-red-500 hover:bg-red-500/40 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  {!banner.is_active && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Inactivo</div>
                  )}
                </div>
                
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-500">
                      <LinkIcon className="w-3 h-3" />
                      <p className="text-[10px] font-bold truncate uppercase tracking-widest">{banner.link_url || 'Sin enlace'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleBannerStatus(banner.id, banner.is_active)}
                    disabled={updatingId !== null}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      banner.is_active 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                        : 'bg-white/5 text-gray-500 border border-white/10'
                    }`}
                  >
                    {banner.is_active ? '● Activo' : '○ Inactivo'}
                  </button>
                </div>
              </div>
            ))}

            {banners.length === 0 && (
              <div className="col-span-full py-20 text-center glass-card border-white/5 border-dashed border-2">
                <ImageIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No hay banners configurados</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-start justify-center p-4 sm:p-10">
          <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={() => setShowModal(false)}></div>
          <div className="relative glass-card p-10 w-full max-w-lg border-white/10 shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neon-teal/10 rounded-2xl text-neon-teal neon-glow">
                  <Plus className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Nuevo Banner</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Drag & Drop Area */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Diseño del Banner (Obligatorio)</label>
                <div 
                  className={`relative group h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 overflow-hidden ${
                    formData.image_url 
                      ? 'border-neon-teal bg-neon-teal/5' 
                      : imageError 
                        ? 'border-red-500 bg-red-500/5 animate-pulse animate-duration-1000' 
                        : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {formData.image_url ? (
                    <>
                      <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
                          Cambiar Imagen
                          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-white/5 rounded-2xl text-gray-500 group-hover:text-white transition-colors">
                        {isUploading ? <RefreshCcw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-white uppercase tracking-widest">Arrastra o haz clic</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">PNG, JPG o WebP hasta 12 MB</p>
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} />
                    </>
                  )}
                </div>

                {/* Campo Alternativo para Pegar URL de Imagen */}
                <div className="space-y-1.5 mt-4">
                  <div className="relative group">
                    <ImageIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                      imageError ? 'text-red-400' : 'text-gray-500 group-focus-within:text-neon-teal'
                    }`} />
                    <input 
                      type="url" 
                      value={formData.image_url && !formData.image_url.startsWith('blob:') && !formData.image_url.startsWith('data:') && !formData.image_url.includes('key=') ? formData.image_url : ''} 
                      onChange={e => {
                        const val = e.target.value;
                        const converted = convertToDirectImageUrl(val);
                        setFormData({...formData, image_url: converted});
                        if (converted) {
                          setImageError(false); // Limpiar error al pegar URL válida
                        }
                      }} 
                      className={`premium-input w-full pl-12 transition-all ${
                        imageError ? '!border-red-500/50 focus:!border-red-500/80 focus:ring-red-500/20' : ''
                      }`} 
                      placeholder="O pega la URL de la imagen directamente" 
                    />
                  </div>
                  
                  {/* Alerta de Error Visual */}
                  {imageError && (
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider ml-2 animate-in fade-in duration-300">
                      ⚠ El diseño del banner (imagen física o URL de imagen) es obligatorio.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Enlace de Destino (Opcional)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                    type="url" 
                    value={formData.link_url} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({...formData, link_url: val});
                    }} 
                    className="premium-input w-full pl-12" 
                    placeholder="https://tu-oferta.com" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="active-check"
                  checked={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-neon-teal focus:ring-0" 
                />
                <label htmlFor="active-check" className="text-xs font-black text-white uppercase tracking-widest cursor-pointer">Activar inmediatamente</label>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full py-4 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-neon-teal/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isUploading ? 'PROCESANDO IMAGEN...' : 'CREAR BANNER PROMOCIONAL'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBanners;
