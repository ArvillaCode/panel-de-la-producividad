import React from 'react';
import { Clock, LogOut, MailCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BRANDING } from '../constants/branding';

const PendingApproval = () => {
  const { user, profile, logout } = useAuth();

  return (
    <main className="min-h-screen bg-[#02040a] text-white flex items-center justify-center p-6 spatial-grid">
      <section className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 w-20 h-20 rounded-3xl bg-neon-teal/10 border border-neon-teal/20 flex items-center justify-center shadow-2xl shadow-neon-teal/10">
          <Clock className="w-10 h-10 text-neon-teal neon-glow" aria-hidden="true" />
        </div>

        <img
          src={BRANDING.logo}
          alt={BRANDING.name}
          width={480}
          height={129}
          className="mx-auto mb-8 h-12 w-auto object-contain brightness-0 invert"
        />

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-teal mb-4">
          Acceso en Revisión
        </p>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-balance">
          Tu cuenta está esperando aprobación
        </h1>
        <p className="mt-6 text-slate-400 leading-relaxed">
          Recibimos tu solicitud correctamente. El equipo revisará el acceso de{' '}
          <span className="text-white font-bold">{profile?.email || user?.email || 'tu correo'}</span>{' '}
          y te notificará cuando el panel esté habilitado.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:soporte@upfunnel.click"
            className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-teal"
          >
            <MailCheck className="w-5 h-5 text-neon-teal" aria-hidden="true" />
            Contactar Soporte
          </a>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      </section>
    </main>
  );
};

export default PendingApproval;
