import React from 'react';
import { MessageCircle, Heart, Shield, Star, Zap, Sparkles } from 'lucide-react';
import Avatar from './Avatar';
import AgentRating from './user/AgentRating';
import { useAuth } from '../hooks/useAuth';

const AgentCard = ({ agent, isFavorite, onToggleFavorite, animationDelay = 0, onChatClick }) => {
  const { user } = useAuth();
  const handleChatClick = (e) => {
    if (e) e.stopPropagation();
    
    // Always call onChatClick to track interactions in Supabase
    if (typeof onChatClick === 'function') {
      onChatClick();
    }
    
    // Si no tiene chatLink en AgentPanel, aquí nos aseguramos de que abra algo
    if (!agent.chatLink) {
      const prompt = `Hola, soy ${agent.name}, especialista en ${agent.specialty}. ${agent.description}. ¿En qué puedes ayudarte hoy?`;
      const chatGPTUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
      window.open(chatGPTUrl, '_blank');
    }
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

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty('--x', `${x}%`);
    e.currentTarget.style.setProperty('--y', `${y}%`);
  };

  return (
    <div 
      className="group relative glass-card p-5 glass-card-hover flex flex-col h-full overflow-hidden animate-fade-in-up"
      onMouseMove={handleMouseMove}
      style={{ 
        animationDelay: `${animationDelay}ms`, 
        animationFillMode: 'both' 
      }}
    >
      <div className="absolute top-3 right-3 z-30 flex gap-2 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(agent.id);
          }}
          title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          className={`p-2.5 rounded-xl transition-all duration-300 backdrop-blur-md ${
            isFavorite 
              ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/30 scale-110' 
              : 'bg-white/10 dark:bg-black/20 text-gray-400 hover:text-red-500 border border-white/10'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-5 md:p-6 flex flex-col flex-1 relative z-10">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative">
            <Avatar 
              name={agent.name}
              avatar={agent.avatar}
              size="lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-neon-teal w-4 h-4 rounded-full border-2 border-white dark:border-deep-dark neon-glow shadow-sm"></div>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 dark:text-white truncate text-base md:text-lg tracking-tight group-hover:neon-text transition-colors">
                {agent.name}
              </h3>
              {agent.isNew && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-neon-teal/10 text-neon-teal text-[10px] font-bold rounded-full border border-neon-teal/20 uppercase tracking-wider neon-glow">
                  <Zap className="w-2.5 h-2.5 fill-current" /> Nuevo
                </span>
              )}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-white/10 bg-white/5 text-gray-600 dark:text-gray-300 shadow-sm">
              {agent.category}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-bold text-neon-teal mb-2 flex items-center gap-1.5 uppercase tracking-wide neon-glow">
            <Shield className="w-3.5 h-3.5" />
            {agent.specialty}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {agent.description}
          </p>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pb-3 border-b border-white/10">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neon-teal" /> IA Certificada
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-neon-teal text-neon-teal neon-glow" /> 4.9/5
            </span>
          </div>
          {user && (
            <AgentRating 
              agentId={agent.id} 
              userId={user.id} 
            />
          )}
          
          <button
            onClick={handleChatClick}
            title={`Iniciar conversación con ${agent.name}`}
            className="w-full group/btn relative flex items-center justify-center gap-3 py-4 bg-white/5 dark:bg-white/5 border border-white/10 dark:hover:border-neon-teal/50 hover:bg-neon-teal hover:text-deep-dark text-gray-800 dark:text-white rounded-2xl font-bold transition-all duration-500 shadow-xl overflow-hidden group"
          >
            <div className="absolute inset-0 bg-neon-teal opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <MessageCircle className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" />
            <span className="relative z-10">Chatear con {agent.name.split(' ')[0]}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;