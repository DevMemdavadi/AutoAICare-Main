import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  timeout: 60000,
});
// const api = axios.create({
//   baseURL:
//     import.meta.env.VITE_API_URL || "https://api.yogi.technoscaffold.com/api",
//   timeout: 10000,
// });

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const response = await api.post('/users/user/token/', { email, password });
  // Backend wraps response in { status, message, data: { access, refresh } }
  const body = response.data;
  const accessToken = body.data?.access ?? body.access;
  if (!accessToken) {
    throw new Error(body.message || 'Login failed');
  }
  return { access: accessToken, refresh: body.data?.refresh ?? body.refresh };
};

export default api;
