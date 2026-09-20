import { useEffect } from 'react';
import { useToast } from '@/shared/components/ui/Toast';

const ERROR_CODES = new Set(['PERMISSION_DENIED', 'ENTITY_ACCESS_DENIED', 'ACCESS_DENIED']);

export default function GlobalApiErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (event) => {
      const error = event?.detail?.error;
      if (!error || !error.response) return;
      const code = error.response?.data?.code;
      if (!ERROR_CODES.has(code)) return;
      const message = error.response?.data?.message || error.message || 'Access denied';
      toast.error(message);
    };

    window.addEventListener('app:api-error', handler);
    return () => window.removeEventListener('app:api-error', handler);
  }, [toast]);

  return null;
}
