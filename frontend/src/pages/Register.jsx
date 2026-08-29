import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../components/Auth.css';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';


export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'artisan', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setRole = (role) => setForm((f) => ({ ...f, role }));

  const extractError = (err) => {
    const data = err?.response?.data;
    if (!data) return err?.message || 'Registration failed — check your details';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    // DRF validation errors come back as { field: ["msg1", "msg2"] }
    return Object.entries(data)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
      .join(' | ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err?.response?.status, err?.response?.data);
      setError(extractError(err));
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
          <h2>{t('registerHeadline')}</h2>
          <p>{t('registerSub')}</p>
          <ul className="auth-brand-points">
            <li><span className="dot">🧵</span> {t('registerPoint1')}</li>
            <li><span className="dot">📦</span> {t('registerPoint2')}</li>
            <li><span className="dot">🌍</span> {t('registerPoint3')}</li>
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

          <h1>{t('registerCreateTitle')}</h1>
          <p className="auth-sub">{t('registerSub2')}</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>{t('registerIAmA')}</label>
              <div className="auth-role-group">
                <div
                  className={`auth-role-card ${form.role === 'artisan' ? 'active' : ''}`}
                  onClick={() => setRole('artisan')}
                  role="button"
                  tabIndex={0}
                >
                    <span className="role-icon">🧵</span>
                  <strong>{t('registerArtisanLabel')}</strong>
                  <span>{t('registerArtisanDesc')}</span>          </div>
                <div
                  className={`auth-role-card ${form.role === 'buyer' ? 'active' : ''}`}
                  onClick={() => setRole('buyer')}
                  role="button"
                  tabIndex={0}
                >
                  <span className="role-icon">🛍️</span>
                  <strong>{t('registerBuyerLabel')}</strong>
                  <span>{t('registerBuyerDesc')}</span>         </div>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-username">{t('registerUsername')}</label>
              <div className="auth-input-wrap">
                <input
                  id="reg-username"
                  placeholder={t('registerUsernamePlaceholder')}
                  value={form.username}
                  onChange={update('username')}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">{t('registerEmail')}</label>
              <div className="auth-input-wrap">
                <input
                  id="reg-email"
                  placeholder={t('registerEmailPlaceholder')}
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-phone">{t('registerPhone')}</label>
              <div className="auth-input-wrap">
                <input
                  id="reg-phone"
                  placeholder={t('registerPhonePlaceholder')}
                  value={form.phone}
                  onChange={update('phone')}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">{t('registerPassword')}</label>
              <div className="auth-input-wrap">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('registerPasswordPlaceholder')}
                  value={form.password}
                  onChange={update('password')}
                  required
                  autoComplete="new-password"
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
              {submitting ? t('registerCreatingAccount') : t('registerButton')}
            </button>
          </form>

          <p className="auth-switch">
            {t('registerHaveAccount')} <Link to="/login">{t('registerSignInLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}