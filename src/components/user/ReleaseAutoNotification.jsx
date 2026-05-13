import React, { useState, useEffect } from 'react';
import { useReleaseNotes } from '../../hooks/useReleaseNotes';
import ReleaseNotesModal from './ReleaseNotesModal';
import { useAuth } from '../../hooks/useAuth';

const ReleaseAutoNotification = () => {
  const { user } = useAuth();
  const { latestRelease, unreadCount, loading, markAsRead, allReleases } = useReleaseNotes();
  const [showModal, setShowModal] = useState(false);
  const [releaseToShow, setReleaseToShow] = useState(null);

  useEffect(() => {
    if (!user) {
      setShowModal(false);
      return;
    }
    
    // TAREA: Desactivar auto-modal de novedades (Zero State)
    // El modal ahora solo se abre manualmente desde el sidebar/panel.
    /*
    if (!loading && unreadCount > 0 && allReleases.length > 0) {
      const hasSeenSession = sessionStorage.getItem(`seen_release_${allReleases[0].id}`);
      
      if (!hasSeenSession) {
        // setReleaseToShow(allReleases[0]);
        // setShowModal(true);
        sessionStorage.setItem(`seen_release_${allReleases[0].id}`, 'true');
      }
    }
    */
  }, [loading, unreadCount, allReleases, user]);

  if (!showModal || !releaseToShow) return null;

  return (
    <ReleaseNotesModal
      release={releaseToShow}
      onClose={() => setShowModal(false)}
      onMarkAsRead={(id) => markAsRead(id)}
    />
  );
};

export default ReleaseAutoNotification;
