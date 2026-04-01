import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../api/api';

// 🚀 LISTA DOS MÓDULOS (ABAS) DO SISTEMA
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

  // Handler para alternar permissões no formulário de Criação
  const togglePermissaoNovo = (moduloId) => {
    setNovoUser(prev => {
      const tem = prev.permissoes.includes(moduloId);
      return { ...prev, permissoes: tem ? prev.permissoes.filter(p => p !== moduloId) : [...prev.permissoes, moduloId] };
    });
  };

  // Handler para alternar permissões no formulário de Edição
  const togglePermissaoEdit = (moduloId) => {
    setModalEdit(prev => {
      const tem = prev.permissoes.includes(moduloId);
      return { ...prev, permissoes: tem ? prev.permissoes.filter(p => p !== moduloId) : [...prev.permissoes, moduloId] };
    });
  };

  const salvarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUser.username || !novoUser.password) return toast.warn("Preencha login e senha provisória.");
    
    // Se for admin, manda array com tudo por segurança
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
    } catch (e) { toast.error("Erro ao salvar. O usuário pode já existir."); }
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
      setMotivo(''); 
      carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao editar."); }
  };

  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn("O motivo é obrigatório.");
    try { 
      await api.delete(`/api/usuarios/${modalExclusao.id}`, { 
        data: { 
            usuario: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual, 
            motivo 
        } 
      });
      toast.success("Acesso revogado!"); 
      setModalExclusao({ aberto: false, id: null, username: '' }); 
      setMotivo(''); 
      carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao excluir."); }
  };

  // Componente Reutilizável de Checkbox para Módulos
  const RenderizarPermissoes = ({ isAdmin, permissoesSelecionadas, onToggle }) => (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {MODULOS.map(mod => {
        const checked = isAdmin || permissoesSelecionadas.includes(mod.id);
        return (
          <label 
            key={mod.id} 
            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${checked ? 'border-blue-500 bg-blue-500/10' : 'hover:border-blue-500/50 opacity-60 hover:opacity-100'} ${isAdmin ? 'cursor-not-allowed opacity-100' : ''}`}
            style={{ borderColor: checked ? '' : 'var(--border-light)', backgroundColor: checked ? '' : 'var(--bg-input)' }}
          >
            <input 
              type="checkbox" 
              checked={checked} 
              disabled={isAdmin}
              onChange={() => onToggle(mod.id)} 
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
            />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              {mod.icone} {mod.nome}
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 animate-fade-in">
        
        {/* LADO ESQUERDO: NOVO USUÁRIO (Ocupa 4 colunas agora para caber os botões) */}
        <div className="lg:col-span-4 space-y-8">
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

              {/* TOGGLE ADMIN MESTRE */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border mt-4 transition-all hover:border-blue-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={novoUser.is_admin} onChange={e => setNovoUser({...novoUser, is_admin: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>👑 Acesso Total (Admin)</span>
              </label>

              {/* BLOCO DE PERMISSÕES GRANULARES */}
              <div className="pt-2 border-t mt-4" style={{ borderColor: 'var(--border-light)' }}>
                <label className="block text-[10px] font-black uppercase opacity-60" style={{ color: 'var(--text-main)' }}>Módulos Permitidos</label>
                <RenderizarPermissoes 
                  isAdmin={novoUser.is_admin} 
                  permissoesSelecionadas={novoUser.permissoes} 
                  onToggle={togglePermissaoNovo} 
                />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 mt-4">Criar Usuário</button>
            </form>
          </div>
        </div>

        {/* LADO DIREITO: LISTA DE USUÁRIOS (Ocupa 8 colunas) */}
        <div className="lg:col-span-8">
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
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Tipo de Conta</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right" style={{ color: 'var(--text-main)' }}>Controle</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(user => {
                    const avatar = user.avatar || 'letras';
                    const nomeExibicao = user.nome_exibicao || user.username;
                    const perms = Array.isArray(user.permissoes) ? user.permissoes : []; 
                    
                    // 🚀 LÓGICA DE ONLINE/OFFLINE
                    // Se o último acesso foi a menos de 2 minutos (120000 ms), está ONLINE.
                    let isOnline = false;
                      if (user.ultimo_acesso) {
                        // Garante que o JS entenda que a data do servidor é UTC adicionando o 'Z'
                        const dataAcesso = new Date(user.ultimo_acesso.endsWith('Z') ? user.ultimo_acesso : user.ultimo_acesso + 'Z');
                        const agora = new Date();
                        
                        // Calcula a diferença em milissegundos
                        const diferencaMs = agora - dataAcesso;
                        
                        // Se a diferença for menor que 2 minutos (120000 ms), está online!
                        isOnline = diferencaMs < 120000;
                      }
                    
                    return (
                      <tr key={user.id} className="border-b last:border-0 transition-all duration-300 hover:bg-gray-500/5 relative" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            
                            {/* 🚀 AVATAR COM A BOLINHA DE STATUS INJETADA */}
                            <div className="relative">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-md ${avatar === 'letras' ? 'bg-gray-900 text-white text-xs uppercase' : 'bg-transparent text-2xl'}`}>
                                {avatar === 'letras' ? user.username.substring(0, 2).toUpperCase() : avatar}
                              </div>
                              {/* Bolinha Verde/Vermelha */}
                              <div 
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080d16] transition-all duration-500 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500/50'}`}
                                title={isOnline ? 'Online agora' : 'Offline'}
                              ></div>
                            </div>

                            <div>
                              <div className="font-black text-sm capitalize flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                {nomeExibicao}
                              </div>
                              <div className="text-[9px] font-bold uppercase tracking-widest opacity-50 mt-0.5" style={{ color: 'var(--text-main)' }}>@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-500/30 shadow-sm bg-blue-500/10">Admin Global <span>🛡️</span></span>
                          ) : (
                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                                {perms.length === 0 ? (
                                    <span className="text-[10px] font-bold text-red-500">Sem Acessos</span>
                                ) : (
                                    perms.map(p => (
                                        <span key={p} className="px-2 py-1 rounded bg-gray-500/10 text-[8px] font-black uppercase border" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>
                                            {MODULOS.find(m => m.id === p)?.nome || p}
                                        </span>
                                    ))
                                )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2 items-center h-full">
                          <button onClick={() => setModalEdit({ aberto: true, id: user.id, username: user.username, password: '', is_admin: user.is_admin, permissoes: perms, avatar: avatar })} className="px-3 py-2 rounded-lg border text-[10px] font-black transition-all hover:bg-blue-500/10 hover:border-blue-400" style={{ borderColor: 'var(--border-light)', color: 'var(--color-blue)' }}>EDITAR</button>
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

      {/* MODAL DE EDIÇÃO */}
      {modalEdit.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl border animate-scale-up max-h-[95vh] overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-4 mb-6 border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black shadow-md ${modalEdit.avatar && modalEdit.avatar !== 'letras' ? 'bg-transparent text-4xl' : 'bg-gray-900 text-white text-lg uppercase'}`}>
                {modalEdit.avatar && modalEdit.avatar !== 'letras' ? modalEdit.avatar : modalEdit.username.substring(0,2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Editar Acessos</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">@{modalEdit.username}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>NOME / LOGIN</label>
                  <input value={modalEdit.username} onChange={e => setModalEdit({...modalEdit, username: e.target.value})} className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>RESETAR SENHA</label>
                  <input type="password" value={modalEdit.password} onChange={e => setModalEdit({...modalEdit, password: e.target.value})} placeholder="Deixe em branco p/ manter" className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-blue-500/50 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={modalEdit.is_admin} onChange={e => setModalEdit({...modalEdit, is_admin: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Conceder Acesso Total (Admin Mestre)</span>
              </label>

              {/* PERMISSÕES NO MODAL */}
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                <label className="block text-[10px] font-black uppercase opacity-60" style={{ color: 'var(--text-main)' }}>Configuração de Módulos</label>
                <RenderizarPermissoes 
                  isAdmin={modalEdit.is_admin} 
                  permissoesSelecionadas={modalEdit.permissoes} 
                  onToggle={togglePermissaoEdit} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1 mt-4 text-red-500">MOTIVO DA AUDITORIA *</label>
                <textarea placeholder="Ex: Alteração de cargo..." className="w-full p-3 rounded-xl border font-medium outline-none focus:ring-2 focus:ring-red-500/20 min-h-[60px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={motivo} onChange={e => setMotivo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalEdit({ aberto: false, id: null })} className="px-6 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all hover:bg-gray-500/10" style={{ color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={confirmarEdicao} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Salvar Acessos</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL EXCLUSÃO (MANTIDO EXATAMENTE IGUAL) */}
      {modalExclusao.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl border animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-3xl mb-4 text-red-500 mx-auto shadow-inner border border-red-500/20">⚠️</div>
            <h3 className="text-2xl font-black tracking-tight mb-2 text-center" style={{ color: 'var(--text-main)' }}>Revogar Acesso</h3>
            <p className="text-sm font-medium mb-6 text-center opacity-70" style={{ color: 'var(--text-main)' }}>O usuário <strong className="font-black text-red-500">@{modalExclusao.username}</strong> perderá o acesso ao sistema imediatamente.</p>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase opacity-50 text-red-500 text-center tracking-widest">JUSTIFICATIVA DA EXCLUSÃO</label>
              <textarea className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-red-500/20 min-h-[100px] text-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Ex: Desligamento..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmarExclusao} className="w-full py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95">Bloquear Definitivamente</button>
              <button onClick={() => setModalExclusao({ aberto: false, id: null })} className="w-full py-3.5 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all hover:bg-gray-500/10" style={{ color: 'var(--text-main)' }}>Cancelar operação</button>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}