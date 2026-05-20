import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '@/services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * Manages authentication state and provides auth methods
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (id_number, password) => {
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { id_number, password });

      if (response.data.status === 'success') {
        const { token, user: userData } = response.data.data;

        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        return { success: true, user: userData };
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
  const isAdmin = user?.role === 'admin';
  const isAnyAdmin = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'].includes(user?.role);
  const isUnitAdmin = ['admin_arsen', 'admin_group', 'admin_squadron'].includes(user?.role);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      isAnyAdmin,
      isUnitAdmin,
      setError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook
 * Access auth state and methods
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthContext;
