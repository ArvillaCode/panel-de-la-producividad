import React from 'react';
import { X, Sparkles, CheckCircle, AlertTriangle, ShieldCheck, Calendar } from 'lucide-react';

const typeConfig = {
  improvement: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Mejora' },
  fix: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Corrección' },
  security: { icon: ShieldCheck, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Seguridad' },
  feature: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Nueva Función' }
};

const ReleaseNotesModal = ({ release, onClose, onMarkAsRead }) => {
  if (!release) return null;

  const config = typeConfig[release?.type] || typeConfig.improvement;
  const Icon = config.icon;

  const handleMarkAsRead = () => {
    if (release?.id && typeof onMarkAsRead === 'function') {
      onMarkAsRead(release.id);
    }
    onClose();
  };

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="relative w-full max-w-2xl bg-[#0f172a]/80 backdrop-blur-2xl border border-slate-800/50 rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Header */}
        <div className="p-8 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-b from-[#1e293b]/20 to-transparent">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${config.bg} border border-white/5`}>
              <Icon className={`w-7 h-7 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{config.label}</span>
                {release?.is_important && (
                  <span className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest animate-pulse">Prioritario</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{release?.title || 'Novedad'}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 max-h-[65vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <span className="px-4 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest">
              V{release?.version || '1.0'}
            </span>
            <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(release?.publish_date)}
            </span>
          </div>

          <div className="space-y-10">
            <p className="text-slate-300 leading-relaxed text-lg font-medium italic border-l-4 border-blue-500/30 pl-6">
              "{release?.description || 'Sin descripción disponible.'}"
            </p>

            {Array.isArray(release?.changes) && release.changes.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-white text-lg font-bold flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                  Registro de Cambios
                </h3>
                <ul className="grid gap-4">
                  {release.changes.map((change, index) => (
                    <li key={index} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all duration-300">
                      <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-slate-400 group-hover:text-slate-200 transition-colors leading-snug font-medium">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-800/50 bg-[#0f172a]/50 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl text-slate-400 font-bold hover:bg-white/5 transition-all duration-300"
          >
            Cerrar
          </button>
          <button
            onClick={handleMarkAsRead}
            className="px-10 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all duration-300 shadow-xl shadow-blue-600/20 active:scale-95"
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
};


export default ReleaseNotesModal;

