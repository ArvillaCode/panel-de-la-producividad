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

const AdminBanners = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      toast.warning('La imagen supera los 200KB recomendados. Podría afectar el tiempo de carga.');
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success('Imagen cargada correctamente');
    } catch (err) {
      console.error('Detailed Supabase Storage Error:', err);
      toast.error('Error al subir: ' + (err.message || 'Error desconocido de storage'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      return toast.error('La imagen es obligatoria');
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
      fetchBanners();
    }
  };

  const toggleBannerStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      fetchBanners();
    }
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
              El peso ideal debe ser menor a <span className="text-blue-400 font-bold">200KB</span> para garantizar que cargue instantáneamente a los 3 segundos.
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
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => window.open(banner.image_url, '_blank')}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={() => setShowModal(false)}></div>
          <div className="relative glass-card p-10 w-full max-w-lg border-white/10 shadow-2xl animate-in zoom-in-95">
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
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Diseño del Banner</label>
                <div 
                  className={`relative group h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 overflow-hidden ${
                    formData.image_url ? 'border-neon-teal bg-neon-teal/5' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {formData.image_url ? (
                    <>
                      <img src={formData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
                          Cambiar Imagen
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
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
                        <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">PNG, JPG hasta 2MB</p>
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileUpload} />
                    </>
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
                    onChange={e => setFormData({...formData, link_url: e.target.value})} 
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
