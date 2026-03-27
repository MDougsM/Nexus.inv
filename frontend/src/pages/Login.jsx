import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';
import { FaUser, FaLock, FaDatabase, FaShieldAlt, FaEnvelope, FaTimes } from 'react-icons/fa';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🚀 STATES DO NOVO MODAL DE SENHA
  const [showModal, setShowModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.warn("Preencha todos os campos.");
    
    setLoading(true);
    try {
      const res = await api.post('/api/usuarios/login', { username, password });
      
      localStorage.setItem('usuario', res.data.username);
      localStorage.setItem('isAdmin', res.data.is_admin);
      localStorage.setItem('permissoes', JSON.stringify(res.data.permissoes || [])); 
      
      const aceitouTermos = res.data.termos_aceitos;

      if (!aceitouTermos) {
          localStorage.setItem('nexus_bloqueado', 'true');
      } else {
          localStorage.removeItem('nexus_bloqueado');
      }

      toast.success(res.data.message);
      
      setTimeout(() => {
        if (!aceitouTermos) navigate('/perfil');
        else navigate('/cadastro');
      }, 500);

    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 FUNÇÃO PARA RECUPERAR SENHA
  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    if (!resetEmail) return toast.warn("Digite seu e-mail cadastrado.");
    
    setResetLoading(true);
    try {
      // Bate na rota que vamos criar no Python
      await api.post('/api/usuarios/recuperar-senha', { email: resetEmail });
      toast.success("✅ Nova senha enviada para o seu e-mail!");
      setShowModal(false);
      setResetEmail('');
    } catch (error) {
      toast.error(error.response?.data?.detail || "E-mail não encontrado no sistema.");
    } finally {
      setResetLoading(false);
    }
  };

  const pulseSlow = { animation: 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite' };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#080d16] text-white overflow-hidden relative font-sans animate-fade-in">
      
      {/* 🚀 MODAL DE ESQUECEU A SENHA (OVERLAY) */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1322] border border-[#1a2c4e] rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
              <FaTimes size={20} />
            </button>
            
            <h3 className="text-2xl font-black mb-2 text-white">Recuperar Acesso</h3>
            <p className="text-sm text-gray-400 font-medium mb-8">Digite o e-mail vinculado à sua conta. Enviaremos uma credencial de acesso temporária.</p>
            
            <form onSubmit={handleRecuperarSenha} className="space-y-6">
              <div className="relative border border-[#1a2c4e] rounded-xl bg-[#080d16] p-4 focus-within:border-blue-500 group transition-all">
                <label className="absolute left-4 top-1.5 font-black text-[8px] uppercase tracking-[2px] text-gray-500 group-focus-within:text-blue-500">Endereço de E-mail</label>
                <div className="flex items-center gap-3 pt-3">
                    <FaEnvelope className="text-gray-500 text-lg group-focus-within:text-blue-500" />
                    <input 
                      type="email" required autoFocus
                      className="w-full bg-transparent outline-none text-white text-sm font-bold placeholder:text-gray-700"
                      placeholder="exemplo@prefeitura.gov.br"
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    />
                </div>
              </div>
              
              <button 
                type="submit" disabled={resetLoading}
                className="w-full py-4 text-sm text-white font-black rounded-xl bg-blue-600 hover:bg-blue-700 shadow-[0_5px_20px_rgb(37,99,235,0.3)] transition-all disabled:opacity-50 active:scale-95"
              >
                {resetLoading ? 'Enviando...' : 'Receber Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      {/* PAINEL DIREITO: BRANDING */}
      <div className="hidden lg:flex lg:col-span-7 bg-[#0b1322] border-r border-[#1a2c4e] p-16 flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 filter blur-[120px]" style={pulseSlow}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px]" style={pulseSlow}></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#2c6ee1 1px, transparent 1px)', backgroundSize: '35px 35px'}}></div>
        
        <div className="relative z-10">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center text-4xl mb-12 shadow-2xl transition-transform group-hover:scale-105 duration-500">
              <FaDatabase />
            </div>
            <h1 className="text-6xl font-extrabold tracking-tighter max-w-xl leading-[1.1] mb-8">
                <span className="text-gray-100">Controle</span> total do seu<br/>
                <span className="text-blue-500">patrimônio digital.</span>
            </h1>
            <p className="mt-8 text-gray-400 max-w-lg text-lg font-medium leading-relaxed opacity-90">
                A plataforma NEXUS unifica a gestão de hardware, software e licenças da sua organização, garantindo conformidade, segurança e redução drástica de custos operacionais.
            </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-4 text-sm font-semibold text-gray-500 tracking-wider">
            <FaShieldAlt className="text-blue-600 text-lg" />
            NEXUS INC © 2026. Gestão Inteligente de Ativos.
        </div>
      </div>

      {/* PAINEL ESQUERDO: FORMULÁRIO */}
      <div className="lg:col-span-5 p-8 sm:p-16 md:p-20 flex flex-col justify-center relative bg-[#080d16]">
        <div className="lg:hidden absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[120px] opacity-20" style={pulseSlow}></div>

        <div className="max-w-md w-full mx-auto relative z-10 space-y-14">
            <div className="text-center lg:text-left border-b border-[#1a2c4e] pb-10">
                <h2 className="text-4xl lg:text-3xl font-extrabold text-white tracking-tighter mb-2">NEXUS<span className="text-blue-500">.INV</span></h2>
                <p className="text-lg lg:text-base text-gray-400 font-medium">Faça login para gerenciar sua infraestrutura.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 group-focus-within:text-blue-500">Utilizador</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaUser className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text" autoFocus required
                        className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide"
                        placeholder="Digite seu login"
                        value={username} onChange={(e) => setUsername(e.target.value)}
                      />
                  </div>
                </div>

                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 group-focus-within:text-blue-500">Palavra-passe</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaLock className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="password" required
                        className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide"
                        placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                      />
                  </div>
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full py-5 text-lg text-white font-extrabold rounded-2xl shadow-[0_10px_40px_rgb(37,99,235,0.25)] hover:shadow-[0_10px_40px_rgb(37,99,235,0.5)] transition-all duration-300 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3 bg-blue-600"
                >
                  {loading ? (
                      <>
                          <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                          A autenticar...
                      </>
                  ) : 'Aceder à Plataforma Nexus' }
                </button>
            </form>
            
            <div className="pt-10 border-t border-[#1a2c4e] flex items-center justify-between text-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest ">🔐 Acesso Restrito</p>
                {/* 🚀 BOTÃO QUE ABRE O MODAL DE RECUPERAÇÃO */}
                <button type="button" onClick={() => setShowModal(true)} className="text-[11px] font-bold hover:text-blue-500 transition-colors">
                  Esqueceu a senha?
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}