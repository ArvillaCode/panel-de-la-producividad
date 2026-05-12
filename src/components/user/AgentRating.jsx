import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AgentRating = ({ agentId, userId, initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const checkExistingRating = async () => {
      if (!userId || !agentId) return;
      const { data, error } = await supabase
        .from('agent_ratings')
        .select('rating')
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setRating(data.rating);
        setHasRated(true);
      }
    };
    checkExistingRating();
  }, [agentId, userId]);

  const handleRate = async (value) => {
    if (hasRated || loading) return;
    
    setLoading(true);
    setRating(value);

    try {
      const { error } = await supabase
        .from('agent_ratings')
        .upsert({ 
          agent_id: agentId, 
          user_id: userId, 
          rating: value 
        }, { onConflict: 'agent_id, user_id' });

      if (!error) {
        setHasRated(true);
      } else {
        console.error('Error saving rating:', error);
      }
    } catch (err) {
      console.error('Rating error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-4 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700/50">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {hasRated ? 'Tu Calificación' : '¿Te fue útil?'}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={hasRated || loading}
            onMouseEnter={() => !hasRated && setHover(star)}
            onMouseLeave={() => !hasRated && setHover(0)}
            onClick={() => handleRate(star)}
            className={`transition-all duration-200 ${!hasRated && !loading ? 'hover:scale-125 active:scale-95' : 'cursor-default'}`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= (hover || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
      {hasRated && (
        <span className="text-[10px] text-green-500 font-bold animate-in fade-in duration-500">
          ¡Gracias por tu feedback!
        </span>
      )}
    </div>
  );
};

export default AgentRating;
