import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader } from 'lucide-react';

const ADMIN_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();

  const [id_number, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && user?.role) {
      const redirectPath = ADMIN_ROLES.includes(user.role) ? '/' : '/landing';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!id_number || !password) {
      setError('Please enter ID Number and password');
      setLoading(false);
      return;
    }

    const result = await login(id_number, password);

    if (result.success) {
      const redirectPath = ADMIN_ROLES.includes(result.user?.role) ? '/' : '/landing';
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-800 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-8 shadow-lg">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              PAFR System
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Personnel & Attendance Force Readiness
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex gap-3 rounded-md bg-red-50 dark:bg-red-950/30 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                ID Number
              </label>
              <input
                type="text"
                value={id_number}
                onChange={(e) => setIdNumber(e.target.value)}
                disabled={loading}
                placeholder="Enter your ID Number"
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 font-medium text-white transition-colors duration-200 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-8 border-t border-neutral-200 dark:border-neutral-700 pt-6">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
              Development credentials:
            </p>
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300 text-center font-mono">
              ID Number: ADMIN-001
            </p>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 text-center font-mono">
              Password: AdminPass123!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-neutral-600 dark:text-neutral-400">
          <p>© 2026 Air Force Reservists System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
