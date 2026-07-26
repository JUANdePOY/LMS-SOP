import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/services/api';

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
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(normalizeUser(parsedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password }, { skipAuthRedirect: true });

      if (response.data.status === 'success') {
        const { token, user: userData } = response.data.data;
        const normalizedUser = normalizeUser(userData);

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

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