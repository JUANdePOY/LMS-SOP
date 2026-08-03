import { useState, useCallback } from 'react';
import {
  issueCertificate,
  getIssuancesByUser,
  getIssuanceByCertificateNumber,
  revokeIssuance,
} from '@/features/certificate-management/services/certificateService';
import { useToast } from '@/shared/components/ui/Toast';

export function useIssuances() {
  const { toast } = useToast();
  const [issuances, setIssuances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const fetchByUser = useCallback(async (userId, status) => {
    setLoading(true);
    try {
      const { data } = await getIssuancesByUser(userId, { status, page, limit });
      setIssuances(data?.data?.rows || []);
      setTotal(data?.data?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit]);

  const handleIssue = async (payload) => {
    setIssuing(true);
    try {
      const { data } = await issueCertificate(payload);
      toast.success('Certificate issued successfully');
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to issue certificate';
      toast.error(message);
      throw err;
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      const { data } = await revokeIssuance(id);
      toast.success('Certificate revoked successfully');
      setIssuances(prev => prev.map(item =>
        item.id === id ? { ...item, status: 'revoked', revoked_at: new Date().toISOString() } : item
      ));
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to revoke certificate';
      toast.error(message);
      throw err;
    }
  };

  return {
    issuances,
    loading,
    issuing,
    total,
    page,
    setPage,
    fetchByUser,
    handleIssue,
    handleRevoke,
  };
}

export function useVerifyCertificate() {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const verify = useCallback(async (certificateNumber) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getIssuanceByCertificateNumber(certificateNumber);
      setCertificate(data?.data || null);
      return data?.data || null;
    } catch (err) {
      const message = err.response?.data?.message || 'Certificate not found';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    certificate,
    loading,
    error,
    verify,
    setError,
  };
}
