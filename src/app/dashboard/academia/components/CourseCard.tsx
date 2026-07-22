import React from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Course } from '../services/academyService';
import { academyMediaUrl } from '../../../../lib/academyR2Upload.js';

interface CourseCardProps {
  course: Course;
  isAdmin: boolean;
  isEditMode: boolean;
  onEditClick: (course: Course, e: React.MouseEvent) => void;
  onDeleteClick: (id: string, e: React.MouseEvent) => void;
  onSelect: () => void;
}

export const CATEGORY_COLORS: Record<string, string> = {
  "General": "bg-slate-500",
  "Inteligencia Artificial": "bg-purple-600",
  "Automatización": "bg-blue-600",
  "Marketing": "bg-pink-600",
  "Ventas": "bg-emerald-600",
  "Estrategia": "bg-amber-600",
  "Premium": "bg-gradient-to-r from-indigo-600 to-purple-600"
};

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isAdmin,
  isEditMode,
  onEditClick,
  onDeleteClick,
  onSelect
}) => {
  const src = academyMediaUrl(course.thumbnail_url);
  const fallback = '/assets/academy-placeholder.svg';
  const hasAdminActions = isAdmin && isEditMode;

  return (
    <div
      onClick={onSelect}
      onKeyDown={(event) => {
        if (hasAdminActions) return;
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      role={hasAdminActions ? undefined : 'button'}
      tabIndex={hasAdminActions ? undefined : 0}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer hover:-translate-y-2 active:scale-[0.98] active:shadow-md"
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        <img
          src={src || fallback}
          alt={course.title}
          width="800"
          height="450"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if ((e.target as HTMLImageElement).src !== fallback) {
              (e.target as HTMLImageElement).src = fallback;
            }
          }}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-3 py-1 ${CATEGORY_COLORS[course.category] || 'bg-slate-600'} backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg`}>
            {course.category || 'General'}
          </span>
          {course.is_published === false && (
            <span className="px-2.5 py-1 bg-rose-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg border border-rose-500/20 w-fit">
              🔒 Oculto
            </span>
          )}
        </div>

        {isAdmin && isEditMode && (
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={(e) => onEditClick(course, e)}
              className="p-2 bg-blue-500/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
              title="Editar Curso"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => onDeleteClick(course.id, e)}
              className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
              title="Borrar Curso"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-500 transition-colors">{course.title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{course.description}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest">Mastery Level</span>
          {hasAdminActions ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
              }}
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-sm"
            >
              Entrar <Plus className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-sm">
              Entrar <Plus className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
