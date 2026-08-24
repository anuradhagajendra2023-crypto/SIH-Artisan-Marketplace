import axios from 'axios';

const client = axios.create({ baseURL: 'http://localhost:8000/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh');
        const { data } = await axios.post('http://localhost:8000/api/auth/login/refresh/', { refresh });
        localStorage.setItem('access', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;