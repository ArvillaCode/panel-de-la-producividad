import React, { useEffect, useRef, useState } from 'react';
import { 
  Shield, 
  ChevronRight, 
  Zap, 
  Target, 
  Star,
  CheckCircle2,
  ArrowRight,
  Brain,
  Sparkles,
  Award,
  Plus,
  Minus,
  HelpCircle,
  Timer,
  LayoutDashboard,
  Cpu,
  MessageSquare
} from 'lucide-react';
import { BRANDING } from '../constants/branding';

// Componente para animaciones estilo Apple (Reveal on Scroll)
const Reveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/5 py-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="text-lg font-bold text-slate-300 group-hover:neon-text transition-colors uppercase italic tracking-tight">{question}</span>
        {isOpen ? <Minus className="w-5 h-5 text-neon-teal" /> : <Plus className="w-5 h-5 text-slate-500 group-hover:text-neon-teal transition-all" />}
      </button>
      <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-slate-400 font-medium leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const handleAction = () => {
    alert("Gracias por tu interés, voy a comunicarte con uno de nuestros asesores.");
  };

  const logos = [
    { name: "OpenAI", icon: "🤖" },
    { name: "Anthropic", icon: "🧠" },
    { name: "Google AI", icon: "🌐" },
    { name: "Meta", icon: "∞" },
    { name: "Mistral", icon: "🌪️" },
    { name: "Stripe", icon: "💳" },
    { name: "AWS", icon: "☁️" },
    { name: "NVIDIA", icon: "📟" }
  ];

  return (
    <div className="min-h-screen bg-deep-dark text-white selection:bg-neon-teal/30 overflow-x-hidden font-sans spatial-grid">
      {/* Premium Background: Grid + Radial Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-neon-teal/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Navigation Header */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-8 max-w-7xl mx-auto backdrop-blur-xl border-b border-white/5 bg-white/5">
        <div className="flex items-center">
          <img 
            src={BRANDING.logo} 
            alt={BRANDING.name} 
            className="h-10 md:h-12 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <span className="ml-3 text-2xl font-black tracking-tighter italic text-white neon-glow">
            {BRANDING.name.toUpperCase()}
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <a href="#solucion" className="text-[10px] font-black text-slate-400 hover:neon-text transition-colors uppercase tracking-[0.3em]">Solución</a>
          <a href="#elegirnos" className="text-[10px] font-black text-slate-400 hover:neon-text transition-colors uppercase tracking-[0.3em]">Por qué nosotros</a>
          <a href="#pricing" className="text-[10px] font-black text-slate-400 hover:neon-text transition-colors uppercase tracking-[0.3em]">Inversión</a>
          <a href="#faq" className="text-[10px] font-black text-slate-400 hover:neon-text transition-colors uppercase tracking-[0.3em]">FAQ</a>
        </div>

        <button onClick={handleAction} className="px-8 py-3 bg-neon-teal/10 border border-neon-teal/20 text-neon-teal rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-teal hover:text-deep-dark transition-all neon-glow">
          Reservar Demo
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-32 px-6 max-w-7xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-neon-teal/5 border border-neon-teal/10 mb-10 neon-glow">
            <Sparkles className="w-4 h-4 text-neon-teal" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-teal/80">Ecosistema IA de Alto Nivel</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.9] max-w-5xl mx-auto">
            <span className="block text-slate-500 italic font-medium text-3xl md:text-5xl mb-6 tracking-normal">Tu tiempo es el activo más caro.</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 uppercase">
              Haz que el <span className="neon-text">tiempo</span> trabaje para ti.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-16 leading-relaxed font-medium">
            Tú y yo sabemos que el ruido de la IA te está robando energía. <span className="text-white">Si no tomas el control ahora</span>, el tiempo seguirá escapándose. Upfunnel es tu atajo maestro.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={handleAction}
              className="group relative flex items-center gap-6 px-12 py-6 bg-neon-teal text-deep-dark rounded-2xl shadow-[0_0_50px_-5px_rgba(0,229,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-500"
            >
              <span className="relative font-black tracking-widest uppercase text-sm italic">Quiero mi tiempo de vuelta</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </Reveal>
      </section>

      {/* Infinite Logo Scroll */}
      <div className="relative z-10 py-16 border-y border-white/5 overflow-hidden bg-white/2">
        <div className="flex whitespace-nowrap animate-infinite-scroll">
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <div key={i} className="flex items-center gap-6 px-16 opacity-30 hover:opacity-100 hover:neon-text transition-all cursor-default">
              <span className="text-3xl">{logo.icon}</span>
              <span className="text-lg font-black tracking-tighter uppercase italic">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Solution Section */}
      <section id="solucion" className="relative z-10 py-40 px-6 max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight mb-8 leading-none">La Solución: <span className="neon-text">Un Solo Cerebro</span></h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-lg font-medium leading-relaxed">Olvídate de tener 20 pestañas abiertas. Hemos unificado el poder de más de 70 agentes especializados en una interfaz diseñada para la ejecución pura y dura.</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: <Brain />, title: "IA Unificada", desc: "Los modelos líderes del mercado, optimizados para tu flujo de trabajo diario." },
            { icon: <LayoutDashboard />, title: "Panel Maestro", desc: "Diseñado para ejecutivos y fundadores que no tienen tiempo que perder." },
            { icon: <Cpu />, title: "Agentes Expertos", desc: "Más de 70 Agentes pre-entrenados para ventas, copy, estrategia y automatización." }
          ].map((item, i) => (
            <Reveal key={i} delay={i * 200}>
              <div className="p-10 rounded-[3rem] glass-card glass-card-hover border-white/5 h-full group flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-neon-teal/10 flex items-center justify-center mb-8 text-neon-teal neon-glow group-hover:scale-110 transition-transform">
                  {React.cloneElement(item.icon, { size: 36 })}
                </div>
                <h3 className="text-2xl font-black uppercase italic mb-6">{item.title}</h3>
                <p className="text-slate-400 font-medium leading-relaxed text-lg">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why Us Section */}
      <section id="elegirnos" className="relative z-10 py-40 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <Reveal>
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 bg-neon-teal/20 blur-[120px] rounded-full animate-pulse" />
              <div className="relative h-full w-full rounded-[5rem] border border-white/10 bg-black/60 backdrop-blur-3xl flex flex-col items-center justify-center p-16 text-center shadow-2xl">
                <div className="w-24 h-24 bg-neon-teal text-deep-dark rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-neon-teal/40">
                  <Award className="w-12 h-12" />
                </div>
                <h3 className="text-4xl font-black uppercase italic leading-none mb-6">¿Por qué Upfunnel?</h3>
                <p className="text-xl text-slate-300 font-medium italic leading-relaxed">"No estamos aquí para darte más herramientas, estamos aquí para darte el resultado que ellas prometen."</p>
              </div>
            </div>
          </Reveal>

          <div className="space-y-16">
            {[
              { q: "¿Por qué seguir pagando 10 IAs?", a: "Es ineficiente y costoso. Upfunnel te da el poder de los modelos más potentes del mundo en un solo lugar por una fracción del costo." },
              { q: "¿Realmente seré más productivo?", a: "Absolutamente. Al eliminar la fricción mental de decidir qué herramienta usar, tu velocidad de ejecución se multiplica por diez." },
              { q: "¿Es una inversión inteligente?", a: "$50 al año es el mayor atajo que puedes comprar hoy. El costo de oportunidad de no tenerlo es simplemente incalculable." }
            ].map((item, i) => (
              <Reveal key={i} delay={i * 200}>
                <div className="flex gap-8">
                  <div className="shrink-0 w-10 h-10 rounded-2xl bg-neon-teal/10 flex items-center justify-center text-neon-teal font-black text-sm italic neon-glow">0{i+1}</div>
                  <div>
                    <h4 className="text-2xl font-black uppercase italic mb-3 tracking-tight">{item.q}</h4>
                    <p className="text-lg text-slate-400 font-medium leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-40 px-6 max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-24">
            <HelpCircle className="w-16 h-16 text-neon-teal mx-auto mb-8 neon-glow" />
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">Preguntas Frecuentes</h2>
          </div>
          <div className="glass-card border-white/5 rounded-[4rem] p-10 md:p-16">
            <FAQItem 
              question="¿Por qué solo cuesta $50 al año?" 
              answer="Nuestra misión es democratizar el acceso a la IA de élite. Queremos que el presupuesto no sea una barrera para que tu negocio escale al siguiente nivel."
            />
            <FAQItem 
              question="¿Necesito conocimientos técnicos?" 
              answer="Ninguno. El panel está diseñado con simplicidad quirúrgica para que cualquier persona pueda empezar a producir resultados en segundos."
            />
            <FAQItem 
              question="¿Qué tipos de agentes incluye?" 
              answer="Desde expertos en marketing y ventas, hasta analistas financieros y generadores de código. Cubrimos todos los pilares de un negocio moderno."
            />
          </div>
        </Reveal>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="relative z-10 py-40 px-6">
        <Reveal>
          <div className="max-w-5xl mx-auto p-16 md:p-24 rounded-[5rem] bg-gradient-to-br from-deep-dark via-deep-dark to-neon-teal/20 border border-white/10 text-center relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:20px_20px]" />
             <div className="relative z-10">
                <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter leading-tight uppercase italic">
                   No dejes pasar <br /> un año más <span className="neon-text">igual</span>.
                </h2>
                <div className="inline-block px-12 py-6 glass-card !bg-white/10 border-white/20 mb-12 shadow-2xl">
                   <span className="text-6xl font-black tracking-tighter neon-text">$50</span>
                   <span className="text-sm font-bold uppercase tracking-widest ml-4 opacity-60">USD / Año</span>
                </div>
                <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto font-medium">
                   Es menos de lo que cuesta un café a la semana. Pero el valor de recuperar tu tiempo es infinito. <span className="block mt-6 text-white font-bold italic underline decoration-neon-teal/30">Esta oferta de lanzamiento es por tiempo limitado.</span>
                </p>
                <button
                  onClick={handleAction}
                  className="flex items-center gap-4 px-16 py-7 bg-neon-teal text-deep-dark rounded-[2rem] font-black tracking-widest uppercase text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl mx-auto italic neon-glow"
                >
                  Sí, quiero mi libertad ahora
                  <ArrowRight className="w-5 h-5" />
                </button>
             </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 pt-32 pb-16 px-6 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 mb-24">
          <div className="flex items-center">
            <img 
              src={BRANDING.logo} 
              alt="Upfunnel Logo" 
              className="h-14 md:h-20 w-auto object-contain dark:invert brightness-110"
            />
          </div>
          
          <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
            <a href="/politicas" className="hover:neon-text transition-colors">Políticas</a>
            <a href="/privacidad" className="hover:neon-text transition-colors">Privacidad</a>
            <a href="/soporte" className="hover:neon-text transition-colors">Soporte</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto text-center border-t border-white/5 pt-12">
           <p className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.4em]">
              <span className="neon-text opacity-50">upfunnel</span> || Ecosistema de Productividad 2026.
           </p>
        </div>
      </footer>

      {/* Global Scroll Animation Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes infinite-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-infinite-scroll {
          display: flex;
          width: max-content;
          animation: infinite-scroll 60s linear infinite;
        }
      `}} />
    </div>
  );
};

export default LandingPage;
