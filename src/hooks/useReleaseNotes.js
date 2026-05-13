import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useReleaseNotes = () => {
  const { user } = useAuth();
  const [latestRelease, setLatestRelease] = useState(null);
  const [allReleases, setAllReleases] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Timeout de seguridad de 5 segundos
    const timeout = setTimeout(() => {
      setLoading(false);
      if (allReleases.length === 0) {
        setError('Tiempo de espera agotado al conectar con el servidor.');
      }
    }, 5000);

    try {
      const { data: releases, error: releasesError } = await supabase
        .from('release_notes')
        .select('*')
        .eq('is_visible', true)
        .order('publish_date', { ascending: false });

      if (releasesError) throw releasesError;

      setAllReleases(releases || []);
      if (releases && releases.length > 0) {
        setLatestRelease(releases[0]);
      }

      if (user) {
        const { data: readData, error: readError } = await supabase
          .from('user_release_reads')
          .select('release_id')
          .eq('user_id', user.id);

        if (readError) throw readError;

        const readIds = new Set(readData.map(r => r.release_id));
        
        // Un usuario nuevo solo ve novedades publicadas DESPUÉS de su fecha de creación (Zero State)
        // Intentamos obtener la fecha de creación del perfil o del objeto de usuario
        const userCreatedAt = user.created_at || user.user_metadata?.created_at;
        
        const unread = (releases || []).filter(r => {
          const isUnread = !readIds.has(r.id);
          const isNewerThanUser = userCreatedAt ? new Date(r.publish_date) > new Date(userCreatedAt) : true;
          return isUnread && isNewerThanUser;
        });
        
        setUnreadCount(unread.length);
      }
    } catch (err) {
      console.error('[useReleaseNotes] Error:', err);
      setError(err.message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [user, allReleases.length]);

  const markAsRead = async (releaseId) => {
    if (!user) return;
    try {
      const { error: readError } = await supabase
        .from('user_release_reads')
        .upsert({ user_id: user.id, release_id: releaseId, read_at: new Date().toISOString() });

      if (readError) throw readError;

      // Update local state
      setUnreadCount(prev => Math.max(0, prev - 1));
      return { success: true };
    } catch (err) {
      console.error('[useReleaseNotes] Mark as read error:', err);
      return { success: false, error: err.message };
    }
  };

  const markAllAsRead = async () => {
    if (!user || allReleases.length === 0) return;
    try {
      const records = allReleases.map(r => ({
        user_id: user.id,
        release_id: r.id,
        read_at: new Date().toISOString()
      }));

      const { error: readError } = await supabase
        .from('user_release_reads')
        .upsert(records);

      if (readError) throw readError;

      setUnreadCount(0);
      return { success: true };
    } catch (err) {
      console.error('[useReleaseNotes] Mark all as read error:', err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  return {
    latestRelease,
    allReleases,
    unreadCount,
    loading,
    error,
    fetchReleases,
    markAsRead,
    markAllAsRead
  };
};
