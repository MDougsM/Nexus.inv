import axios from 'axios';

const api = axios.create({
  // O Vite exige o prefixo VITE_ para reconhecer variáveis de ambiente
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001',
});

api.interceptors.request.use((config) => {
  const usuario = localStorage.getItem('usuario');
  if (usuario) {
    config.params = { ...config.params, usuario_acao: usuario };
  }
  return config;
});

export default api;