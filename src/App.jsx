import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ComingSoon from './pages/ComingSoon';
import AgentPanel from './components/AgentPanel';
import AdminLogin from './pages/admin/AdminLogin';
import ReleaseHistory from './pages/ReleaseHistory';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './context/ToastContext';
import ReleaseAutoNotification from './components/user/ReleaseAutoNotification';
import Policies from './pages/Policies';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import GlobalBanner from './components/user/GlobalBanner';
import AcademiaPage from './app/dashboard/academia/page';
import LessonCreator from './app/dashboard/academia/admin/page';
import PendingApproval from './pages/PendingApproval';
import Documentation from './pages/Documentation';
import './App.css';

// Lazy load heavy admin views to decouple Recharts, D3, and Lucide packages from the initial bundle
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAgents = lazy(() => import('./pages/admin/AdminAgents'));
const MatchmakerConfig = lazy(() => import('./pages/admin/MatchmakerConfig'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));
const AdminReleases = lazy(() => import('./pages/admin/AdminReleases'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[APP] Error de render no controlado:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-[#020203] text-white flex items-center justify-center p-6">
        <section className="max-w-lg text-center space-y-5">
          <h1 className="text-2xl font-black uppercase">No pudimos abrir esta pantalla</h1>
          <p className="text-gray-400">Recarga la aplicacion. Si el problema continua, contacta a soporte.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-neon-teal text-deep-dark font-black uppercase text-xs tracking-widest"
          >
            Recargar
          </button>
        </section>
      </main>
    );
  }
}

// 1. Componente de Restricción de Dominio (Restaurado)
const DomainRestrictedRoute = ({ children, appOnly = false }) => {
  const isAppDomain = window.location.hostname.includes('app.') || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '::1' ||
                      window.location.hostname.startsWith('51.79.68.'); // Permitir acceso desde Coolify
  if (appOnly && !isAppDomain) return <Navigate to="/" replace />;
  return children;
};

// 2. Componente de Rutas Protegidas (Optimizado)
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center">
        <div className="premium-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!profile) return <Navigate to="/login?error=PerfilNoDisponible" replace />;

  if (profile.is_approved !== true || profile.status !== 'active') {
    return <Navigate to="/dashboard/espera-aprobacion" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

// 3. Componente Home (Selector Landing/App)
const Home = () => {
  const { isAuthenticated, profile, isAdmin, loading } = useAuth();
  const isAppDomain = window.location.hostname.includes('app.') || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '::1' ||
                      window.location.hostname.startsWith('51.79.68.');

  if (loading) return <div className="min-h-screen bg-[#020203] flex items-center justify-center"><div className="premium-spinner"></div></div>;
  if (!isAppDomain) return <LandingPage />;

  if (isAuthenticated) {
    if (!profile) return <AdminLogin />;

    if (profile.is_approved !== true || profile.status !== 'active') {
      return <PendingApproval />;
    }

    return <AgentPanel />;
  }

  return <AdminLogin />;
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <div className="App min-h-screen w-full pointer-events-auto">
            <AppErrorBoundary>
              {/* Todas las capas globales solo se activan si hay sesión */}
              {isAuthenticated && (
                <>
                  <ReleaseAutoNotification />
                  <GlobalBanner />
                </>
              )}

              <Suspense fallback={
                <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center">
                  <div className="premium-spinner"></div>
                </div>
              }>
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/coming-soon" element={<ComingSoon />} />
                <Route path="/login" element={<AdminLogin />} />
                
                {/* Rutas Admin */}
                <Route path="/admin/dashboard" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/users" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminUsers /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/agents" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminAgents /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/matchmaker-config" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><MatchmakerConfig /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/config" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminConfig /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/releases" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminReleases /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/logs" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminLogs /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/finance" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminFinance /></ProtectedRoute></DomainRestrictedRoute>} />
                <Route path="/admin/banners" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminBanners /></ProtectedRoute></DomainRestrictedRoute>} />

                {/* Páginas de Información */}
                <Route path="/novedades" element={<ReleaseHistory />} />
                <Route path="/politicas" element={<Policies />} />
                <Route path="/privacidad" element={<Privacy />} />
                <Route path="/soporte" element={<Support />} />
                <Route path="/dashboard/espera-aprobacion" element={<PendingApproval />} />
                <Route path="/documentacion" element={<Documentation />} />

                {/* Academia */}
                <Route path="/dashboard/academia" element={<ProtectedRoute><AcademiaPage /></ProtectedRoute>} />
                <Route path="/dashboard/academia/admin" element={<ProtectedRoute adminOnly={true}><LessonCreator /></ProtectedRoute>} />

                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </AppErrorBoundary>
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
