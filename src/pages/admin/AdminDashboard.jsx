import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Bot,
  Settings,
  Plus,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  BarChart2,
  Star,
  Trophy,
  Award,
  Medal,
  TrendingDown,
  ChevronUp,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const useCountUp = (target, duration = 1200) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = typeof target === 'number' ? target : parseInt(target) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    
    // Always start from 0 to target on mount or when target updates
    const start = 0;
    const increment = end / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
};

const StatCard = ({ title, value, icon: Icon, description }) => {
  const animatedValue = useCountUp(typeof value === 'number' ? value : parseInt(value) || 0);
  return (
    <div className="glass-card p-7 border border-white/10 relative overflow-hidden group glass-card-hover animate-fade-in-up">
      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-neon-teal/10 transition-all duration-700"></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">{title}</p>
          <p className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>{animatedValue}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{description}</p>
        </div>
        <div className="p-4 rounded-[1.2rem] bg-neon-teal/10 text-neon-teal neon-glow"><Icon className="w-8 h-8" /></div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, profile, users, fetchUsers, loading } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
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
    roleDistribution: [],
    agentRankings: []
  });

  const fetchStats = async () => {
    const { data: directUsers } = await supabase.from('profiles').select('*');
    const { data: agentsData } = await supabase.from('agents').select('*');
    const { data: ratingsData } = await supabase.from('agent_ratings').select('*');

    let allUsers = directUsers || [];
    let filteredAgents = agentsData || [];

    if (dateFilter !== 'all') {
      const now = new Date();
      let limitDate = new Date();
      if (dateFilter === '7days') limitDate.setDate(now.getDate() - 7);
      else if (dateFilter === '30days') limitDate.setDate(now.getDate() - 30);
      else if (dateFilter === 'thisMonth') limitDate = new Date(now.getFullYear(), now.getMonth(), 1);

      allUsers = allUsers.filter(u => new Date(u.created_at) >= limitDate);
      filteredAgents = filteredAgents.filter(a => new Date(a.created_at) >= limitDate);
    }

    // --- User Growth: last 7 days grouped by created_at ---
    const now = new Date();
    const userGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
      const label = day.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      const count = allUsers.filter(u => {
        if (!u.created_at) return false;
        return u.created_at.startsWith(dayStr);
      }).length;
      userGrowth.push({ date: label, users: count });
    }

    // --- Agent Usage: top 5 by total_interactions ---
    const agentUsage = filteredAgents
      .map(a => ({ name: a.name ? a.name.split(' ').slice(0, 2).join(' ') : 'Sin nombre', interactions: a.total_interactions || 0 }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 5);

    // --- Role Distribution ---
    const adminCount = allUsers.filter(u => u.role === 'admin').length;
    const userCount = allUsers.filter(u => u.role !== 'admin').length;
    const roleDistribution = [
      { name: 'Admin', value: adminCount, color: '#A855F7' },
      { name: 'User', value: userCount, color: '#00E5FF' }
    ];

    // --- Rankings ---
    const rankings = filteredAgents.map(agent => {
      const agentRatings = (ratingsData || []).filter(r => r.agent_id === agent.id);
      const avg = agentRatings.length > 0 ? agentRatings.reduce((sum, r) => sum + r.rating, 0) / agentRatings.length : 0;
      return { id: agent.id, name: agent.name, avgRating: avg, totalVotes: agentRatings.length, trend: avg >= 4 ? 'up' : 'neutral' };
    }).sort((a, b) => b.avgRating - a.avgRating);

    setStats({
      totalUsers: allUsers.length,
      adminUsers: allUsers.filter(u => u.role === 'admin').length,
      activeUsers: allUsers.filter(u => u.status === 'active').length,
      pendingUsers: allUsers.filter(u => u.status === 'pending').length,
      totalAgents: filteredAgents.length,
      recentActivity: allUsers.slice(0, 5).map(u => ({ id: u.id, message: `Nuevo usuario: ${u.name || u.email}`, timestamp: new Date(u.created_at).toLocaleTimeString() })),
      userGrowth,
      agentUsage,
      roleDistribution,
      agentRankings: rankings
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
  }, [dateFilter]);

  // (Moved outside to prevent re-renders)

  const chartTooltipStyle = {
    background: '#0E1A2B',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold'
  };

  return (
    <AdminLayout currentPage="dashboard">
      <div className="space-y-8 pb-10">
        {/* Welcome Section */}
        <div className="glass-card bg-deep-dark/40 p-10 border border-white/5 relative overflow-hidden group animate-fade-in-up">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-teal/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-neon-teal neon-glow" />
                <span className="text-neon-teal font-black uppercase tracking-[0.3em] text-xs">Ecosistema Premium</span>
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-deep-dark/50 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2 outline-none focus:border-neon-teal transition-colors"
                >
                  <option value="all">Todo el tiempo</option>
                  <option value="7days">Últimos 7 días</option>
                  <option value="30days">Últimos 30 días</option>
                  <option value="thisMonth">Este mes</option>
                </select>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-teal/10 text-neon-teal border border-neon-teal/20 hover:bg-neon-teal/20 transition-all duration-300 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
            </div>
            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
              Control Maestro, <span className="neon-text">{profile?.name || 'Líder'}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl font-medium">
              Supervisa el rendimiento de tus agentes y la actividad de tus usuarios con la interfaz de mayor precisión del mercado.
            </p>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Usuarios" value={stats.totalUsers} icon={Users} description="Base de datos global" />
          <StatCard title="Agentes IA" value={stats.totalAgents} icon={Bot} description="Especialistas activos" />
          <StatCard title="Usuarios Activos" value={stats.activeUsers} icon={CheckCircle} description="Acceso verificado" />
          <StatCard title="Pendientes" value={stats.pendingUsers} icon={Clock} description="Esperando revisión" />
        </div>

        {/* Charts Section - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart - User Growth */}
          <div className="lg:col-span-2 glass-card p-8 border border-white/10 spatial-grid">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Crecimiento de Usuarios</h3>
              <TrendingUp className="w-6 h-6 text-neon-teal" />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#00E5FF"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    strokeWidth={3}
                    dot={{ fill: '#00E5FF', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#00E5FF', strokeWidth: 2, fill: '#0E1A2B' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart - Top Agents */}
          <div className="glass-card p-8 border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Top Agentes</h3>
              <Activity className="w-6 h-6 text-neon-teal" />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.agentUsage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="interactions" fill="#00E5FF" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Section - Row 2: Pie Chart + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart - Role Distribution */}
          <div className="glass-card p-8 border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Distribución de Roles</h3>
              <Users className="w-6 h-6 text-neon-teal" />
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#9CA3AF' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking Section */}
          <div className="lg:col-span-2 glass-card border border-white/10 overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-white/5 dark:bg-white/5 flex items-center justify-between">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4 tracking-tighter">
                <Trophy className="w-8 h-8 text-neon-teal neon-glow" /> RANKING DE RENDIMIENTO
              </h3>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">Top 10 Agentes</span>
            </div>
            <div className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 dark:bg-deep-dark/30">
                    <th className="py-5 px-8">Agente Especialista</th>
                    <th className="py-5 px-8">Calificación</th>
                    <th className="py-5 px-8">Tendencia</th>
                    <th className="py-5 px-8 text-right">Volumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.agentRankings.slice(0, 8).map((agent, i) => (
                    <tr key={i} className="group hover:bg-neon-teal/5 transition-colors">
                      <td className="py-6 px-8 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neon-teal/10 flex items-center justify-center text-neon-teal font-black text-lg">
                          {i + 1}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{agent.name}</span>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 fill-neon-teal text-neon-teal neon-glow" />
                          <span className="font-black text-gray-900 dark:text-white text-lg">{agent.avgRating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        {agent.trend === 'up' ? (
                          <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase rounded-full border border-green-500/20 inline-flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Máximo
                          </div>
                        ) : (
                          <div className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full border border-amber-500/20 inline-flex items-center gap-2">
                            <ChevronUp className="w-3 h-3 rotate-90" /> Estable
                          </div>
                        )}
                      </td>
                      <td className="py-6 px-8 text-right font-bold text-gray-500">{agent.totalVotes} votos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;