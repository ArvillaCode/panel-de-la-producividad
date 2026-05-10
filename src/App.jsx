import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ComingSoon from './pages/ComingSoon';
import AgentPanel from './components/AgentPanel';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAgents from './pages/admin/AdminAgents';
import AdminConfig from './pages/admin/AdminConfig';
import AdminReleases from './pages/admin/AdminReleases';
import ReleaseHistory from './pages/ReleaseHistory';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import ReleaseAutoNotification from './components/user/ReleaseAutoNotification';
import './App.css';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  console.log('ProtectedRoute check - loading:', loading, 'isAuthenticated:', isAuthenticated, 'isAdmin:', isAdmin);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center gap-8">
        <div className="premium-spinner"></div>
        <div className="text-center space-y-4">
          <p className="text-blue-400/80 font-bold tracking-widest uppercase text-xs animate-pulse">Sincronizando Acceso Seguro</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            ¿Demasiado tiempo? Volver al Login
          </button>
        </div>
      </div>
    );
  }
  
  return isAuthenticated && isAdmin ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen w-full relative z-0 pointer-events-auto">
          <ReleaseAutoNotification />
          <Routes>
            <Route path="/" element={<AgentPanel />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/login" element={<AdminLogin />} />

            {/* Rutas administrativas protegidas */}
            <Route 
              path="/admin/dashboard" 
              element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/users" 
              element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/agents" 
              element={<ProtectedRoute><AdminAgents /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/config" 
              element={<ProtectedRoute><AdminConfig /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/releases" 
              element={<ProtectedRoute><AdminReleases /></ProtectedRoute>} 
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
