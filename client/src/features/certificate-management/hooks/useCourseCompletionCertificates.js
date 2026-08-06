import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/shared/components/ui/Toast';
import { getIssuancesByUser } from '@/features/certificate-management/services/certificateService';

export function useCourseCompletionCertificates() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [issuances, setIssuances] = useState([]);

  const fetchByUser = useCallback(async (userId, status) => {
    setLoading(true);
    try {
      const { data } = await getIssuancesByUser(userId, { status, page: 1, limit: 50 });
      const rows = data?.data?.rows || [];
      setIssuances(rows);
      return rows;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch certificates');
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getCertificateForCourse = useCallback((userId, courseId) => {
    return issuances.find(issuance => issuance.course_id === courseId && issuance.status === 'active');
  }, [issuances]);

  return {
    loading,
    issuances,
    fetchByUser,
    getCertificateForCourse,
  };
}
