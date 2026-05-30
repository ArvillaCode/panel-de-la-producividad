import React, { useState } from 'react';
import { Settings, Save, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminActionsMenuProps {
  isAdmin: boolean;
  isEditMode: boolean;
  onSettingsClick: () => void;
  onAddCourseClick: () => void;
  onToggleEditMode: () => void;
}

export const AdminActionsMenu: React.FC<AdminActionsMenuProps> = ({
  isAdmin,
  isEditMode,
  onSettingsClick,
  onAddCourseClick,
  onToggleEditMode
}) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  if (!isAdmin) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Botones visibles en desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={onSettingsClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
          title="Ajustes de Academia"
        >
          <Settings className="w-4 h-4" />
          <span>Ajustes</span>
        </button>

        <Link
          to="/dashboard/academia/admin"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          Creador de Contenido
        </Link>

        {isEditMode && (
          <div className="hidden md:flex items-center gap-2 text-green-500 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-3.5 py-2 rounded-xl text-xs font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            <span>✓ Guardado automático activo en la nube</span>
          </div>
        )}

        <button
          onClick={onToggleEditMode}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm ${isEditMode ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
        >
          <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
          {isEditMode ? 'Modo Edición Activo' : 'Modo Edición'}
        </button>

        <button
          onClick={onAddCourseClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Añadir Curso
        </button>
      </div>

      {/* Botón menú hamburguesa solo mobile */}
      <div className="sm:hidden relative">
        <button
          onClick={() => setShowAdminMenu(!showAdminMenu)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Opciones de administración"
        >
          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        {showAdminMenu && (
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => { setShowAdminMenu(false); onSettingsClick(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4" /> Ajustes
            </button>
            <Link
              to="/dashboard/academia/admin"
              onClick={() => setShowAdminMenu(false)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" /> Creador de Contenido
            </Link>
            <button
              onClick={() => {
                setShowAdminMenu(false);
                onToggleEditMode();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${isEditMode ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></div>
              {isEditMode ? 'Desactivar Edición' : 'Modo Edición'}
            </button>
            <hr className="my-1 border-slate-100 dark:border-slate-800" />
            <button
              onClick={() => { setShowAdminMenu(false); onAddCourseClick(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Añadir Curso
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
