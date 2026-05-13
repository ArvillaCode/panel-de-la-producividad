import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const Toaster = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className="animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl min-w-[300px] max-w-md">
        <div className="shrink-0">
          {icons[toast.type] || icons.success}
        </div>
        <p className="flex-1 text-sm font-bold text-gray-900 dark:text-gray-100">
          {toast.message}
        </p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
