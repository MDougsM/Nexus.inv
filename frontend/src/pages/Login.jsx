import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';
// 🚀 Adicionando ícones profissionais
import { FaUser, FaLock, FaDatabase, FaShieldAlt } from 'react-icons/fa';

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
      const res = await api.post('/api/usuarios/login', { username, password });
      
      localStorage.setItem('usuario', res.data.username);
        if (res.data.termos_aceitos === false) {
            localStorage.setItem('nexus_bloqueado', 'true');
        } else {
            localStorage.removeItem('nexus_bloqueado');
        }
      localStorage.setItem('isAdmin', res.data.is_admin);
      localStorage.setItem('permissoes', JSON.stringify(res.data.permissoes || [])); 
      
      const aceitouTermos = res.data.termos_aceitos; // Pega o que o backend mandou

      if (!aceitouTermos) {
          localStorage.setItem('nexus_bloqueado', 'true');
      } else {
          localStorage.removeItem('nexus_bloqueado');
      }

      toast.success(res.data.message);
      
      setTimeout(() => {
        if (!aceitouTermos) {
            navigate('/perfil'); // Se tá bloqueado, vai direto ler os termos!
        } else {
            navigate('/cadastro'); // Se tá livre, vai trabalhar normal.
        }
      }, 500);

    } catch (error) {
      toast.error(e.response?.data?.detail || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Definição local de animação pulsante lenta para o fundo
  const pulseSlow = {
    animation: 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  return (
    // 🌍 CONTEINER PRINCIPAL EM GRID SPLIT-SCREEN
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#080d16] text-white overflow-hidden relative font-sans animate-fade-in">
      
      {/* 🛡️ PAINEL DIREITO: BRANDING & VISUAL (Escondido em mobile) */}
      <div className="hidden lg:flex lg:col-span-7 bg-[#0b1322] border-r border-[#1a2c4e] p-16 flex-col justify-between relative overflow-hidden group">
        {/* Auras de luz pulsantes no fundo do cofre */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 filter blur-[120px]" style={pulseSlow}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-cyan-500/10 rounded-full filter blur-[100px]" style={pulseSlow}></div>
        
        {/* Malha de dados sutil (Data Net) */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#2c6ee1 1px, transparent 1px)', backgroundSize: '35px 35px'}}></div>
        
        {/* Conteúdo da Marca */}
        <div className="relative z-10">
            {/* Ícone Refinado */}
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center text-4xl mb-12 shadow-2xl shadow-blue-500/10 transition-transform group-hover:scale-105 duration-500">
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
        
        {/* Rodapé da Marca */}
        <div className="relative z-10 flex items-center gap-4 text-sm font-semibold text-gray-500 tracking-wider">
            <FaShieldAlt className="text-blue-600 text-lg" />
            NEXUS INC © 2026. Gestão Inteligente de Ativos.
        </div>
      </div>

      {/* 🔐 PAINEL ESQUERDO: FORMULÁRIO DE LOGIN */}
      <div className="lg:col-span-5 p-8 sm:p-16 md:p-20 flex flex-col justify-center relative bg-[#080d16]">
        {/* Aura de fundo mobile */}
        <div className="lg:hidden absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[120px] opacity-20" style={pulseSlow}></div>

        <div className="max-w-md w-full mx-auto relative z-10 space-y-14">
            
            {/* Cabeçalho do Formulário */}
            <div className="text-center lg:text-left border-b border-[#1a2c4e] pb-10">
                <h2 className="text-4xl lg:text-3xl font-extrabold text-white tracking-tighter mb-2">NEXUS<span className="text-blue-500">.INV</span></h2>
                <p className="text-lg lg:text-base text-gray-400 font-medium">Faça login para gerenciar sua infraestrutura.</p>
            </div>

            {/* O FORMULÁRIO */}
            <form onSubmit={handleLogin} className="space-y-8">
                
                {/* INPUT: UTILIZADOR (ESTILO CARD) */}
                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  {/* Label flutuante estilizado */}
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 transition-all duration-300 group-focus-within:text-blue-500">Utilizador</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaUser className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text" 
                        autoFocus
                        required
                        className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide"
                        placeholder="Digite seu login, ex: admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                  </div>
                </div>

                {/* INPUT: PALAVRA-PASSE (ESTILO CARD) */}
                <div className="relative border border-[#1a2c4e] rounded-2xl bg-[#0b1322] p-5 focus-within:border-blue-500 group transition-all duration-300 shadow-inner">
                  {/* Label flutuante estilizado */}
                  <label className="absolute left-6 top-2 font-black text-[9px] uppercase tracking-[3px] text-gray-500 transition-all duration-300 group-focus-within:text-blue-500">Palavra-passe</label>
                  <div className="flex items-center gap-4 pt-4">
                      <FaLock className="text-gray-500 text-xl group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="password" 
                        required
                        className="w-full bg-transparent outline-none text-white text-base font-bold placeholder:text-gray-700 tracking-wide"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                  </div>
                </div>

                {/* BOTÃO DE LOGIN "PODEROSO" */}
                <button 
                  type="submit" 
                  disabled={loading}
                  // Sombra projetada agressiva para dar profundidade
                  className="w-full py-5 text-lg text-white font-extrabold rounded-2xl shadow-[0_10px_40px_rgb(37,99,235,0.25)] hover:shadow-[0_10px_40px_rgb(37,99,235,0.5)] transition-all duration-300 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                  style={{ backgroundColor: 'var(--color-blue)' }}
                >
                  {loading ? (
                      <>
                          {/* Spinner suave */}
                          <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                          A autenticar...
                      </>
                  ) : (
                      'Aceder à Plataforma Nexus'
                  )}
                </button>
            </form>
            
            {/* Rodapé do Formulário */}
            <div className="pt-10 border-t border-[#1a2c4e] flex items-center justify-between text-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest ">🔐 Acesso Restrito</p>
                <button type="button" className="text-[11px] font-bold hover:text-blue-500 transition-colors">Esqueceu a senha?</button>
            </div>
        </div>
      </div>
    </div>
  );
}