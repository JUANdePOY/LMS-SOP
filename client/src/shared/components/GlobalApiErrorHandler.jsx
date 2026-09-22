import { useEffect } from 'react';
import { useToast } from '@/shared/components/ui/Toast';

const ERROR_CODES = new Set([
  'PERMISSION_DENIED',
  'ENTITY_ACCESS_DENIED',
  'ACCESS_DENIED',
  'FORBIDDEN',
  'BUSINESS_SCOPE_DENIED',
  'DEPT_OUT_OF_BUSINESS_SCOPE',
  'DEPT_SCOPE_DENIED',
  'SUPER_ADMIN_REQUIRED',
  'ADMIN_REQUIRED',
  'DEPT_HEAD_REQUIRED',
  'ADMIN_ARSEN_REQUIRED',
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_LOCKED',
  'OUT_OF_SCOPE',
  'USE_SELF_SERVICE',
]);

export default function GlobalApiErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (event) => {
      const error = event?.detail?.error;
      if (!error || !error.response) return;
      const status = error.response?.status;
      const code = error.response?.data?.code;

      if (status === 403 || ERROR_CODES.has(code)) {
        const message = error.response?.data?.message || error.message || 'You don\'t have permission to perform this action.';
        toast.error(message);
      }
    };

    window.addEventListener('app:api-error', handler);
    return () => window.removeEventListener('app:api-error', handler);
  }, [toast]);

  return null;
}
