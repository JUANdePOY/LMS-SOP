import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import * as session from '@/services/session';

const AuthContext = createContext(null);

function normalizeUser(userData) {
  if (!userData || typeof userData !== 'object') {
    return userData;
  }

  const rawRole = userData.role;
  const normalizedRole = typeof rawRole === 'string'
    ? rawRole
    : (rawRole && typeof rawRole === 'object' ? (rawRole.name || rawRole.role || '') : '');

  return {
    ...userData,
    role: normalizedRole,
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
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password }, { skipAuthRedirect: true });

      if (response.data.status === 'success') {
        const { token, user: userData } = response.data.data;
        const normalizedUser = normalizeUser(userData);

        session.saveCurrentSession(token, normalizedUser);

        setUser(normalizedUser);
        return { success: true, user: normalizedUser };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
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

  const listSessions = useCallback(() => session.listSessions(), []);

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isDepartmentHead = user?.role === 'department_head';
  const isEmployee = user?.role === 'employee';
  const isAnyAdmin = ['super_admin', 'admin', 'department_head'].includes(user?.role);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      switchSession,
      listSessions,
      isAuthenticated,
      isSuperAdmin,
      isAdmin,
      isDepartmentHead,
      isEmployee,
      isAnyAdmin,
      setError,
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