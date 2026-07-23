import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader, Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';

const LMS_ROLES = ['super_admin', 'admin', 'department_head', 'employee'];

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && !authLoading && user?.role) {
      const redirectPath = LMS_ROLES.includes(user.role) ? '/' : '/profile';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter your email and password.');
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      const redirectPath = LMS_ROLES.includes(result.user?.role) ? '/' : '/profile';
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-logo-icon">
              <GraduationCap size={32} />
            </div>
            <h1 className="login-card-title">SOP TRAINING PLATFORM</h1>
            <p className="login-card-subtitle">
              Learning Management System for Standard Operating Procedures
            </p>
          </div>

          <div className="login-card-body">
            {error && (
              <div className="login-error">
                <AlertCircle className="login-error-icon h-4 w-4" />
                <p className="login-error-text">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="login-field">
                <label className="login-label">Email Address</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="you@organization.com"
                    className="login-input"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="••••••••"
                    className="login-input"
                    style={{ paddingRight: '2.75rem' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-btn"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          <div className="login-card-footer">
            <p className="login-footer-text">
              © {new Date().getFullYear()} SOP Training Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}