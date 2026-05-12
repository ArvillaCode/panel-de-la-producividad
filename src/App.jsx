import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ComingSoon from './pages/ComingSoon';
import AgentPanel from './components/AgentPanel';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAgents from './pages/admin/AdminAgents';
import AdminConfig from './pages/admin/AdminConfig';
import AdminReleases from './pages/admin/AdminReleases';
import AdminLogs from './pages/admin/AdminLogs';
import ReleaseHistory from './pages/ReleaseHistory';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import ReleaseAutoNotification from './components/user/ReleaseAutoNotification';
import Policies from './pages/Policies';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import './App.css';

// Componente para rutas protegidas
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center gap-8">
        <div className="premium-spinner"></div>
        <div className="text-center space-y-4">
          <p className="text-blue-400/80 font-bold tracking-widest uppercase text-xs animate-pulse">Sincronizando Acceso Seguro</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  
  return children;
};

const Home = () => {
  const { isAuthenticated, loading } = useAuth();
  const isAppDomain = window.location.hostname.includes('app.') || window.location.hostname === 'localhost';
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center gap-8">
        <div className="premium-spinner"></div>
      </div>
    );
  }
  
  // Si estamos en el dominio de la landing, siempre mostramos la landing
  if (!isAppDomain) return <LandingPage />;
  
  // Si estamos en el dominio de la app, mostramos el panel si está autenticado, o el login si no lo está
  return isAuthenticated ? <AgentPanel /> : <AdminLogin />;
};

// Componente para restringir acceso según el dominio
const DomainRestrictedRoute = ({ children, appOnly = false }) => {
  const isAppDomain = window.location.hostname.includes('app.') || window.location.hostname === 'localhost';
  
  if (appOnly && !isAppDomain) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen w-full relative z-0 pointer-events-auto">
          <ReleaseAutoNotification />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route 
              path="/login" 
              element={<DomainRestrictedRoute appOnly={true}><AdminLogin /></DomainRestrictedRoute>} 
            />

            {/* Rutas administrativas protegidas */}
            <Route 
              path="/admin/dashboard" 
              element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute></DomainRestrictedRoute>} 
            />
            <Route 
              path="/admin/users" 
              element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminUsers /></ProtectedRoute></DomainRestrictedRoute>} 
            />
            <Route 
              path="/admin/agents" 
              element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminAgents /></ProtectedRoute></DomainRestrictedRoute>} 
            />
            <Route 
              path="/admin/config" 
              element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminConfig /></ProtectedRoute></DomainRestrictedRoute>} 
            />
            <Route 
              path="/admin/releases" 
              element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminReleases /></ProtectedRoute></DomainRestrictedRoute>} 
            />
            <Route 
              path="/admin/logs" 
              element={<DomainRestrictedRoute appOnly={true}><ProtectedRoute adminOnly={true}><AdminLogs /></ProtectedRoute></DomainRestrictedRoute>} 
            />
            
            <Route path="/novedades" element={<ReleaseHistory />} />
            <Route path="/politicas" element={<Policies />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="/soporte" element={<Support />} />
            
            {/* Redirect /admin a /admin/dashboard */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Ruta catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
