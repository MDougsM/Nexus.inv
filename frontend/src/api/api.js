import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

api.interceptors.request.use((config) => {
  const usuario = localStorage.getItem('usuario');
  const empresa = localStorage.getItem('empresa'); // 🚀 Puxa a empresa

  if (usuario) {
    config.params = { ...config.params, usuario_acao: usuario };
  }
  
  if (empresa) {
    config.headers['x-empresa'] = empresa; // 🚀 O Crachá que o database.py vai ler
  }
  
  return config;
});

export default api;