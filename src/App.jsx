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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center gap-8">
        <div className="premium-spinner"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <AgentPanel /> : <LandingPage />;
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
            <Route path="/login" element={<AdminLogin />} />

            {/* Rutas administrativas protegidas */}
            <Route 
              path="/admin/dashboard" 
              element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/users" 
              element={<ProtectedRoute adminOnly={true}><AdminUsers /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/agents" 
              element={<ProtectedRoute adminOnly={true}><AdminAgents /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/config" 
              element={<ProtectedRoute adminOnly={true}><AdminConfig /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/releases" 
              element={<ProtectedRoute adminOnly={true}><AdminReleases /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/logs" 
              element={<ProtectedRoute adminOnly={true}><AdminLogs /></ProtectedRoute>} 
            />
            
            <Route path="/novedades" element={<ReleaseHistory />} />
            
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
