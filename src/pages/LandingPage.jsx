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
        <span className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors uppercase italic tracking-tight">{question}</span>
        {isOpen ? <Minus className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-all" />}
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
    <div className="min-h-screen bg-[#020203] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      {/* Premium Background: Grid + Radial Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Navigation Header */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center">
          <img 
            src="https://krtthtzljlyewlngaklo.supabase.co/storage/v1/object/public/images/ChatGPT%20Image%2011%20may%202026,%2023_48_25.png" 
            alt="Upfunnel Logo" 
            className="h-16 md:h-20 w-auto object-contain"
          />
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <a href="#solucion" className="text-xs font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">Solución</a>
          <a href="#elegirnos" className="text-xs font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">Por qué nosotros</a>
          <a href="#pricing" className="text-xs font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">Inversión</a>
          <a href="#faq" className="text-xs font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">FAQ</a>
        </div>

        <button onClick={handleAction} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
          Reservar Demo
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/10 mb-8">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400/80">Tu tiempo no es negociable</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[0.95] max-w-4xl mx-auto">
            <span className="block text-slate-500 italic font-medium text-3xl md:text-4xl mb-4 tracking-normal">Mira, sé que estás cansado de correr.</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 uppercase">
              Haz que el tiempo trabaje para ti.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Tú y yo sabemos que el ruido de la IA te está robando energía. <span className="text-white">Si no tomas el control ahora</span>, el tiempo seguirá escapándose. Upfunnel es tu atajo para recuperar tu vida.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={handleAction}
              className="group relative flex items-center gap-4 px-10 py-5 bg-blue-600 text-white rounded-full shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 transition-all duration-500"
            >
              <span className="relative font-black tracking-widest uppercase text-xs italic">Quiero mi tiempo de vuelta</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </Reveal>
      </section>

      {/* Infinite Logo Scroll */}
      <div className="relative z-10 py-12 border-y border-white/5 overflow-hidden">
        <div className="flex whitespace-nowrap animate-infinite-scroll">
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <div key={i} className="flex items-center gap-4 px-12 opacity-20 hover:opacity-100 transition-opacity">
              <span className="text-xl">{logo.icon}</span>
              <span className="text-sm font-black tracking-tighter uppercase italic">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Solution Section (La Solución) */}
      <section id="solucion" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mb-6">La Solución: <span className="text-blue-500">Un Solo Cerebro</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto font-medium">Olvídate de tener 20 pestañas abiertas. Hemos unificado el poder de más de 70 agentes especializados (y sumamos nuevos constantemente) en una interfaz diseñada para la ejecución inmediata.</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Brain />, title: "IA Unificada", desc: "Los modelos líderes del mercado, optimizados para tu flujo de trabajo diario." },
            { icon: <LayoutDashboard />, title: "Panel Ejecutivo", desc: "Diseñado para emprendedores que no tienen tiempo que perder." },
            { icon: <Cpu />, title: "Agentes Expertos", desc: "Más de 70 Agentes pre-entrenados para ventas, copy, estrategia y más." }
          ].map((item, i) => (
            <Reveal key={i} delay={i * 200}>
              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-blue-500/30 transition-all h-full group">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-black uppercase italic italic mb-4">{item.title}</h3>
                <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why Us Section (¿Por qué nosotros?) */}
      <section id="elegirnos" className="relative z-10 py-32 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <Reveal>
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative h-full w-full rounded-[4rem] border border-white/10 bg-black/50 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-black uppercase italic leading-tight mb-4">¿Por qué Upfunnel?</h3>
                <p className="text-slate-400 font-medium italic">"Porque no estamos aquí para darte más herramientas, estamos aquí para darte el resultado que ellas prometen."</p>
              </div>
            </div>
          </Reveal>

          <div className="space-y-12">
            {[
              { q: "¿Por qué seguir pagando 10 IAs?", a: "Tú sabes que es ineficiente. Upfunnel te da el poder de los modelos más potentes por una fracción del costo." },
              { q: "¿Realmente seré más productivo?", a: "Absolutamente. Al eliminar la fricción de '¿qué IA uso para esto?', tu velocidad de ejecución se multiplica." },
              { q: "¿Es una inversión segura?", a: "$50 al año por más de 70 agentes especializados es el mayor atajo que puedes comprar hoy. El costo de oportunidad de no tenerlo es incalculable." }
            ].map((item, i) => (
              <Reveal key={i} delay={i * 200}>
                <div className="flex gap-6">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs italic">0{i+1}</div>
                  <div>
                    <h4 className="text-lg font-black uppercase italic mb-2 tracking-tight">{item.q}</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Point Section */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-8 tracking-tighter leading-tight italic uppercase">
                ¿Vas a seguir dejando <br /> que se te <span className="text-red-500 underline decoration-red-500/30">escape</span> el día?
              </h2>
              <div className="space-y-6">
                {[
                  { title: "Deja de tirar dinero", desc: "No te hablo de otra suscripción. Te hablo de dejar de pagar 10 herramientas que no conectan entre sí." },
                  { title: "Sal de la parálisis", desc: "No pierdas horas buscando 'el mejor prompt'. Nuestros agentes ya están configurados para ganar." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 p-6 rounded-3xl bg-white/5 border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm mb-1 uppercase italic">{item.title}</h3>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 rounded-[3rem] border border-white/10 bg-white/[0.01] backdrop-blur-3xl text-center">
              <Timer className="w-12 h-12 text-blue-500 mx-auto mb-6" />
              <p className="text-5xl font-black tracking-tighter mb-2 italic">2,100 Horas</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Perdidas por año en tareas manuales</p>
            </div>
          </div>
        </Reveal>
      </section>
      
      {/* Testimonials Section */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mb-4">Lo que dicen de nosotros</h2>
            <p className="text-slate-400 font-medium">Empresarios y creativos que ya están escalando con Upfunnel.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Carlos Mendoza", role: "Emprendedor Digital", quote: "Upfunnel ha reducido mi carga de trabajo en un 40%. Los agentes son increíblemente precisos." },
              { name: "Elena Ríos", role: "Directora de Marketing", quote: "Nunca pensé que la IA pudiera ser tan 'lista para usar'. Es conectar y empezar a producir." },
              { name: "Javier Soler", role: "Desarrollador Senior", quote: "El nivel de optimización de estos modelos es superior a cualquier otra plataforma que haya probado." }
            ].map((t, i) => (
              <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-500 h-full flex flex-col">
                <MessageSquare className="w-8 h-8 text-blue-500/30 mb-6" />
                <p className="text-lg text-slate-300 font-medium italic mb-8 leading-relaxed flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black italic">{t.name.charAt(0)}</div>
                  <div>
                    <h4 className="font-black uppercase text-sm tracking-tight">{t.name}</h4>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-32 px-6 max-w-4xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <HelpCircle className="w-12 h-12 text-blue-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight">Preguntas Frecuentes</h2>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 md:p-12">
            <FAQItem 
              question="¿Por qué solo cuesta $50 al año?" 
              answer="Nuestra misión es democratizar el acceso a la IA de alto nivel para emprendedores. Queremos ser tu primer paso hacia la libertad, no otra carga financiera."
            />
            <FAQItem 
              question="¿Necesito conocimientos técnicos?" 
              answer="Ninguno. El panel está diseñado para que cualquier persona pueda empezar a interactuar con los agentes en segundos."
            />
            <FAQItem 
              question="¿Qué tipos de agentes incluye?" 
              answer="Desde especialistas en copy persuasivo y estrategia de marketing, hasta analistas de datos y generadores de contenido técnico."
            />
            <FAQItem 
              question="¿Necesito instalar, descargar o configurar algo?" 
              answer="Para nada. Nuestro panel es 'Ready to Use'. El acceso es 100% web, lo que significa que puedes entrar desde cualquier dispositivo con internet y empezar a producir en segundos sin complicaciones técnicas."
            />
            <FAQItem 
              question="¿Es un pago recurrente?" 
              answer="Sí, es una suscripción anual de $50 USD que te garantiza acceso ilimitado a todas las actualizaciones y nuevos agentes que lancemos con frecuencia."
            />
          </div>
        </Reveal>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="relative z-10 py-32 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto p-12 md:p-16 rounded-[4rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-center relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]" />
             <div className="relative z-10">
                <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-tight uppercase italic">
                   No dejes pasar <br /> un año más igual.
                </h2>
                <div className="inline-block px-10 py-4 bg-white text-blue-600 rounded-full mb-10 shadow-2xl">
                   <span className="text-5xl font-black tracking-tighter">$50</span>
                   <span className="text-xs font-bold uppercase tracking-widest ml-2">USD / Año</span>
                </div>
                <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto font-medium">
                   Si lo piensas, es menos de lo que cuesta una cena. Pero el valor de recuperar tu tiempo es incalculable. <span className="block mt-4 text-white font-bold italic underline decoration-white/30">Esta oportunidad no durará siempre.</span>
                </p>
                <button
                  onClick={handleAction}
                  className="flex items-center gap-3 px-12 py-5 bg-black text-white rounded-full font-black tracking-widest uppercase text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl mx-auto italic"
                >
                  Sí, quiero mi libertad ahora
                  <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 pt-20 pb-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
          <div className="flex items-center">
            <img 
              src="https://krtthtzljlyewlngaklo.supabase.co/storage/v1/object/public/images/ChatGPT%20Image%2011%20may%202026,%2023_48_25.png" 
              alt="Upfunnel Logo" 
              className="h-12 md:h-16 w-auto object-contain"
            />
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
            <a href="/politicas" className="hover:text-blue-400 transition-colors">Políticas</a>
            <a href="/privacidad" className="hover:text-blue-400 transition-colors">Privacidad</a>
            <a href="/soporte" className="hover:text-blue-400 transition-colors">Soporte</a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto text-center border-t border-white/5 pt-8">
           <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
              <a href="https://app.upfunnel.click/login" className="hover:text-blue-500 transition-colors decoration-transparent">upfunnel</a> || Todos los derechos reservados 2026.
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
