import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.warn("Preencha todos os campos.");
    
    setLoading(true);
    try {
      // Faz o pedido à rota que acabámos de criar no backend
      const res = await api.post('/api/usuarios/login', { username, password });
      
      // Guarda os dados da sessão no navegador
      localStorage.setItem('usuario', res.data.username);
      localStorage.setItem('isAdmin', res.data.is_admin);
      
      toast.success(res.data.message);
      
      // Redireciona para o Dashboard ou Cadastro
      setTimeout(() => {
        navigate('/cadastro'); // ou '/' se tiver uma página inicial de dashboard
      }, 500);

    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 relative overflow-hidden">
      {/* Efeito de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            🏢
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">NEXUS<span className="text-blue-600">.INV</span></h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestão Inteligente de Ativos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600 uppercase tracking-wider">Utilizador</label>
            <input 
              type="text" 
              autoFocus
              className="w-full p-3 rounded-lg border bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
              placeholder="ex: admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600 uppercase tracking-wider">Palavra-passe</label>
            <input 
              type="password" 
              className="w-full p-3 rounded-lg border bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 mt-4 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-blue)' }}
          >
            {loading ? 'A autenticar...' : 'Entrar no Sistema'}
          </button>
        </form>
        
        <div className="mt-8 text-center border-t pt-4 border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Acesso Restrito</p>
        </div>
      </div>
    </div>
  );
}