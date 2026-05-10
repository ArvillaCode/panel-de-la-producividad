import React from 'react';
import { MessageCircle, Heart, Star, Shield, Zap, Sparkles } from 'lucide-react';
import Avatar from './Avatar';

const AgentCard = ({ agent, isFavorite, onToggleFavorite, animationDelay = 0 }) => {
  const handleChatClick = () => {
    const prompt = `Hola, soy ${agent.name}, especialista en ${agent.specialty}. ${agent.description}. ¿En qué puedes ayudarte hoy?`;
    const chatGPTUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
    window.open(chatGPTUrl, '_blank');
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Salud': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Tecnología': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Educación': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Negocios': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Gastronomía': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Diseño': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'Arte': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div 
      className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'both' }}
    >
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(agent.id);
          }}
          className={`p-2.5 rounded-xl transition-all duration-300 backdrop-blur-md ${
            isFavorite 
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' 
              : 'bg-white/80 dark:bg-gray-900/80 text-gray-400 hover:text-red-500 border border-gray-100 dark:border-gray-700'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-5 md:p-6 flex flex-col flex-1">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <Avatar 
              name={agent.name}
              avatar={agent.avatar}
              size="lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white truncate text-base md:text-lg tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {agent.name}
              </h3>
              {agent.isNew && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800/50 uppercase tracking-wider">
                  <Zap className="w-2.5 h-2.5 fill-current" /> Nuevo
                </span>
              )}
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-sm ${getCategoryColor(agent.category)}`}>
              {agent.category}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            {agent.specialty}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {agent.description}
          </p>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pb-3 border-b border-gray-50 dark:border-gray-700/50">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> IA Avanzada
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.9/5
            </span>
          </div>
          
          <button
            onClick={handleChatClick}
            className="w-full group/btn relative flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
            <MessageCircle className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Chatear con {agent.name.split(' ')[0]}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;