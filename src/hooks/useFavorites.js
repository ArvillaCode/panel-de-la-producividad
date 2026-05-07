import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState(new Set());
  const { user } = useAuth();

  // Cargar favoritos de Supabase cuando el usuario inicie sesión
  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      return;
    }

    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('agent_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setFavorites(new Set(data.map(f => f.agent_id)));
      } else if (error) {
        console.error('Error cargando favoritos de Supabase:', error.message);
      }
    };

    fetchFavorites();
  }, [user]);

  // Alternar favorito en la nube de forma optimista (UI rápida)
  const toggleFavorite = async (agentId) => {
    if (!user) {
      alert("Debes iniciar sesión para guardar favoritos.");
      return;
    }

    const isFav = favorites.has(agentId);

    // 1. Actualización optimista de la UI (para que el corazón cambie al instante)
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (isFav) {
        newFavorites.delete(agentId);
      } else {
        newFavorites.add(agentId);
      }
      return newFavorites;
    });

    // 2. Operación real en la base de datos en segundo plano
    if (isFav) {
      // Eliminar de favoritos
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .match({ user_id: user.id, agent_id: agentId });
        
      if (error) console.error("Error al quitar favorito:", error.message);
    } else {
      // Agregar a favoritos
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, agent_id: agentId });
        
      if (error) console.error("Error al guardar favorito:", error.message);
    }
  };

  const isFavorite = (agentId) => {
    return favorites.has(agentId);
  };

  const getFavoriteAgents = (agents) => {
    return agents.filter(agent => favorites.has(agent.id));
  };

  const getFavoritesCount = () => {
    return favorites.size;
  };

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoriteAgents,
    getFavoritesCount
  };
};