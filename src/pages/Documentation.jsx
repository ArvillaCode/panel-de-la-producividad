import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Terminal, 
  ArrowLeft, 
  ChevronRight, 
  Check, 
  Copy, 
  Cpu, 
  Database, 
  ShieldCheck, 
  CreditCard, 
  Layout, 
  Cloud 
} from 'lucide-react';
import { BRANDING } from '../constants/branding';

const SECTIONS = [
  {
    id: 'intro',
    title: '1. Introducción',
    icon: BookOpen,
    description: 'Descripción central del ecosistema de 74 agentes de IA de Upfunnel.',
    code: {
      curl: `# Clonar repositorio del proyecto\ngit clone https://github.com/usuario/upfunnel.git\ncd upfunnel\nnpm install`,
      javascript: `// Iniciar servidor local de desarrollo\nnpm run dev\n// Abre http://localhost:3000 por defecto`,
      sql: `-- Esquema principal de Postgres en Supabase\n-- Base del ecosistema Upfunnel V3.0\nSELECT version();`
    }
  },
  {
    id: 'arquitectura',
    title: '2. Arquitectura',
    icon: Cpu,
    description: 'Estructura frontend estática (React, Vite, Tailwind) conectada a Supabase (BaaS).',
    code: {
      curl: `# Consultar estado del backend de Supabase\ncurl -X GET "https://krtthtzljlyewlngaklo.supabase.co/rest/v1/" \\\n  -H "apikey: SUPABASE_PUBLIC_ANON_KEY"`,
      javascript: `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = import.meta.env.VITE_SUPABASE_URL;\nconst supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\n\nexport const supabase = createClient(supabaseUrl, supabaseAnonKey);`,
      sql: `-- Habilitar extensiones necesarias en Postgres\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS "pgcrypto";`
    }
  },
  {
    id: 'auth',
    title: '3. Autenticación',
    icon: ShieldCheck,
    description: 'Control de sesiones en tiempo real (SWR), Magic Links (OTP) y roles del sistema.',
    code: {
      curl: `# Login mediante API de Supabase Auth\ncurl -X POST "https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password" \\\n  -H "apikey: SUPABASE_ANON_KEY" \\\n  -d '{"email": "user@example.com", "password": "secure_password"}'`,
      javascript: `// Login con contraseña en React Hook (useAuth.jsx)\nconst login = async (email, password) => {\n  const { data, error } = await supabase.auth.signInWithPassword({\n    email,\n    password\n  });\n  return { success: !error, error: error?.message };\n};`,
      sql: `-- Trigger automático al registrar usuario nuevo\nCREATE TRIGGER on_auth_user_created\n  AFTER INSERT ON auth.users\n  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();`
    }
  },
  {
    id: 'database',
    title: '4. Base de Datos',
    icon: Database,
    description: 'Estructura detallada de las tablas profiles, notifications, audit_logs y system_config.',
    code: {
      curl: `# Obtener todos los perfiles de usuario aprobados\ncurl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/profiles?status=eq.active" \\\n  -H "apikey: SUPABASE_ANON_KEY" \\\n  -H "Authorization: Bearer USER_JWT_TOKEN"`,
      javascript: `// Consultar perfiles desde la app\nconst { data, error } = await supabase\n  .from('profiles')\n  .select('id, email, name, role, status, plan, is_legacy_fallback')\n  .order('created_at', { ascending: false });`,
      sql: `-- Estructura de la tabla public.profiles\nCREATE TABLE public.profiles (\n  id UUID PRIMARY KEY REFERENCES auth.users(id),\n  email TEXT UNIQUE,\n  name TEXT,\n  role TEXT DEFAULT 'user',\n  status TEXT DEFAULT 'pending',\n  plan TEXT DEFAULT 'annual',\n  is_legacy_fallback BOOLEAN DEFAULT FALSE,\n  start_date TIMESTAMPTZ,\n  end_date TIMESTAMPTZ\n);`
    }
  },
  {
    id: 'stripe',
    title: '5. Stripe & Suscripciones',
    icon: CreditCard,
    description: 'Lógica comercial de Upfunnel Pro Mensual ($14.99 USD), Pro Anual ($79.99 USD) y Reversión Legacy.',
    code: {
      curl: `# Registrar intento de pago en Stripe\ncurl https://api.stripe.com/v1/checkout/sessions \\\n  -u sk_test_Key: \\\n  -d "line_items[0][price]"=price_monthly_id \\\n  -d "line_items[0][quantity]"=1 \\\n  -d "mode"=subscription`,
      javascript: `// Constantes de Enlaces de Pago de Stripe (LandingPage.jsx)\nconst STRIPE_URL = 'https://buy.stripe.com/4gMdR96wma4KdLM6LQ7bW0C'; // Anual $79.99\nconst STRIPE_MONTHLY_URL = 'https://buy.stripe.com/test_placeholder_monthly'; // Mensual $14.99\n\nconst handleUpgrade = (period) => {\n  window.open(period === 'annual' ? STRIPE_URL : STRIPE_MONTHLY_URL, '_blank');\n};`,
      sql: `-- Habilitar seguridad de nivel de fila (RLS)\nALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Permitir lectura de perfil propio" ON public.profiles\n  FOR SELECT USING (auth.uid() = id);`
    }
  },
  {
    id: 'admin',
    title: '6. Terminal Admin',
    icon: Layout,
    description: 'Consola de moderación, control del Copilot, emisión de notificaciones globales y banners.',
    code: {
      curl: `# Ejecutar RPC de actualización administrativa\ncurl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/rpc/admin_update_profile" \\\n  -H "apikey: SUPABASE_SERVICE_ROLE_KEY" \\\n  -d '{"target_user_id": "uuid", "profile_patch": {"role": "admin"}}'`,
      javascript: `// Llamar RPC de actualización segura (useAuth.jsx)\nconst { error } = await supabase.rpc('admin_update_profile', {\n  target_user_id: id,\n  profile_patch: rpcPatch\n});`,
      sql: `-- RPC seguro para moderación administrativa de perfiles\nCREATE OR REPLACE FUNCTION public.admin_update_profile(\n  target_user_id UUID, \n  profile_patch JSONB\n)\nRETURNS VOID SECURITY DEFINER AS $$\nBEGIN\n  -- Lógica de actualización restringida a administradores\n  UPDATE public.profiles \n  SET role = COALESCE(profile_patch->>'role', role)\n  WHERE id = target_user_id;\nEND;\n$$ LANGUAGE plpgsql;`
    }
  },
  {
    id: 'vercel',
    title: '7. Despliegue & Vercel',
    icon: Cloud,
    description: 'Pautas de compilación de Vite en Linux, control de Case-Sensitivity y manejo defensivo de fallas.',
    code: {
      curl: `# Comando de construcción en Vercel\nnpm run build\n# O directamente con vite\nnpx vite build`,
      javascript: `// vite.config.js - Configuración del empaquetador\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 3000 }\n});`,
      sql: `-- Resetear intentos fallidos de Login en la base de datos\nUPDATE public.profiles\n  SET status = 'active'\n  WHERE role IN ('admin', 'core_admin');`
    }
  }
];

const Documentation = () => {
  const [activeSection, setActiveSection] = useState('intro');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLang, setActiveLang] = useState('javascript');
  const [copied, setCopied] = useState(false);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSections = useMemo(() => {
    return SECTIONS.filter(sec => 
      sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const selectedData = useMemo(() => {
    return SECTIONS.find(sec => sec.id === activeSection) || SECTIONS[0];
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-[#080C14] text-white overflow-hidden font-sans relative flex flex-col spatial-grid">
      {/* Radial overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[800px] h-[500px] bg-neon-teal/5 blur-[120px] rounded-full opacity-45 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full opacity-30 pointer-events-none" />
      </div>

      {/* Header Estilo Postman */}
      <header className="relative z-10 border-b border-white/5 bg-[#080C14]/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neon-teal/10 flex items-center justify-center border border-neon-teal/20">
              <Terminal className="w-4 h-4 text-neon-teal neon-glow" />
            </div>
            <div>
              <span className="text-xs font-black text-neon-teal tracking-widest uppercase block leading-none">Upfunnel Docs</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Manual de API & Operaciones</span>
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded">v3.0.0</span>
          <span className="text-[9px] font-black uppercase tracking-widest bg-neon-teal/10 text-neon-teal border border-neon-teal/20 px-2 py-0.5 rounded animate-pulse-glow">Online</span>
        </div>
      </header>

      {/* Workspace de 3 Columnas Postman */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Columna 1: Navegador / Sidebar Izquierdo */}
        <aside className="w-72 border-r border-white/5 bg-[#080C14]/65 backdrop-blur-md flex flex-col shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-neon-teal transition-colors" />
              <input 
                type="text"
                placeholder="Buscar documentación..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-white/5 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:ring-1 focus:ring-neon-teal/50 transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-2">Colección de Referencia</p>
            {filteredSections.map(sec => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeSection === sec.id 
                      ? 'bg-neon-teal/10 border border-neon-teal/20 text-neon-teal shadow-lg shadow-neon-teal/5' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${activeSection === sec.id ? 'text-neon-teal' : 'text-slate-500'}`} />
                    <span>{sec.title.split('. ')[1]}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 opacity-30 ${activeSection === sec.id ? 'opacity-80' : ''}`} />
                </button>
              );
            })}
            {filteredSections.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-500 font-bold">No se hallaron resultados</p>
            )}
          </div>
        </aside>

        {/* Columna 2: Explicación Técnica - Central */}
        <section className="flex-1 overflow-y-auto p-8 lg:p-12 bg-[#080C14]/40 custom-scrollbar border-r border-white/5">
          <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neon-teal bg-neon-teal/5 border border-neon-teal/15 px-3 py-1 rounded-full">
                Referencia Técnica
              </span>
              <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mt-4">{selectedData.title}</h2>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">{selectedData.description}</p>
            </div>

            {/* Renderización dinámico de cada sección */}
            {selectedData.id === 'intro' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  El proyecto **Upfunnel** es un Sistema Operativo de Inteligencia Artificial que centraliza más de 70 agentes de IA calibrados. Está enfocado en eliminar el desorden del prompting manual estructurando inputs en workflows prediseñados y con la guía del Copilot.
                </p>
                <div className="bg-[#090C12] border border-white/5 p-6 rounded-2xl">
                  <h4 className="font-bold text-white uppercase italic text-xs mb-3">Módulos Operacionales Activos:</h4>
                  <ul className="space-y-2 text-xs list-disc pl-4 text-slate-400">
                    <li>**Dashboard de Agentes**: Rejilla de búsqueda y enrutamiento con base de datos real.</li>
                    <li>**Copiloto Matchmaker**: Sistema inteligente de chat con NLP para recomendación automática de bots.</li>
                    <li>**Academia LMS**: Módulo LMS dinámico para reproducción de lecciones en video.</li>
                    <li>**Terminal Administrativa**: Interfaz de control absoluto para el propietario de la plataforma.</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedData.id === 'arquitectura' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  La arquitectura se fundamenta en un flujo reactivo asíncrono y desacoplado para asegurar escalabilidad ilimitada:
                </p>
                <div className="border border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 text-white">
                        <th className="p-4 font-bold uppercase tracking-wider">Capa</th>
                        <th className="p-4 font-bold uppercase tracking-wider">Framework</th>
                        <th className="p-4 font-bold uppercase tracking-wider">Propósito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-400">
                      <tr>
                        <td className="p-4 font-bold text-white">Frontend</td>
                        <td className="p-4">React 18 + Vite</td>
                        <td className="p-4">Interfaz estática cliente SPA de alta velocidad.</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-white">Estilos</td>
                        <td className="p-4">Tailwind CSS</td>
                        <td className="p-4">Ecosistema responsivo y Glassmorphism unificado.</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-white">Backend</td>
                        <td className="p-4">Supabase (Postgres)</td>
                        <td className="p-4">Autenticación de nivel JWT y sincronización asíncrona.</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-white">LMS Media</td>
                        <td className="p-4">Cloudflare R2</td>
                        <td className="p-4">Hospedaje de videos y portadas de alta velocidad.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedData.id === 'auth' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  El sistema utiliza **Supabase GoTrue** para gestionar la autenticación por contraseña y Magic Links. Las sesiones se revalidan en segundo plano de manera ininterrumpida mediante una estrategia de caché **SWR (Stale-While-Revalidate)** implementada en el hook `useAuth.jsx`.
                </p>
                <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-white/5 p-6 rounded-2xl">
                  <h4 className="font-bold text-white uppercase italic text-xs mb-3">Jerarquía de Roles de Seguridad:</h4>
                  <ul className="space-y-2.5 text-xs text-slate-400">
                    <li>🔑 **admin** / **core_admin**: Acceso a la consola administrativa `/admin` para gestionar usuarios, banners e IA.</li>
                    <li>✍️ **editor**: Permisos para gestionar el historial de actualizaciones y la biblioteca de la academia.</li>
                    <li>👤 **user**: Acceso estándar de exploración y visualización (sujeto a plan activo).</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedData.id === 'database' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  El esquema relacional de PostgreSQL se compone de tablas con políticas RLS robustas para asegurar la máxima protección de privacidad a nivel de fila.
                </p>
                <div className="border border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden">
                  <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
                    <span className="font-mono text-xs font-black uppercase text-white">Tabla: profiles</span>
                    <span className="text-[9px] font-black uppercase bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">Segura con RLS</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400">
                        <th className="p-4 font-bold uppercase">Columna</th>
                        <th className="p-4 font-bold uppercase">Tipo</th>
                        <th className="p-4 font-bold uppercase">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-400 font-medium">
                      <tr>
                        <td className="p-4 font-mono text-white">id</td>
                        <td className="p-4">uuid</td>
                        <td className="p-4">Identificador de usuario (FK a auth.users).</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-mono text-white">plan</td>
                        <td className="p-4">text</td>
                        <td className="p-4">Valor del plan ('monthly', 'annual', 'legacy').</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-mono text-white">is_legacy_fallback</td>
                        <td className="p-4">boolean</td>
                        <td className="p-4">Bandera para auto-reversión a plan Legacy sin bloqueo.</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-mono text-white">status</td>
                        <td className="p-4">text</td>
                        <td className="p-4">Estado ('pending', 'active', 'inactive', 'rejected', 'expired').</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedData.id === 'stripe' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  El sistema comercial se basa en enlaces de Stripe configurados en el Dashboard. La asignación de accesos está completamente automatizada:
                </p>
                <div className="bg-[#090C12] border border-white/5 p-6 rounded-2xl">
                  <h4 className="font-bold text-white uppercase italic text-xs mb-3">Modelos de Facturación Configurados:</h4>
                  <ul className="space-y-3.5 text-xs text-slate-400">
                    <li>💳 **Upfunnel Pro Mensual ($14.99 USD)**: Otorga 1 mes de acceso Premium. Renovación automática sin contratos.</li>
                    <li>💎 **Upfunnel Pro Anual ($79.99 USD)**: Ahorro masivo del 60%. Otorga 1 año de acceso ininterrumpido.</li>
                    <li>🛡️ **Protección de Reversión Legacy**: Al expirar el plan mensual de $14.99 USD de un usuario antiguo, el sistema cambia dinámicamente su plan de vuelta a `'legacy'` en Supabase de forma asíncrona, manteniendo su acceso activo y restaurando sus beneficios básicos originales (agentes de IA y cursos gratis) de por vida.</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedData.id === 'admin' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  La terminal administrativa `/admin` provee interfaces avanzadas de control total:
                </p>
                <div className="bg-gradient-to-br from-[#090C12] to-neon-teal/[0.02] border border-white/5 p-6 rounded-2xl">
                  <h4 className="font-bold text-white uppercase italic text-xs mb-3">Herramientas del Panel de Control:</h4>
                  <ul className="space-y-2 text-xs list-disc pl-4 text-slate-400">
                    <li>**Moderación de Usuarios**: Activación, bloqueo, cambio de planes (Pro Anual, Pro Mensual o Legacy) y activación de la protección `is_legacy_fallback`.</li>
                    <li>**Matchmaker Config**: Modificar el modelo de IA base de OpenRouter/Gemini y cambiar las instrucciones del Copilot.</li>
                    <li>**Biblioteca de la Academia**: Cargar nuevos cursos en video y marcar su visibilidad pública u hito Premium.</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedData.id === 'vercel' && (
              <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-medium">
                <p>
                  El despliegue en Vercel se realiza conectando tu rama de Git. Para garantizar el éxito del compilador en el pipeline de CI/CD:
                </p>
                <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-2xl text-slate-400 space-y-3">
                  <h4 className="font-bold text-red-400 uppercase italic text-xs flex items-center gap-2">
                    🚨 Reglas Críticas Contra Fallas (Página Negra)
                  </h4>
                  <p className="text-xs">
                    *   **Case-Sensitivity**: Los archivos importados deben respetar estrictamente las mayúsculas del sistema de archivos (ej: `AgentGuide.jsx` no puede importarse como `agentguide`). Windows los compila localmente, pero Linux en Vercel fallará de inmediato.
                    *   **Try-Catch Defensivo**: Cualquier petición externa debe encapsularse en un try-catch. En caso de caídas de red, inyecta alertas amigables en lugar de crasheos de consola.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Columna 3: Código Interactivo / Panel de Respuestas (Derecha) */}
        <aside className="hidden lg:flex w-96 bg-[#04060A]/80 backdrop-blur-md flex-col shrink-0 overflow-hidden">
          {/* Lenguajes / Pestañas tipo Postman */}
          <div className="px-4 py-3 bg-[#080C14]/90 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex gap-1.5">
              {['javascript', 'curl', 'sql'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeLang === lang 
                      ? 'bg-white/10 text-white font-bold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {lang === 'javascript' ? 'JS SDK' : lang === 'curl' ? 'cURL' : 'SQL'}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handleCopy(selectedData.code[activeLang])}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              title="Copiar código al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          
          {/* Visualizador de Código */}
          <div className="flex-1 p-6 font-mono text-xs text-slate-300 overflow-auto bg-[#04060A]/95 leading-relaxed selection:bg-neon-teal/20 custom-scrollbar">
            <pre className="whitespace-pre-wrap">{selectedData.code[activeLang]}</pre>
          </div>
          
          <div className="p-4 bg-white/5 border-t border-white/5 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black text-white uppercase block">STATUS 200 OK</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Payload de respuesta estructurado</span>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default Documentation;
