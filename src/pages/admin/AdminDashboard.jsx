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
  CheckCircle,
  Calendar,
  BarChart2,
  PieChart as PieIcon
} from 'lucide-react';
// Gráficos SVG personalizados para evitar dependencias externas
const SimpleAreaChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.users), 1);
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.users / max) * 100}`).join(' ');
  
  return (
    <div className="w-full h-full relative group">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#grad)"
          stroke="none"
          points={`0,100 ${points} 100,100`}
        />
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={points}
          className="drop-shadow-lg"
        />
      </svg>
      {/* Tooltip simulado */}
      <div className="absolute top-0 left-0 w-full h-full flex justify-between px-2">
        {data.map((d, i) => (
          <div key={i} className="h-full group/item relative flex flex-col justify-end pb-2">
            <div className="hidden group-hover/item:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-10 shadow-xl">
              {d.name}: {d.users}
            </div>
            <div className="w-px h-0 group-hover/item:h-full bg-blue-500/20 absolute left-1/2 -translate-x-1/2 bottom-0 transition-all"></div>
            <span className="text-[10px] text-gray-400 font-bold">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.uso), 1);
  
  return (
    <div className="space-y-4 w-full h-full flex flex-col justify-center">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <span>{d.name}</span>
            <span className="text-blue-600">{d.uso}</span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000" 
              style={{ width: `${(d.uso / max) * 100}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const AdminDashboard = () => {
  const { user, profile, users, fetchUsers, loading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalAgents: 0,
    totalInteractions: 0,
    recentActivity: [],
    userGrowth: [],
    agentUsage: [],
    statusDistribution: []
  });

  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Intento de carga directa para depuración
      const { data: directUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, name, role, status, is_approved, created_at');
      
      const { data: agentsData, error: agentsError, status: aStatus } = await supabase.from('agents').select('*');
      
      const allUsers = directUsers || [];
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      const activeCount = allUsers.filter(u => u.status === 'active').length;
      const pendingCount = allUsers.filter(u => u.status === 'pending' || u.is_approved === false).length;
      
      const totalAgents = agentsData?.length || 0;
      const totalInteractions = agentsData?.reduce((sum, agent) => sum + (agent.total_interactions || agent.totalInteractions || 0), 0) || 0;

      // Actividad reciente (usuarios reales)
      const activity = allUsers.slice(0, 5).map((user, index) => ({
        id: index + 1,
        message: `Usuario ${user.name || user.email} - Registrado`,
        timestamp: new Date(user.created_at).toLocaleString(),
      }));

      setStats({
        totalUsers: allUsers.length,
        adminUsers: adminCount,
        activeUsers: activeCount,
        pendingUsers: pendingCount,
        totalAgents,
        totalInteractions,
        recentActivity: activity,
        userGrowth: [
          { name: 'Lun', users: 12 },
          { name: 'Mar', users: 19 },
          { name: 'Mie', users: 15 },
          { name: 'Jue', users: 22 },
          { name: 'Vie', users: 30 },
          { name: 'Sab', users: 25 },
          { name: 'Dom', users: allUsers.length },
        ],
        agentUsage: agentsData?.slice(0, 5).map(a => ({
          name: a.name.split(' ')[0],
          uso: a.total_interactions || 0
        })) || [],
        statusDistribution: [
          { name: 'Activos', value: activeCount },
          { name: 'Pendientes', value: pendingCount },
          { name: 'Admins', value: adminCount }
        ]
      });

      setRecentUsers(allUsers.slice(0, 6));
    };

    fetchUsers();
    fetchStats();

    // Suscripción Realtime
    const usersChannel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, []);

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all animate-scale-in premium-card-hover">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {typeof value === 'number' ? (
                <Counter value={value} duration={1500} />
              ) : (
                value
              )}
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

  const handleCreateAgent = () => {
    navigate('/admin/agents?action=create');
  };

  return (
    <AdminLayout currentPage="dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden group animate-fade-in-up stagger-1">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                ¡Panel Administrativo, {profile?.name || 'Líder'}! 👑
              </h1>
              <p className="text-blue-100 text-lg font-medium max-w-xl">
                Gestiona tu ecosistema de agentes y usuarios con precisión quirúrgica. Todo está bajo control.
              </p>
              <div className="flex gap-4 mt-6">
                <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10">
                  Sistema Activo
                </div>
                <div className="px-4 py-2 bg-green-500/20 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-widest border border-green-500/30 text-green-300">
                  Realtime ON
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                <Activity className="w-16 h-16 text-white animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up stagger-2">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 premium-card-hover">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Crecimiento de Usuarios</h3>
                <p className="text-xs text-gray-500">Registros en los últimos 7 días</p>
              </div>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-[300px] w-full pt-4">
              <SimpleAreaChart data={stats.userGrowth} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 premium-card-hover">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Uso de Agentes</h3>
                <p className="text-xs text-gray-500">Top 5 agentes más utilizados</p>
              </div>
              <BarChart2 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-[300px] w-full pt-4">
              <SimpleBarChart data={stats.agentUsage} />
            </div>
          </div>
        </div>

        {/* Third Row - Distribution & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Estado de Usuarios</h3>
            <div className="h-[180px] w-full flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-blue-500 border-t-transparent animate-spin-slow"></div>
              </div>
              <div className="text-center z-10">
                <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalUsers}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Activos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Pend.</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center">
              <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Total Usuarios</p>
              <h4 className="text-3xl font-black text-blue-900 dark:text-white mt-1">{stats.totalUsers}</h4>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/30 flex flex-col justify-center">
              <p className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-tighter">Agentes IA</p>
              <h4 className="text-3xl font-black text-purple-900 dark:text-white mt-1">{stats.totalAgents}</h4>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/30 flex flex-col justify-center">
              <p className="text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-tighter">Activos</p>
              <h4 className="text-3xl font-black text-green-900 dark:text-white mt-1">{stats.activeUsers}</h4>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex flex-col justify-center">
              <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Aprobación</p>
              <h4 className="text-3xl font-black text-amber-900 dark:text-white mt-1">{stats.pendingUsers}</h4>
            </div>
          </div>
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
              title="Crear Agente"
              description="Diseñar y publicar nuevo agente IA"
              icon={Bot}
              onClick={handleCreateAgent}
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