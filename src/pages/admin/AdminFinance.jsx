import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  Download, 
  Calendar, 
  RefreshCw, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

// Hook de conteo animado (Count Up)
const useCountUp = (target, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = typeof target === 'number' ? target : parseFloat(target) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const start = 0;
    const increment = end / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
};

// Componente Tarjeta de KPI
const StatCard = ({ title, value, prefix = "", suffix = "", isDecimal = false, percentage = null, icon: Icon, description }) => {
  const animatedValue = useCountUp(value);
  const formattedValue = isDecimal 
    ? animatedValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.floor(animatedValue).toLocaleString('es-ES');

  return (
    <div className="glass-card p-6 border border-white/10 relative overflow-hidden group glass-card-hover animate-fade-in-up">
      <div className="absolute top-0 right-0 w-24 h-24 bg-neon-teal/5 rounded-full -mr-12 -mt-12 blur-xl group-hover:bg-neon-teal/10 transition-all duration-700"></div>
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {prefix}{formattedValue}{suffix}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="p-3 rounded-xl bg-neon-teal/10 text-neon-teal neon-glow"><Icon className="w-5 h-5" /></div>
          {percentage !== null && (
            <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              percentage >= 0 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {percentage >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(percentage).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState('thisMonth'); // 'today', '7days', '30days', 'thisMonth', 'thisYear'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  
  // Estados de datos
  const [financeStats, setFinanceStats] = useState({
    currentNet: 0,
    currentGross: 0,
    prevNet: 0,
    prevGross: 0,
    activeSubscribers: 0,
    mrr: 0,
    arr: 0,
    target: 0
  });

  const [pricingPlans, setPricingPlans] = useState([]);
  const [targetHistory, setTargetHistory] = useState([]);
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Paginación y Estados de Transacciones Server-Side
  const [paginatedTransactions, setPaginatedTransactions] = useState([]);
  const [chartTransactions, setChartTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchQueryInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQueryInput]);

  // Calcular rangos de fechas proporcionales MoM
  const getDateRanges = useCallback((filter) => {
    const now = new Date();
    let start = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (filter === 'today') {
      start.setHours(0,0,0,0);
      prevStart.setDate(start.getDate() - 1);
      prevStart.setHours(0,0,0,0);
      prevEnd.setDate(start.getDate() - 1);
      prevEnd.setHours(23,59,59,999);
    } else if (filter === '7days') {
      start.setDate(now.getDate() - 7);
      prevStart.setDate(start.getDate() - 7);
      prevEnd.setDate(start.getDate());
    } else if (filter === '30days') {
      start.setDate(now.getDate() - 30);
      prevStart.setDate(start.getDate() - 30);
      prevEnd.setDate(start.getDate());
    } else if (filter === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filter === 'thisYear') {
      start = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      prevStartDate: prevStart.toISOString(),
      prevEndDate: prevEnd.toISOString()
    };
  }, []);

  // Consulta ligera para Recharts
  const fetchChartDataLocal = useCallback(async () => {
    try {
      const ranges = getDateRanges(dateFilter);
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status, paid_at')
        .eq('status', 'succeeded')
        .gte('paid_at', ranges.startDate)
        .lte('paid_at', ranges.endDate);

      if (error) throw error;
      setChartTransactions(data || []);
    } catch (err) {
      console.error('[ADMIN_FINANCE] Error loading chart transactions:', err);
    }
  }, [dateFilter, getDateRanges]);

  // Consulta paginada y filtrada para la tabla
  const fetchTransactionsLocal = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const ranges = getDateRanges(dateFilter);
      let query = supabase
        .from('payments')
        .select('*, profiles:profiles!payments_user_id_fkey(name, email)', { count: 'exact' });

      // Apply date range filter
      query = query.gte('paid_at', ranges.startDate).lte('paid_at', ranges.endDate);

      // Apply source filter
      if (filterSource !== 'all') {
        query = query.eq('source', filterSource);
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // Apply search query by name, email, or IDs
      if (searchQuery) {
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(50);
        
        const matchedIds = matchedProfiles?.map(p => p.id) || [];
        if (matchedIds.length > 0) {
          query = query.or(`user_id.in.(${matchedIds.join(',')}),processor_payment_id.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
        } else {
          query = query.or(`processor_payment_id.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
        }
      }

      // Apply ordering
      query = query.order('paid_at', { ascending: false });

      // Apply range for pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, count, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      setPaginatedTransactions(data || []);
      setTotalTransactions(count || 0);
    } catch (err) {
      console.error('[ADMIN_FINANCE] Error loading paginated transactions FULL:', JSON.stringify(err, null, 2));
      toast.error('Error al cargar transacciones');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [dateFilter, filterSource, filterStatus, searchQuery, currentPage, toast, getDateRanges]);

  // Cargar estadísticas core
  const fetchFinanceData = async () => {
    try {
      setIsRefreshing(true);
      const ranges = getDateRanges(dateFilter);

      // 1. Invocar RPC Seguro de Supabase
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_financial_dashboard_stats', {
        start_date: ranges.startDate,
        end_date: ranges.endDate,
        prev_start_date: ranges.prevStartDate,
        prev_end_date: ranges.prevEndDate
      });

      if (rpcError) throw rpcError;

      if (rpcData) {
        setFinanceStats({
          currentNet: (rpcData.current_net_cents || 0) / 100,
          currentGross: (rpcData.current_gross_cents || 0) / 100,
          prevNet: (rpcData.prev_net_cents || 0) / 100,
          prevGross: (rpcData.prev_gross_cents || 0) / 100,
          activeSubscribers: rpcData.active_premium_subscribers || 0,
          mrr: (rpcData.mrr_cents || 0) / 100,
          arr: (rpcData.arr_cents || 0) / 100,
          target: (rpcData.target_cents || 0) / 100
        });
        setTargetInput(((rpcData.target_cents || 0) / 100).toString());
      }

      // 2. Cargar planes de facturación (pricing_plans)
      const { data: plansData, error: plansError } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('price', { ascending: true });

      if (!plansError) {
        setPricingPlans(plansData || []);
      }

      // 3. Cargar Historial de metas
      const { data: targetData, error: targetError } = await supabase
        .from('financial_targets_history')
        .select('*, profiles(name)')
        .order('changed_at', { ascending: false })
        .limit(5);

      if (!targetError) {
        setTargetHistory(targetData || []);
      }

      // Desencadenar las cargas locales
      fetchChartDataLocal();
      fetchTransactionsLocal();

    } catch (err) {
      console.error('[FINANCE DASHBOARD] Error loading financials:', err);
      toast.error(err.message || 'Error al conectar con la pasarela de base de datos');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [dateFilter]);

  // Escuchar cambios en paginación y filtros adicionales de la tabla
  useEffect(() => {
    fetchTransactionsLocal();
  }, [fetchTransactionsLocal]);

  // Escuchar cambios en el filtro de fecha para actualizar el gráfico
  useEffect(() => {
    fetchChartDataLocal();
  }, [fetchChartDataLocal]);

  // Actualizar meta financiera mensual en base de datos
  const handleUpdateTarget = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const parsedTarget = parseFloat(targetInput);
      if (isNaN(parsedTarget) || parsedTarget <= 0) {
        throw new Error('La meta mensual ingresada no es válida');
      }

      const targetInCents = Math.round(parsedTarget * 100);

      // 1. Actualizar en config
      const { error: configError } = await supabase
        .from('system_config')
        .update({ monthly_financial_target_cents: targetInCents })
        .eq('id', 1); // Configuración global singleton

      if (configError) throw configError;

      // 2. Registrar en historial de auditoría
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('financial_targets_history').insert({
        target_cents: targetInCents,
        changed_by: session?.user?.id
      });

      toast.success('Meta de facturación mensual actualizada correctamente');
      setShowTargetModal(false);
      fetchFinanceData();
    } catch (err) {
      toast.error(err.message || 'Error al guardar configuración de meta');
    } finally {
      setActionLoading(false);
    }
  };

  // Exportar reporte de transacciones a CSV compatible con Microsoft Excel
  const handleExportCSV = async () => {
    try {
      setActionLoading(true);
      const ranges = getDateRanges(dateFilter);
      let query = supabase
        .from('payments')
        .select('*, profiles:profiles!payments_user_id_fkey(name, email)');

      // Apply date range filter
      query = query.gte('paid_at', ranges.startDate).lte('paid_at', ranges.endDate);

      // Apply source filter
      if (filterSource !== 'all') {
        query = query.eq('source', filterSource);
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // Apply search query
      if (searchQuery) {
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(50);
        
        const matchedIds = matchedProfiles?.map(p => p.id) || [];
        if (matchedIds.length > 0) {
          query = query.or(`user_id.in.(${matchedIds.join(',')}),processor_payment_id.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
        } else {
          query = query.or(`processor_payment_id.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
        }
      }

      // Apply ordering
      query = query.order('paid_at', { ascending: false });

      const { data: allTx, error: exportErr } = await query;
      if (exportErr) throw exportErr;

      if (!allTx || allTx.length === 0) {
        toast.error('No hay transacciones en el periodo actual para exportar');
        return;
      }

      // 1. Definir columnas y cabecera
      const headers = [
        'ID Transacción',
        'Cliente',
        'Email',
        'Monto (USD)',
        'Divisa',
        'Estado',
        'Canal/Origen',
        'Método Pago',
        'ID Procesador',
        'Plan Tipo',
        'Fecha Pago (UTC)',
        'Auditor/Admin'
      ];

      // 2. Mapear filas
      const rows = allTx.map(tx => [
        tx.id,
        tx.profiles?.name || 'Cliente sin nombre',
        tx.profiles?.email || 'Sin email',
        (tx.amount / 100).toFixed(2),
        tx.currency.toUpperCase(),
        tx.status.toUpperCase(),
        tx.source.toUpperCase(),
        tx.payment_method || 'N/A',
        tx.processor_payment_id || 'N/A',
        tx.plan_type || 'N/A',
        new Date(tx.paid_at).toLocaleString(),
        tx.created_by ? 'Admin Registrado' : 'Sistema Stripe'
      ]);

      // 3. Crear stream CSV con firma BOM para compatibilidad de Excel nativa
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Auditoria_Finanzas_Upfunnel_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Reporte CSV compatible exportado con éxito');
    } catch (err) {
      console.error('[ADMIN_FINANCE] Error exporting CSV:', err);
      toast.error('Error al generar archivo CSV');
    } finally {
      setActionLoading(false);
    }
  };

  // Enfoque server-side: usamos directamente el estado local paginado
  const filteredTransactions = paginatedTransactions;

  // Agrupar datos por fecha para Recharts AreaChart usando la consulta ligera
  const getChartData = () => {
    const dataMap = {};
    const ranges = getDateRanges(dateFilter);
    const startLimit = new Date(ranges.startDate);

    // Filtrar cobros exitosos reales en el rango
    const currentPeriodSucceeded = chartTransactions.filter(tx => 
      tx.status === 'succeeded' &&
      new Date(tx.paid_at) >= startLimit &&
      new Date(tx.paid_at) <= new Date(ranges.endDate)
    );

    currentPeriodSucceeded.forEach(tx => {
      const paidDate = new Date(tx.paid_at);
      let label = "";

      if (dateFilter === 'today') {
        label = `${paidDate.getHours()}:00`;
      } else if (dateFilter === '7days' || dateFilter === '30days' || dateFilter === 'thisMonth') {
        label = paidDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      } else {
        label = paidDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
      }

      dataMap[label] = (dataMap[label] || 0) + (tx.amount / 100);
    });

    // Convertir mapa a array ordenado
    return Object.keys(dataMap).map(label => ({
      date: label,
      revenue: dataMap[label]
    }));
  };

  const chartData = getChartData();

  // Calcular deltas MoM
  const calculateDelta = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const netDelta = calculateDelta(financeStats.currentNet, financeStats.prevNet);
  const grossDelta = calculateDelta(financeStats.currentGross, financeStats.prevGross);

  // Forecast Simple CFO V1
  // Algoritmo móvil trimestral: MRR actual proyectado a 3 meses en base a la retención neta
  const calculateForecast = () => {
    const growthRate = grossDelta > 0 ? Math.min(grossDelta / 100, 0.20) : 0.03; // Tope defensivo de 20%
    const currentMRR = financeStats.mrr;
    
    return [
      { month: 'Mes 1', projection: currentMRR * (1 + growthRate) },
      { month: 'Mes 2', projection: currentMRR * Math.pow(1 + growthRate, 2) },
      { month: 'Mes 3', projection: currentMRR * Math.pow(1 + growthRate, 3) }
    ];
  };

  const forecastData = calculateForecast();

  // Calcular barra de progreso de metas
  const targetPercentage = financeStats.target > 0 
    ? Math.min((financeStats.currentGross / financeStats.target) * 100, 100) 
    : 0;

  const chartTooltipStyle = {
    background: '#0E1A2B',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold'
  };

  return (
    <AdminLayout currentPage="finance">
      <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="glass-card bg-deep-dark/40 p-10 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-neon-teal/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-neon-teal neon-glow animate-pulse" />
                <span className="text-neon-teal font-black uppercase tracking-[0.3em] text-xs">Consola CFO</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-deep-dark/50 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2 outline-none focus:border-neon-teal transition-colors cursor-pointer"
                >
                  <option value="today">Hoy</option>
                  <option value="7days">Últimos 7 días</option>
                  <option value="30days">Últimos 30 días</option>
                  <option value="thisMonth">Este mes</option>
                  <option value="thisYear">Año en curso</option>
                </select>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-teal/10 text-neon-teal border border-neon-teal/20 hover:bg-neon-teal/20 transition-all duration-300 text-xs font-black uppercase tracking-widest"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV compatible con Excel
                </button>
                <button
                  onClick={fetchFinanceData}
                  disabled={isRefreshing}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-neon-teal transition-colors text-white disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase italic">
              Terminal <span className="neon-text">Financiera</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-md max-w-2xl font-medium">
              Supervisa la liquidez, facturación en Stripe, cobros manuales y proyecciones de ingresos de tu SaaS en tiempo real.
            </p>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Ingreso Neto (Net)" value={financeStats.currentNet} prefix="$" suffix=" USD" isDecimal={true} percentage={netDelta} icon={DollarSign} description="Facturación restando reembolsos" />
          <StatCard title="Ingreso Bruto (Gross)" value={financeStats.currentGross} prefix="$" suffix=" USD" isDecimal={true} percentage={grossDelta} icon={TrendingUp} description="Volumen total de cobros" />
          <StatCard title="MRR Estimado" value={financeStats.mrr} prefix="$" suffix=" USD" isDecimal={true} icon={Layers} description="Base recurrente activa" />
          <StatCard title="ARR Estimado" value={financeStats.arr} prefix="$" suffix=" USD" isDecimal={true} icon={Users} description="MRR proyectado a 12 meses" />
        </div>

        {/* Charts & Targets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main AreaChart */}
          <div className="lg:col-span-2 glass-card p-8 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase italic">Línea de Facturación Neta</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Evolución de ingresos en el periodo</p>
              </div>
              <TrendingUp className="w-6 h-6 text-neon-teal neon-glow" />
            </div>
            
            <div className="h-[300px] w-full relative z-10 pr-4">
              {chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <AlertTriangle className="w-8 h-8 text-gray-600 mb-2 animate-bounce" />
                  <p className="text-xs font-black uppercase tracking-widest">Sin transacciones registradas</p>
                  <p className="text-[10px] uppercase mt-1">Comienza registrando cobros manuales o conecta Stripe</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`$${value.toFixed(2)} USD`, 'Facturado']} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00E5FF"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={3}
                      dot={{ fill: '#00E5FF', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#00E5FF', strokeWidth: 2, fill: '#0E1A2B' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Targets & Forecast */}
          <div className="glass-card p-8 border border-white/10 flex flex-col justify-between">
            {/* Meta Mensual */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Meta Mensual</h3>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Medida sobre facturación bruta</p>
                </div>
                <button 
                  onClick={() => setShowTargetModal(true)} 
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neon-teal font-black text-[9px] uppercase tracking-widest border border-white/5 hover:border-neon-teal/20 transition-all"
                >
                  Fijar Objetivo
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-white">
                  <span className="text-4xl font-black tracking-tighter">${financeStats.currentGross.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase">Meta: ${financeStats.target.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                </div>
                {/* Barra de Progreso Neón */}
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-neon-teal to-purple-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                    style={{ width: `${targetPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] font-black uppercase text-gray-500 tracking-wider">
                  <span>0%</span>
                  <span className="text-neon-teal font-black italic">{targetPercentage.toFixed(1)}% completado</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full my-6"></div>

            {/* Forecast V1 */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Forecast Simple V1</h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Predicción móvil a 3 meses</p>
              </div>

              <div className="space-y-3">
                {forecastData.map((forecast, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-teal"></div>
                      <span className="text-xs font-bold text-gray-300">{forecast.month}</span>
                    </div>
                    <span className="text-sm font-black text-white">${forecast.projection.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table Section */}
        <div className="glass-card border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5 dark:bg-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Auditoría de Pagos</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Registro de cobros inmutables en tiempo real</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-teal transition-colors w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Escanear transacción..."
                  value={searchQueryInput}
                  onChange={(e) => setSearchQueryInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-xl bg-white/5 text-white placeholder-gray-600 focus:ring-1 focus:ring-neon-teal focus:border-neon-teal transition-all outline-none text-xs"
                />
              </div>

              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-3 py-2 border border-white/10 rounded-xl bg-white/5 text-white font-bold text-xs uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="all">Todas las Fuentes</option>
                <option value="stripe">Stripe</option>
                <option value="manual">Manual</option>
                <option value="paypal">PayPal</option>
                <option value="mercadopago">MercadoPago</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-white/10 rounded-xl bg-white/5 text-white font-bold text-xs uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="succeeded">Completados</option>
                <option value="refunded">Reembolsos</option>
                <option value="failed">Fallidos</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingTransactions ? (
              <div className="min-h-[200px] flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-neon-teal/20 border-t-neon-teal animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest animate-pulse">Cargando transacciones...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-4 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-widest">Sin transacciones para mostrar</p>
                <p className="text-[9px] uppercase tracking-wider mt-1">Asegura que las búsquedas o filtros coincidan con cobros existentes</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Cliente / email</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Monto (USD)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Divisa</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Canal</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Estado</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Fecha Pago (UTC)</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest italic">ID Procesador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-xs font-black text-white uppercase tracking-tighter truncate max-w-[180px]">
                              {tx.profiles?.name || 'Cliente sin nombre'}
                            </p>
                            <p className="text-[9px] font-bold text-gray-500 truncate max-w-[180px]">
                              {tx.profiles?.email || 'Sin correo asociado'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-black uppercase ${
                            tx.status === 'refunded' ? 'text-red-400' : 'text-white'
                          }`}>
                            {tx.status === 'refunded' ? '-' : ''}${(tx.amount / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">
                          {tx.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                            tx.source === 'stripe' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 
                            tx.source === 'manual' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                            'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {tx.source === 'stripe' ? 'Stripe' : tx.source === 'manual' ? 'Manual' : tx.source.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {tx.status === 'succeeded' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : tx.status === 'refunded' ? (
                              <HelpCircle className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-orange-500" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                              {tx.status === 'succeeded' ? 'Completado' : tx.status === 'refunded' ? 'Reembolso' : tx.status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">
                          {new Date(tx.paid_at).toLocaleString('es-ES')}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-gray-500 font-mono truncate max-w-[120px]" title={tx.processor_payment_id}>
                          {tx.processor_payment_id || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                  <div className="p-6 border-t border-white/10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2.5 rounded-xl glass-card border-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      let end = Math.min(totalPages, start + maxVisible - 1);
                      if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                      
                      if (start > 1) {
                        pages.push(
                          <button key={1} onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-xl font-black transition-all glass-card border-white/5 text-gray-500 hover:text-white">1</button>
                        );
                        if (start > 2) pages.push(<span key="start-ellipsis" className="text-gray-600 font-bold px-1">...</span>);
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-10 h-10 rounded-xl font-black transition-all ${currentPage === i ? 'bg-neon-teal text-deep-dark shadow-lg shadow-neon-teal/20' : 'glass-card border-white/5 text-gray-500 hover:text-white'}`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      if (end < totalPages) {
                        if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="text-gray-600 font-bold px-1">...</span>);
                        pages.push(
                          <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-xl font-black transition-all glass-card border-white/5 text-gray-500 hover:text-white">{totalPages}</button>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2.5 rounded-xl glass-card border-white/5 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Metas Modal */}
        {showTargetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-deep-dark/90 backdrop-blur-xl" onClick={() => setShowTargetModal(false)}></div>
            <div className="relative glass-card p-10 w-full max-w-sm border-white/10 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neon-teal/10 text-neon-teal rounded-xl neon-glow">
                    <Target className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Fijar Meta</h2>
                </div>
                <button onClick={() => setShowTargetModal(false)} className="p-1 text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTarget} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Meta Bruta Mensual (USD)</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      placeholder="10000"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="premium-input w-full pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  </div>
                </div>

                {targetHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Historial de Auditoría</p>
                    <div className="space-y-1.5">
                      {targetHistory.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[9px] text-gray-400 bg-white/5 p-2 rounded-lg">
                          <span>${(item.target_cents / 100).toLocaleString('es-ES')} USD</span>
                          <span>{new Date(item.changed_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowTargetModal(false)} className="flex-1 py-3.5 glass-card border-white/5 text-gray-500 font-black uppercase text-xs tracking-widest">Cancelar</button>
                  <button type="submit" disabled={actionLoading} className="flex-1 py-3.5 bg-neon-teal text-deep-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-neon-teal/20">
                    {actionLoading ? 'PROCESANDO...' : 'GUARDAR'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
