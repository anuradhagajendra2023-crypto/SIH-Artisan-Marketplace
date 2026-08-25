import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'artisan', phone: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err?.response?.status, err?.response?.data);
      setError(extractError(err));
    }
  };

  return (
    <div className="auth-card">
      <h2>Join Kaarigar</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Username" value={form.username} onChange={update('username')} required />
        <input placeholder="Email" type="email" value={form.email} onChange={update('email')} />
        <input placeholder="Phone" value={form.phone} onChange={update('phone')} />
        <select value={form.role} onChange={update('role')}>
          <option value="artisan">Artisan</option>
          <option value="buyer">Buyer</option>
        </select>
        <input type="password" placeholder="Password" value={form.password} onChange={update('password')} required />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit">Create Account</button>
      </form>
      <p>Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}