import React from 'react';
import { useReleaseNotes } from '../../hooks/useReleaseNotes';

const ReleaseNotesBadge = () => {
  const { unreadCount, loading } = useReleaseNotes();

  if (loading || unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-gray-900 animate-pulse">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
};

export default ReleaseNotesBadge;
