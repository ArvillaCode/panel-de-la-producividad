import React, { useState } from 'react';
import { useReleaseNotes } from '../hooks/useReleaseNotes';
import { Sparkles, CheckCircle, ShieldCheck, Calendar, ChevronRight, Info } from 'lucide-react';
import ReleaseNotesModal from '../components/user/ReleaseNotesModal';

const typeConfig = {
  improvement: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Mejora' },
  fix: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Corrección' },
  security: { icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Seguridad' },
  feature: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Nueva Función' }
};

const ReleaseHistory = () => {
  const { allReleases, loading, markAsRead } = useReleaseNotes();
  const [selectedRelease, setSelectedRelease] = useState(null);

  const formatDate = (dateStr) => {
    try {
      if (!dateStr) return 'Fecha no disponible';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return 'Error en fecha';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium animate-pulse">Cargando historial de novedades...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-[#f8fafc] selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white flex items-center gap-4 tracking-tight">
            <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
            </div>
            Historial de Novedades
          </h1>
          <p className="text-[#94a3b8] mt-4 text-lg md:text-xl max-w-2xl leading-relaxed">
            Explora la evolución del panel. Cada actualización está diseñada para potenciar tu productividad con la mejor tecnología IA.
          </p>
        </div>

        <div className="relative border-l-[3px] border-slate-800/50 ml-4 md:ml-6 pl-10 space-y-16">
          {Array.isArray(allReleases) && allReleases.map((release, index) => {
            if (!release) return null;
            const config = typeConfig[release?.type] || typeConfig.improvement;
            const Icon = config.icon;
            const changes = Array.isArray(release?.changes) ? release.changes : [];
            
            return (
              <div key={release.id || index} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -left-[53px] top-0 w-6 h-6 rounded-full border-[4px] border-[#030712] transition-all duration-500 z-10 
                  ${index === 0 
                    ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110' 
                    : 'bg-slate-700 group-hover:bg-blue-400 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]'}`}>
                </div>
                
                <div className="bg-[#0f172a]/70 backdrop-blur-xl border border-slate-800/50 rounded-[2rem] p-8 md:p-10 hover:bg-[#0f172a]/90 hover:border-blue-500/30 transition-all duration-500 cursor-pointer shadow-[0_18px_60px_rgba(0,0,0,0.35)] group/card"
                     onClick={() => setSelectedRelease(release)}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-4 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-sm tracking-widest">
                        V{release?.version || '1.0'}
                      </span>
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl ${config.bg} border border-white/5 ${config.color} text-[11px] font-bold uppercase tracking-widest`}>
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </div>
                      {release?.is_important && (
                        <span className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-widest animate-pulse">
                          Prioritario
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[#94a3b8] text-sm font-medium">
                      <Calendar className="w-4 h-4" />
                      {formatDate(release?.publish_date)}
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover/card:text-blue-400 transition-colors tracking-tight">
                    {release?.title || 'Sin título'}
                  </h3>
                  <p className="text-[#94a3b8] leading-relaxed text-lg line-clamp-2 mb-8">
                    {release?.description || 'Sin descripción disponible.'}
                  </p>

                  <div className="pt-8 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {changes.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0f172a] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                      ))}
                      {changes.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0f172a] flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          +{changes.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm group-hover/card:translate-x-1 transition-transform">
                      Explorar cambios
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {(!allReleases || allReleases.length === 0) && (
            <div className="text-center py-32 bg-[#0f172a]/30 rounded-[3rem] border-2 border-dashed border-slate-800/50">
              <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Info className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-500 text-xl font-medium">No hay registros en el historial todavía.</p>
            </div>
          )}
        </div>

        {selectedRelease && (
          <ReleaseNotesModal
            release={selectedRelease}
            onClose={() => setSelectedRelease(null)}
            onMarkAsRead={markAsRead}
          />
        )}
      </div>
    </div>
  );
};

export default ReleaseHistory;

