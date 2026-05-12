import React, { useState } from 'react';
import { X, Send, Sparkles, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SuggestionModal = ({ isOpen, onClose }) => {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { suggestAgent } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setLoading(true);
    try {
      const result = await suggestAgent(suggestion);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setSuggestion('');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          </div>
          <Sparkles className="w-16 h-16 text-white/20 absolute -right-4 -bottom-4 rotate-12" />
          <div className="relative z-10 text-center">
            <MessageSquare className="w-10 h-10 text-white mx-auto mb-2" />
            <h3 className="text-xl font-black text-white tracking-tight">Sugerir Nuevo Agente</h3>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Sugerencia Enviada!</h4>
              <p className="text-gray-500 dark:text-gray-400">Gracias por ayudarnos a mejorar. Analizaremos tu propuesta pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
                ¿Tienes alguna idea para un agente que te ayude a ser más productivo? Descríbelo aquí y nuestro equipo lo evaluará.
              </p>
              
              <div>
                <textarea
                  required
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Ej: Necesito un agente especializado en análisis de contratos legales o redacción de correos corporativos..."
                  className="w-full h-40 px-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-sm leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !suggestion.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Sugerencia
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionModal;
