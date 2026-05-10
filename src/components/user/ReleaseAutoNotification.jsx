import React, { useState, useEffect } from 'react';
import { useReleaseNotes } from '../../hooks/useReleaseNotes';
import ReleaseNotesModal from './ReleaseNotesModal';

const ReleaseAutoNotification = () => {
  const { latestRelease, unreadCount, loading, markAsRead, allReleases } = useReleaseNotes();
  const [showModal, setShowModal] = useState(false);
  const [releaseToShow, setReleaseToShow] = useState(null);

  useEffect(() => {
    if (!loading && unreadCount > 0 && allReleases.length > 0) {
      // Find the first unread release (starting from the most recent)
      // Check if it hasn't been shown in this session (optional, but good for UX)
      const hasSeenSession = sessionStorage.getItem(`seen_release_${allReleases[0].id}`);
      
      if (!hasSeenSession) {
        setReleaseToShow(allReleases[0]);
        setShowModal(true);
        sessionStorage.setItem(`seen_release_${allReleases[0].id}`, 'true');
      }
    }
  }, [loading, unreadCount, allReleases]);

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
