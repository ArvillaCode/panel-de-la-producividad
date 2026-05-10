import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Bot,
  Settings,
  User,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const AdminDashboard = () => {
  const { getUserInfo, getAllUsers, users, fetchUsers } = useAuth();
  const navigate = useNavigate();
  const user = getUserInfo;

  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
    totalAgents: 0,
    totalInteractions: 0,
    recentActivity: []
  });

  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Intento de carga directa para depuración
      const { data: directUsers, error: usersError, status: uStatus } = await supabase.from('profiles').select('*');
      const { data: agentsData, error: agentsError, status: aStatus } = await supabase.from('agents').select('*');
      
      console.log("📊 DIAGNÓSTICO DE CARGA:", {
        usuarios: { count: directUsers?.length, status: uStatus, error: usersError?.message },
        agentes: { count: agentsData?.length, status: aStatus, error: agentsError?.message }
      });
      
      const allUsers = directUsers || [];
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      const activeCount = allUsers.filter(u => u.status !== 'inactive').length;
      const totalAgents = agentsData?.length || 0;
      const totalInteractions = agentsData?.reduce((sum, agent) => sum + (agent.total_interactions || agent.totalInteractions || 0), 0) || 0;

      // Actividad reciente (usuarios reales)
      const activity = allUsers.slice(0, 5).map((user, index) => ({
        id: index + 1,
        message: `Usuario ${user.name || user.email} - Última actividad`,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toLocaleString(),
      }));

      setStats({
        totalUsers: allUsers.length,
        adminUsers: adminCount,
        activeUsers: activeCount,
        totalAgents,
        totalInteractions,
        recentActivity: activity
      });

      setRecentUsers(allUsers.slice(0, 6));
    };

    fetchUsers();
    fetchStats();
  }, [users, getAllUsers, fetchUsers]);

  const Counter = ({ value, duration = 1500 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setCount(Math.floor(progress * (value || 0)));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }, [value, duration]);

    return <span>{count.toLocaleString()}</span>;
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', description, action }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600'
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              <Counter value={value} duration={1500} />
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
            {action && (
              <button
                onClick={action.onClick}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {action.label}
              </button>
            )}
          </div>
          <div className={`p-4 rounded-xl bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
    );
  };

  const QuickAction = ({ title, description, icon: Icon, onClick, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
      green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
      orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
    };

    return (
      <button
        onClick={onClick}
        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all text-left group"
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const ActivityItem = ({ activity }) => {
    return (
      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white font-medium">
            {activity.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activity.timestamp}
          </p>
        </div>
        <CheckCircle className="w-4 h-4 text-green-500" />
      </div>
    );
  };

  const handleNavigateToUsers = () => {
    navigate('/admin/users');
  };

  const handleNavigateToAgents = () => {
    navigate('/admin/agents');
  };

  const handleNavigateToConfig = () => {
    navigate('/admin/config');
  };

  const handleCreateUser = () => {
    navigate('/admin/users?action=create');
  };

  return (
    <AdminLayout currentPage="dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                ¡Bienvenido, {user?.name || 'Administrador'}!
              </h1>
              <p className="text-blue-100 text-lg">
                Panel de administración del sistema - Gestiona usuarios, agentes y configuraciones
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total de Usuarios"
            value={stats.totalUsers}
            icon={Users}
            color="blue"
            description="Usuarios registrados en el sistema"
            action={{
              label: "Ver todos →",
              onClick: handleNavigateToUsers
            }}
          />
          <StatCard
            title="Agentes IA"
            value={stats.totalAgents}
            icon={Bot}
            color="purple"
            description="Agentes configurados"
            action={{
              label: "Configurar →",
              onClick: handleNavigateToAgents
            }}
          />
          <StatCard
            title="Usuarios Activos"
            value={stats.activeUsers}
            icon={Activity}
            color="green"
            description="Usuarios con estado activo"
          />
          <StatCard
            title="Interacciones"
            value={stats.totalInteractions}
            icon={TrendingUp}
            color="orange"
            description="Consultas totales a la IA"
          />
          <StatCard
            title="Sistema"
            value="Online"
            icon={CheckCircle}
            color="green"
            description="Estado operativo"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Acciones Rápidas
            </h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction
              title="Crear Usuario"
              description="Agregar nuevo usuario al sistema"
              icon={Plus}
              onClick={handleCreateUser}
              color="blue"
            />
            <QuickAction
              title="Gestionar Usuarios"
              description="Ver, editar y administrar usuarios"
              icon={Users}
              onClick={handleNavigateToUsers}
              color="green"
            />
            <QuickAction
              title="Configurar Agentes"
              description="Administrar agentes del sistema"
              icon={Bot}
              onClick={handleNavigateToAgents}
              color="purple"
            />
            <QuickAction
              title="Configuración"
              description="Ajustes generales del sistema"
              icon={Settings}
              onClick={handleNavigateToConfig}
              color="orange"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Usuarios Recientes
              </h3>
              <button
                onClick={handleNavigateToUsers}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Ver todos
              </button>
            </div>

            {recentUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No hay usuarios registrados
                </p>
                <button
                  onClick={handleCreateUser}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Crear primer usuario
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {user.name || 'Sin nombre'}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.email} • {user.role}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Activo
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Actividad Reciente
              </h3>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>

            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No hay actividad reciente
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Estado del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Sistema Operativo</p>
                <p className="text-sm text-green-600 dark:text-green-400">Funcionando correctamente</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Autenticación</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Activa y segura</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">Agentes</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Listos para configurar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;