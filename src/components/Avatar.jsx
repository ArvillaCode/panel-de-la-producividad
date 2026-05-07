import React, { useState } from 'react';

const Avatar = ({ name, avatar, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);
  // Función para generar iniciales del nombre
  const generateInitials = (name) => {
    if (!name) return 'AG';
    
    // Remover la palabra "Agente" y conectores comunes
    const cleanName = name
      .replace(/agente\s+/gi, '')
      .replace(/\s+de\s+/gi, ' ')
      .replace(/\s+del\s+/gi, ' ')
      .replace(/\s+para\s+/gi, ' ')
      .replace(/\s+en\s+/gi, ' ')
      .replace(/\s+y\s+/gi, ' ')
      .replace(/\s+–\s+/gi, ' ')
      .replace(/\s+-\s+/gi, ' ')
      .trim();
    
    const words = cleanName.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return 'AG';
    
    // Tomar 2-3 letras iniciales dependiendo del número de palabras
    if (words.length === 1) {
      // Si es una sola palabra, tomar las primeras 2-3 letras
      return words[0].substring(0, Math.min(3, words[0].length)).toUpperCase();
    } else if (words.length === 2) {
      // Si son dos palabras, tomar la primera letra de cada una
      return (words[0][0] + words[1][0]).toUpperCase();
    } else {
      // Si son tres o más palabras, tomar la primera letra de las primeras tres
      return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).toUpperCase();
    }
  };

  // Función para generar color de fondo basado en el nombre
  const generateColor = (name) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-violet-500',
      'bg-rose-500',
      'bg-amber-500',
      'bg-lime-500',
      'bg-sky-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Definir tamaños
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg'
  };

  const initials = generateInitials(name);
  const bgColor = generateColor(name);

  if (avatar && !imageError) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;