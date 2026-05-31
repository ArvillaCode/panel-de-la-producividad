import { useMemo } from 'react';
import { useAuth } from '../../../../hooks/useAuth.jsx';
import { Course } from '../services/academyService';

export function useAcademyPermissions() {
  const { isAdmin, profile } = useAuth();

  const hasPremiumAccess = useMemo(() => {
    if (isAdmin) return true;
    const plan = profile?.plan?.toLowerCase();
    return plan === 'annual' || plan === 'monthly' || plan === 'trial';
  }, [isAdmin, profile?.plan]);

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
