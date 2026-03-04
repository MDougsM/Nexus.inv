import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios'); 
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  
  const [usuarios, setUsuarios] = useState([]);
  const [novoUser, setNovoUser] = useState({ username: '', password: '', is_admin: false });
  const [modalEdit, setModalEdit] = useState({ aberto: false, id: null, username: '', password: '', is_admin: false });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, id: null, username: '' });
  const [motivo, setMotivo] = useState('');

  const [empresa, setEmpresa] = useState(localStorage.getItem('empresaNome') || '');
  const [doc, setDoc] = useState(localStorage.getItem('empresaDoc') || '');

  // ESTADOS IMPORTAÇÃO 3 PASSOS
  const [fileLocais, setFileLocais] = useState(null);
  const [fileTipos, setFileTipos] = useState(null);
  const [fileAtivos, setFileAtivos] = useState(null);
  const [loadingImport, setLoadingImport] = useState({ locais: false, tipos: false, ativos: false });
  
  const refLocais = useRef();
  const refTipos = useRef();
  const refAtivos = useRef();

  const carregarUsuarios = async () => {
    try { const res = await api.get('/api/usuarios/'); setUsuarios(res.data); } catch (e) {}
  };
  useEffect(() => { carregarUsuarios(); }, []);

  const salvarUsuario = async () => {
    if (!novoUser.username || !novoUser.password) return toast.warn("Preencha login e senha provisória.");
    try { await api.post('/api/usuarios/', { ...novoUser, usuario_acao: usuarioAtual }); toast.success("Usuário criado!"); setNovoUser({ username: '', password: '', is_admin: false }); carregarUsuarios(); } catch (e) { toast.error("Erro ao salvar."); }
  };

  const confirmarEdicao = async () => {
    if (!motivo || !modalEdit.username) return toast.warn("Nome e motivo são obrigatórios.");
    try { await api.put(`/api/usuarios/${modalEdit.id}`, { username: modalEdit.username, password: modalEdit.password, is_admin: modalEdit.is_admin, usuario_acao: usuarioAtual, motivo }); toast.success("Usuário atualizado!"); setModalEdit({ aberto: false, id: null, username: '', password: '', is_admin: false }); setMotivo(''); carregarUsuarios(); } catch (e) { toast.error("Erro ao editar."); }
  };

  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn("O motivo é obrigatório.");
    try { await api.delete(`/api/usuarios/${modalExclusao.id}`, { data: { usuario: usuarioAtual, motivo } }); toast.success("Usuário excluído!"); setModalExclusao({ aberto: false, id: null, username: '' }); setMotivo(''); carregarUsuarios(); } catch (e) { toast.error("Erro ao excluir."); }
  };

  const salvarDadosEmpresa = (e) => {
    e.preventDefault();
    localStorage.setItem('empresaNome', empresa);
    localStorage.setItem('empresaDoc', doc);
    toast.success("Informações salvas com sucesso!");
  };

  // FUNÇÕES DE IMPORTAÇÃO (OS 3 PASSOS)
  const realizarUpload = async (tipo, file, ref) => {
    if (!file) return toast.warn("Selecione um arquivo CSV primeiro.");
    if (!file.name.endsWith('.csv')) return toast.warn("Formato inválido! Use .csv");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usuario", usuarioAtual);

    setLoadingImport(prev => ({...prev, [tipo]: true}));
    
    try {
      const res = await api.post(`/api/importacao/${tipo}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success(res.data.message, { autoClose: 5000 });
      if(tipo === 'locais') setFileLocais(null);
      if(tipo === 'categorias') setFileTipos(null);
      if(tipo === 'ativos') setFileAtivos(null);
      if(ref.current) ref.current.value = '';
    } catch (e) {
      toast.error(e.response?.data?.detail || `Erro ao processar ${tipo}. Verifique a formatação do arquivo.`);
    } finally {
      setLoadingImport(prev => ({...prev, [tipo]: false}));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>⚙️</div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Painel de Controle</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gerencie preferências, relatórios, segurança e carga de dados.</p>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex space-x-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <button onClick={() => setAbaAtiva('usuarios')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          👥 Equipe & Usuários
        </button>
        <button onClick={() => setAbaAtiva('relatorios')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'relatorios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          🏢 Relatórios & Empresa
        </button>
        <button onClick={() => setAbaAtiva('backup')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'backup' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          🚀 Migração (Importação)
        </button>
      </div>

      {/* ABA: USUÁRIOS E RELATÓRIOS MANTIDOS OMITIDOS VISUALMENTE AQUI PARA POUPAR LINHAS, MAS ESTÃO MANTIDOS NO FUNCIONAL (Abaixo) */}
      {abaAtiva === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 animate-fade-in">
          {/* COLUNA ESQUERDA (FORMULÁRIOS) */}
          <div className="space-y-6">
            
            <div className="p-6 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>🔑 Alterar Minha Senha</h3>
              <div className="space-y-4">
                <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>SENHA ATUAL</label><input type="password" placeholder="••••••••" className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/></div>
                <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOVA SENHA</label><input type="password" placeholder="••••••••" className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/></div>
                <button className="w-full py-2.5 text-white rounded font-bold transition-opacity hover:opacity-90 shadow-sm" style={{ backgroundColor: 'var(--bg-sidebar)' }}>Atualizar Senha</button>
              </div>
            </div>

            <div className="p-6 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>➕ Cadastrar Novo Usuário</h3>
              <div className="space-y-4">
                <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOME DE LOGIN</label><input value={novoUser.username} onChange={e => setNovoUser({...novoUser, username: e.target.value})} className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/></div>
                <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>SENHA PROVISÓRIA</label><input value={novoUser.password} onChange={e => setNovoUser({...novoUser, password: e.target.value})} type="password" placeholder="••••••••" className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/></div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={novoUser.is_admin} onChange={e => setNovoUser({...novoUser, is_admin: e.target.checked})} className="w-4 h-4 rounded border-gray-300" />
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Acesso de Administrador (Total)</span>
                </label>
                <button onClick={salvarUsuario} className="w-full py-2.5 text-white rounded font-bold transition-opacity hover:opacity-90 mt-2 shadow-sm" style={{ backgroundColor: 'var(--color-blue)' }}>Criar Usuário</button>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA (TABELA) */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-xl border shadow-sm h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>👑 Gerenciar Usuários</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm mt-2">
                  <thead style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
                    <tr>
                      <th className="pb-3 font-semibold text-xs uppercase">Usuário</th>
                      <th className="pb-3 font-semibold text-xs uppercase">Nível de Acesso</th>
                      <th className="pb-3 font-semibold text-xs uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(user => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="py-4 font-bold" style={{ color: 'var(--text-main)' }}>{user.username}</td>
                        <td className="py-4">
                          {user.is_admin 
                            ? <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded text-white shadow-sm" style={{ backgroundColor: 'var(--color-green)' }}>Admin 👑</span>
                            : <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>Técnico</span>
                          }
                        </td>
                        <td className="py-4 text-right flex justify-end gap-2">
                          <button onClick={() => setModalEdit({ aberto: true, id: user.id, username: user.username, password: '', is_admin: user.is_admin })} className="px-3 py-1 rounded border text-xs font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border-light)', color: 'var(--color-yellow)' }}>EDITAR</button>
                          <button onClick={() => setModalExclusao({ aberto: true, id: user.id, username: user.username })} className="px-3 py-1 rounded border text-xs font-bold transition-colors hover:bg-red-50 dark:hover:bg-red-900/20" style={{ borderColor: 'var(--border-light)', color: 'var(--color-red)' }}>EXCLUIR</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'relatorios' && (
        <div className="pt-4 animate-fade-in">
          <div className="p-6 rounded-xl border shadow-sm max-w-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
             <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--color-blue)' }}>Dados da Organização</h3>
             <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Estas informações serão utilizadas como cabeçalho oficial em todos os PDFs e planilhas exportadas pelo sistema.</p>
             
             <form onSubmit={salvarDadosEmpresa} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOME DA EMPRESA / INSTITUIÇÃO</label>
                  <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex: Prefeitura Municipal de São Paulo" className="w-full p-3 rounded-lg border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>CNPJ / DEPARTAMENTO (Opcional)</label>
                  <input value={doc} onChange={e => setDoc(e.target.value)} placeholder="Ex: Secretaria de Saúde - 00.000.000/0001-00" className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                </div>
                
                <button type="submit" className="px-6 py-3 text-white rounded-lg font-bold transition-opacity hover:opacity-90 mt-4 shadow-md w-full md:w-auto" style={{ backgroundColor: 'var(--color-blue)' }}>
                  💾 Salvar Informações Oficiais
                </button>
             </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* ABA 3: NOVA MIGRAÇÃO EM 3 PASSOS */}
      {/* ================================================= */}
      {abaAtiva === 'backup' && (
        <div className="pt-4 animate-fade-in">
          
          <div className="mb-8 p-6 rounded-xl border shadow-sm flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '6px solid var(--color-green)' }}>
            <div>
              <h3 className="font-black text-xl mb-1 flex items-center gap-2" style={{ color: 'var(--color-green)' }}>⬇️ Backup do Sistema</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Faça o download completo de dados e senhas antes de realizar grandes importações.</p>
            </div>
            <button onClick={async () => { try { const res = await api.get('/api/backup/download', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `NEXUS_Backup_${new Date().toISOString().split('T')[0]}.db`); document.body.appendChild(link); link.click(); toast.success("Download do Backup concluído!"); } catch (e) { toast.error("Erro ao gerar backup."); } }} className="px-6 py-3 text-white rounded-lg font-bold hover:opacity-90 shadow-md" style={{ backgroundColor: 'var(--color-green)' }}>
              Baixar Backup (.db)
            </button>
          </div>

          <h3 className="font-bold text-xl mb-4" style={{ color: 'var(--text-main)' }}>🚀 Assistente de Migração de Dados</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Siga os passos abaixo na ordem para garantir a integridade relacional do banco de dados.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* PASSO 1: LOCAIS */}
            <div className="p-6 rounded-xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div>
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 mb-4">1</div>
                <h4 className="font-bold text-base mb-2" style={{ color: 'var(--color-blue)' }}>Mapeamento de Locais</h4>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Importe o arquivo contendo a árvore de setores.<br/><b>Colunas exigidas:</b> <code>Secretaria</code>, <code>Setor</code></p>
                <input type="file" accept=".csv" ref={refLocais} onChange={(e) => setFileLocais(e.target.files[0])} className="w-full text-xs mb-4" />
              </div>
              <button onClick={() => realizarUpload('locais', fileLocais, refLocais)} disabled={!fileLocais || loadingImport.locais} className="w-full py-2.5 rounded font-bold text-white shadow-sm disabled:opacity-50" style={{ backgroundColor: 'var(--color-blue)' }}>
                {loadingImport.locais ? 'Enviando...' : 'Importar Locais'}
              </button>
            </div>

            {/* PASSO 2: TIPOS E CATEGORIAS */}
            <div className="p-6 rounded-xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div>
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 mb-4">2</div>
                <h4 className="font-bold text-base mb-2" style={{ color: 'var(--color-yellow)' }}>Tipos de Equipamento</h4>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Crie os tipos e seus campos dinâmicos separados por vírgula.<br/><b>Colunas exigidas:</b> <code>Nome</code>, <code>Campos</code></p>
                <input type="file" accept=".csv" ref={refTipos} onChange={(e) => setFileTipos(e.target.files[0])} className="w-full text-xs mb-4" />
              </div>
              <button onClick={() => realizarUpload('categorias', fileTipos, refTipos)} disabled={!fileTipos || loadingImport.tipos} className="w-full py-2.5 rounded font-bold text-white shadow-sm disabled:opacity-50" style={{ backgroundColor: 'var(--color-yellow)' }}>
                {loadingImport.tipos ? 'Criando...' : 'Importar Tipos'}
              </button>
            </div>

            {/* PASSO 3: MÁQUINAS (ATIVOS) */}
            <div className="p-6 rounded-xl border shadow-sm flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div>
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 mb-4">3</div>
                <h4 className="font-bold text-base mb-2" style={{ color: 'var(--color-red)' }}>Inventário Principal</h4>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>A planilha principal do inventário.<br/><b>Colunas:</b> <code>Patrimonio</code>, <code>Status</code>, <code>Marca</code>, <code>Modelo</code>, <code>Categoria</code>, <code>Secretaria</code>, <code>Setor</code> e colunas extras.</p>
                <input type="file" accept=".csv" ref={refAtivos} onChange={(e) => setFileAtivos(e.target.files[0])} className="w-full text-xs mb-4" />
              </div>
              <button onClick={() => realizarUpload('ativos', fileAtivos, refAtivos)} disabled={!fileAtivos || loadingImport.ativos} className="w-full py-2.5 rounded font-bold text-white shadow-sm disabled:opacity-50" style={{ backgroundColor: 'var(--color-red)' }}>
                {loadingImport.ativos ? 'Injetando...' : 'Injetar Máquinas'}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAIS (EDIÇÃO E EXCLUSÃO DE USUÁRIO) */}
      {modalEdit.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-main)' }}>Editar Usuário</h3>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOME / LOGIN</label>
            <input value={modalEdit.username} onChange={e => setModalEdit({...modalEdit, username: e.target.value})} className="w-full p-3 rounded-lg border outline-none mb-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOVA SENHA (Deixe em branco para manter)</label>
            <input type="password" value={modalEdit.password} onChange={e => setModalEdit({...modalEdit, password: e.target.value})} placeholder="••••••••" className="w-full p-3 rounded-lg border outline-none mb-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input type="checkbox" checked={modalEdit.is_admin} onChange={e => setModalEdit({...modalEdit, is_admin: e.target.checked})} className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Acesso Administrador</span>
            </label>
            <textarea placeholder="Motivo da alteração (obrigatório para a auditoria)..." className="w-full p-3 rounded-lg border outline-none mb-4 min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={motivo} onChange={e => setMotivo(e.target.value)} />
            <div className="flex gap-3 justify-end border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalEdit({ aberto: false, id: null })} className="px-4 py-2 rounded font-bold" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={confirmarEdicao} className="px-5 py-2 rounded font-bold text-white shadow-md transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-blue)' }}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {modalExclusao.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-red)' }}>Atenção: Revogar Acesso</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-main)' }}>O usuário <strong className="font-bold">{modalExclusao.username}</strong> perderá acesso imediato.</p>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>MOTIVO DO BLOQUEIO *</label>
            <textarea className="w-full p-3 rounded-lg border outline-none mb-4 min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Escreva a justificativa..." value={motivo} onChange={e => setMotivo(e.target.value)} />
            <div className="flex gap-3 justify-end border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalExclusao({ aberto: false, id: null })} className="px-4 py-2 rounded font-bold" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={confirmarExclusao} className="px-5 py-2 rounded font-bold text-white shadow-md transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-red)' }}>Revogar Acesso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}