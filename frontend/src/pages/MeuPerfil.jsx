import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function MeuPerfil({ usuarioAtual }) {
  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmacao: '' });

  // Pegando dados salvos no navegador (ou usando o padrão)
  const [nomeExibicao, setNomeExibicao] = useState(localStorage.getItem(`nome_${usuarioAtual}`) || usuarioAtual);
  const [avatarAtivo, setAvatarAtivo] = useState(localStorage.getItem(`avatar_${usuarioAtual}`) || 'letras');

  // Galeria de Avatares Criativos
  const avatares = ['🤖', '🦊', '🐱', '🐼', '🦉', '👽', '👻', '😎', '🤓', '👩‍💻', '👨‍💻', '🚀', '⚡', '🔥', '👾', '🦖'];

  const salvarPerfil = (e) => {
    e.preventDefault();
    if (!nomeExibicao.trim()) return toast.warn("O nome não pode ficar vazio.");
    
    // Salva no navegador do usuário
    localStorage.setItem(`nome_${usuarioAtual}`, nomeExibicao);
    localStorage.setItem(`avatar_${usuarioAtual}`, avatarAtivo);
    
    toast.success("Perfil atualizado com sucesso! ✨");
    
    // Mágica para avisar o Layout (Header) para atualizar a foto na hora!
    window.dispatchEvent(new Event('perfilAtualizado'));
  };

  const salvarSenha = async (e) => {
    e.preventDefault();
    if (!senhas.atual || !senhas.nova || !senhas.confirmacao) return toast.warn("Preencha todos os campos.");
    if (senhas.nova !== senhas.confirmacao) return toast.error("As novas senhas não coincidem!");

    try {
      await api.put('/api/usuarios/senha/trocar', {
        username: usuarioAtual,
        senha_atual: senhas.atual,
        senha_nova: senhas.nova
      });
      toast.success("✅ Senha atualizada com sucesso!");
      setSenhas({ atual: '', nova: '', confirmacao: '' });
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) toast.error("❌ Senha atual incorreta!");
      else toast.error("Erro ao alterar senha. Tente novamente.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
          {avatarAtivo === 'letras' ? '👤' : avatarAtivo}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight capitalize" style={{ color: 'var(--text-main)' }}>Olá, {nomeExibicao}!</h2>
          <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>Preferências e Segurança da Conta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: IDENTIDADE E AVATAR */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-8 rounded-3xl border shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            
            <div className="flex flex-col items-center text-center mb-8 pb-8 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-5xl font-black text-white uppercase shadow-xl mb-4 transition-all hover:scale-105 cursor-pointer" 
                   style={{ backgroundColor: avatarAtivo === 'letras' ? '#111827' : 'var(--bg-input)', border: avatarAtivo === 'letras' ? '2px solid rgba(255,255,255,0.1)' : '2px solid var(--border-light)' }}>
                {avatarAtivo === 'letras' ? usuarioAtual.substring(0, 2).toUpperCase() : avatarAtivo}
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm text-blue-500 border-blue-500/30 bg-blue-500/10">
                Login: {usuarioAtual}
              </span>
            </div>

            <form onSubmit={salvarPerfil} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Nome de Exibição</label>
                <input value={nomeExibicao} onChange={e => setNomeExibicao(e.target.value)} placeholder="Como quer ser chamado?" className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-2 ml-1" style={{ color: 'var(--text-main)' }}>Escolha seu Avatar</label>
                <div className="grid grid-cols-4 gap-2">
                  <button type="button" onClick={() => setAvatarAtivo('letras')} className={`aspect-square rounded-xl flex items-center justify-center text-sm font-black transition-all ${avatarAtivo === 'letras' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-transparent border hover:bg-gray-500/10'}`} style={{ borderColor: avatarAtivo === 'letras' ? 'transparent' : 'var(--border-light)', color: avatarAtivo === 'letras' ? '#fff' : 'var(--text-main)' }}>
                    {usuarioAtual.substring(0, 2).toUpperCase()}
                  </button>
                  {avatares.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setAvatarAtivo(emoji)} className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${avatarAtivo === emoji ? 'bg-blue-600 shadow-lg scale-105' : 'bg-transparent border hover:bg-gray-500/10'}`} style={{ borderColor: avatarAtivo === emoji ? 'transparent' : 'var(--border-light)' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                💾 Salvar Identidade
              </button>
            </form>

          </div>
        </div>

        {/* COLUNA DIREITA: SEGURANÇA */}
        <div className="lg:col-span-7">
          <div className="p-8 rounded-3xl border shadow-xl transition-all h-full flex flex-col" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3 mb-8 pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>Segurança e Acesso</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-red-500">Altere sua senha periodicamente</p>
              </div>
            </div>

            <form onSubmit={salvarSenha} className="space-y-6 flex-1 flex flex-col">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Senha Atual *</label>
                <input required type="password" value={senhas.atual} onChange={e => setSenhas({...senhas, atual: e.target.value})} placeholder="••••••••" className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-red-500/20 transition-colors shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Nova Senha *</label>
                  <input required type="password" value={senhas.nova} onChange={e => setSenhas({...senhas, nova: e.target.value})} placeholder="Nova senha segura" className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Confirmar Nova Senha *</label>
                  <input required type="password" value={senhas.confirmacao} onChange={e => setSenhas({...senhas, confirmacao: e.target.value})} placeholder="Repita a nova senha" className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                </div>
              </div>

              <div className="mt-auto pt-8 flex justify-end">
                <button type="submit" className="px-8 py-3.5 rounded-xl font-black text-white bg-gray-900 hover:bg-black shadow-lg shadow-gray-900/30 transition-all active:scale-95 border border-gray-700">
                  Atualizar Senha Secreta
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}