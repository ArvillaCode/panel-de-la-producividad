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
  Sparkles
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// Gráficos SVG personalizados con estética Premium (Smooth Splines)
const SimpleAreaChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.users), 1);
  const width = 1000;
  const height = 300;
  
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (d.users / max) * (height - 40) - 20
  }));

  const generateSmoothPath = (pts) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      d += ` C ${cp1x} ${p0.y}, ${cp1x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathData = generateSmoothPath(points);
  
  return (
    <div className="w-full h-full relative group">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="neonTealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#00E5FF', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#00E5FF', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path
          d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
          fill="url(#neonTealGradient)"
          className="transition-all duration-700"
        />
        <path
          d={pathData}
          fill="none"
          stroke="#00E5FF"
          strokeWidth="4"
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
        />
        {points.map((p, i) => (
          <g key={i} className="group/dot cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill="#00E5FF"
              className="opacity-0 group-hover/dot:opacity-100 transition-opacity animate-pulse-glow"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#0E1A2B"
              stroke="#00E5FF"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 flex justify-between px-2">
        {data.map((d, i) => (
          <div key={i} className="h-full group/item relative flex flex-col justify-end pb-2">
            <div className="hidden group-hover/item:block absolute bottom-full mb-4 left-1/2 -translate-x-1/2 custom-tooltip z-50">
              <div className="flex flex-col items-center gap-1">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">{d.name}</span>
                <span className="text-lg font-black neon-text">{d.users}</span>
              </div>
            </div>
            <div className="w-px h-0 group-hover/item:h-[80%] bg-neon-teal/20 absolute left-1/2 -translate-x-1/2 bottom-0 transition-all duration-500"></div>
            <span className="text-[10px] text-gray-500 font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{d.name}</span>
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
    <div className="space-y-6 w-full h-full flex flex-col justify-center px-4">
      {data.map((d, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-teal neon-glow" />
              {d.name}
            </span>
            <span className="neon-text">{d.uso}</span>
          </div>
          <div className="segmented-progress">
            {[...Array(10)].map((_, idx) => (
              <div 
                key={idx} 
                className={`progress-segment ${idx < Math.ceil((d.uso / max) * 10) ? 'active' : ''}`}
                style={{ transitionDelay: `${idx * 50}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

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
    statusDistribution: [],
    agentRankings: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: directUsers } = await supabase.from('profiles').select('*');
      const { data: agentsData } = await supabase.from('agents').select('*');
      const { data: ratingsData } = await supabase.from('agent_ratings').select('*');

      const allUsers = directUsers || [];
      const rankings = (agentsData || []).map(agent => {
        const agentRatings = (ratingsData || []).filter(r => r.agent_id === agent.id);
        const avg = agentRatings.length > 0 ? agentRatings.reduce((sum, r) => sum + r.rating, 0) / agentRatings.length : 0;
        return { id: agent.id, name: agent.name, avgRating: avg, totalVotes: agentRatings.length, trend: avg >= 4 ? 'up' : 'neutral' };
      }).sort((a, b) => b.avgRating - a.avgRating);

      setStats({
        totalUsers: allUsers.length,
        adminUsers: allUsers.filter(u => u.role === 'admin').length,
        activeUsers: allUsers.filter(u => u.status === 'active').length,
        pendingUsers: allUsers.filter(u => u.status === 'pending').length,
        totalAgents: agentsData?.length || 0,
        recentActivity: allUsers.slice(0, 5).map(u => ({ id: u.id, message: `Nuevo usuario: ${u.name || u.email}`, timestamp: new Date(u.created_at).toLocaleTimeString() })),
        userGrowth: [
          { name: 'Lun', users: 12 }, { name: 'Mar', users: 19 }, { name: 'Mie', users: 15 },
          { name: 'Jue', users: 22 }, { name: 'Vie', users: 30 }, { name: 'Sab', users: 25 }, { name: 'Dom', users: allUsers.length }
        ],
        agentUsage: agentsData?.slice(0, 5).map(a => ({ name: a.name.split(' ')[0], uso: a.total_interactions || 0 })) || [],
        agentRankings: rankings
      });
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, description }) => (
    <div className="glass-card p-7 border border-white/10 relative overflow-hidden group glass-card-hover animate-fade-in-up">
      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-teal/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-neon-teal/10 transition-all duration-700"></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">{title}</p>
          <p className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{description}</p>
        </div>
        <div className="p-4 rounded-[1.2rem] bg-neon-teal/10 text-neon-teal neon-glow"><Icon className="w-8 h-8" /></div>
      </div>
    </div>
  );

  return (
    <AdminLayout currentPage="dashboard">
      <div className="space-y-8 pb-10">
        {/* Welcome Section */}
        <div className="glass-card bg-deep-dark/40 p-10 border border-white/5 relative overflow-hidden group animate-fade-in-up">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-teal/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-neon-teal neon-glow" />
              <span className="text-neon-teal font-black uppercase tracking-[0.3em] text-xs">Ecosistema Premium</span>
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-8 border border-white/10 spatial-grid">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Crecimiento de Usuarios</h3>
              <TrendingUp className="w-6 h-6 text-neon-teal" />
            </div>
            <div className="h-[300px] w-full"><SimpleAreaChart data={stats.userGrowth} /></div>
          </div>
          <div className="glass-card p-8 border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Uso de Agentes</h3>
              <Activity className="w-6 h-6 text-neon-teal" />
            </div>
            <div className="h-[300px] w-full"><SimpleBarChart data={stats.agentUsage} /></div>
          </div>
        </div>

        {/* Ranking Section */}
        <div className="glass-card border border-white/10 overflow-hidden">
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
    </AdminLayout>
  );
};

export default AdminDashboard;