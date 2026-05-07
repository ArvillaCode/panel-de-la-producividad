import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
  const { isAuthenticated, isAdmin } = useAuth();
  
  console.log('ProtectedRoute check - isAuthenticated:', isAuthenticated(), 'isAdmin:', isAdmin());
  
  return isAuthenticated() && isAdmin() ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen w-full">
            <Routes>
              {/* Ruta principal - Panel de Agentes */}
              <Route path="/" element={<AgentPanel />} />
              
              {/* Rutas administrativas y login general */}
              <Route path="/login" element={<AdminLogin />} />
              
              {/* Rutas administrativas protegidas - SIN ProtectedRoute para probar */}
              <Route 
                path="/admin/dashboard" 
                element={<AdminDashboard />} 
              />
              <Route 
                path="/admin/users" 
                element={<AdminUsers />} 
              />
              <Route 
                path="/admin/agents" 
                element={<AdminAgents />} 
              />
              <Route 
                path="/admin/config" 
                element={<AdminConfig />} 
              />
              
              {/* Redirect /admin a /admin/dashboard */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              
              {/* Ruta catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
