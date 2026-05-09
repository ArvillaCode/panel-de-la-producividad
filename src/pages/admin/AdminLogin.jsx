import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader2 as Loader
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import RegisterForm from '../../components/RegisterForm';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    logout,
    getProfile,
    isAuthenticated,
    getUserInfo
  } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const user = getUserInfo;

      if (user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, navigate, getUserInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Email y contraseña son obligatorios');
      }

      console.log('[DEBUG] Intentando iniciar sesión con:', formData.email);

      const result = await login(formData.email, formData.password);

      console.log('[DEBUG] Resultado login:', result);

      if (!result.success) {
        throw new Error(result.error || 'Credenciales incorrectas');
      }

      // Recordar usuario
      if (rememberMe) {
        localStorage.setItem(
          'loginCredentials',
          JSON.stringify({
            email: formData.email,
            rememberMe: true
          })
        );
      } else {
        localStorage.removeItem('loginCredentials');
      }

      setSuccess('Inicio de sesión exitoso');

      const targetPath =
        formData.email === 'admin@admin.com'
          ? '/admin/dashboard'
          : '/';

      console.log('[DEBUG] Redirigiendo a:', targetPath);

      navigate(targetPath, { replace: true });

    } catch (err) {
      console.error('[DEBUG] Error en login form:', err);

      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">

          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />

            <h2 className="text-2xl font-bold text-white">
              Crear Cuenta
            </h2>

            <p className="text-gray-400">
              Regístrate para acceder
            </p>
          </div>

          <RegisterForm
            onSuccess={() => setIsRegistering(false)}
            onCancel={() => setIsRegistering(false)}
          />

          <button
            onClick={() => setIsRegistering(false)}
            className="w-full mt-4 text-blue-400 text-sm hover:underline"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />

          <h1 className="text-3xl font-bold text-white">
            Iniciar Sesión
          </h1>

          <p className="text-gray-400">
            Panel de Productividad
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 text-red-200 rounded-lg text-sm flex items-start">
              <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-500 text-green-200 rounded-lg text-sm flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-gray-700 border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="admin@ejemplo.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Contraseña
              </label>

              <div className="relative">

                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>

              </div>
            </div>

            <div className="flex items-center justify-between text-sm">

              <label className="flex items-center text-gray-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 rounded bg-gray-700 border-gray-600 text-blue-500"
                />

                Recordarme
              </label>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading
                ? <Loader className="w-5 h-5 animate-spin" />
                : 'Entrar'
              }
            </button>

          </form>

          <div className="mt-6 pt-6 border-t border-gray-700 text-center">

            <button
              onClick={() => setIsRegistering(true)}
              className="text-blue-400 hover:underline text-sm font-medium"
            >
              ¿No tienes cuenta? Regístrate aquí
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;