import React from 'react';
import { ChevronDownIcon, CheckCircleIcon, PlayIcon, Trash2 } from 'lucide-react';
import { Lesson, Module } from '../services/academyService';

interface LessonSidebarProps {
  modules: Module[];
  activeLesson: Lesson | null;
  expandedModules: Record<string, boolean>;
  onToggleModule: (id: string) => void;
  onLessonSelect: (lesson: Lesson) => void;
  isAdmin: boolean;
  isEditMode: boolean;
  onDeleteModule: (id: string, e: React.MouseEvent) => void;
  onDeleteLesson: (id: string, moduleId: string) => void;
  isLoading: boolean;
  draggedModuleId?: string | null;
  draggedLesson?: { id: string; moduleId: string } | null;
  handleModuleDragStart?: (e: React.DragEvent, id: string) => void;
  handleModuleDragOver?: (e: React.DragEvent, id: string) => void;
  handleModuleDrop?: (e: React.DragEvent, targetId: string) => void;
  handleLessonDragStart?: (e: React.DragEvent, id: string, mId: string) => void;
  handleLessonDragOver?: (e: React.DragEvent, id: string, mId: string) => void;
  handleLessonDrop?: (e: React.DragEvent, targetId: string, mId: string) => void;
}

export const LessonSidebar: React.FC<LessonSidebarProps> = ({
  modules,
  activeLesson,
  expandedModules,
  onToggleModule,
  onLessonSelect,
  isAdmin,
  isEditMode,
  onDeleteModule,
  onDeleteLesson,
  isLoading,
  draggedModuleId = null,
  draggedLesson = null,
  handleModuleDragStart = () => {},
  handleModuleDragOver = () => {},
  handleModuleDrop = () => {},
  handleLessonDragStart = () => {},
  handleLessonDragOver = () => {},
  handleLessonDrop = () => {}
}) => {
  return (
    <div className="w-full lg:w-[380px] shrink-0 order-2 lg:order-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-auto lg:h-[calc(100vh-8rem)] lg:sticky lg:top-8">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
          Contenido del curso
          <span className="text-xs font-normal text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
            {(modules || []).reduce((acc, m) => acc + (m.lessons || []).length, 0)} lecciones
          </span>
        </h2>
      </div>

      <div className="overflow-y-auto flex-1 p-4 custom-scrollbar">
        {isLoading && modules.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
            </div>
            <div className="space-y-2 pt-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
              <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
              <div className="h-12 bg-slate-100 dark:bg-slate-800/40 rounded-xl"></div>
            </div>
          </div>
        ) : (
          (modules || []).map((module) => {
            const isExpanded = expandedModules[module.id];
            const moduleLessons = module.lessons || [];
            const moduleLessonsCompleted = moduleLessons.filter(l => l.is_completed).length;
            const progress = Math.round((moduleLessonsCompleted / moduleLessons.length) * 100) || 0;

            return (
              <div 
                key={module.id} 
                className={`mb-2 rounded-xl transition-all ${isAdmin && isEditMode ? 'border border-dashed border-slate-200 dark:border-slate-800/60 p-1 hover:border-slate-400 dark:hover:border-slate-700' : ''} ${draggedModuleId === module.id ? 'opacity-40 scale-[0.98]' : ''}`}
                draggable={isAdmin && isEditMode}
                onDragStart={(e) => handleModuleDragStart(e, module.id)}
                onDragOver={(e) => handleModuleDragOver(e, module.id)}
                onDrop={(e) => handleModuleDrop(e, module.id)}
              >
                <button
                  onClick={() => onToggleModule(module.id)}
                  className="w-full flex flex-col p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {module.title}
                      </span>
                      {isAdmin && isEditMode && (
                        <button
                          onClick={(e) => onDeleteModule(module.id, e)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 w-8 text-right">
                      {progress}%
                    </span>
                  </div>
                </button>

                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden flex flex-col gap-1 px-2 pb-3">
                    {(module.lessons || []).map((lesson, lIdx) => {
                      const isActive = activeLesson?.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onLessonSelect(lesson)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200
                          ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm border border-blue-100 dark:border-blue-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}
                          ${isAdmin && isEditMode ? 'border-dashed border border-slate-200 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700' : ''}
                          ${draggedLesson?.id === lesson.id ? 'opacity-40 scale-[0.98]' : ''}`}
                          draggable={isAdmin && isEditMode}
                          onDragStart={(e) => handleLessonDragStart(e, lesson.id, module.id)}
                          onDragOver={(e) => handleLessonDragOver(e, lesson.id, module.id)}
                          onDrop={(e) => handleLessonDrop(e, lesson.id, module.id)}
                        >
                          <div className="shrink-0 mt-0.5">
                            {lesson.is_completed ? (
                              <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                            ) : isActive ? (
                              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <PlayIcon className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{lIdx + 1}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              {lesson.title}
                            </p>
                            {isAdmin && isEditMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLesson(lesson.id, module.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
