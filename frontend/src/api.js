import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 300000, // 5 minutes for large plagiarism checks
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hn_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hn_token');
      localStorage.removeItem('hn_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
