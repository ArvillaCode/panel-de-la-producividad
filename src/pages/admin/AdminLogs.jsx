import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  User, 
  Search, 
  Filter, 
  Trash2, 
  Download,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles(name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error) {
        setLogs(data || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['ID', 'Accion', 'Usuario', 'Email', 'Entidad', 'Detalles', 'Fecha'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.action,
      log.profiles?.name || 'Sistema',
      log.profiles?.email || '',
      log.entity || '',
      JSON.stringify(log.details || {}).replace(/,/g, ';'),
      new Date(log.created_at).toISOString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getLogIcon = (action) => {
    const a = action.toLowerCase();
    if (a.includes('delete') || a.includes('error') || a.includes('rechaz') || a.includes('expuls')) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (a.includes('create') || a.includes('add') || a.includes('aprob') || a.includes('login') || a.includes('activ')) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && (
      log.action.toLowerCase().includes(filterType.toLowerCase()) ||
      (log.entity && log.entity.toLowerCase().includes(filterType.toLowerCase()))
    );
  });

  return (
    <AdminLayout currentPage="logs">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Actividad</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Registros detallados de las acciones en el sistema</p>
          </div>
          <button 
            onClick={fetchLogs}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Clock className="w-4 h-4 mr-2" /> Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por acción o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white outline-none"
              >
                <option value="all">Todas las acciones</option>
                <option value="login">Inicios de sesión</option>
                <option value="create">Creaciones</option>
                <option value="update">Actualizaciones</option>
                <option value="delete">Eliminaciones</option>
              </select>
              <button 
                onClick={handleExportCSV}
                title="Exportar a CSV"
                className="p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Acción</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Detalles</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      <div className="premium-spinner mx-auto mb-4"></div>
                      Cargando registros...
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getLogIcon(log.action)}
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{log.profiles?.name || 'Sistema'}</p>
                            <p className="text-xs text-gray-500">{log.profiles?.email || 'Auto'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-500 font-medium">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center text-gray-500 italic">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      No se encontraron registros de actividad.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
