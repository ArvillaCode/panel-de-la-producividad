import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Menu,
  X,
  Terminal,
  Bot,
  Zap,
  BookOpen,
  Award,
  ChevronRight,
  Users,
  Compass,
  PlayCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { BRANDING } from '../constants/branding';

const NAV_LINKS = [
  { id: 'solucion', label: 'Sistema' },
  { id: 'features', label: 'Producto' },
  { id: 'academia', label: 'Academia' },
  { id: 'pricing', label: 'Inversión' }
];

const LOGOS = [
  { name: 'OpenAI', tech: 'GPT-4o' },
  { name: 'Anthropic', tech: 'Claude 3.5' },
  { name: 'Google DeepMind', tech: 'Gemini 1.5' },
  { name: 'Meta AI', tech: 'Llama 3' },
  { name: 'Mistral', tech: 'Codestral' },
  { name: 'Supabase', tech: 'Postgres Core' },
  { name: 'Stripe', tech: 'Payments Hub' },
  { name: 'Cloudflare', tech: 'R2 Edge' }
];

const PROBLEM_CARDS = [
  {
    tool: 'ChatGPT',
    issue: 'Dispersión de chats',
    desc: 'Prompts perdidos en un historial infinito sin jerarquía ni orden.'
  },
  {
    tool: 'Claude',
    issue: 'Suscripción adicional',
    desc: 'Pagar $20/mes extra solo por probar otro modelo en otra pestaña.'
  },
  {
    tool: 'Google Drive',
    issue: 'Manuales de marca',
    desc: 'Copiar y pegar tus datos de negocio manualmente en cada nueva sesión.'
  },
  {
    tool: 'Bloc de Notas',
    issue: 'Prompts guardados',
    desc: 'Buscar en archivos de texto dispersos la "fórmula" que te funcionó ayer.'
  },
  {
    tool: 'Notion',
    issue: 'Workflows rotos',
    desc: 'Intentar conectar herramientas de IA sin una estructura de pasos lógicos.'
  },
  {
    tool: 'Tu Operación',
    issue: 'Fatiga de prompts',
    desc: 'Pasar más tiempo redactando instrucciones que ejecutando el trabajo real.'
  }
];

const BENTO_FEATURES = [
  {
    id: 'agents',
    title: 'Workspace de 71 Agentes',
    desc: 'Una consola optimizada con agentes de IA configurados con prompts de élite en Salud, Ventas, Copywriting, Marketing y Programación.',
    tag: 'Infraestructura',
    size: 'md:col-span-2'
  },
  {
    id: 'copilot',
    title: 'Copiloto Matchmaker',
    desc: 'No busques qué herramienta usar. Tu asesor de inteligencia artificial local te asigna el agente ideal según tu requerimiento diario.',
    tag: 'IA Local',
    size: 'md:col-span-1'
  },
  {
    id: 'workflows',
    title: 'Workflows Estandarizados',
    desc: 'Dile adiós a las respuestas inconsistentes. Upfunnel encauza tus inputs hacia la estructura correcta para outputs profesionales predecibles.',
    tag: 'Velocidad',
    size: 'md:col-span-1'
  },
  {
    id: 'academy',
    title: 'Centro de Implementación',
    desc: 'Academia interna con mini-cursos express y tutoriales aplicables de 10 minutos para activar Upfunnel en tu negocio desde el primer día.',
    tag: 'Educación',
    size: 'md:col-span-2'
  }
];

const USE_CASES = {
  freelancer: {
    title: 'Freelancers Eficientes',
    issue: 'El día tiene 24 horas y no puedes delegar porque contratar personal destruye tus márgenes.',
    solution: 'Upfunnel actúa como tu equipo de soporte interno. El redactor creativo genera propuestas, el programador depura código y el estratega valida tus tarifas en segundos.',
    result: 'Multiplica por 3 tu capacidad de entrega de clientes sin contratar a nadie.'
  },
  marketer: {
    title: 'Marketers y Copywriters',
    issue: 'Pasar horas frente a la página en blanco saltando de ChatGPT a Claude buscando ideas creativas.',
    solution: 'Activa la suite de copywriters y estrategas de contenido con prompts de nivel agencia. El Matchmaker te enlaza al bot exacto para anuncios, secuencias de email o copies virales.',
    result: 'Crea campañas completas con copys listos para pautar en un 70% menos de tiempo.'
  },
  agencia: {
    title: 'Agencias Boutiques',
    issue: 'Cada colaborador redacta prompts diferentes, lo que genera entregables de calidad inconsistente.',
    solution: 'Estandariza los workflows con Upfunnel. Tu equipo completo utiliza la misma flota de agentes calibrados, asegurando que la calidad del output siempre cumpla tu estándar.',
    result: 'Entregables consistentes, reducción drástica de revisiones y onboarding veloz de nuevos empleados.'
  },
  creador: {
    title: 'Creadores y Emprendedores',
    issue: 'La fatiga operacional de gestionar redes, finanzas, soporte y estrategia de producto tú solo.',
    solution: 'Delega tareas complejas en la suite. Usa el agente de planificación de contenido para estructurar un mes de ideas y el agente financiero para auditar tus costos fijos en segundos.',
    result: 'Liberas más de 12 horas operacionales a la semana para enfocarte en vender y crecer.'
  }
};

const FAQ_ITEMS = [
  {
    question: '¿Por qué Upfunnel se vende como un "Sistema Operativo" y no un directorio?',
    answer: 'Los directorios solo listan links externos para que tú adivines cómo usarlos. Upfunnel es un entorno de trabajo integrado. Te da los agentes optimizados, un copiloto con Gemini que te asigna la herramienta perfecta según tu problema y una Academia interna para enseñarte a automatizar tu negocio.'
  },
  {
    question: '¿Tengo que pagar suscripciones premium adicionales de IA?',
    answer: 'No. Upfunnel está diseñado para canalizar tus requerimientos mediante prompts inyectados y un copiloto inteligente. Puedes acceder a las herramientas optimizadas directamente desde la plataforma sin pagar suscripciones mensuales de $20 USD.'
  },
  {
    question: '¿Cómo funciona el precio del "Acceso Founder"?',
    answer: 'Es una oferta única de lanzamiento. Por solo $79.99 USD obtienes acceso completo a todo el sistema operativo, la flota de 71 agentes, el Asistente Copiloto y los cursos de la Academia por un año completo. En la renovación el precio se mantendrá congelado para ti, aunque el valor regular suba a $199 USD.'
  },
  {
    question: '¿Necesito conocimientos de código o prompts avanzados?',
    answer: 'Ninguno. Diseñamos Upfunnel específicamente para erradicar el "prompting manual". El sistema te guía mediante flujos intuitivos y el Copiloto interpreta tu lenguaje natural para darte exactamente la solución que necesitas.'
  },
  {
    question: '¿Tienen garantía de devolución?',
    answer: 'Sí. Estamos tan seguros del valor del sistema operativo que ofrecemos una garantía incondicional de 7 días. Si ingresas y sientes que no te ahorra tiempo ni optimiza tu negocio, nos escribes a soporte y te devolvemos el 100% de tu pago de inmediato.'
  }
];

const STRIPE_URL = 'https://buy.stripe.com/4gMdR96wma4KdLM6LQ7bW0C';
const STRIPE_MONTHLY_URL = 'https://buy.stripe.com/test_placeholder_monthly';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-teal focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14]';

function usePrefersReducedMotion() {
  // Ignorar configuración del SO y forzar animaciones siempre
  return false;
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
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5] }
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

// MOCKUP ANIMADO EN CÓDIGO - Simula el copiloto y dashboard de Upfunnel interactuando
const DashboardMockup = () => {
  const [typedPrompt, setTypedPrompt] = useState('');
  const [copilotReply, setCopilotReply] = useState('');
  const [activeAgent, setActiveAgent] = useState('');
  const [status, setStatus] = useState('idle'); // idle, typing, analyzing, connecting, active

  const fullPromptText = 'Necesito redactar una propuesta comercial irresistible para cerrar una startup tecnológica...';

  useEffect(() => {
    let timeoutId;
    let intervalId;
    
    const runSimulation = () => {
      // 1. Reset
      setTypedPrompt('');
      setCopilotReply('');
      setActiveAgent('');
      setStatus('typing');
      
      // 2. Escribir prompt
      let currentLength = 0;
      intervalId = setInterval(() => {
        currentLength++;
        setTypedPrompt(fullPromptText.substring(0, currentLength));
        if (currentLength >= fullPromptText.length) {
          clearInterval(intervalId);
          setStatus('analyzing');
          
          // 3. Analizar (1s)
          timeoutId = setTimeout(() => {
            setStatus('connecting');
            setCopilotReply('⚡ Buscando en el catálogo... Coincidencia: [Agente de Ventas B2B]');
            
            // 4. Conectar al Agente (1.5s)
            timeoutId = setTimeout(() => {
              setStatus('active');
              setActiveAgent('Agente de Ventas B2B');
              setCopilotReply('🚀 Conexión establecida. Prompt optimizado inyectado.');
              
              // Reiniciar simulación en 6 segundos
              timeoutId = setTimeout(runSimulation, 6000);
            }, 1800);
          }, 1200);
        }
      }, 40);
    };

    runSimulation();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[#0A0E17]/90 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden font-sans text-left mt-16 select-none relative group">
      {/* Luz de neón trasera sutil */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-neon-teal/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-1000"></div>
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-red-500/80"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-green-500/80"></div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 ml-4">
            upfunnel_workspace_console_v3.0.sh
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase bg-neon-teal/10 text-neon-teal px-2 py-0.5 rounded border border-neon-teal/20 tracking-wider">
            CORE ACTIVE
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 min-h-[380px] text-xs">
        
        {/* Sidebar */}
        <div className="p-5 border-r border-white/5 bg-[#090C12] md:col-span-1 space-y-4">
          <div>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Ecosistema IA</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white font-semibold">
                <Compass className="w-3.5 h-3.5 text-neon-teal" />
                <span>Flota de Agentes</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">
                <Bot className="w-3.5 h-3.5" />
                <span>Matchmaker Copilot</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Academia</span>
              </div>
            </div>
          </div>
          
          <div>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-2">Categorías</span>
            <div className="space-y-1 text-slate-400 font-medium">
              <div className="flex items-center justify-between px-3 py-1 text-[11px] hover:text-white rounded">
                <span>Ventas & Marketing</span>
                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded">24</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1 text-[11px] hover:text-white rounded">
                <span>Copywriting</span>
                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded">16</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1 text-[11px] hover:text-white rounded">
                <span>Estrategia</span>
                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded">12</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1 text-[11px] hover:text-white rounded">
                <span>Salud & Bienestar</span>
                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Central */}
        <div className="p-6 md:col-span-3 flex flex-col justify-between bg-[#0A0D15]">
          
          {/* Output del Asistente */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="font-black tracking-tight text-white uppercase italic text-[11px]">Consola Copiloto Activa</h4>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gemini 1.5 core</span>
              </div>
            </div>

            {/* Prompt Simulado del Usuario */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500">
                <Terminal className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[10px] font-mono">USUARIO_PROMPT:</span>
              </div>
              <p className="pl-5 text-slate-300 font-medium font-mono leading-relaxed border-l border-white/5">
                {typedPrompt}
                {status === 'typing' && <span className="inline-block w-1.5 h-3.5 bg-neon-teal ml-0.5 animate-pulse"></span>}
              </p>
            </div>

            {/* Repuesta del Copiloto */}
            {status !== 'typing' && (
              <div className="space-y-1.5 animate-in fade-in duration-300 pt-2">
                <div className="flex items-center gap-2 text-neon-teal">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold">MATCHMAKER_AI:</span>
                </div>
                <p className="pl-5 text-slate-400 font-mono text-[11px]">
                  {status === 'analyzing' ? (
                    <span className="text-slate-500 animate-pulse">Analizando requerimiento con NLP...</span>
                  ) : (
                    <span>{copilotReply}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Cards de Agentes Abajo (Visual del catálogo) */}
          <div className="grid grid-cols-2 gap-3 mt-6 border-t border-white/5 pt-5">
            <div className={`p-3 rounded-xl border transition-all duration-300 ${activeAgent === 'Agente de Ventas B2B' ? 'bg-neon-teal/5 border-neon-teal shadow-lg shadow-neon-teal/5 scale-105' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-[11px]">Agente Ventas B2B</span>
                <Zap className={`w-3.5 h-3.5 ${activeAgent === 'Agente de Ventas B2B' ? 'text-neon-teal' : 'text-slate-600'}`} />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">Redacción de propuestas y prospección en frío.</p>
            </div>
            
            <div className="p-3 rounded-xl border bg-white/[0.02] border-white/5 opacity-30 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-[11px]">Redactor Experto</span>
                <Zap className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">Copywriting y guiones para alto impacto.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

const LandingHeader = ({ activeSection, onNavigate, mobileOpen, setMobileOpen }) => {
  const navLinkClass = (id) =>
    `text-[10px] font-black uppercase tracking-[0.25em] transition-colors rounded-md px-2 py-1 ${focusRing} ${
      activeSection === id ? 'text-neon-teal' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080C14]/85 backdrop-blur-xl supports-[backdrop-filter]:bg-[#080C14]/75 pt-[env(safe-area-inset-top)]">
      <nav
        className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 max-w-6xl mx-auto"
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
            fetchpriority="high"
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
              onClick={(e) => {
                e.preventDefault();
                onNavigate(link.id);
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className={`hidden sm:inline-flex px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors ${focusRing}`}
          >
            Iniciar Sesión
          </Link>
          <a
            href={STRIPE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-5 py-2.5 bg-neon-teal text-deep-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-teal/90 transition-colors shadow-lg shadow-neon-teal/20 ${focusRing}`}
          >
            Acceso Founder
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
          className="lg:hidden border-t border-white/5 bg-[#080C14]/95 px-4 pb-6 pt-2 overscroll-contain"
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
            <li className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-3">
              <Link
                to="/login"
                className={`flex items-center justify-between py-3 text-sm font-black uppercase tracking-wider text-slate-300 ${focusRing}`}
              >
                Iniciar Sesión
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href={STRIPE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-4 bg-neon-teal text-deep-dark rounded-xl text-xs font-black uppercase tracking-widest"
              >
                Acceso Founder
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

const FAQItemComponent = ({ id, question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  const triggerId = `faq-trigger-${id}`;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div className="border-b border-white/5 py-5 last:border-b-0">
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
          className={`w-full flex items-center justify-between gap-4 text-left group touch-manipulation ${focusRing} rounded-lg py-2`}
        >
          <span className="text-md md:text-lg font-bold text-slate-200 group-hover:text-neon-teal transition-colors uppercase italic tracking-tight text-pretty">
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
        className={`${isOpen ? 'mt-3 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-300`}
      >
        <p className="text-slate-400 font-medium leading-relaxed text-pretty text-xs md:text-sm pl-1">
          {answer}
        </p>
      </div>
    </div>
  );
};
const SECTION_IDS = ['solucion', 'features', 'academia', 'pricing'];

const LandingPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('freelancer');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('annual'); // 'monthly' o 'annual'
  const reducedMotion = false;
  const activeSection = useActiveSection(SECTION_IDS);

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
    <div className="min-h-screen bg-[#080C14] text-white selection:bg-neon-teal/30 overflow-x-hidden font-sans spatial-grid landing-page">
      
      <a
        href="#contenido-principal"
        className={`sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-neon-teal focus:text-deep-dark focus:rounded-lg focus:font-bold ${focusRing}`}
      >
        Saltar al contenido principal
      </a>

      {/* Background radial overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-neon-teal/5 blur-[120px] rounded-full opacity-45 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full opacity-30 pointer-events-none" />
      </div>

      <LandingHeader
        activeSection={activeSection}
        onNavigate={scrollToSection}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main id="contenido-principal" className="relative z-10">
        
        {/* 1. HERO SECTION */}
        <section className="pt-20 pb-20 md:pt-28 md:pb-28 px-4 sm:px-6 max-w-6xl mx-auto text-center scroll-mt-24">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-neon-teal/5 border border-neon-teal/15 mb-8 animate-pulse-glow">
              <Sparkles className="w-3.5 h-3.5 text-neon-teal" aria-hidden="true" />
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-neon-teal/95">
                SISTEMA OPERATIVO IA · ACCESO FOUNDER DISPONIBLE
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-8 tracking-tighter leading-[0.95] max-w-5xl mx-auto text-balance">
              <span className="block text-slate-500 italic font-medium text-xl sm:text-2xl md:text-3xl mb-4 tracking-normal">
                Opera tu negocio sin el caos.
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/60 uppercase">
                UPFUNNEL CONVIERTE IA <br />
                EN <span className="neon-text">EJECUCIÓN</span> REAL.
              </span>
            </h1>

            <p className="text-sm md:text-md text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium text-pretty">
              Centraliza tu ejecución con inteligencia artificial. Un solo workspace, todos tus agentes optimizados y un copiloto que hace el trabajo por ti. Diseñado para solopreneurs y agencias modernas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md sm:max-w-none mx-auto">
              <a
                href={STRIPE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-10 py-5 bg-neon-teal text-deep-dark rounded-2xl font-black tracking-widest uppercase text-xs italic shadow-[0_0_35px_-8px_rgba(0,229,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all touch-manipulation"
              >
                Obtener Acceso Founder
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </a>
              <button
                onClick={() => setShowVideoModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl border border-white/10 hover:border-white/20 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-colors touch-manipulation"
              >
                Ver cómo funciona
              </button>
            </div>
          </Reveal>

          {/* SIMULACIÓN DE DASHBOARD ANIMADO EN CÓDIGO */}
          <Reveal delay={200}>
            <DashboardMockup />
          </Reveal>
        </section>

        {/* 2. LOGOS MARQUEE & STATS BAR */}
        <section className="py-10 border-y border-white/5 overflow-hidden bg-white/[0.01]" aria-label="Tecnologías compatibles">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-10">
            <div>
              <p className="text-2xl md:text-3xl font-black text-white italic tracking-tight">71</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Agentes Optimizados</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-neon-teal italic tracking-tight">1</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Copiloto Matchmaker</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white italic tracking-tight">0</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Prompting Manual</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-neon-teal italic tracking-tight">60 min</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Curva de Onboarding</p>
            </div>
          </div>

          <div className={`flex whitespace-nowrap ${reducedMotion ? '' : 'landing-logo-marquee'} border-t border-white/5 pt-8`}>
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <div
                key={`${logo.name}-${i}`}
                className="flex items-center gap-2.5 px-12 opacity-35 hover:opacity-60 transition-opacity"
                aria-hidden={i >= LOGOS.length}
              >
                <span className="text-xs font-black tracking-tighter uppercase italic text-white" translate="no">
                  {logo.name}
                </span>
                <span className="text-[9px] font-bold text-neon-teal border border-neon-teal/20 px-1.5 py-0.5 rounded font-mono bg-neon-teal/5">
                  {logo.tech}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. EL PROBLEMA */}
        <section className="py-24 px-4 sm:px-6 max-w-5xl mx-auto scroll-mt-24">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                La Realidad del Mercado
              </span>
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mt-6 mb-4 text-balance">
                Todo el mundo tiene acceso a IA. <br />
                <span className="neon-text">Muy pocos tienen un sistema.</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
                Pagar micro-suscripciones y saltar entre 20 pestañas de navegador buscando prompts dispersos en Notion no es automatizar. Es desorden operacional.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROBLEM_CARDS.map((card, i) => (
              <Reveal key={card.tool} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-white/5 bg-[#090C12] hover:border-red-500/20 transition-all duration-300 flex flex-col justify-between h-full group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">{card.tool}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                    </div>
                    <h3 className="text-md font-bold text-white uppercase italic">{card.issue}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 4. LA SOLUCIÓN */}
        <section id="solucion" className="py-24 px-4 sm:px-6 bg-white/[0.01] border-y border-white/5 scroll-mt-24">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div className="text-center mb-16">
                <span className="text-[9px] font-black uppercase tracking-widest text-neon-teal bg-neon-teal/5 border border-neon-teal/10 px-3 py-1.5 rounded-full">
                  Un Cerebro Centralizado
                </span>
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mt-6 mb-4 text-balance">
                  Upfunnel no es otra herramienta. <br />
                  <span className="neon-text">Es tu sistema operativo.</span>
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
                  Consolida tus tareas, automatiza tus entregas y capacita tu negocio desde un único workspace.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Reveal delay={100}>
                <div className="p-8 rounded-2xl bg-[#090C12] border border-white/5 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-neon-teal/10 text-neon-teal rounded-xl flex items-center justify-center mb-5 border border-neon-teal/20">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold uppercase italic text-md text-white mb-3">100% Centralizado</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Unifica tu workflow. Despídete de pagar múltiples herramientas premium. Tu centro de operaciones está en un solo lugar.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={200}>
                <div className="p-8 rounded-2xl bg-[#090C12] border border-white/5 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-neon-teal/10 text-neon-teal rounded-xl flex items-center justify-center mb-5 border border-neon-teal/20">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold uppercase italic text-md text-white mb-3">Ejecución Guiada</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    El copiloto inteligente Matchmaker analiza tus tareas en lenguaje natural y te asigna la herramienta perfecta al instante.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={300}>
                <div className="p-8 rounded-2xl bg-[#090C12] border border-white/5 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-neon-teal/10 text-neon-teal rounded-xl flex items-center justify-center mb-5 border border-neon-teal/20">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold uppercase italic text-md text-white mb-3">Estructura Predictiva</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Workflows estandarizados y agentes calibrados para que el output de tu trabajo siempre cumpla con el estándar más alto.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 5. BENTO FEATURES */}
        <section id="features" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto scroll-mt-24">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                La Suite de Productividad
              </span>
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mt-6 mb-4 text-balance">
                Ingeniería IA <span className="neon-text">hecha para ejecutar.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENTO_FEATURES.map((item, i) => (
              <Reveal key={item.id} delay={i * 100}>
                <div className={`p-8 rounded-3xl border border-white/5 bg-[#090C12] hover:border-neon-teal/25 transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden group ${item.size}`}>
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded">
                        {item.tag}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-neon-teal transition-colors" />
                    </div>
                    <h3 className="text-lg font-black uppercase italic text-white leading-tight">{item.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xl">{item.desc}</p>
                  </div>
                  {/* Glowing hover dot in corner */}
                  <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-neon-teal/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 6. INTERACTIVE CASOS DE USO TABS */}
        <section className="py-24 px-4 sm:px-6 bg-white/[0.01] border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <div className="text-center mb-12">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                  Casos de Aplicación
                </span>
                <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mt-6 mb-4">
                  ¿Cómo encaja en tu flujo?
                </h2>
              </div>
            </Reveal>

            {/* Selector de Tabs */}
            <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto pb-4 no-scrollbar">
              {Object.keys(USE_CASES).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    activeTab === tab
                      ? 'bg-neon-teal/5 border-neon-teal text-neon-teal'
                      : 'bg-[#090C12] border-white/5 text-slate-500 hover:text-white'
                  }`}
                >
                  {tab === 'freelancer' && 'Freelancer'}
                  {tab === 'marketer' && 'Marketer'}
                  {tab === 'agencia' && 'Agencia'}
                  {tab === 'creador' && 'Creador'}
                </button>
              ))}
            </div>

            {/* Contenido del Tab */}
            <div className="mt-8 p-8 md:p-10 rounded-3xl border border-white/5 bg-[#090C12] min-h-[250px] flex flex-col justify-between animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-neon-teal">
                  <Users className="w-5 h-5" />
                  <h3 className="text-md font-black uppercase italic tracking-tight">{USE_CASES[activeTab].title}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-500 font-mono">El Problema</span>
                    <p className="text-slate-400 text-xs leading-relaxed">{USE_CASES[activeTab].issue}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neon-teal font-mono">Cómo ayuda Upfunnel</span>
                    <p className="text-slate-300 text-xs leading-relaxed">{USE_CASES[activeTab].solution}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neon-teal/[0.01] -mx-4 -mb-4 p-4 rounded-b-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resultado Obtenido</span>
                <span className="text-xs font-bold text-white italic">{USE_CASES[activeTab].result}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. AI COPILOTO SECTION */}
        <section className="py-24 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal>
              <div className="space-y-6">
                <span className="text-[9px] font-black uppercase tracking-widest text-neon-teal bg-neon-teal/5 border border-neon-teal/10 px-3 py-1.5 rounded-full">
                  AI Matchmaker Copilot
                </span>
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[0.95] text-balance">
                  No busques bots. <br />
                  <span className="neon-text">Pregúntale al Copiloto.</span>
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  El copiloto interpretará tu requerimiento comercial y te guiará al agente óptimo para tu tarea. No es un chatbot inútil; es un enrutador operativo diseñado para eliminar el rozamiento técnico.
                </p>
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-neon-teal shrink-0" />
                    <span className="text-slate-300 font-semibold">Zero Prompting: el sistema inyecta las directivas de élite</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-neon-teal shrink-0" />
                    <span className="text-slate-300 font-semibold">Conexión con Gemini 1.5 core en menos de 8 segundos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-neon-teal shrink-0" />
                    <span className="text-slate-300 font-semibold">Búsqueda contextual en lenguaje natural de tus herramientas</span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="p-8 rounded-3xl border border-white/5 bg-[#090C12] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-neon-teal/5 rounded-full blur-2xl"></div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-neon-teal" />
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">Asistente Matchmaker</span>
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Core API</span>
                  </div>
                  
                  {/* Cuadros de simulación */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Tu consulta</span>
                    <p className="text-xs text-white font-medium">"Necesito optimizar mis costos fijos y ver dónde estoy perdiendo liquidez en mi agencia..."</p>
                  </div>

                  <div className="p-4 rounded-xl bg-neon-teal/5 border border-neon-teal/20 space-y-2">
                    <span className="text-[9px] font-mono text-neon-teal uppercase">Matchmaker Copilot</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Para optimizar la estructura de costos de tu agencia, te recomiendo el <strong className="text-white">Agente Financiero B2B</strong>. Cuenta con un workflow estructurado de balance general."
                    </p>
                    <div className="pt-2">
                      <a href={STRIPE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-neon-teal text-deep-dark text-[9px] font-black uppercase tracking-widest rounded-lg">
                        <span>Iniciar Agente Financiero</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 8. ACADEMIA SECTION */}
        <section id="academia" className="py-24 px-4 sm:px-6 bg-white/[0.01] border-y border-white/5 scroll-mt-24">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            <Reveal>
              <div className="p-8 rounded-3xl border border-white/5 bg-[#090C12] space-y-5 relative group order-2 lg:order-1">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-teal/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center shadow-lg">
                  <PlayCircle className="w-14 h-14 text-neon-teal/90 animate-pulse cursor-pointer hover:scale-110 transition-transform" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Módulo_01_Config_Inicial.mp4</span>
                    <span>10:24</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Lección Recomendada</span>
                  <h4 className="font-bold text-white text-sm uppercase italic">"Activando Upfunnel en tu Negocio de Servicios"</h4>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="space-y-6 order-1 lg:order-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                  Upfunnel Academy
                </span>
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight leading-[0.95] text-balance">
                  De acceso a ejecución, <br />
                  <span className="neon-text">en menos de 60 minutos.</span>
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  No vendemos cursos teóricos. La Academia es tu <strong>Centro de Implementación Práctica</strong>. Mini-tutoriales de 10 minutos enfocados en enseñarte a automatizar tu negocio conectando los agentes con tus herramientas diarias.
                </p>
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-neon-teal shrink-0" />
                    <span className="text-slate-300 font-semibold">Mini-cursos estructurados de alto rendimiento</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-neon-teal shrink-0" />
                    <span className="text-slate-300 font-semibold">Guiados paso a paso sin teoría abstracta</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-neon-teal shrink-0" />
                    <span className="text-slate-300 font-semibold">Acceso incluido de forma gratuita en tu membresía Founder</span>
                  </div>
                </div>
              </div>
            </Reveal>

          </div>
        </section>

        {/* 9. PRICING & OFERTA SECTION */}
        <section id="pricing" className="py-24 px-4 sm:px-6 max-w-3xl mx-auto scroll-mt-24">
          <Reveal>
            <div className="text-center mb-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-neon-teal bg-neon-teal/5 border border-neon-teal/10 px-3 py-1.5 rounded-full">
                Acceso Fundadores
              </span>
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight mt-6 mb-4">
                Elige tu plan de inversión
              </h2>
              <p className="text-slate-400 text-sm">
                Consigue acceso completo a Upfunnel y delega tu esfuerzo operativo hoy mismo.
              </p>
            </div>
          </Reveal>

          {/* Selector de Período de Facturación */}
          <Reveal delay={100}>
            <div className="flex justify-center mb-10">
              <div className="bg-[#090C12] p-1.5 rounded-2xl border border-white/5 inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-neon-teal/15 border border-neon-teal/20 text-neon-teal shadow-[0_0_15px_-3px_rgba(0,229,255,0.2)]'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                    billingPeriod === 'annual'
                      ? 'bg-neon-teal/15 border border-neon-teal/20 text-neon-teal shadow-[0_0_15px_-3px_rgba(0,229,255,0.2)]'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Anual
                  <span className="bg-neon-teal text-deep-dark text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-normal">Ahorra 60%</span>
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-[#090C12] via-[#090C12] to-neon-teal/5 border border-white/10 text-center relative overflow-hidden group">
              {/* Decorative glows */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-neon-teal/5 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl"></div>

              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neon-teal text-deep-dark text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse-glow">
                  <Zap className="w-2.5 h-2.5" />
                  Cupos Limitados
                </span>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {billingPeriod === 'annual' ? 'Membresía Anual Completa' : 'Membresía Mensual Flexible'}
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-6xl md:text-7xl font-black text-white italic tracking-tighter">
                      {billingPeriod === 'annual' ? '$79.99' : '$14.99'}
                    </span>
                    <div className="text-left">
                      <span className="text-xs font-bold text-neon-teal uppercase tracking-wider block">USD</span>
                      <span className="text-[9px] text-slate-500 uppercase block -mt-1">
                        {billingPeriod === 'annual' ? 'al año' : 'al mes'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed min-h-[48px]">
                  {billingPeriod === 'annual' 
                    ? 'Consigue acceso total a la flota de agentes, copiloto de Gemini, centro de implementación de la Academia y actualizaciones prioritarias durante un año entero.'
                    : 'Disfruta de la flexibilidad de pagar mes a mes con acceso total ilimitado a la flota de agentes, copiloto de Gemini y academia práctica.'}
                </p>

                {/* Lista de beneficios premium */}
                <div className="max-w-xs mx-auto text-left space-y-2.5 border-t border-b border-white/5 py-6 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span>Flota de 71 agentes de IA calibrados</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span>Copiloto de recomendación inteligente</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span>Cursos Premium de la Academia</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span>Soporte prioritario y solicitudes de agentes</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span>Acceso previo a las próximas actualizaciones</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span>Mantenimiento y actualizaciones incluidas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neon-teal" />
                    <span className="font-bold text-white">Garantía incondicional de 7 días</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href={billingPeriod === 'annual' ? STRIPE_URL : STRIPE_MONTHLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full group inline-flex items-center justify-center gap-3 px-10 py-5 bg-neon-teal text-deep-dark rounded-2xl font-black tracking-widest uppercase text-xs italic shadow-lg shadow-neon-teal/20 hover:brightness-110 transition-all"
                  >
                    {billingPeriod === 'annual' ? 'Obtener Acceso Founder Anual' : 'Obtener Acceso Mensual'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {billingPeriod === 'annual' 
                      ? 'Renovación con precio congelado de por vida. Cancela cuando quieras.'
                      : 'Suscripción mensual sin contratos. Cancela de forma instantánea cuando quieras.'}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* 10. FAQ SECTION */}
        <section className="py-24 px-4 sm:px-6 max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                Resolución de Dudas
              </span>
              <h2 className="text-3xl font-black italic uppercase tracking-tight mt-6">
                Preguntas Frecuentes
              </h2>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="p-6 md:p-8 rounded-3xl border border-white/5 bg-[#090C12] space-y-1">
              {FAQ_ITEMS.map((item, i) => (
                <FAQItemComponent key={item.question} id={i} question={item.question} answer={item.answer} />
              ))}
            </div>
          </Reveal>
        </section>

        {/* 11. CTA FINAL */}
        <section className="py-24 px-4 sm:px-6 max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="p-10 md:p-16 rounded-[2.5rem] bg-gradient-to-br from-[#080C14] via-[#080C14] to-neon-teal/15 border border-white/10 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
                <div className="w-full h-full bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:20px_20px]" />
              </div>
              
              <div className="relative z-10 space-y-8">
                <h2 className="text-3xl md:text-6xl font-black tracking-tighter leading-none uppercase italic text-balance">
                  Los mejores operan con sistemas.<br />
                  <span className="neon-text">No con pestañas dispersas.</span>
                </h2>
                
                <p className="text-slate-400 text-sm md:text-md max-w-xl mx-auto leading-relaxed">
                  Únete hoy a Upfunnel. Centraliza tus procesos de inteligencia artificial y empieza a ver outputs predecibles desde la primera hora.
                </p>

                <div>
                  <a
                    href={STRIPE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-12 py-5 bg-neon-teal text-deep-dark rounded-2xl font-black tracking-widest uppercase text-xs italic shadow-[0_0_35px_-8px_rgba(0,229,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all touch-manipulation"
                  >
                    Unirse a Upfunnel
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

      </main>

      {/* 12. FOOTER */}
      <footer className="relative z-10 pt-16 pb-8 px-4 sm:px-6 border-t border-white/5 bg-black/20 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          
          <a href="#" className={`flex items-center ${focusRing} rounded-xl`} translate="no">
            <img
              src={BRANDING.logo}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
            <span className="ml-3 text-xl font-black tracking-tighter italic text-white">
              {BRANDING.name}
            </span>
          </a>

          <nav aria-label="Legal y navegación">
            <ul className="flex flex-wrap justify-center gap-6 md:gap-8 list-none p-0 m-0 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              <li>
                <a href="#solucion" onClick={(e) => { e.preventDefault(); scrollToSection('solucion'); }} className="hover:text-neon-teal transition-colors">Sistema</a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="hover:text-neon-teal transition-colors">Producto</a>
              </li>
              <li>
                <a href="#academia" onClick={(e) => { e.preventDefault(); scrollToSection('academia'); }} className="hover:text-neon-teal transition-colors">Academia</a>
              </li>
              <li>
                <Link to="/documentacion" className="hover:text-neon-teal transition-colors text-neon-teal/95 font-bold">Documentación</Link>
              </li>
              <li>
                <a href="/politicas" className="hover:text-neon-teal transition-colors">Políticas</a>
              </li>
              <li>
                <a href="/privacidad" className="hover:text-neon-teal transition-colors">Privacidad</a>
              </li>
              <li>
                <a href="/soporte" className="hover:text-neon-teal transition-colors">Soporte</a>
              </li>
            </ul>
          </nav>

        </div>

        <div className="max-w-6xl mx-auto text-center border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} {BRANDING.name} — SISTEMA OPERATIVO IA. TODOS LOS DERECHOS RESERVADOS.
          </p>
          <a href="https://app.upfunnel.click/login" className="text-[9px] font-black uppercase tracking-widest text-neon-teal/70 hover:text-neon-teal transition-colors">
            ACCEDER AL PANEL OPERATIVO →
          </a>
        </div>
      </footer>

      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#090C12] border border-white/10 p-8 rounded-3xl max-w-md w-full relative">
            <button 
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-neon-teal/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-teal/20">
                <PlayCircle className="w-8 h-8 text-neon-teal" />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
                Próximamente
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Estamos preparando una demostración en video increíble para que veas todo el potencial de Upfunnel en acción. ¡Mantente atento!
              </p>
              <button
                onClick={() => setShowVideoModal(false)}
                className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors text-white"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
