import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SOPPermissionContext = createContext(null);

export function SOPPermissionProvider({ children }) {
  const { user } = useAuth();
  const role = typeof user?.role === 'string' ? user.role : '';

  const permissions = useMemo(() => ({
    canCreate: ['super_admin', 'admin', 'department_head'].includes(role),
    canEdit: ['super_admin', 'admin', 'department_head'].includes(role),
    canPublish: ['super_admin', 'admin', 'department_head'].includes(role),
    canShare: ['super_admin', 'admin', 'department_head'].includes(role),
    canApprove: ['super_admin', 'admin', 'department_head'].includes(role),
  }), [role]);

  return <SOPPermissionContext.Provider value={permissions}>{children}</SOPPermissionContext.Provider>;
}

export function useSOPPermission() {
  const context = useContext(SOPPermissionContext);
  if (!context) {
    throw new Error('useSOPPermission must be used within SOPPermissionProvider');
  }
  return context;
}

export default SOPPermissionContext;
