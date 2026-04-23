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
  
  // Estados para as funções de Super Admin
  const [novaSenhaPadrao, setNovaSenhaPadrao] = useState('Nexus@2026');
  const [carregandoReset, setCarregandoReset] = useState(false);

  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const carregarUsuarios = async () => {
    try { 
      const res = await api.get('/api/usuarios/'); 
      setUsuarios(res.data); 
    } catch (e) {
      toast.error("Falha ao carregar usuários.");
    }
  };
  
  useEffect(() => { carregarUsuarios(); }, []);

  const formatarUltimoAcesso = (isoDate) => {
    if (!isoDate) return 'Nunca acessou';
    const data = new Date(isoDate.endsWith('Z') ? isoDate : isoDate + 'Z');
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
        password: modalEdit.password, // Se estiver vazio, o backend deve ignorar a alteração de senha
        is_admin: modalEdit.is_admin, 
        permissoes: permissoesFinais,
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual, 
        motivo 
      });
      toast.success("Dados do operador atualizados! 🛡️"); 
      setModalEdit({ aberto: false, id: null, username: '', password: '', is_admin: false, permissoes: [], avatar: 'letras' }); 
      setMotivo(''); carregarUsuarios(); 
    } catch (e) { toast.error("Erro ao editar."); }
  };

  // 🚨 FUNÇÃO DE RESET EM MASSA ATUALIZADA
  const resetarTodasSenhas = async () => {
    const confirmacao = window.confirm(
      `⚠️ AVISO CRÍTICO ⚠️\n\nVocê vai resetar as senhas de TODOS os usuários para "${novaSenhaPadrao}".\n\nDeseja continuar?`
    );
    
    if (!confirmacao) return;

    // 🚀 Pede a justificativa para a auditoria
    const motivoReset = window.prompt(
      "🔒 AUDITORIA OBRIGATÓRIA:\nDigite o motivo para este reset em massa:"
    );

    // Se o usuário cancelar o prompt ou deixar vazio, aborta a missão
    if (!motivoReset || motivoReset.trim() === '') {
      toast.warn("O reset foi cancelado porque a justificativa é obrigatória.");
      return;
    }

    setCarregandoReset(true);
    try {
      // Usando 'api.post' em vez de fetch nativo para manter os headers (CORS/Tokens)
      const response = await api.post('/api/usuarios/admin/reset-senhas-todas', {
        nova_senha_padrao: novaSenhaPadrao,
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual,
        motivo: motivoReset // 🚀 Enviando a justificativa
      });
      
      toast.success("Senhas resetadas em massa com sucesso! 🚨");
    } catch (error) {
      // Extraindo a mensagem real de erro do backend, se existir
      const msgErro = error.response?.data?.detail || error.message;
      toast.error("Erro no reset: " + msgErro);
    } finally {
      setCarregandoReset(false);
    }
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
        
        {/* COLUNA DA ESQUERDA: CADASTRO E RESET */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* FORMULÁRIO NOVO USUÁRIO */}
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

          {/* FERRAMENTA DE RESET EM MASSA (APENAS ADMIN) */}
          {isAdmin && (
            <div className="p-6 rounded-3xl border shadow-xl bg-red-500/5" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2 mb-4">🚨 Zona de Perigo</h3>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-red-400">Resetar senhas de toda a equipe para:</p>
                <input 
                  value={novaSenhaPadrao} 
                  onChange={e => setNovaSenhaPadrao(e.target.value)}
                  className="w-full p-2.5 rounded-lg border bg-black/20 text-red-500 font-mono text-center font-bold"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                />
                <button 
                  onClick={resetarTodasSenhas}
                  disabled={carregandoReset}
                  className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase text-white bg-red-600 hover:bg-red-700 transition-all"
                >
                  {carregandoReset ? "Processando..." : "Executar Reset Geral"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DA DIREITA: LISTA DE USUÁRIOS */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl border shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>👥 Equipe Nexus</h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <th className="p-4 text-left text-[10px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Operador</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Tipo / Acesso</th>
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
                              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080d16] ${isOnline ? 'bg-emerald-500' : 'bg-red-500/50'}`}></div>
                            </div>
                            <div>
                              <div className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{user.nome_exibicao || user.username}</div>
                              <div className="text-[9px] font-bold opacity-50 uppercase" style={{ color: 'var(--text-main)' }}>@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.is_admin ? <span className="text-[9px] font-black text-blue-500 border border-blue-500/30 px-2 py-1 rounded-full bg-blue-500/10">ADMIN GLOBAL 🛡️</span> : 
                          <span className="text-[9px] font-black opacity-60 uppercase">{perms.length} Módulos Liberados</span>}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setModalEdit({ 
                              aberto: true, 
                              id: user.id, 
                              username: user.username, 
                              password: '', 
                              is_admin: user.is_admin, 
                              permissoes: perms, 
                              avatar: avatar 
                            })} 
                            className="text-[10px] font-black text-blue-500 hover:underline"
                          >
                            GERENCIAR
                          </button>
                          {user.username !== 'admin' && (
                            <button 
                              onClick={() => setModalExclusao({ aberto: true, id: user.id, username: user.username })} 
                              className="text-[10px] font-black text-red-500 hover:underline ml-3"
                            >
                              REVOGAR
                            </button>
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

      {/* MODAL DE EDIÇÃO INTEGRADO COM SENHA */}
      {modalEdit.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl p-8 shadow-2xl border bg-[#0c0c0c]" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black" style={{ color: 'var(--text-main)' }}>Configurar Operador</h3>
              <span className="text-[10px] font-black px-2 py-1 bg-blue-500/20 text-blue-500 rounded">ID: #{modalEdit.id}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase opacity-40 ml-1">Nome de Login</label>
                <input value={modalEdit.username} onChange={e => setModalEdit({...modalEdit, username: e.target.value})} className="w-full p-3 rounded-xl border bg-transparent font-bold outline-none mt-1" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase opacity-40 ml-1 text-blue-400">Nova Senha (Deixe vazio para manter)</label>
                <input 
                  type="password"
                  placeholder="Definir nova senha..." 
                  value={modalEdit.password} 
                  onChange={e => setModalEdit({...modalEdit, password: e.target.value})} 
                  className="w-full p-3 rounded-xl border bg-blue-500/5 font-bold outline-none mt-1 border-blue-500/20" 
                  style={{ color: 'var(--text-main)' }}
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer bg-white/5" style={{ borderColor: 'var(--border-light)' }}>
                <input type="checkbox" checked={modalEdit.is_admin} onChange={e => setModalEdit({...modalEdit, is_admin: e.target.checked})} />
                <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Privilégios de Administrador</span>
              </label>

              <div className="py-2">
                <p className="text-[9px] font-black uppercase opacity-40 ml-1 mb-2">Permissões de Módulo</p>
                <RenderizarPermissoes isAdmin={modalEdit.is_admin} permissoesSelecionadas={modalEdit.permissoes} onToggle={togglePermissaoEdit} />
              </div>

              <textarea 
                placeholder="Justificativa da alteração (Auditoria)..." 
                className="w-full p-3 rounded-xl border bg-transparent outline-none mt-2 border-red-500/20 text-xs" 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)} 
              />
            </div>

            <div className="flex gap-3 justify-end mt-6 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalEdit({ aberto: false, id: null })} className="px-6 py-3 font-bold opacity-60 text-white">Cancelar</button>
              <button onClick={confirmarEdicao} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 shadow-lg shadow-blue-600/20">Aplicar Mudanças</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL DE EXCLUSÃO */}
      {modalExclusao.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl p-8 shadow-2xl border bg-[#0c0c0c]" style={{ borderColor: 'var(--border-light)' }}>
            <h3 className="text-2xl font-black text-red-500 mb-4 text-center">Bloquear Acesso</h3>
            <p className="text-xs text-center opacity-60 mb-6 text-white">O usuário <strong>@{modalExclusao.username}</strong> perderá o acesso imediatamente.</p>
            <textarea className="w-full p-4 rounded-xl border bg-transparent text-white outline-none mb-4 border-red-500/30" placeholder="Motivo do bloqueio..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            <button onClick={confirmarExclusao} className="w-full py-3.5 rounded-xl font-black text-white bg-red-600">Confirmar Revogação</button>
            <button onClick={() => setModalExclusao({ aberto: false, id: null })} className="w-full py-3.5 font-bold opacity-60 text-white mt-2">Voltar</button>
          </div>
        </div>, document.body
      )}
    </>
  );
}