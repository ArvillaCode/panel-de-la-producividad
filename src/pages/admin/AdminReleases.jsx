import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Info, Sparkles, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const typeOptions = [
  { value: 'improvement', label: 'Mejora', icon: CheckCircle, color: 'text-blue-400' },
  { value: 'fix', label: 'Corrección', icon: CheckCircle, color: 'text-green-400' },
  { value: 'security', label: 'Seguridad', icon: ShieldCheck, color: 'text-red-400' },
  { value: 'feature', label: 'Nueva Función', icon: Sparkles, color: 'text-purple-400' }
];

const AdminReleases = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsEditing(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRelease, setCurrentRelease] = useState(null);
  const [newChange, setNewChange] = useState('');

  const emptyRelease = {
    version: '',
    title: '',
    description: '',
    changes: [],
    type: 'improvement',
    is_visible: false,
    is_important: false,
    publish_date: new Date().toISOString()
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReleases();
    }
  }, [isAdmin]);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('release_notes')
        .select('*')
        .order('publish_date', { ascending: false });

      if (error) throw error;
      setReleases(data || []);
    } catch (err) {
      console.error('Error fetching releases:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNextVersion = (lastVersion) => {
    if (!lastVersion) return '2.5.1';
    const parts = lastVersion.replace(/[^0-9.]/g, '').split('.');
    if (parts.length < 3) return lastVersion + '.1';
    const lastNum = parseInt(parts[parts.length - 1]);
    parts[parts.length - 1] = isNaN(lastNum) ? 1 : lastNum + 1;
    return parts.join('.');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (currentRelease.id) {
        const { error } = await supabase
          .from('release_notes')
          .update(currentRelease)
          .eq('id', currentRelease.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('release_notes')
          .insert([currentRelease]);
        if (error) throw error;
      }
      setIsEditing(false);
      setCurrentRelease(null);
      fetchReleases();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta actualización?')) return;
    try {
      const { error } = await supabase.from('release_notes').delete().eq('id', id);
      if (error) throw error;
      fetchReleases();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const toggleVisibility = async (release) => {
    try {
      const { error } = await supabase
        .from('release_notes')
        .update({ is_visible: !release.is_visible })
        .eq('id', release.id);
      if (error) throw error;
      fetchReleases();
    } catch (err) {
      alert('Error al actualizar visibilidad: ' + err.message);
    }
  };

  const addChange = () => {
    if (!newChange.trim()) return;
    setCurrentRelease({
      ...currentRelease,
      changes: [...currentRelease.changes, newChange.trim()]
    });
    setNewChange('');
  };

  const removeChange = (index) => {
    const updatedChanges = [...currentRelease.changes];
    updatedChanges.splice(index, 1);
    setCurrentRelease({ ...currentRelease, changes: updatedChanges });
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Acceso Denegado</h1>
        <p className="text-gray-400 mt-2">Solo administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-[#f8fafc] p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group w-fit"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold uppercase tracking-widest text-xs">Regresar Panel Admin</span>
            </button>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
              </div>
              Gestión de Novedades
            </h1>
            <p className="text-[#94a3b8] mt-4 text-lg font-medium">Administra el pulso de las actualizaciones del sistema.</p>
          </div>
          <button
            onClick={() => {
              const lastVer = releases.length > 0 ? releases[0].version : '2.5.0';
              setCurrentRelease({ 
                ...emptyRelease, 
                version: getNextVersion(lastVer) 
              });
              setIsEditing(true);
            }}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black transition-all shadow-[0_15px_40px_rgba(59,130,246,0.3)] active:scale-95 group"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            Nueva Actualización
          </button>
        </div>

        {isEditing && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500"
            onClick={() => setIsEditing(false)}
          >
            <div 
              className="bg-[#0f172a]/90 backdrop-blur-2xl border border-slate-800/50 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-b from-[#1e293b]/20 to-transparent">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {currentRelease.id ? 'Editar Novedad' : 'Configurar Nueva Novedad'}
                </h2>
                <button onClick={() => setIsEditing(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Versión Semántica</label>
                    <input
                      type="text"
                      required
                      placeholder="ej: 2.5.0"
                      value={currentRelease.version}
                      onChange={(e) => setCurrentRelease({ ...currentRelease, version: e.target.value })}
                      className="w-full bg-[#030712]/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Categoría</label>
                    <select
                      value={currentRelease.type}
                      onChange={(e) => setCurrentRelease({ ...currentRelease, type: e.target.value })}
                      className="w-full bg-[#030712]/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {typeOptions.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#030712]">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Título de la Versión</label>
                  <input
                    type="text"
                    required
                    placeholder="¿Qué destaca en esta actualización?"
                    value={currentRelease.title}
                    onChange={(e) => setCurrentRelease({ ...currentRelease, title: e.target.value })}
                    className="w-full bg-[#030712]/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Resumen Estratégico</label>
                  <textarea
                    required
                    placeholder="Describe el impacto de estos cambios..."
                    rows={3}
                    value={currentRelease.description}
                    onChange={(e) => setCurrentRelease({ ...currentRelease, description: e.target.value })}
                    className="w-full bg-[#030712]/50 border border-slate-800/50 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Log de Cambios Detallado</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Agrega un ítem al registro..."
                      value={newChange}
                      onChange={(e) => setNewChange(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChange())}
                      className="flex-1 bg-[#030712]/50 border border-slate-800/50 rounded-2xl px-5 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={addChange}
                      className="p-3.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl hover:bg-blue-600/20 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-3 pt-2">
                    {currentRelease.changes.map((change, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group/item">
                        <span className="text-slate-300 text-sm font-medium">{change}</span>
                        <button
                          type="button"
                          onClick={() => removeChange(idx)}
                          className="text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover/item:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {currentRelease.changes.length === 0 && (
                      <p className="text-center text-slate-600 text-sm italic py-4 bg-white/5 rounded-2xl border border-dashed border-slate-800/50">No hay cambios registrados en el log.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={currentRelease.is_visible}
                        onChange={(e) => setCurrentRelease({ ...currentRelease, is_visible: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-12 h-6 bg-slate-800 rounded-full peer-checked:bg-green-500/50 transition-all border border-slate-700"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full transition-all peer-checked:translate-x-6 peer-checked:bg-white"></div>
                    </div>
                    <span className="text-slate-400 text-sm font-bold group-hover:text-white transition-colors uppercase tracking-widest">Público</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={currentRelease.is_important}
                        onChange={(e) => setCurrentRelease({ ...currentRelease, is_important: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-12 h-6 bg-slate-800 rounded-full peer-checked:bg-red-500/50 transition-all border border-slate-700"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full transition-all peer-checked:translate-x-6 peer-checked:bg-white"></div>
                    </div>
                    <span className="text-slate-400 text-sm font-bold group-hover:text-white transition-colors uppercase tracking-widest">Prioritario</span>
                  </label>
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t border-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-4 rounded-2xl text-slate-500 font-bold hover:bg-white/5 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-10 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Sincronizando...' : 'Publicar Ahora'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-[#0f172a]/50 backdrop-blur-xl border border-slate-800/50 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#1e293b]/30">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Versión</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contenido</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Categoría</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Estado</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {releases.map((release) => {
                  const typeConfig = typeOptions.find(o => o.value === release.type) || typeOptions[0];
                  const TypeIcon = typeConfig.icon;
                  
                  return (
                    <tr key={release.id} className="hover:bg-white/5 transition-all duration-300 group release-card-glow">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-blue-400 tracking-widest text-base">V{release.version}</span>
                          <span className="text-[10px] text-slate-500 mt-1 font-bold uppercase">{new Date(release.publish_date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="max-w-md">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-200 text-lg tracking-tight">{release.title}</span>
                            {release.is_important && (
                              <span className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest">Prioritario</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate mt-1.5 font-medium">{release.description}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${typeConfig.color} bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest w-fit`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          {typeConfig.label}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => toggleVisibility(release)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            release.is_visible 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {release.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {release.is_visible ? 'Visible' : 'Oculto'}
                        </button>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => {
                              setCurrentRelease(release);
                              setIsEditing(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(release.id)}
                            className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {releases.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center text-slate-600 font-medium italic">
                      <div className="flex flex-col items-center gap-4">
                        <Sparkles className="w-10 h-10 opacity-20" />
                        No hay novedades registradas. ¡Inicia el historial!
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReleases;
