import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [novoUser, setNovoUser] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  
  // Modais e Motivos
  const [modalSenha, setModalSenha] = useState({ aberto: false, id: null, username: '', senha: '' });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, id: null, username: '' });
  const [motivo, setMotivo] = useState('');

  const usuarioAtual = localStorage.getItem('usuario');

  const carregarUsuarios = async () => {
    try {
      const res = await api.get('/api/usuarios/');
      setUsuarios(res.data);
    } catch (e) { toast.error("Erro ao carregar usuários."); }
  };

  useEffect(() => { carregarUsuarios(); }, []);

  const salvarUsuario = async () => {
    if (!novoUser || !novaSenha) return toast.warn("Preencha usuário e senha.");
    try {
      await api.post('/api/usuarios/', { username: novoUser, password: novaSenha, usuario_acao: usuarioAtual });
      toast.success("Novo operador cadastrado!");
      setNovoUser(''); setNovaSenha('');
      carregarUsuarios();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar."); }
  };

  const confirmarEdicaoSenha = async () => {
    if (!motivo || !modalSenha.senha) return toast.warn("A nova senha e o motivo são obrigatórios.");
    try {
      await api.put(`/api/usuarios/${modalSenha.id}/senha`, { nova_senha: modalSenha.senha, usuario_acao: usuarioAtual, motivo: motivo });
      toast.success("Senha atualizada com sucesso!");
      setModalSenha({ aberto: false, id: null, username: '', senha: '' }); setMotivo('');
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao alterar senha."); }
  };

  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn("O motivo é obrigatório.");
    try {
      await api.delete(`/api/usuarios/${modalExclusao.id}`, { data: { usuario: usuarioAtual, motivo: motivo } });
      toast.success("Acesso revogado!");
      setModalExclusao({ aberto: false, id: null, username: '' }); setMotivo('');
      carregarUsuarios();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao excluir."); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      
      {/* CARD DE CADASTRO */}
      <div className="p-6 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end" style={{backgroundColor:'var(--bg-card)', borderColor:'var(--border-light)'}}>
        <div className="w-full">
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--color-blue)' }}>NOVO OPERADOR (LOGIN)</label>
          <input value={novoUser} onChange={e => setNovoUser(e.target.value)} placeholder="Ex: joao.silva" className="w-full p-3 rounded-lg border outline-none" style={{backgroundColor:'var(--bg-input)', borderColor:'var(--border-light)', color:'var(--text-main)'}}/>
        </div>
        <div className="w-full">
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--color-blue)' }}>SENHA INICIAL</label>
          <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="••••••••" className="w-full p-3 rounded-lg border outline-none" style={{backgroundColor:'var(--bg-input)', borderColor:'var(--border-light)', color:'var(--text-main)'}}/>
        </div>
        <button onClick={salvarUsuario} className="w-full md:w-auto px-8 py-3 text-white rounded-lg font-bold transition-opacity hover:opacity-90 whitespace-nowrap" style={{backgroundColor:'var(--color-blue)'}}>
          Criar Acesso
        </button>
      </div>

      {/* LISTA DE USUÁRIOS */}
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{backgroundColor:'var(--bg-card)', borderColor:'var(--border-light)'}}>
        <div className="p-4 border-b font-bold flex justify-between items-center" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
          <span>Operadores Credenciados</span>
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{usuarios.length} Ativos</span>
        </div>
        <table className="w-full text-left text-sm">
          <tbody>
            {usuarios.map(user => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border-light)' }}>
                <td className="p-4 flex items-center gap-3 font-bold" style={{ color: 'var(--text-main)' }}>
                  <span className="text-xl">👤</span> {user.username}
                  {user.username === 'admin' && <span className="text-[10px] uppercase bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded ml-2">Mestre</span>}
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => setModalSenha({ aberto: true, id: user.id, username: user.username, senha: '' })} className="px-3 py-1.5 rounded text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm">REDEFINIR SENHA</button>
                  {user.username !== 'admin' && (
                    <button onClick={() => setModalExclusao({ aberto: true, id: user.id, username: user.username })} className="px-3 py-1.5 rounded text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors shadow-sm">REVOGAR ACESSO</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: REDEFINIR SENHA */}
      {modalSenha.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-blue)' }}>Redefinir Senha</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Você está alterando a credencial de <strong>{modalSenha.username}</strong>.</p>
            <input autoFocus type="text" placeholder="Digite a nova senha..." className="w-full p-3 rounded-lg border outline-none mb-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={modalSenha.senha} onChange={e => setModalSenha({...modalSenha, senha: e.target.value})} />
            <textarea className="w-full p-3 rounded-lg border outline-none mb-4 min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Motivo da alteração (Ex: Esquecimento, troca periódica)..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => {setModalSenha({ aberto: false, id: null, username: '', senha: '' }); setMotivo('')}} className="px-4 py-2 rounded font-bold" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={confirmarEdicaoSenha} className="px-4 py-2 rounded font-bold text-white bg-blue-500 hover:bg-blue-600">Salvar Senha</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO */}
      {modalExclusao.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-lg font-bold text-red-500 mb-2">Atenção: Revogar Acesso</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-main)' }}>O usuário <strong>{modalExclusao.username}</strong> perderá acesso imediato ao sistema.</p>
            <textarea autoFocus className="w-full p-3 rounded-lg border outline-none mb-4 min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Motivo do bloqueio (Ex: Desligamento, mudança de setor)..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => {setModalExclusao({ aberto: false, id: null, username: '' }); setMotivo('')}} className="px-4 py-2 rounded font-bold" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={confirmarExclusao} className="px-4 py-2 rounded font-bold text-white bg-red-500 hover:bg-red-600">Revogar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}