import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';
import { TERMOS_NEXUS } from '../termosNexus';
import { createPortal } from 'react-dom';

export default function MeuPerfil() {
  const userSafe = localStorage.getItem('usuario') || 'admin';

  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirmacao: '' });
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [avatarAtivo, setAvatarAtivo] = useState('letras');
  const [email, setEmail] = useState(''); // 🚀 NOVO STATE DO EMAIL
  
  const [termosAceitos, setTermosAceitos] = useState(false); 
  const [mostrarModal, setMostrarModal] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);

  const avatares = ['🤖', '🦊', '🐱', '🐼', '🦉', '👽', '👻', '😎', '🤓', '👩‍💻', '👨‍💻', '🚀', '⚡', '🔥', '👾', '🦖'];

  useEffect(() => {
    const buscarDadosDoBanco = async () => {
      try {
        const res = await api.get('/api/usuarios/');
        const meuUsuario = res.data.find(u => u.username === userSafe);
        if (meuUsuario) {
          setNomeExibicao(meuUsuario.nome_exibicao || userSafe);
          setAvatarAtivo(meuUsuario.avatar || 'letras');
          setEmail(meuUsuario.email || ''); // 🚀 CARREGA O E-MAIL DO BANCO
          
          const aceitou = meuUsuario.termos_aceitos === true;
          setTermosAceitos(aceitou);
          
          if (!aceitou) {
              localStorage.setItem('nexus_bloqueado', 'true');
          } else {
              localStorage.removeItem('nexus_bloqueado');
          }
          window.dispatchEvent(new Event('statusTermosAlterado'));
        }
      } catch (e) {
        console.error("Erro ao buscar dados do perfil");
        toast.error("Erro ao conectar com o servidor.");
      } finally {
        setCarregando(false);
      }
    };
    buscarDadosDoBanco();
  }, [userSafe]);

  const aceitarTermosFinal = async () => {
    setRecarregando(true);
    try {
      const res = await api.put('/api/usuarios/perfil/atualizar', {
        username: userSafe,
        termos_aceitos: true,
        nome_exibicao: nomeExibicao,
        avatar: avatarAtivo,
        email: email // 🚀 MANDA O EMAIL QUANDO ACEITA OS TERMOS
      });

      if (res.data.termos_aceitos === true) {
        localStorage.removeItem('nexus_bloqueado');
        setTermosAceitos(true);
        setMostrarModal(false);
        window.dispatchEvent(new Event('statusTermosAlterado'));
        window.dispatchEvent(new Event('perfilAtualizado'));
        toast.success("✅ Termos aceitos! Acesso liberado. 🚀");
        setTimeout(() => window.location.href = '/', 1500);
      } else {
        toast.error("Erro: Servidor não confirmou o aceite. Tente novamente.");
      }
    } catch (e) {
      toast.error("Erro ao registrar aceite. Verifique a conexão.");
    } finally {
      setRecarregando(false);
    }
  };

  const revogarTermos = async () => {
    if (!window.confirm("⚠️ Tem certeza? Ao revogar os termos, você perderá acesso ao sistema até aceitar novamente.")) return;
    setRecarregando(true);
    try {
      const res = await api.put('/api/usuarios/perfil/atualizar', {
        username: userSafe,
        termos_aceitos: false
      });

      if (res.data.termos_aceitos === false) {
        localStorage.setItem('nexus_bloqueado', 'true');
        setTermosAceitos(false);
        window.dispatchEvent(new Event('statusTermosAlterado'));
        window.dispatchEvent(new Event('perfilAtualizado'));
        toast.warning("❌ Termos revogados. Seu acesso foi restringido.");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error("Erro ao revogar termos.");
      }
    } catch (e) {
      toast.error("Erro ao processar revogação.");
    } finally {
      setRecarregando(false);
    }
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/usuarios/perfil/atualizar', {
        username: userSafe,
        nome_exibicao: nomeExibicao,
        avatar: avatarAtivo,
        email: email // 🚀 ENVIA O EMAIL PARA SALVAR
      });
      toast.success("Perfil atualizado! ✨");
      window.dispatchEvent(new Event('perfilAtualizado'));
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Erro ao salvar perfil."); 
    }
  };

  const salvarSenha = async (e) => {
    e.preventDefault();
    if (senhas.nova !== senhas.confirmacao) return toast.error("Senhas não coincidem!");
    try {
      await api.put('/api/usuarios/senha/trocar', {
        username: userSafe,
        senha_atual: senhas.atual,
        senha_nova: senhas.nova
      });
      toast.success("✅ Senha atualizada!");
      setSenhas({ atual: '', nova: '', confirmacao: '' });
    } catch (err) { toast.error("Erro na senha atual!"); }
  };

  if (carregando) return <div className="p-10 text-center font-bold opacity-50 text-white">Validando acessos...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {!termosAceitos && (
        <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-4">
                <span className="text-4xl">⚠️</span>
                <div>
                    <h3 className="text-red-500 font-black text-lg uppercase">Acesso Restrito</h3>
                    <p className="text-sm font-medium opacity-80" style={{ color: 'var(--text-main)' }}>
                        Você precisa aceitar os termos de responsabilidade técnica para liberar o console.
                    </p>
                </div>
            </div>
            <button onClick={() => setMostrarModal(true)} className="px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/40">
                LER E LIBERAR AGORA
            </button>
        </div>
      )}

      <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
          {avatarAtivo === 'letras' ? '👤' : avatarAtivo}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight capitalize" style={{ color: 'var(--text-main)' }}>Olá, {nomeExibicao}!</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50 text-blue-500">
              {termosAceitos ? 'Conta em conformidade com a LGPD' : 'Aguardando aceite jurídico'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: IDENTIDADE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-8 rounded-3xl border shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <form onSubmit={salvarPerfil} className="space-y-6">
              
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-2 ml-1" style={{ color: 'var(--text-main)' }}>Escolha seu Avatar</label>
                <div className="grid grid-cols-4 gap-2">
                  <button type="button" onClick={() => setAvatarAtivo('letras')} className={`aspect-square rounded-xl flex items-center justify-center text-sm font-black transition-all ${avatarAtivo === 'letras' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-transparent border hover:bg-gray-500/10'}`} style={{ borderColor: avatarAtivo === 'letras' ? 'transparent' : 'var(--border-light)', color: avatarAtivo === 'letras' ? '#fff' : 'var(--text-main)' }}>
                    {userSafe.substring(0, 2).toUpperCase()}
                  </button>
                  {avatares.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setAvatarAtivo(emoji)} className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${avatarAtivo === emoji ? 'bg-blue-600 shadow-lg scale-105' : 'bg-transparent border hover:bg-gray-500/10'}`} style={{ borderColor: avatarAtivo === emoji ? 'transparent' : 'var(--border-light)' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

               <div className="space-y-4 mt-6">
                 <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Nome de Exibição</label>
                  <input value={nomeExibicao} onChange={e => setNomeExibicao(e.target.value)} className="w-full p-4 rounded-xl border font-bold outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                 </div>
                 
                 {/* 🚀 NOVO CAMPO DE EMAIL AQUI */}
                 <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>E-mail (Recuperação de Senha)</label>
                  <input type="email" placeholder="seu.email@dominio.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-xl border font-bold outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                 </div>
               </div>

              <button type="submit" className="w-full py-3.5 rounded-xl font-black text-white bg-blue-600 shadow-lg shadow-blue-500/30 transition-transform active:scale-95">
                💾 Salvar Identidade
              </button>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: SEGURANÇA */}
        <div className="lg:col-span-7">
          <div className="p-8 rounded-3xl border shadow-xl transition-all h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
             <h4 className="font-black text-lg mb-4" style={{ color: 'var(--text-main)' }}>Segurança e Acesso</h4>
             
             <div className="mb-8 p-5 rounded-2xl border-2" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚖️</span>
                    <div>
                      <h5 className="font-black text-sm uppercase" style={{ color: 'var(--text-main)' }}>Termos de Responsabilidade</h5>
                      <p className="text-[10px] opacity-60 mt-0.5">Status: {termosAceitos ? '✅ Aceito' : '❌ Não aceito'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => setMostrarModal(true)} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">
                    📖 Reler Termos
                  </button>
                  {termosAceitos && (
                    <button onClick={revogarTermos} disabled={recarregando} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 disabled:opacity-60">
                      🚪 Revogar Acesso
                    </button>
                  )}
                </div>
             </div>
             
             <form onSubmit={salvarSenha} className="space-y-6 flex-1 flex flex-col">
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Senha Atual *</label>
                  <input required type="password" value={senhas.atual} onChange={e => setSenhas({...senhas, atual: e.target.value})} className="w-full p-4 rounded-xl border font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Nova Senha *</label>
                    <input required type="password" value={senhas.nova} onChange={e => setSenhas({...senhas, nova: e.target.value})} className="w-full p-4 rounded-xl border font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Confirmar Nova Senha *</label>
                    <input required type="password" value={senhas.confirmacao} onChange={e => setSenhas({...senhas, confirmacao: e.target.value})} className="w-full p-4 rounded-xl border font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                  </div>
                </div>

                <div className="mt-auto pt-8 flex justify-end">
                  <button type="submit" className="px-8 py-3.5 rounded-xl font-black text-white bg-gray-900 border border-gray-700 hover:bg-black transition-all active:scale-95 shadow-lg">
                    Atualizar Senha
                  </button>
                </div>
             </form>
          </div>
        </div>
      </div>

      {/* MODAL TERMOS */}
      {mostrarModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white max-w-2xl w-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 bg-gray-950 text-white border-b border-white/10">
                <h2 className="text-2xl font-black flex items-center gap-3">
                    <span className="text-blue-500">⚖️</span> {TERMOS_NEXUS.titulo}
                </h2>
                <p className="text-[10px] opacity-60 mt-1 uppercase tracking-widest font-bold">{TERMOS_NEXUS.subtitulo}</p>
            </div>
            
            <div className="p-8 overflow-y-auto text-gray-700 space-y-6 text-sm leading-relaxed text-justify custom-scrollbar">
                {TERMOS_NEXUS.corpo.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <h4 className="font-black text-gray-900 uppercase text-xs border-b pb-1">{item.topico}</h4>
                        <p className="text-gray-600">{item.texto}</p>
                    </div>
                ))}
                
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-blue-900 text-[11px] font-bold italic">
                    {TERMOS_NEXUS.notaAlerta}
                </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-4">
                <button onClick={() => setMostrarModal(false)} disabled={recarregando} className={`py-4 font-bold rounded-2xl transition-all disabled:opacity-50 ${termosAceitos ? 'w-full bg-gray-200 text-gray-700 hover:bg-gray-300' : 'flex-1 text-gray-500 hover:bg-gray-100'}`}>
                    {termosAceitos ? 'FECHAR DOCUMENTO' : 'Fechar'}
                </button>
                
                {!termosAceitos && (
                  <button onClick={aceitarTermosFinal} disabled={recarregando} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                      {recarregando ? '⏳ PROCESSANDO...' : 'CONCORDO E ACEITO OS TERMOS'}
                  </button>
                )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}