import axios from 'axios';

// ⚡ O TRUQUE: Deixamos a baseURL vazia (ou como '/')
// Assim, o celular vai fazer os pedidos para o próprio link do Ngrok, 
// e o Vite vai interceptar e mandar para o Python.
const api = axios.create({
  baseURL: '/', 
});

api.interceptors.request.use((config) => {
  const usuario = localStorage.getItem('usuario');
  if (usuario) {
    config.params = { ...config.params, usuario_acao: usuario };
  }
  return config;
});

export default api;