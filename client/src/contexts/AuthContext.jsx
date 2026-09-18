import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import * as session from '@/services/session';

const AuthContext = createContext(null);

function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  return role.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeUser(userData) {
  if (!userData || typeof userData !== 'object') {
    return userData;
  }

  const rawRole = userData.role;
  const normalizedRole = typeof rawRole === 'string'
    ? normalizeRole(rawRole)
    : (rawRole && typeof rawRole === 'object'
      ? normalizeRole(rawRole.name || rawRole.role || '')
      : '');

  return {
    ...userData,
    role: normalizedRole,
    permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
    permission_details: Array.isArray(userData.permission_details) ? userData.permission_details : [],
    scoped_department_ids: Array.isArray(userData.scoped_department_ids) ? userData.scoped_department_ids : [],
    business_id: userData.business_id || null,
    department_id: userData.department_id || null,
    department_business_id: userData.department_business_id || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const currentSession = session.getCurrentSession();

    if (currentSession?.token && currentSession?.user) {
      try {
        api.get('/auth/profile', { skipAuthRedirect: true })
          .then(response => {
            if (response.data?.status === 'success' && response.data?.data) {
              const verifiedUser = normalizeUser(response.data.data);
              session.saveCurrentSession(currentSession.token, verifiedUser);
              setUser(verifiedUser);
            } else {
              throw new Error('Invalid response');
            }
          })
          .catch((authError) => {
            const status = authError.response?.status;
            if (status === 401) {
              session.clearCurrentSession();
              setUser(null);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      } catch {
        session.clearCurrentSession();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password }, { skipAuthRedirect: true });

      if (response.data?.status === 'success') {
        const { token, refreshToken, user: userData } = response.data.data || {};
        if (!token || !userData) {
          throw new Error('Invalid login response');
        }
        const normalizedUser = normalizeUser(userData);
        session.saveCurrentSession(token, normalizedUser, refreshToken);
        setUser(normalizedUser);
        return { success: true, user: normalizedUser };
      }

      const message = response.data?.message || 'Login failed';
      throw new Error(message);
    } catch (err) {
      const data = err.response?.data || {};
      const code = data.code;
      let message = data.message || err.message || 'Login failed';

      if (code === 'ACCOUNT_LOCKED') {
        const retryAfter = data.retryAfter;
        if (retryAfter) {
          const minutes = Math.ceil(retryAfter / 60000);
          message = `Account is locked. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        }
      }

      setError(message);
      return { success: false, error: message, code: code || 'UNKNOWN_ERROR' };
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setError(null);

    try {
      const response = await api.post('/auth/forgot-password', { email }, { skipAuthRedirect: true });
      return { success: response.data.status === 'success', message: response.data.message };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Request failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    setError(null);

    try {
      const response = await api.post('/auth/reset-password', { token, password }, { skipAuthRedirect: true });
      if (response.data.status === 'success') {
        return { success: true, message: response.data.message };
      }
      throw new Error(response.data.message || 'Password reset failed');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Password reset failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session.getCurrentRefreshToken();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken }, { skipAuthRedirect: true });
      } catch {
        // ignore logout errors
      }
    }

    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription();
      if (sub?.endpoint) {
      const token = session.getCurrentToken();
      if (token) {
        await fetch('/api/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
        await sub.unsubscribe();
      }
    } catch {
      // ignore push cleanup errors during logout
    }

    session.clearCurrentSession();
    setUser(null);
    setError(null);
  }, []);

  const switchSession = useCallback((tabId) => {
    if (session.switchSession(tabId)) {
      const current = session.getCurrentSession();
      if (current?.user) {
        setUser(normalizeUser(current.user));
      }
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const currentSession = session.getCurrentSession();
      if (currentSession?.token) {
        session.saveCurrentSession(currentSession.token, updated);
      }
      return updated;
    });
  }, []);

  const listSessions = useCallback(() => session.listSessions(), []);

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isDepartmentHead = user?.role === 'department_head';
  const isEmployee = user?.role === 'employee';
  const isAnyAdmin = ['super_admin', 'admin', 'department_head'].includes(user?.role);
  const permissions = user?.permissions || [];
  const permissionDetails = user?.permission_details || [];
  const scopedDepartmentIds = user?.scoped_department_ids || [];
  const businessId = user?.business_id || null;

  const hasPermission = useCallback((permission) => {
    if (!permission || !Array.isArray(permissions)) return false;
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  }, [permissions, isSuperAdmin]);

  const hasPermissionAction = useCallback((permission, action) => {
    if (!permission || !action || !Array.isArray(permissionDetails)) return false;
    if (isSuperAdmin) return true;
    const detail = permissionDetails.find((d) => d.name === permission);
    if (!detail || !Array.isArray(detail.actions)) return false;
    return detail.actions.includes(action);
  }, [permissionDetails, isSuperAdmin]);

  const canCreateSops = isSuperAdmin || isAdmin || isDepartmentHead || hasPermission('create_sops');

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      switchSession,
      listSessions,
      updateUser,
      isAuthenticated,
      isSuperAdmin,
      isAdmin,
      isDepartmentHead,
      isEmployee,
      isAnyAdmin,
      canCreateSops,
      permissions,
      permission_details: permissionDetails,
      scopedDepartmentIds,
      businessId,
      hasPermission,
      hasPermissionAction,
      setError,
      forgotPassword,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthContext;