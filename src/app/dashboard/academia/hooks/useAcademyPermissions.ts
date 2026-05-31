import { useMemo } from 'react';
import { useAuth } from '../../../../hooks/useAuth.jsx';
import { Course } from '../services/academyService';

export function useAcademyPermissions() {
  const { isAdmin, profile, hasPremiumAccess } = useAuth();

  const canAccessCourse = (course: Course | null): boolean => {
    if (!course) return false;
    if (!course.is_premium) return true;
    return hasPremiumAccess;
  };

  return {
    isAdmin,
    profile,
    hasPremiumAccess,
    canAccessCourse
  };
}
