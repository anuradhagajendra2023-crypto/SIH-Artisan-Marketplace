import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="auth-card">
      <h2>Sign in to Kaarigar</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit">Sign In</button>
      </form>
      <p>New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}