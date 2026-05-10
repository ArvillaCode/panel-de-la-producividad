import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ChevronRight, 
  Star, 
  Zap, 
  Target, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      title: "Velocidad Extrema",
      description: "Procesa tareas que tomaban horas en cuestión de segundos con precisión algorítmica."
    },
    {
      icon: <Target className="w-6 h-6 text-red-500" />,
      title: "Precisión de Élite",
      description: "Agentes especializados entrenados para ejecutar tareas críticas con cero margen de error."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      title: "Escalabilidad Total",
      description: "Multiplica tu capacidad operativa sin aumentar tus costos fijos de personal."
    }
  ];

  const testimonials = [
    {
      name: "Ricardo P.",
      role: "Director de Operaciones",
      text: "Reduje mi tiempo de redacción técnica de 15 horas semanales a solo 45 minutos. Los agentes no solo escriben, razonan el contexto.",
      impact: "+220% Eficiencia",
      initials: "RP",
      color: "blue"
    },
    {
      name: "Marta L.",
      role: "CEO TechGrowth",
      text: "Gestionamos 3 proyectos simultáneos con el mismo equipo. El retorno de inversión se pagó en los primeros 12 días de uso.",
      impact: "$2,400 Ahorro Mensual",
      initials: "ML",
      color: "purple"
    },
    {
      name: "Jorge S.",
      role: "Product Manager",
      text: "La precisión de los agentes de soporte eliminó el 90% de los tickets repetitivos. Liberé a mi equipo para tareas creativas.",
      impact: "-90% Carga Admin",
      initials: "JS",
      color: "indigo"
    }
  ];

  return (
    <div className="min-h-screen bg-[#020203] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight uppercase italic">
            AI<span className="text-blue-600">PANEL</span>
          </span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-white/20 backdrop-blur-md"
        >
          Iniciar Sesión
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Acceso Exclusivo: +50 Agentes de IA</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] max-w-5xl mx-auto">
          <span className="block opacity-90">Delega tu esfuerzo,</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            potencia tus resultados
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
          La matriz definitiva de productividad. Convierte <span className="text-red-500/80 line-through decoration-2">8 horas</span> de trabajo manual en <span className="text-white font-bold underline decoration-blue-500 underline-offset-4">12 minutos</span> de precisión algorítmica.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button
            onClick={() => navigate('/login')}
            className="group relative flex items-center gap-4 px-10 py-5 bg-white text-black rounded-2xl shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-500"
          >
            <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
            <span className="relative font-black tracking-widest uppercase text-sm">Comenzar Ahora</span>
            <div className="relative p-2 bg-blue-600 rounded-full text-white">
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
          
          <button
            onClick={() => {
              const el = document.getElementById('features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5 hover:border-white/10 backdrop-blur-sm"
          >
            Ver Características
          </button>
        </div>

        {/* Dashboard Preview Overlay */}
        <div className="mt-24 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-4 shadow-2xl">
            <div className="aspect-video rounded-2xl bg-[#0a0a0c] overflow-hidden relative group">
              {/* Fake UI Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                    <Lock className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-2">Panel de Agentes Bloqueado</p>
                    <p className="text-slate-400">Inicia sesión para acceder a la suite completa de herramientas</p>
                  </div>
                  <button 
                    onClick={() => navigate('/login')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Desbloquear Acceso
                  </button>
                </div>
              </div>
              
              {/* Fake Dashboard Content (Blurred) */}
              <div className="grid grid-cols-3 gap-4 p-8 opacity-20 blur-sm pointer-events-none">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/10 p-6">
                    <div className="w-12 h-12 rounded-xl bg-white/10 mb-4" />
                    <div className="h-4 w-2/3 bg-white/10 rounded mb-2" />
                    <div className="h-4 w-full bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <p className="text-5xl font-black text-white mb-2 tracking-tighter">+50</p>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Agentes IA</p>
            </div>
            <div>
              <p className="text-5xl font-black text-white mb-2 tracking-tighter">90%</p>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Ahorro Tiempo</p>
            </div>
            <div>
              <p className="text-5xl font-black text-white mb-2 tracking-tighter">24/7</p>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Disponibilidad</p>
            </div>
            <div>
              <p className="text-5xl font-black text-white mb-2 tracking-tighter">300%</p>
              <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">Productividad</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight italic uppercase">
            Diseñado para <span className="text-blue-500">Alta Performance</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto font-medium">
            Cada agente ha sido configurado para una tarea específica, optimizando flujos de trabajo que antes requerían departamentos enteros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-500 group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed font-medium">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
          <div className="text-left">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight italic uppercase leading-none">
              Resultados <span className="text-blue-500">Reales</span><br />
              Impacto <span className="text-indigo-400">Inmediato</span>
            </h2>
            <p className="text-slate-400 max-w-xl font-medium">
              Únete a los líderes que ya están utilizando la inteligencia artificial para dominar su mercado.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020203] bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                  U{i}
                </div>
              ))}
            </div>
            <div className="text-xs font-bold">
              <p className="text-white">+2,400 Usuarios</p>
              <p className="text-blue-400">Escalando hoy</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
                <Star className="w-12 h-12 fill-current" />
              </div>
              <div className="flex gap-1 mb-6 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-slate-300 font-medium italic mb-8 leading-relaxed text-lg">"{t.text}"</p>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-${t.color}-600/20 border border-${t.color}-500/20 flex items-center justify-center font-bold text-${t.color}-400`}>
                  {t.initials}
                </div>
                <div>
                  <p className="font-black text-white text-sm">{t.name}</p>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{t.impact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 py-32 px-6 max-w-5xl mx-auto text-center">
        <div className="p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shadow-2xl shadow-blue-600/20 group">
          {/* Decorative Rings */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 border-[32px] border-white/5 rounded-full" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 border-[24px] border-white/5 rounded-full" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-tight">
              ¿Listo para dar el salto al <span className="text-black/40 italic">futuro</span>?
            </h2>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto font-medium">
              Obtén acceso inmediato a los 50 agentes y comienza a recuperar tu activo más valioso: el tiempo.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-3 px-12 py-5 bg-white text-blue-600 rounded-2xl font-black tracking-widest uppercase text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
              Comenzar Ahora Grátis
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-6 text-xs font-bold text-white/60 uppercase tracking-[0.2em]">Sin tarjetas de crédito · Cancelación inmediata</p>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-bold text-sm tracking-tight uppercase italic text-slate-400">
              AI<span className="text-slate-500">PANEL</span> © 2026
            </span>
          </div>
          <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
            <a href="#" className="hover:text-blue-400 transition-colors">Políticas</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
