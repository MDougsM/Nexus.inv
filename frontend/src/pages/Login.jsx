import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../api/api';
import { FaUser, FaLock, FaDatabase, FaShieldAlt, FaEnvelope, FaTimes, FaBuilding } from 'react-icons/fa';

export default function Login() {
  // ==========================================
  // 1. TODOS OS STATES DEVEM FICAR NO TOPO
  // ==========================================
  const [empresa, setEmpresa] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmpresa, setResetEmpresa] = useState(''); // Estado do Modal

  // ==========================================
  // 2. EFFECTS SÓ DEPOIS QUE OS STATES EXISTEM
  // ==========================================
  
  // 🧹 EXORCISMO DE CACHE: Sempre que abrir o login, limpa os resíduos velhos
  useEffect(() => {
    localStorage.clear();
  }, []);

  // Preenche a empresa automaticamente no modal se o usuário já tiver digitado
  useEffect(() => {
    if (showModal && empresa) setResetEmpresa(empresa);
  }, [showModal, empresa]);

  // ==========================================
  // 3. FUNÇÕES DE AÇÃO
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!empresa || !username || !password) return toast.warn("Preencha todos os campos.");
    
    setLoading(true);
    try {
      const empresaTratada = empresa.trim().toUpperCase();

      const res = await api.post('/api/usuarios/login', { empresa: empresaTratada, username, password });
      
      localStorage.setItem('empresa', empresaTratada); 
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
        // 🚀 FORÇA BRUTA: Ignora o React e manda o navegador recarregar a URL correta do zero
        if (empresaTratada === 'NEXUS_MASTER') {
           window.location.href = '/matriz'; 
        } else {
           if (!aceitouTermos) window.location.href = '/perfil';
           else window.location.href = '/cadastro';
        }
      }, 500);

    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    if (!resetEmpresa) return toast.warn("Digite o Código da Empresa.");
    if (!resetEmail) return toast.warn("Digite seu e-mail cadastrado.");

    setResetLoading(true);
    try {
      const empresaTratada = resetEmpresa.trim().toUpperCase();
      
      if (empresaTratada === 'NEXUS_MASTER') {
        // Rota da Matriz enviando a empresa pelo Header
        await api.post('/api/matriz/reset-master-acesso', 
          { email: resetEmail },
          { headers: { 'x-empresa': empresaTratada } }
        );
        toast.success("🔑 Credenciais Mestre enviadas para o e-mail de segurança!");
      } else {
        // Rota do Cliente enviando a empresa pelo Header
        await api.post('/api/usuarios/recuperar-senha', 
          { email: resetEmail },
          { headers: { 'x-empresa': empresaTratada } }
        );
        toast.success("✅ Nova senha enviada para o e-mail cadastrado.");
      }
      
      setShowModal(false);
      setResetEmail('');
      setResetEmpresa('');
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao recuperar acesso.");
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
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><FaTimes size={20} /></button>
            <h3 className="text-2xl font-black mb-2 text-white">Recuperar Acesso</h3>
            <p className="text-sm text-gray-400 font-medium mb-8">Digite os dados vinculados à sua conta.</p>
            
            <form onSubmit={handleRecuperarSenha} className="space-y-6">
              
              {/* CAMPO DA EMPRESA NO MODAL */}
              <div className="relative border border-[#1a2c4e] rounded-xl bg-[#080d16] p-4 focus-within:border-blue-500 group transition-all">
                <label className="absolute left-4 top-1.5 font-black text-[8px] uppercase tracking-[2px] text-gray-500 group-focus-within:text-blue-500">Código da Empresa</label>
                <div className="flex items-center gap-3 pt-3">
                    <FaBuilding className="text-gray-500 text-lg group-focus-within:text-blue-500" />
                    <input 
                      type="text" required autoFocus 
                      className="w-full bg-transparent outline-none text-white text-sm font-bold uppercase placeholder:text-gray-700" 
                      placeholder="EX: NEXUS_MASTER" 
                      value={resetEmpresa} onChange={(e) => setResetEmpresa(e.target.value.toUpperCase())} 
                    />
                </div>
              </div>

              {/* CAMPO DE E-MAIL */}
              <div className="relative border border-[#1a2c4e] rounded-xl bg-[#080d16] p-4 focus-within:border-blue-500 group transition-all">
                <label className="absolute left-4 top-1.5 font-black text-[8px] uppercase tracking-[2px] text-gray-500 group-focus-within:text-blue-500">Endereço de E-mail</label>
                <div className="flex items-center gap-3 pt-3">
                    <FaEnvelope className="text-gray-500 text-lg group-focus-within:text-blue-500" />
                    <input 
                      type="email" required 
                      className="w-full bg-transparent outline-none text-white text-sm font-bold placeholder:text-gray-700" 
                      placeholder="exemplo@dominio.com.br" 
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} 
                    />
                </div>
              </div>

              <button type="submit" disabled={resetLoading} className="w-full py-4 text-sm text-white font-black rounded-xl bg-blue-600 hover:bg-blue-700 shadow-[0_5px_20px_rgb(37,99,235,0.3)] transition-all disabled:opacity-50 active:scale-95">
                {resetLoading ? 'Enviando...' : 'Receber Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      <div className="hidden lg:flex lg:col-span-7 bg-[#0b1322] border-r border-[#1a2c4e] p-16 flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 filter blur-[120px]" style={pulseSlow}></div>
        <div className="relative z-10">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center text-4xl mb-12 shadow-2xl transition-transform group-hover:scale-105 duration-500"><FaDatabase /></div>
            <h1 className="text-6xl font-extrabold tracking-tighter max-w-xl leading-[1.1] mb-8"><span className="text-gray-100">Controle</span> total do seu<br/><span className="text-blue-500">patrimônio digital.</span></h1>
            <p className="mt-8 text-gray-400 max-w-lg text-lg font-medium leading-relaxed opacity-90">Plataforma NEXUS Multi-Tenant. Gestão isolada e segura para clientes Enterprise.</p>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-sm font-semibold text-gray-500 tracking-wider">
            <FaShieldAlt className="text-blue-600 text-lg" /> NEXUS INC © 2026. Gestão Inteligente de Ativos.
        </div>
      </div>

      <div className="lg:col-span-5 p-8 sm:p-16 md:p-20 flex flex-col justify-center relative bg-[#080d16]">
        <div className="max-w-md w-full mx-auto relative z-10 space-y-14">
            <div className="text-center lg:text-left border-b border-[#1a2c4e] pb-10">
                <h2 className="text-4xl lg:text-3xl font-extrabold text-white tracking-tighter mb-2">NEXUS<span className="text-blue-500">.SAAS</span></h2>
                <p className="text-lg lg:text-base text-gray-400 font-medium">Faça login para acessar o ambiente da sua empresa.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-8">
                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 group-focus-within:text-blue-500">Código da Empresa</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaBuilding className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input type="text" autoFocus required className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide uppercase" placeholder="Ex: PREFEITURA_SP" value={empresa} onChange={(e) => setEmpresa(e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 group-focus-within:text-blue-500">Utilizador</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaUser className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input type="text" required className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide" placeholder="Digite seu login" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                </div>
                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 group-focus-within:text-blue-500">Palavra-passe</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaLock className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input type="password" required className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-5 text-lg text-white font-extrabold rounded-2xl shadow-[0_10px_40px_rgb(37,99,235,0.25)] hover:shadow-[0_10px_40px_rgb(37,99,235,0.5)] transition-all duration-300 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3 bg-blue-600">
                  {loading ? <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Aceder à Plataforma Nexus' }
                </button>
            </form>
            <div className="pt-10 border-t border-[#1a2c4e] flex items-center justify-between text-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest ">🔐 Acesso Restrito</p>
                <button type="button" onClick={() => setShowModal(true)} className="text-[11px] font-bold hover:text-blue-500 transition-colors">Esqueceu a senha?</button>
            </div>
        </div>
      </div>
    </div>
  );
}