import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../api/api';

const MODULOS = [
  { id: 'dashboard', nome: 'Dashboard', icone: '📊' },
  { id: 'gestao_ativos', nome: 'Gestão de Ativos', icone: '💻' },
  { id: 'nexus_print', nome: 'Nexus Print', icone: '🖨️' },
  { id: 'cadastros', nome: 'Cadastros Base', icone: '📁' },
  { id: 'auditoria', nome: 'Auditoria Logs', icone: '📜' },
  { id: 'configuracoes', nome: 'Configurações', icone: '⚙️' }
];

export default function GerenciamentoUsuarios({ usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [novoUser, setNovoUser] = useState({ username: '', password: '', is_admin: false, permissoes: [] });
  const [modalEdit, setModalEdit] = useState({ aberto: false, id: null, username: '', password: '', is_admin: false, permissoes: [], avatar: 'letras' });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, id: null, username: '' });
  const [motivo, setMotivo] = useState('');

  const carregarUsuarios = async () => {
    try { const res = await api.get('/api/usuarios/'); setUsuarios(res.data); } catch (e) {}
  };
  
  useEffect(() => { carregarUsuarios(); }, []);

  // 🚀 FORMATADOR DE DATA PARA ÚLTIMO LOGIN
  const formatarUltimoAcesso = (isoDate) => {
    if (!isoDate) return 'Nunca acessou';
    const data = new Date(isoDate.endsWith('Z') ? isoDate : isoDate + 'Z');
    return data.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  };

  const togglePermissaoNovo = (moduloId) => {
    setNovoUser(prev => {
      const tem = prev.permissoes.includes(moduloId);
      return { ...prev, permissoes: tem ? prev.permissoes.filter(p => p !== moduloId) : [...prev.permissoes, moduloId] };
    });
  };

  const togglePermissaoEdit = (moduloId) => {
    setModalEdit(prev => {
      const tem = prev.permissoes.includes(moduloId);
      return { ...prev, permissoes: tem ? prev.permissoes.filter(p => p !== moduloId) : [...prev.permissoes, moduloId] };
    });
  };

  const salvarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUser.username || !novoUser.password) return toast.warn("Preencha login e senha provisória.");
    const permissoesFinais = novoUser.is_admin ? MODULOS.map(m => m.id) : novoUser.permissoes;
    try { 
      await api.post('/api/usuarios/', { 
        ...novoUser, 
        permissoes: permissoesFinais, 
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual 
      });
      toast.success("Usuário criado com sucesso! 👤"); 
      setNovoUser({ username: '', password: '', is_admin: false, permissoes: [] }); 
      carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao salvar."); }
  };

  const confirmarEdicao = async () => {
    if (!motivo || !modalEdit.username) return toast.warn("Nome e motivo são obrigatórios.");
    const permissoesFinais = modalEdit.is_admin ? MODULOS.map(m => m.id) : modalEdit.permissoes;
    try { 
      await api.put(`/api/usuarios/${modalEdit.id}`, { 
        username: modalEdit.username, 
        password: modalEdit.password, 
        is_admin: modalEdit.is_admin, 
        permissoes: permissoesFinais,
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual, 
        motivo 
      });
      toast.success("Privilégios atualizados! 🛡️"); 
      setModalEdit({ aberto: false, id: null, username: '', password: '', is_admin: false, permissoes: [], avatar: 'letras' }); 
      setMotivo(''); carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao editar."); }
  };

  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn("O motivo é obrigatório.");
    try { 
      await api.delete(`/api/usuarios/${modalExclusao.id}`, { 
        data: { usuario: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual, motivo } 
      });
      toast.success("Acesso revogado!"); 
      setModalExclusao({ aberto: false, id: null, username: '' }); 
      setMotivo(''); carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao excluir."); }
  };

  const RenderizarPermissoes = ({ isAdmin, permissoesSelecionadas, onToggle }) => (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {MODULOS.map(mod => {
        const checked = isAdmin || permissoesSelecionadas.includes(mod.id);
        return (
          <label key={mod.id} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${checked ? 'border-blue-500 bg-blue-500/10' : 'hover:border-blue-500/50 opacity-60 hover:opacity-100'}`} style={{ borderColor: checked ? '' : 'var(--border-light)', backgroundColor: checked ? '' : 'var(--bg-input)' }}>
            <input type="checkbox" checked={checked} disabled={isAdmin} onChange={() => onToggle(mod.id)} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{mod.icone} {mod.nome}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 animate-fade-in">
        <div className="lg:col-span-4 space-y-8">
          <div className="p-6 rounded-3xl border shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>🚀 Novo Operador</h3>
            <form onSubmit={salvarUsuario} className="space-y-4">
              <input value={novoUser.username} onChange={e => setNovoUser({...novoUser, username: e.target.value})} className="w-full p-3 rounded-xl border font-bold outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Login"/>
              <input value={novoUser.password} onChange={e => setNovoUser({...novoUser, password: e.target.value})} type="password" placeholder="Senha Provisória" className="w-full p-3 rounded-xl border font-bold outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={novoUser.is_admin} onChange={e => setNovoUser({...novoUser, is_admin: e.target.checked})} />
                <span className="text-[11px] font-black uppercase" style={{ color: 'var(--text-main)' }}>👑 Admin Global</span>
              </label>
              <RenderizarPermissoes isAdmin={novoUser.is_admin} permissoesSelecionadas={novoUser.permissoes} onToggle={togglePermissaoNovo} />
              <button type="submit" className="w-full py-3 rounded-xl font-black text-white bg-blue-600 shadow-lg mt-4">Criar Usuário</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-3xl border shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>👥 Equipe Nexus</h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <th className="p-4 text-[10px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Operador</th>
                    <th className="p-4 text-[10px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Tipo</th>
                    <th className="p-4 text-right text-[10px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(user => {
                    const avatar = user.avatar || 'letras';
                    const perms = Array.isArray(user.permissoes) ? user.permissoes : []; 
                    const dataAcesso = new Date(user.ultimo_acesso?.endsWith('Z') ? user.ultimo_acesso : user.ultimo_acesso + 'Z');
                    const isOnline = user.ultimo_acesso && (new Date() - dataAcesso < 120000);

                    return (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-gray-500/5 transition-all" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="relative group">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${avatar === 'letras' ? 'bg-gray-900 text-white text-xs' : 'text-2xl'}`}>
                                {avatar === 'letras' ? user.username.substring(0, 2).toUpperCase() : avatar}
                              </div>
                              {/* 🚀 BOLINHA COM TOOLTIP DE ÚLTIMO LOGIN */}
                              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080d16] ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500/50'}`}></div>
                              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-gray-900 text-white text-[9px] font-bold px-2 py-1 rounded z-50 whitespace-nowrap">
                                {isOnline ? 'Conectado agora' : `Visto em: ${formatarUltimoAcesso(user.ultimo_acesso)}`}
                              </div>
                            </div>
                            <div>
                              <div className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{user.nome_exibicao || user.username}</div>
                              <div className="text-[9px] font-bold opacity-50 uppercase" style={{ color: 'var(--text-main)' }}>@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.is_admin ? <span className="text-[9px] font-black text-blue-500 border border-blue-500/30 px-2 py-1 rounded-full bg-blue-500/10">ADMIN GLOBAL 🛡️</span> : 
                          <span className="text-[9px] font-black opacity-60 uppercase">{perms.length} Módulos</span>}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button onClick={() => setModalEdit({ aberto: true, id: user.id, username: user.username, password: '', is_admin: user.is_admin, permissoes: perms, avatar: avatar })} className="text-[10px] font-black text-blue-500 hover:underline">EDITAR</button>
                          {user.username !== 'admin' && <button onClick={() => setModalExcluir({ aberto: true, id: user.id, username: user.username })} className="text-[10px] font-black text-red-500 hover:underline ml-2">EXCLUIR</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* OS MODAIS PERMANECEM COM A LÓGICA DE AUDITORIA E EDIÇÃO IGUAIS */}
      {modalEdit.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl border bg-[#0c0c0c]" style={{ borderColor: 'var(--border-light)' }}>
            <h3 className="text-xl font-black mb-6" style={{ color: 'var(--text-main)' }}>Editar Operador</h3>
            <div className="space-y-4">
              <input value={modalEdit.username} onChange={e => setModalEdit({...modalEdit, username: e.target.value})} className="w-full p-3 rounded-xl border bg-transparent font-bold outline-none" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={modalEdit.is_admin} onChange={e => setModalEdit({...modalEdit, is_admin: e.target.checked})} />
                <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Acesso Total</span>
              </label>
              <RenderizarPermissoes isAdmin={modalEdit.is_admin} permissoesSelecionadas={modalEdit.permissoes} onToggle={togglePermissaoEdit} />
              <textarea placeholder="Motivo da alteração..." className="w-full p-3 rounded-xl border bg-transparent outline-none mt-4 border-red-500/30" value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end mt-6 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalEdit({ aberto: false, id: null })} className="px-6 py-3 font-bold opacity-60" style={{ color: 'var(--text-main)' }}>Sair</button>
              <button onClick={confirmarEdicao} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600">Salvar</button>
            </div>
          </div>
        </div>, document.body
      )}

      {modalExclusao.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl border bg-[#0c0c0c]" style={{ borderColor: 'var(--border-light)' }}>
            <h3 className="text-2xl font-black text-red-500 mb-4 text-center">Revogar Acesso</h3>
            <textarea className="w-full p-4 rounded-xl border bg-transparent text-white outline-none mb-4" placeholder="Justificativa obrigatória..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            <button onClick={confirmarExclusao} className="w-full py-3.5 rounded-xl font-black text-white bg-red-600">Bloquear @{modalExclusao.username}</button>
            <button onClick={() => setModalExclusao({ aberto: false, id: null })} className="w-full py-3.5 font-bold opacity-60 text-white mt-2">Cancelar</button>
          </div>
        </div>, document.body
      )}
    </>
  );
}