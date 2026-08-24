import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'artisan', phone: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate('/');
    } catch {
      setError('Registration failed — check your details');
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