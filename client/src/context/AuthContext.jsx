import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulate checking auth status
  useEffect(() => {
    // In a real app, validate the token with the API. For local dev against the
    // Express server, set VITE_DEV_AUTH_TOKEN to match server DEV_AUTH_TOKEN when
    // ALLOW_DEV_AUTH=1 so admin CRUD requests include a recognized Bearer token.
    const devToken = import.meta.env.VITE_DEV_AUTH_TOKEN;
    if (import.meta.env.DEV && devToken) {
      localStorage.setItem('token', devToken);
    }

    const simulatedUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      isAdmin: true
    };

    setUser(simulatedUser);
    setLoading(false);
  }, []);

  const value = {
    user,
    isAdmin: user?.isAdmin || false,
    loading,
    login: (userData) => setUser(userData),
    logout: () => setUser(null)
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;