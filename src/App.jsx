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
      <div className="min-h-screen bg-[#020203] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
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

            {/* Rutas administrativas protegidas - DESBLOQUEADAS para trabajo */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/agents" element={<AdminAgents />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            
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
