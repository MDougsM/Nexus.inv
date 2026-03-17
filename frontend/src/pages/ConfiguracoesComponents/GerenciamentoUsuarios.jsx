import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function GerenciamentoUsuarios({ usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [novoUser, setNovoUser] = useState({ username: '', password: '', is_admin: false });
  const [modalEdit, setModalEdit] = useState({ aberto: false, id: null, username: '', password: '', is_admin: false, avatar: 'letras' });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, id: null, username: '' });
  const [motivo, setMotivo] = useState('');

  const carregarUsuarios = async () => {
    try { const res = await api.get('/api/usuarios/'); setUsuarios(res.data); } catch (e) {}
  };
  useEffect(() => { carregarUsuarios(); }, []);

  const salvarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUser.username || !novoUser.password) return toast.warn("Preencha login e senha provisória.");
    try { 
      await api.post('/api/usuarios/', { ...novoUser, usuario_acao: usuarioAtual }); 
      toast.success("Usuário criado com sucesso! 👤"); 
      setNovoUser({ username: '', password: '', is_admin: false }); 
      carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao salvar. O usuário pode já existir."); }
  };

  const confirmarEdicao = async () => {
    if (!motivo || !modalEdit.username) return toast.warn("Nome e motivo são obrigatórios.");
    try { 
      await api.put(`/api/usuarios/${modalEdit.id}`, { username: modalEdit.username, password: modalEdit.password, is_admin: modalEdit.is_admin, usuario_acao: usuarioAtual, motivo }); 
      toast.success("Privilégios atualizados! 🛡️"); 
      setModalEdit({ aberto: false, id: null, username: '', password: '', is_admin: false, avatar: 'letras' }); 
      setMotivo(''); 
      carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao editar."); }
  };

  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn("O motivo é obrigatório.");
    try { 
      await api.delete(`/api/usuarios/${modalExclusao.id}`, { data: { usuario: usuarioAtual, motivo } }); 
      toast.success("Acesso revogado!"); 
      setModalExclusao({ aberto: false, id: null, username: '' }); 
      setMotivo(''); 
      carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao excluir."); }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 animate-fade-in">
        {/* LADO ESQUERDO: NOVO USUÁRIO */}
        <div className="space-y-8">
          <div className="p-6 rounded-3xl border shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}><span className="text-blue-500 text-lg">➕</span> Novo Operador</h3>
            <form onSubmit={salvarUsuario} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Nome de Login</label>
                <input value={novoUser.username} onChange={e => setNovoUser({...novoUser, username: e.target.value})} className="w-full p-3 rounded-xl border font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Ex: joao.tecnico"/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Senha Provisória</label>
                <input value={novoUser.password} onChange={e => setNovoUser({...novoUser, password: e.target.value})} type="password" placeholder="••••••••" className="w-full p-3 rounded-xl border font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border mt-4 transition-all hover:border-blue-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={novoUser.is_admin} onChange={e => setNovoUser({...novoUser, is_admin: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>Conceder Acesso Admin</span>
              </label>
              <button type="submit" className="w-full py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 mt-2">Criar Usuário</button>
            </form>
          </div>
        </div>

        {/* LADO DIREITO: LISTA DE USUÁRIOS */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border shadow-xl overflow-hidden h-full flex flex-col" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}><span className="text-yellow-500 text-lg">👑</span> Equipe Nexus</h3>
              <span className="px-3 py-1 rounded-full border shadow-sm text-[10px] font-black uppercase opacity-80" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>{usuarios.length} Registros</span>
            </div>
            <div className="flex-1 overflow-x-auto p-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Operador</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Privilégios</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right" style={{ color: 'var(--text-main)' }}>Controle</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(user => {
                    const avatar = user.avatar || 'letras';
                    const nomeExibicao = user.nome_exibicao || user.username;
                    return (
                      <tr key={user.id} className="border-b last:border-0 transition-all duration-300 hover:shadow-md hover:bg-gray-500/5 relative" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-md ${avatar === 'letras' ? 'bg-gray-900 text-white text-xs uppercase' : 'bg-transparent text-2xl'}`}>
                              {avatar === 'letras' ? user.username.substring(0, 2).toUpperCase() : avatar}
                            </div>
                            <div>
                              <div className="font-black text-sm capitalize" style={{ color: 'var(--text-main)' }}>{nomeExibicao}</div>
                              <div className="text-[9px] font-bold uppercase tracking-widest opacity-50 mt-0.5" style={{ color: 'var(--text-main)' }}>@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.is_admin 
                            ? <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-green-600 text-[9px] font-black uppercase tracking-widest border border-green-500/30 shadow-sm bg-green-500/10">Admin <span>🛡️</span></span>
                            : <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>Técnico</span>
                          }
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button onClick={() => setModalEdit({ aberto: true, id: user.id, username: user.username, password: '', is_admin: user.is_admin, avatar: avatar })} className="px-3 py-2 rounded-lg border text-[10px] font-black transition-all hover:bg-blue-500/10 hover:border-blue-400" style={{ borderColor: 'var(--border-light)', color: 'var(--color-blue)' }}>EDITAR</button>
                          {user.username !== 'admin' && (
                            <button onClick={() => setModalExclusao({ aberto: true, id: user.id, username: user.username })} className="px-3 py-2 rounded-lg border text-[10px] font-black text-red-500 border-red-500/30 hover:bg-red-500/10 transition-all active:scale-95">EXCLUIR</button>
                          )}
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

      {/* --- MODAIS DE EDIÇÃO E EXCLUSÃO (MANTIDOS DO ORIGINAL) --- */}
      {modalEdit.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl border animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-4 mb-6 border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black shadow-md ${modalEdit.avatar && modalEdit.avatar !== 'letras' ? 'bg-transparent text-4xl' : 'bg-gray-900 text-white text-lg uppercase'}`}>
                {modalEdit.avatar && modalEdit.avatar !== 'letras' ? modalEdit.avatar : modalEdit.username.substring(0,2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Editar Acesso</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">@{modalEdit.username}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>NOME / LOGIN</label>
                <input value={modalEdit.username} onChange={e => setModalEdit({...modalEdit, username: e.target.value})} className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>NOVA SENHA (Opcional - Reset)</label>
                <input type="password" value={modalEdit.password} onChange={e => setModalEdit({...modalEdit, password: e.target.value})} placeholder="Deixe em branco para manter..." className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-blue-500/50 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={modalEdit.is_admin} onChange={e => setModalEdit({...modalEdit, is_admin: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Conceder Poderes de Admin</span>
              </label>
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1 mt-2 text-red-500">MOTIVO DA AUDITORIA *</label>
                <textarea placeholder="Ex: Solicitação de reset de senha..." className="w-full p-3 rounded-xl border font-medium outline-none focus:ring-2 focus:ring-red-500/20 min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={motivo} onChange={e => setMotivo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <button onClick={() => setModalEdit({ aberto: false, id: null })} className="px-6 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all hover:bg-gray-500/10" style={{ color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={confirmarEdicao} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {modalExclusao.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl border animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-3xl mb-4 text-red-500 mx-auto shadow-inner border border-red-500/20">⚠️</div>
            <h3 className="text-2xl font-black tracking-tight mb-2 text-center" style={{ color: 'var(--text-main)' }}>Revogar Acesso</h3>
            <p className="text-sm font-medium mb-6 text-center opacity-70" style={{ color: 'var(--text-main)' }}>O usuário <strong className="font-black text-red-500">@{modalExclusao.username}</strong> perderá o acesso ao sistema imediatamente.</p>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase opacity-50 text-red-500 text-center tracking-widest">JUSTIFICATIVA DA EXCLUSÃO (AUDITORIA)</label>
              <textarea className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-red-500/20 min-h-[100px] text-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Ex: Desligamento da empresa..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmarExclusao} className="w-full py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95">Bloquear Definitivamente</button>
              <button onClick={() => setModalExclusao({ aberto: false, id: null })} className="w-full py-3.5 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all hover:bg-gray-500/10" style={{ color: 'var(--text-main)' }}>Cancelar operação</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}