import React, { useState, useEffect } from 'react';
import { Star, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

const AgentRating = ({ agentId, userId }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkExistingRating = async () => {
      if (!userId || !agentId) return;
      const { data, error } = await supabase
        .from('agent_ratings')
        .select('rating, feedback')
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data) {
        setRating(data.rating);
        setFeedback(data.feedback || '');
        setHasRated(true);
      }
    };
    checkExistingRating();
  }, [agentId, userId]);

  const handleRate = async (value) => {
    if (loading || hasRated) return; 
    
    if (rating === value) {
      setRating(0);
      setShowFeedbackInput(false);
      return;
    }

    setRating(value);
    setShowFeedbackInput(true);
  };

  const submitRating = async () => {
    if (loading || hasRated) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('agent_ratings')
        .upsert({ 
          agent_id: agentId, 
          user_id: userId, 
          rating: rating,
          feedback: feedback.trim() || null
        }, { onConflict: 'agent_id, user_id' });

      if (!error) {
        setHasRated(true);
        setShowFeedbackInput(false);
        toast('¡Gracias por tu calificación!');
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
    <div className="flex flex-col items-center gap-3 mt-6 p-4 bg-white/5 dark:bg-gray-800/40 rounded-[2rem] border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-1">
        {!hasRated && (
          <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-[0.2em] mb-1">
            Calificar Agente
          </p>
        )}
        <div className={`flex items-center gap-1.5 ${hasRated ? 'pointer-events-none' : ''}`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={loading || hasRated}
              onMouseEnter={() => !hasRated && setHover(star)}
              onMouseLeave={() => !hasRated && setHover(0)}
              onClick={() => handleRate(star)}
              className={`group relative transition-all duration-300 ${!loading && !hasRated ? 'hover:scale-125 active:scale-90' : 'cursor-default opacity-100'}`}
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hover || rating)
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                    : 'text-gray-300 dark:text-gray-700'
                } transition-all duration-300`}
              />
              {!hasRated && star <= (hover || rating) && (
                 <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {showFeedbackInput && !hasRated && (
        <div className="w-full space-y-3 animate-in zoom-in-95 duration-300 mt-2">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="¿Qué te pareció este agente? (Opcional)"
            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-all resize-none h-20"
          />
          <button
            onClick={submitRating}
            disabled={loading || rating === 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmar Voto'}
          </button>
        </div>
      )}

      {hasRated && (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
          <div className="bg-green-500/20 p-1.5 rounded-full border border-green-500/30">
            <Check className="w-3 h-3 text-green-400" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentRating;
