import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../components/Auth.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-glow-1" />
        <div className="auth-glow-2" />

        <div className="auth-brand-top">
          <div className="auth-brand-icon">K</div>
          <span>Kaarigar</span>
        </div>

        <div className="auth-brand-mid">
          <h2>Bringing marginalized artisans to a global marketplace.</h2>
          <p>
            AI-drafted catalog listings, fair dynamic pricing, and bulk-order
            clustering — built for craftspeople who deserve to be seen.
          </p>
          <ul className="auth-brand-points">
            <li><span className="dot">📷</span> Photo &amp; voice cataloging in seconds</li>
            <li><span className="dot">₹</span> Fair, AI-assisted pricing suggestions</li>
            <li><span className="dot">🤝</span> Cluster fulfillment for bulk buyers</li>
          </ul>
        </div>

        <div className="auth-brand-foot">Kaarigar · Built for SIH26090</div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-mobile-brand">
            <div className="auth-brand-icon">K</div>
            <span>Kaarigar</span>
          </div>

          <h1>Welcome back</h1>
          <p className="auth-sub">Sign in to continue to your dashboard.</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-username">Username</label>
              <div className="auth-input-wrap">
                <input
                  id="login-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-toggle-visibility"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting && <span className="auth-spinner" />}
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}