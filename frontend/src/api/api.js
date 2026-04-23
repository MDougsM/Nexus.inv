import axios from 'axios';

// 🚀 O SEGREDO: Ele tenta ler o .env. Se o .env estiver vazio ou falhar, 
// ele usa '/' (que significa "use o link atual da tela").
const urlBase = import.meta.env.VITE_API_URL || '/';

const api = axios.create({
  baseURL: urlBase
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