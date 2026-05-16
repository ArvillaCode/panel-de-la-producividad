import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Brain,
  ChevronRight,
  Cpu,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Minus,
  Plus,
  Sparkles,
  X
} from 'lucide-react';
import { BRANDING } from '../constants/branding';

const NAV_LINKS = [
  { id: 'solucion', label: 'Solución' },
  { id: 'elegirnos', label: 'Por Qué Nosotros' },
  { id: 'faq', label: 'FAQ' },
  { id: 'pricing', label: 'Inversión' }
];

const LOGOS = [
  { name: 'OpenAI', icon: '🤖' },
  { name: 'Anthropic', icon: '🧠' },
  { name: 'Google AI', icon: '🌐' },
  { name: 'Meta', icon: '∞' },
  { name: 'Mistral', icon: '🌪️' },
  { name: 'Stripe', icon: '💳' },
  { name: 'AWS', icon: '☁️' },
  { name: 'NVIDIA', icon: '📟' }
];

const SOLUTION_CARDS = [
  { icon: Brain, title: 'IA Unificada', desc: 'Los modelos líderes del mercado, optimizados para tu flujo de trabajo diario.' },
  { icon: LayoutDashboard, title: 'Panel Maestro', desc: 'Diseñado para ejecutivos y fundadores que no tienen tiempo que perder.' },
  { icon: Cpu, title: 'Agentes Expertos', desc: 'Más de 70 agentes pre-entrenados para ventas, copy, estrategia y automatización.' }
];

const WHY_ITEMS = [
  { q: '¿Por qué seguir pagando 10 IAs?', a: 'Es ineficiente y costoso. Upfunnel te da el poder de los modelos más potentes del mundo en un solo lugar por una fracción del costo.' },
  { q: '¿Realmente seré más productivo?', a: 'Al eliminar la fricción de decidir qué herramienta usar, tu velocidad de ejecución se multiplica.' },
  { q: '¿Es una inversión inteligente?', a: '$50 al año es un atajo accesible. El costo de no tener un sistema unificado suele ser mucho mayor.' }
];

const FAQ_ITEMS = [
  { question: '¿Por qué solo cuesta $50 al año?', answer: 'Nuestra misión es democratizar el acceso a la IA de élite. Queremos que el presupuesto no sea una barrera para escalar tu negocio.' },
  { question: '¿Necesito conocimientos técnicos?', answer: 'Ninguno. El panel está diseñado para que empieces a producir resultados en segundos, sin configuraciones complejas.' },
  { question: '¿Qué tipos de agentes incluye?', answer: 'Marketing, ventas, estrategia, finanzas y más. Cubrimos los pilares de un negocio moderno.' },
  { question: '¿Tengo que instalar o descargar algo?', answer: 'No. Ingresas desde el navegador y empiezas de inmediato, sin fricciones técnicas.' }
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-teal focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1A2B]';

const getAppLoginUrl = (intent = '') => {
  if (typeof window === 'undefined') return '/login';
  const host = window.location.hostname;
  const base = host.includes('localhost') ? '/login' : 'https://app.upfunnel.click/login';
  return intent ? `${base}?intent=${intent}` : base;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useActiveSection(sectionIds) {
  const [active, setActive] = useState(sectionIds[0]);
  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}

const Reveal = ({ children, delay = 0 }) => {
  const reducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(reducedMotion);
  const ref = useRef(null);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className={
        reducedMotion
          ? ''
          : `transition-[opacity,transform] duration-700 ease-out ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'
            }`
      }
      style={reducedMotion ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const FAQItem = ({ id, question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  const triggerId = `faq-trigger-${id}`;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div className="border-b border-white/5 py-6">
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
          className={`w-full flex items-center justify-between gap-4 text-left group touch-manipulation ${focusRing} rounded-lg -mx-2 px-2 py-1`}
        >
          <span className="text-lg font-bold text-slate-300 group-hover:text-neon-teal transition-colors uppercase italic tracking-tight text-pretty">
            {question}
          </span>
          {isOpen ? (
            <Minus className="w-5 h-5 shrink-0 text-neon-teal" aria-hidden="true" />
          ) : (
            <Plus className="w-5 h-5 shrink-0 text-slate-500 group-hover:text-neon-teal transition-colors" aria-hidden="true" />
          )}
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className={isOpen ? 'mt-4' : ''}
      >
        <p className="text-slate-400 font-medium leading-relaxed text-pretty">{answer}</p>
      </div>
    </div>
  );
};

const LandingHeader = ({ activeSection, onNavigate, mobileOpen, setMobileOpen }) => {
  const appLogin = getAppLoginUrl('demo');

  const navLinkClass = (id) =>
    `text-[10px] font-black uppercase tracking-[0.25em] transition-colors rounded-md px-2 py-1 ${focusRing} ${
      activeSection === id ? 'text-neon-teal' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0E1A2B]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0E1A2B]/75 pt-[env(safe-area-inset-top)]">
      <nav
        className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 max-w-7xl mx-auto"
        aria-label="Principal"
      >
        <a
          href="#contenido-principal"
          className={`flex items-center min-w-0 ${focusRing} rounded-xl`}
          aria-label={`${BRANDING.name} — inicio`}
          translate="no"
        >
          <img
            src={BRANDING.logo}
            alt=""
            width={48}
            height={48}
            aria-hidden="true"
            className="h-10 md:h-11 w-auto object-contain brightness-0 invert"
            fetchPriority="high"
          />
          <span className="ml-3 text-xl md:text-2xl font-black tracking-tighter italic text-white truncate">
            {BRANDING.name}
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={navLinkClass(link.id)}
              aria-current={activeSection === link.id ? 'true' : undefined}
              onClick={() => onNavigate(link.id)}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={appLogin}
            className={`hidden sm:inline-flex px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-colors ${focusRing}`}
          >
            Iniciar Sesión
          </a>
          <a
            href={appLogin}
            className={`px-5 py-2.5 bg-neon-teal/10 border border-neon-teal/20 text-neon-teal rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-teal hover:text-deep-dark transition-colors ${focusRing}`}
          >
            Reservar Demo
          </a>
          <button
            type="button"
            className={`lg:hidden p-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors touch-manipulation ${focusRing}`}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          id="landing-mobile-menu"
          className="lg:hidden border-t border-white/5 bg-[#0E1A2B]/95 px-4 pb-6 pt-2 overscroll-contain"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={`block py-3 text-sm font-bold uppercase tracking-wider ${focusRing} rounded-lg px-2 ${
                    activeSection === link.id ? 'text-neon-teal' : 'text-slate-300'
                  }`}
                  aria-current={activeSection === link.id ? 'true' : undefined}
                  onClick={() => {
                    onNavigate(link.id);
                    setMobileOpen(false);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-3 mt-2 border-t border-white/10">
              <a
                href={appLogin}
                className={`flex items-center justify-between py-3 text-sm font-black uppercase tracking-wider text-neon-teal ${focusRing}`}
              >
                Iniciar Sesión
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

const LandingPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const sectionIds = NAV_LINKS.map((l) => l.id);
  const activeSection = useActiveSection(sectionIds);
  const appLogin = getAppLoginUrl();
  const appSignup = getAppLoginUrl('signup');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  useEffect(() => {
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.style.colorScheme = '';
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-deep-dark text-white selection:bg-neon-teal/30 overflow-x-hidden font-sans spatial-grid landing-page">
      <a
        href="#contenido-principal"
        className={`sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-neon-teal focus:text-deep-dark focus:rounded-lg focus:font-bold ${focusRing}`}
      >
        Saltar al contenido principal
      </a>

      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-neon-teal/5 blur-[120px] rounded-full opacity-30" />
      </div>

      <LandingHeader
        activeSection={activeSection}
        onNavigate={scrollToSection}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main id="contenido-principal" className="relative z-10">
        {/* Hero */}
        <section className="pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 max-w-7xl mx-auto text-center scroll-mt-24">
          <Reveal>
            <p className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-neon-teal/5 border border-neon-teal/10 mb-8">
              <Sparkles className="w-4 h-4 text-neon-teal" aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neon-teal/90">
                Ecosistema IA de alto nivel
              </span>
            </p>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-8 tracking-tighter leading-[0.95] max-w-5xl mx-auto text-balance">
              <span className="block text-slate-500 italic font-medium text-2xl sm:text-3xl md:text-4xl mb-4 tracking-normal">
                Tu tiempo es el activo más valioso.
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 uppercase">
                Haz que el <span className="neon-text">tiempo</span> trabaje para ti.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium text-pretty">
              Centraliza más de 70 agentes especializados en un solo panel. Menos fricción, más ejecución.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-md sm:max-w-none mx-auto">
              <a
                href={appSignup}
                className={`group inline-flex items-center justify-center gap-3 px-10 py-5 bg-neon-teal text-deep-dark rounded-2xl font-black tracking-widest uppercase text-sm italic shadow-[0_0_40px_-8px_rgba(0,229,255,0.45)] hover:brightness-110 active:scale-[0.98] transition-[transform,filter] touch-manipulation ${focusRing}`}
              >
                Empezar ahora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </a>
              <a
                href="#pricing"
                className={`inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl border border-white/15 text-white font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-colors touch-manipulation ${focusRing}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('pricing');
                }}
              >
                Ver inversión
              </a>
            </div>
          </Reveal>
        </section>

        {/* Logos */}
        <section className="py-12 border-y border-white/5 overflow-hidden bg-white/[0.02]" aria-label="Tecnologías compatibles">
          <div className={`flex whitespace-nowrap ${reducedMotion ? '' : 'landing-logo-marquee'}`}>
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <div
                key={`${logo.name}-${i}`}
                className="flex items-center gap-4 px-10 sm:px-14 opacity-40"
                aria-hidden={i >= LOGOS.length}
              >
                <span className="text-2xl" aria-hidden="true">
                  {logo.icon}
                </span>
                <span className="text-base font-black tracking-tighter uppercase italic" translate="no">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Solución */}
        <section id="solucion" className="py-24 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-24">
          <Reveal>
            <header className="text-center mb-16 md:mb-20">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mb-6 text-balance">
                La solución: <span className="neon-text">un solo cerebro</span>
              </h2>
              <p className="text-slate-400 max-w-3xl mx-auto text-lg font-medium leading-relaxed text-pretty">
                Olvida las 20 pestañas abiertas. Más de 70 agentes especializados en una interfaz hecha para ejecutar.
              </p>
            </header>
          </Reveal>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 list-none p-0 m-0">
            {SOLUTION_CARDS.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.title}>
                  <Reveal delay={i * 120}>
                    <article className="p-8 md:p-10 rounded-[2rem] glass-card glass-card-hover border-white/5 h-full flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-neon-teal/10 flex items-center justify-center mb-6 text-neon-teal">
                        <Icon size={32} aria-hidden="true" />
                      </div>
                      <h3 className="text-xl font-black uppercase italic mb-4">{item.title}</h3>
                      <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Por qué */}
        <section id="elegirnos" className="py-24 md:py-32 px-4 sm:px-6 bg-white/[0.02] scroll-mt-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal>
              <div className="relative aspect-square max-w-md mx-auto lg:max-w-lg">
                <div className="absolute inset-0 bg-neon-teal/20 blur-[100px] rounded-full motion-safe:animate-pulse" aria-hidden="true" />
                <div className="relative h-full w-full rounded-[3rem] border border-white/10 bg-black/60 backdrop-blur-3xl flex flex-col items-center justify-center p-10 md:p-14 text-center">
                  <div className="w-20 h-20 bg-neon-teal text-deep-dark rounded-2xl flex items-center justify-center mb-8">
                    <Award className="w-10 h-10" aria-hidden="true" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black uppercase italic leading-tight mb-4 text-balance">
                    ¿Por qué Upfunnel?
                  </h2>
                  <p className="text-lg text-slate-300 font-medium italic leading-relaxed text-pretty">
                    No damos más herramientas: damos el resultado que prometen.
                  </p>
                </div>
              </div>
            </Reveal>

            <ol className="space-y-12 list-none p-0 m-0">
              {WHY_ITEMS.map((item, i) => (
                <li key={item.q}>
                  <Reveal delay={i * 100}>
                    <div className="flex gap-6">
                      <span
                        className="shrink-0 w-10 h-10 rounded-xl bg-neon-teal/10 flex items-center justify-center text-neon-teal font-black text-sm tabular-nums"
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-xl md:text-2xl font-black uppercase italic mb-2 tracking-tight text-pretty">
                          {item.q}
                        </h3>
                        <p className="text-slate-400 font-medium leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 md:py-32 px-4 sm:px-6 max-w-3xl mx-auto scroll-mt-24">
          <Reveal>
            <header className="text-center mb-12 md:mb-16">
              <HelpCircle className="w-12 h-12 text-neon-teal mx-auto mb-6" aria-hidden="true" />
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight text-balance">
                Preguntas frecuentes
              </h2>
            </header>
            <div className="glass-card border-white/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12">
              {FAQ_ITEMS.map((item, i) => (
                <FAQItem key={item.question} id={i} question={item.question} answer={item.answer} />
              ))}
            </div>
          </Reveal>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 md:py-32 px-4 sm:px-6 scroll-mt-24">
          <Reveal>
            <div className="max-w-4xl mx-auto p-10 md:p-16 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-deep-dark via-deep-dark to-neon-teal/15 border border-white/10 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true">
                <div className="w-full h-full bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:20px_20px]" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-6xl font-black mb-8 tracking-tighter leading-tight uppercase italic text-balance">
                  No dejes pasar <br className="hidden sm:block" />
                  un año más <span className="neon-text">igual</span>.
                </h2>
                <p className="mb-8">
                  <span className="text-5xl md:text-6xl font-black tracking-tighter neon-text tabular-nums">$50</span>
                  <span className="text-sm font-bold uppercase tracking-widest ml-3 text-slate-400">USD / año</span>
                </p>
                <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto font-medium text-pretty">
                  Acceso anual al panel completo. Oferta de lanzamiento por tiempo limitado.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href={appSignup}
                    className={`inline-flex items-center justify-center gap-3 px-12 py-5 bg-neon-teal text-deep-dark rounded-2xl font-black tracking-widest uppercase text-sm italic hover:brightness-110 active:scale-[0.98] transition-[transform,filter] touch-manipulation ${focusRing}`}
                  >
                    Obtener acceso
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </a>
                  <a
                    href={getAppLoginUrl('demo')}
                    className={`inline-flex items-center justify-center px-8 py-5 rounded-2xl border border-white/20 text-white font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-colors touch-manipulation ${focusRing}`}
                  >
                    Reservar demo
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 pt-20 pb-10 px-4 sm:px-6 border-t border-white/5 bg-black/20 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 mb-16">
          <a href="#" className={`flex items-center ${focusRing} rounded-xl`} translate="no">
            <img
              src={BRANDING.logo}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="h-12 md:h-14 w-auto object-contain brightness-0 invert"
            />
            <span className="sr-only">{BRANDING.name}</span>
          </a>

          <nav aria-label="Legal y soporte">
            <ul className="flex flex-wrap justify-center gap-8 sm:gap-12 list-none p-0 m-0">
              {[
                { to: '/politicas', label: 'Políticas' },
                { to: '/privacidad', label: 'Privacidad' },
                { to: '/soporte', label: 'Soporte' }
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`text-[10px] font-black uppercase tracking-[0.35em] text-slate-500 hover:text-neon-teal transition-colors ${focusRing}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto text-center border-t border-white/5 pt-8">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.3em]">
            <span translate="no">{BRANDING.name}</span>
            <span className="mx-2 opacity-40" aria-hidden="true">
              ·
            </span>
            Ecosistema de productividad {new Date().getFullYear()}
          </p>
          <p className="mt-4">
            <a href={appLogin} className={`text-[10px] font-black uppercase tracking-widest text-neon-teal/70 hover:text-neon-teal transition-colors ${focusRing}`}>
              Acceso al panel
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
