import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, AlertTriangle, ShieldCheck, Calendar, ChevronRight, Info, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useReleaseNotes } from '../hooks/useReleaseNotes';
import ReleaseNotesModal from '../components/user/ReleaseNotesModal';

const typeConfig = {
  improvement: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Mejora' },
  fix: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Corrección' },
  security: { icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Seguridad' },
  feature: { icon: Sparkles, color: 'text-neon-teal', bg: 'bg-neon-teal/10', label: 'Nueva Función' }
};

const ReleaseHistory = () => {
  const { isAdmin } = useAuth();
  const { allReleases, loading, error, fetchReleases, markAsRead } = useReleaseNotes();
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-deep-dark gap-6">
        <div className="premium-spinner"></div>
        <p className="text-gray-500 font-black uppercase text-xs tracking-[0.3em] animate-pulse">Sincronizando Archivos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-deep-dark p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8 border border-red-500/20 neon-glow-red">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 uppercase italic italic tracking-tight">Fallo en la Sincronización</h2>
        <p className="text-gray-500 max-w-md mb-10 font-bold uppercase text-xs tracking-widest leading-loose">
          No pudimos establecer un puente con el núcleo de actualizaciones. Revisa tu conexión o reintenta.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => fetchReleases()}
            className="px-10 py-4 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:scale-105 transition-all shadow-lg shadow-neon-teal/20"
          >
            Reintentar
          </button>
          <button 
            onClick={() => window.history.back()}
            className="px-10 py-4 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-[0.2em] hover:text-white transition-all"
          >
            Regresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-dark text-white selection:bg-neon-teal/30">
      <div className="max-w-5xl mx-auto p-8 md:p-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-16">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-3 px-6 py-3 glass-card border-white/10 text-gray-500 hover:text-neon-teal hover:border-neon-teal/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Volver al Panel
          </button>

          {isAdmin && (
            <button 
              onClick={() => window.location.href = '/admin'}
              className="flex items-center gap-3 px-6 py-3 bg-neon-teal/10 hover:bg-neon-teal/20 text-neon-teal rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-neon-teal/20 shadow-lg shadow-neon-teal/5"
            >
              <Shield className="w-4 h-4" />
              Terminal Admin
            </button>
          )}
        </div>

        <div className="mb-24 space-y-4">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-neon-teal/10 rounded-2xl border border-neon-teal/20 shadow-xl shadow-neon-teal/5 neon-glow">
                    <Sparkles className="w-10 h-10 text-neon-teal" />
                </div>
                <div>
                    <h1 className="text-5xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
                        Log de <span className="text-neon-teal">Evolución</span>
                    </h1>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-[0.4em] mt-1">Historial de despliegues y parches</p>
                </div>
            </div>
          <p className="text-gray-400 mt-8 text-lg md:text-xl max-w-3xl leading-relaxed font-medium">
            Cada actualización es un paso hacia la automatización total. Explora la bitácora técnica de Upfunnel y descubre cómo optimizamos tu flujo de trabajo.
          </p>
        </div>

        <div className="relative border-l-2 border-white/5 ml-4 md:ml-40 pl-8 md:pl-12 space-y-20 pb-20">
          {Array.isArray(allReleases) && allReleases.map((release, index) => {
            if (!release) return null;
            const config = typeConfig[release?.type] || typeConfig.improvement;
            const Icon = config.icon;
            const changes = Array.isArray(release?.changes) ? release.changes : [];
            
            return (
              <div key={release.id || index} className="relative group">
                {/* Timeline Node */}
                {/* Timeline Date (Left of the line) */}
                <div className="hidden md:flex absolute -left-[150px] top-2 h-4 w-[120px] justify-end items-center text-gray-500 text-[10px] font-black uppercase tracking-widest text-right">
                  {formatDate(release?.publish_date)}
                </div>

                <div className={`absolute -left-[42px] md:-left-[58px] top-2 w-4 h-4 rounded-full border-4 border-deep-dark transition-all duration-700 z-10 
                  ${index === 0 
                    ? 'bg-neon-teal shadow-[0_0_20px_rgba(0,229,255,0.8)] scale-150' 
                    : 'bg-white/10 group-hover:bg-neon-teal group-hover:shadow-[0_0_15px_rgba(0,229,255,0.4)]'}`}>
                </div>
                
                <div className="glass-card !bg-white/[0.02] border-white/10 p-10 md:p-12 hover:border-neon-teal/30 transition-all duration-700 cursor-pointer shadow-2xl group/card relative overflow-hidden"
                     onClick={() => setSelectedRelease(release)}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-neon-teal/5 blur-[100px] opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="px-5 py-2 rounded-xl bg-neon-teal text-deep-dark font-black text-xs tracking-widest shadow-lg shadow-neon-teal/20">
                        V{release?.version || '1.0'}
                      </span>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 ${config.color} text-[10px] font-black uppercase tracking-widest`}>
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </div>
                      {release?.is_important && (
                        <span className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-red-500/5">
                          Critical Patch
                        </span>
                      )}
                    </div>
                    <div className="md:hidden flex items-center gap-3 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                      <Calendar className="w-4 h-4 text-neon-teal" />
                      {formatDate(release?.publish_date)}
                    </div>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-black text-white mb-6 group-hover/card:text-neon-teal transition-colors tracking-tight uppercase italic">
                    {release?.title || 'Sin título'}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-lg font-medium mb-10 max-w-4xl line-clamp-3">
                    {release?.description || 'Sin descripción disponible.'}
                  </p>

                  <div className="pt-10 border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex -space-x-3">
                      {changes.slice(0, 4).map((_, i) => (
                        <div key={i} className="w-10 h-10 rounded-xl bg-white/5 border-2 border-deep-dark flex items-center justify-center shadow-lg">
                          <div className="w-2 h-2 rounded-full bg-neon-teal neon-glow"></div>
                        </div>
                      ))}
                      {changes.length > 4 && (
                        <div className="w-10 h-10 rounded-xl bg-white/5 border-2 border-deep-dark flex items-center justify-center text-[10px] text-gray-500 font-black tracking-tighter">
                          +{changes.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-neon-teal font-black text-[10px] uppercase tracking-[0.3em] group-hover/card:translate-x-2 transition-transform">
                      Detalles del Despliegue
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {(!allReleases || allReleases.length === 0) && (
            <div className="text-center py-40 glass-card border-white/5 border-dashed">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/5">
                <Info className="w-12 h-12 text-gray-700" />
              </div>
              <p className="text-gray-600 text-2xl font-black uppercase italic italic">Sin registros sincronizados</p>
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
