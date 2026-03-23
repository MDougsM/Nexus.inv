import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

api.interceptors.request.use((config) => {
  const usuario = localStorage.getItem('usuario');
  if (usuario) {
    config.params = { ...config.params, usuario_acao: usuario };
  }
  return config;
});

export default api;