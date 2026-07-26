import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function normalizeRole(role) {
  if (typeof role === 'string') return role;
  if (role && typeof role === 'object') return role.name || role.role || '';
  return '';
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const normalizedRole = normalizeRole(user?.role);
  const normalizedAllowedRoles = Array.isArray(allowedRoles) ? allowedRoles.filter(Boolean) : [];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
