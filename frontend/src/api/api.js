import axios from 'axios';

// Usa o hostname atual (seja localhost ou o IP da rede como 192.168.x.x)
const api = axios.create({
  baseURL: `http://${window.location.hostname}:8001`,
});

api.interceptors.request.use((config) => {
  const usuario = localStorage.getItem('usuario');
  if (usuario) {
    config.params = { ...config.params, usuario_acao: usuario };
  }
  return config;
});

export default api;