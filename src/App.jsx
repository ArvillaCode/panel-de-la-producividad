import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ComingSoon from './pages/ComingSoon';
import AgentPanel from './components/AgentPanel';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAgents from './pages/admin/AdminAgents';
import MatchmakerConfig from './pages/admin/MatchmakerConfig';
import AdminConfig from './pages/admin/AdminConfig';
import AdminReleases from './pages/admin/AdminReleases';
import AdminLogs from './pages/admin/AdminLogs';
import ReleaseHistory from './pages/ReleaseHistory';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './context/ToastContext';
import ReleaseAutoNotification from './components/user/ReleaseAutoNotification';
import Policies from './pages/Policies';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import AdminBanners from './pages/admin/AdminBanners';
import GlobalBanner from './components/user/GlobalBanner';
import AcademiaPage from './app/dashboard/academia/page';
import LessonCreator from './app/dashboard/academia/admin/page';
import './App.css';

// 1. Componente de Restricción de Dominio (Restaurado)
const DomainRestrictedRoute = ({ children, appOnly = false }) => {
  const isAppDomain = window.location.hostname.includes('app.') || 
                      window.location.hostname === 'localhost' || 
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

  // Bypass global incondicional para la sección de Gestión de Usuarios si es un administrador autenticado
  const isUserManagement = window.location.pathname === '/admin/users';
  if (isUserManagement && isAuthenticated && isAdmin) {
    return children;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

// 3. Componente Home (Selector Landing/App)
const Home = () => {
  const { isAuthenticated, profile, isAdmin, loading } = useAuth();
  const isAppDomain = window.location.hostname.includes('app.') || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname.startsWith('51.79.68.');

  if (loading) return <div className="min-h-screen bg-[#020203] flex items-center justify-center"><div className="premium-spinner"></div></div>;
  if (!isAppDomain) return <LandingPage />;

  if (isAuthenticated) {
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
            {/* Todas las capas globales solo se activan si hay sesión */}
            {isAuthenticated && (
              <>
                <ReleaseAutoNotification />
                <GlobalBanner />
              </>
            )}

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
              <Route path="/admin/banners" element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminBanners /></ProtectedRoute></DomainRestrictedRoute>} />

              {/* Páginas de Información */}
              <Route path="/novedades" element={<ReleaseHistory />} />
              <Route path="/politicas" element={<Policies />} />
              <Route path="/privacidad" element={<Privacy />} />
              <Route path="/soporte" element={<Support />} />

              {/* Academia */}
              <Route path="/dashboard/academia" element={<ProtectedRoute><AcademiaPage /></ProtectedRoute>} />
              <Route path="/dashboard/academia/admin" element={<ProtectedRoute adminOnly={true}><LessonCreator /></ProtectedRoute>} />

              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
