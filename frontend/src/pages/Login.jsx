import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../components/Auth.css';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}><LanguageSwitcher /></div>
      <div className="auth-brand-panel">
        <div className="auth-glow-1" />
        <div className="auth-glow-2" />

        <div className="auth-brand-top">
          <div className="auth-brand-icon">K</div>
          <span>Kaarigar</span>
        </div>

        <div className="auth-brand-mid">
          <h2>{t('brandHeadline')}</h2>
          <p>{t('brandSub')}</p>
          <ul className="auth-brand-points">
            <li><span className="dot">📷</span> {t('brandPoint1')}</li>
            <li><span className="dot">₹</span> {t('brandPoint2')}</li>
            <li><span className="dot">🤝</span> {t('brandPoint3')}</li>
          </ul>
        </div>

        <div className="auth-brand-foot">{t('brandFooter')}</div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-mobile-brand">
            <div className="auth-brand-icon">K</div>
            <span>Kaarigar</span>
          </div>

          <h1>{t('loginWelcomeBack')}</h1>
          <p className="auth-sub">{t('loginSubtitle')}</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="login-username">{t('loginUsernameLabel')}</label>
              <div className="auth-input-wrap">
                <input
                  id="login-username"
                  placeholder={t('loginUsernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">{t('loginPasswordLabel')}</label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('loginPasswordPlaceholder')}
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
                  {showPassword ? t('loginHide') : t('loginShow')}
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
              {submitting ? t('loginSigningIn') : t('loginSignIn')}
            </button>
          </form>

          <p className="auth-switch">
            {t('loginNewHere')} <Link to="/register">{t('loginCreateAccount')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}