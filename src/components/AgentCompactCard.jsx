import React from 'react';
import { MessageCircle, Heart, Star, Zap, Shield } from 'lucide-react';
import Avatar from './Avatar';

const AgentCompactCard = ({ agent, isFavorite, onToggleFavorite, animationDelay = 0 }) => {
  const handleChatClick = (e) => {
    e.stopPropagation();
    const prompt = `Hola, soy ${agent.name}, especialista en ${agent.specialty}. ${agent.description}. ¿En qué puedes ayudarte hoy?`;
    const chatGPTUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
    window.open(chatGPTUrl, '_blank');
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty('--x', `${x}%`);
    e.currentTarget.style.setProperty('--y', `${y}%`);
  };

  return (
    <div 
      className="agent-card group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-white/20 dark:border-gray-700/30 p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2"
      onMouseMove={handleMouseMove}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'both' }}
    >
      <div className="relative flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
        <Avatar 
          name={agent.name}
          avatar={agent.avatar}
          size="md"
        />
        {agent.isNew && (
          <div className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-1 shadow-lg border-2 border-white dark:border-gray-800">
            <Zap className="w-2.5 h-2.5 text-white fill-current" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 dark:text-white truncate text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {agent.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-800/30">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">4.9</span>
          </div>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {agent.specialty}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(agent.id);
          }}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            isFavorite 
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105' 
              : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:bg-gray-700/50 dark:text-gray-500 dark:hover:bg-red-900/20'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={handleChatClick}
          className="p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 active:scale-95"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AgentCompactCard;