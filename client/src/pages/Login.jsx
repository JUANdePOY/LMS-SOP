import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader, Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

const LMS_ROLES = ['super_admin', 'admin', 'department_head', 'employee'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { login, forgotPassword, resetPassword, isAuthenticated, loading: authLoading, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading && user?.role) {
      const redirectPath = sessionStorage.getItem('sop_share_redirect') || (LMS_ROLES.includes(user.role) ? '/' : '/profile');
      sessionStorage.removeItem('sop_share_redirect');
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, user?.role]);

  const validateLoginFields = () => {
    const errors = { email: '', password: '' };
    let hasError = false;

    if (!email.trim()) {
      errors.email = 'Email is required';
      hasError = true;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
      hasError = true;
    }

    if (!password) {
      errors.password = 'Password is required';
      hasError = true;
    }

    setFieldErrors(errors);
    return !hasError;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ email: '', password: '' });

    if (!validateLoginFields()) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password);

      if (result?.success) {
        const redirectPath = sessionStorage.getItem('sop_share_redirect') || (LMS_ROLES.includes(result.user?.role) ? '/' : '/profile');
        sessionStorage.removeItem('sop_share_redirect');
        navigate(redirectPath, { replace: true });
      } else {
        const message = result?.error || 'Login failed. Please try again.';
        setError(message);
      }
    } catch (unexpectedError) {
      console.error('Login handler unexpected error', unexpectedError);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ email: '', password: '' });

    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: 'Email is required' }));
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setFieldErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email.trim());
    if (result.success) {
      setResetSent(true);
    } else {
      setError(result.error || 'Request failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-card-header">
            <img
              src="/login.png"
              alt="SOP Training Platform"
              className="login-logo"
            />
            <h1 className="login-card-title">SOP LMS PLATFORM</h1>
          </div>

          <div className="login-card-body">
            {error && (
              <div className="login-error">
                <AlertCircle className="login-error-icon h-4 w-4" />
                <p className="login-error-text">{error}</p>
              </div>
            )}

            {!forgotMode ? (
              <div>
                <div className="login-field">
                  <label className="login-label">Email Address</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLogin(e);
                        }
                      }}
                      disabled={loading}
                      placeholder="you@organization.com"
                      className={`login-input${fieldErrors.email ? ' login-input-error' : ''}`}
                      autoComplete="email"
                    />
                  </div>
                  {fieldErrors.email && <p className="login-field-error">{fieldErrors.email}</p>}
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLogin(e);
                        }
                      }}
                      disabled={loading}
                      placeholder="••••••••"
                      className={`login-input${fieldErrors.password ? ' login-input-error' : ''}`}
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
                  {fieldErrors.password && <p className="login-field-error">{fieldErrors.password}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
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

              </div>
            ) : (
              <div>
                {resetSent ? (
                  <div className="login-success-box">
                    <p>If an account with that email exists, a password reset link has been sent.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(false);
                        setResetSent(false);
                        setError('');
                      }}
                      className="login-btn login-btn-secondary"
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="login-field">
                      <label className="login-label">Email Address</label>
                      <div className="login-input-wrap">
                        <span className="login-input-icon">
                          <Mail size={15} />
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleForgotPassword(e);
                            }
                          }}
                          disabled={loading}
                          placeholder="you@organization.com"
                          className={`login-input${fieldErrors.email ? ' login-input-error' : ''}`}
                          autoComplete="email"
                        />
                      </div>
                      {fieldErrors.email && <p className="login-field-error">{fieldErrors.email}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="login-btn"
                    >
                      {loading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Sending reset link…</span>
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(false);
                        setResetSent(false);
                        setError('');
                      }}
                      disabled={loading}
                      className="login-forgot-btn"
                    >
                      Back to Sign In
                    </button>
                  </>
                )}
              </div>
            )}
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
