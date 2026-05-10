import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ComingSoon from './pages/ComingSoon';
import AgentPanel from './components/AgentPanel';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAgents from './pages/admin/AdminAgents';
import AdminConfig from './pages/admin/AdminConfig';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import './App.css';

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  console.log('ProtectedRoute check - loading:', loading, 'isAuthenticated:', isAuthenticated, 'isAdmin:', isAdmin);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020203] flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-4">
          <p className="text-gray-400 animate-pulse">Verificando sesión...</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-all"
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
        <div className="App min-h-screen w-full">
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
