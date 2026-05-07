import React from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import Avatar from './Avatar';

const AgentCompactCard = ({ agent, isFavorite, onToggleFavorite, animationDelay = 0 }) => {
  const getCategoryColor = (category) => {
    const colors = {
      'Salud': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Tecnología': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Educación': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Negocios': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'Gastronomía': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'Diseño': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'Arte': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const handleChatClick = () => {
    const prompt = `Hola, soy ${agent.name}, especialista en ${agent.specialty}. ${agent.description}. ¿En qué puedo ayudarte hoy?`;
    const chatGPTUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
    window.open(chatGPTUrl, '_blank');
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-4 border border-gray-200 dark:border-gray-700"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center gap-4">
        <Avatar 
          name={agent.name}
          avatar={agent.avatar}
          size="lg"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{agent.name}</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">{agent.specialty}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{agent.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(agent.category)}`}>
            {agent.category}
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={() => onToggleFavorite(agent.id)}
              className={`p-2 rounded-full transition-colors ${
                isFavorite 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={handleChatClick}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCompactCard;