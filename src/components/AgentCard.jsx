import React from 'react';
import { MessageCircle, User, Sparkles, Heart } from 'lucide-react';
import Avatar from './Avatar';

const AgentCard = ({ agent, onChatClick, isFavorite, onToggleFavorite, animationDelay = 0 }) => {
  const getCategoryColor = (category) => {
    const colors = {
      'Salud': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Tecnología': 'bg-blue-100 text-blue-800 border-blue-200',
      'Educación': 'bg-purple-100 text-purple-800 border-purple-200',
      'Negocios': 'bg-orange-100 text-orange-800 border-orange-200',
      'Gastronomía': 'bg-red-100 text-red-800 border-red-200',
      'Diseño': 'bg-pink-100 text-pink-800 border-pink-200',
      'Arte': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div 
      className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 overflow-hidden animate-stagger"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/30 group-hover:to-purple-50/30 transition-all duration-300 pointer-events-none" />
      
      {/* Card content */}
      <div className="relative p-6">
        {/* Header with avatar and category */}
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="ring-3 ring-white shadow-lg group-hover:ring-blue-100 transition-all duration-300 rounded-full">
              <Avatar 
                name={agent.name}
                avatar={agent.avatar}
                size="lg"
                className="group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white shadow-sm">
              <div className="w-full h-full bg-green-400 rounded-full animate-pulse" />
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(agent.category)}`}>
              {agent.category}
            </span>
            
            {/* Favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(agent.id);
              }}
              className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                isFavorite 
                  ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400'
              }`}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart 
                className={`w-4 h-4 transition-all duration-200 ${
                  isFavorite ? 'fill-current' : ''
                }`} 
              />
            </button>
          </div>
        </div>

        {/* Agent info */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors duration-200">
            {agent.name}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <p className="text-sm font-medium text-blue-600">
              {agent.specialty}
            </p>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {agent.description}
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => onChatClick(agent)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-lg transform group-hover:-translate-y-0.5"
        >
          <MessageCircle className="w-4 h-4" />
          Iniciar Chat
        </button>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-pink-100/20 to-yellow-100/20 rounded-full translate-y-8 -translate-x-8 group-hover:scale-125 transition-transform duration-500" />
    </div>
  );
};

export default AgentCard;