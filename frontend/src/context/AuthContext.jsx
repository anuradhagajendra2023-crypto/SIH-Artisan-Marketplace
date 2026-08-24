import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) { setLoading(false); return; }
    client.get('/auth/me/')
      .then(({ data }) => setUser(data))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await client.post('/auth/login/', { username, password });
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    const { data: me } = await client.get('/auth/me/');
    setUser(me);
    return me;
  };

  const register = async (payload) => {
    await client.post('/auth/register/', payload);
    return login(payload.username, payload.password);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);