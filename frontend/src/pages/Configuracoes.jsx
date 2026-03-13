import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios'); 
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  
  const [usuarios, setUsuarios] = useState([]);
  const [novoUser, setNovoUser] = useState({ username: '', password: '', is_admin: false });
  const [modalEdit, setModalEdit] = useState({ aberto: false, id: null, username: '', password: '', is_admin: false, avatar: 'letras' });
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, id: null, username: '' });
  const [motivo, setMotivo] = useState('');

  const [empresa, setEmpresa] = useState(localStorage.getItem('empresaNome') || '');
  const [doc, setDoc] = useState(localStorage.getItem('empresaDoc') || '');

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

  const salvarDadosEmpresa = (e) => {
    e.preventDefault();
    localStorage.setItem('empresaNome', empresa);
    localStorage.setItem('empresaDoc', doc);
    toast.success("Informações salvas com sucesso! 🏢");
  };

  const realizarUpload = async (tipo, file, ref) => {
    if (!file) return toast.warn("Selecione um arquivo CSV primeiro.");
    if (!file.name.endsWith('.csv')) return toast.warn("Formato inválido! Use .csv");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usuario", usuarioAtual);

    setLoadingImport(prev => ({...prev, [tipo]: true}));
    
    try {
      const res = await api.post(`/api/importacao/${tipo}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success(`✅ ${res.data.message}`, { autoClose: 5000 });
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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
      
      <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-blue-500/30">⚙️</div>
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Painel de Controle</h2>
          <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>Preferências, segurança e carga de dados</p>
        </div>
      </div>

      {/* NOVO CARD DO AGENTE (Abaixo do título, Fixo e Menor) */}
      <div className="bg-gradient-to-br from-emerald-900 to-gray-900 border border-emerald-500/30 p-5 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-overlay filter blur-[50px] opacity-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="animate-pulse">📡</span> Agente Nexus Instalador (v4.3)
            </h3>
            <p className="text-emerald-100/70 mt-1 text-xs max-w-2xl font-medium">
              Baixe o executável para varredura de hardware e telemetria de rede. Instalação silenciosa no diretório <code>C:\Nexus.inv</code> e execução automática (Ping de 1min).
            </p>
          </div>

          {/* BOTÃO DO INSTALADOR PROFISSIONAL */}
          <button 
            onClick={async () => {
              try {
                toast.info("Preparando Instalador...");
                const res = await api.get('/api/inventario/download/agente', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'Nexus_Instalador.exe'); // 👈 AQUI MUDA O NOME
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success("Download do Instalador concluído!");
              } catch (e) {
                toast.error("Erro ao baixar. O arquivo instalador não está na pasta static do servidor.");
              }
            }}
            className="flex-shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 transform hover:scale-105 text-sm"
          >
            📥 Baixar Instalador (.EXE)
          </button>
        </div>
      </div>

      <div className="flex space-x-8 border-b overflow-x-auto custom-scrollbar" style={{ borderColor: 'var(--border-light)' }}>
        <button onClick={() => setAbaAtiva('usuarios')} className={`pb-4 text-sm font-black tracking-wide border-b-2 transition-all whitespace-nowrap ${abaAtiva === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>👥 Equipe & Usuários</button>
        <button onClick={() => setAbaAtiva('relatorios')} className={`pb-4 text-sm font-black tracking-wide border-b-2 transition-all whitespace-nowrap ${abaAtiva === 'relatorios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🏢 Dados da Empresa</button>
        <button onClick={() => setAbaAtiva('backup')} className={`pb-4 text-sm font-black tracking-wide border-b-2 transition-all whitespace-nowrap ${abaAtiva === 'backup' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🚀 Migração & Backup</button>
      </div>

      {abaAtiva === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 animate-fade-in">
          
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
      )}

      {abaAtiva === 'relatorios' && (
        <div className="pt-4 animate-fade-in">
          <div className="p-8 rounded-3xl border shadow-xl max-w-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>🏢</div>
              <div>
                <h3 className="font-black text-xl tracking-tight" style={{ color: 'var(--text-main)' }}>Identidade da Organização</h3>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Cabeçalhos oficiais de relatórios</p>
              </div>
            </div>
              
             <form onSubmit={salvarDadosEmpresa} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>NOME DA EMPRESA / INSTITUIÇÃO</label>
                  <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex: Secretaria de Tecnologia" className="w-full p-4 rounded-xl border outline-none font-black text-lg focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>CNPJ / DEPARTAMENTO (Opcional)</label>
                  <input value={doc} onChange={e => setDoc(e.target.value)} placeholder="Ex: 00.000.000/0001-00" className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                </div>
                
                <button type="submit" className="px-8 py-3 text-white rounded-xl font-black transition-all hover:bg-gray-800 shadow-lg active:scale-95 bg-gray-900 border border-gray-700">💾 Salvar Informações</button>
             </form>
          </div>
        </div>
      )}

      {abaAtiva === 'backup' && (
        <div className="pt-4 animate-fade-in space-y-8">
          <div className="p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-500 text-white" style={{ borderColor: 'var(--border-light)' }}>
            <div className="relative z-10">
              <h3 className="font-black text-2xl mb-1 tracking-tight">Cópia de Segurança (Backup)</h3>
              <p className="text-sm font-bold opacity-90">Faça o download do banco SQLite contendo todos os ativos e históricos.</p>
            </div>
            <button onClick={async () => { try { const res = await api.get('/api/backup/download', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `NEXUS_Backup_${new Date().toISOString().split('T')[0]}.db`); document.body.appendChild(link); link.click(); toast.success("Backup salvo com sucesso!"); } catch (e) { toast.error("Erro ao gerar backup."); } }} 
                    className="relative z-10 px-8 py-3.5 bg-white text-green-700 rounded-xl font-black shadow-2xl hover:scale-105 transition-all active:scale-95 whitespace-nowrap">Baixar Backup (.db) ⬇️</button>
          </div>

          <div>
            <h3 className="font-black text-2xl tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>Assistente de Migração</h3>
            <p className="text-sm font-bold opacity-50 uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Siga a ordem estrutural do banco de dados</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-blue-500 text-lg mb-6 shadow-inner" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>1</div>
                  <h4 className="font-black text-lg mb-2 tracking-tight" style={{ color: 'var(--color-blue)' }}>Locais & Setores</h4>
                  <p className="text-xs font-medium mb-6 leading-relaxed opacity-70" style={{ color: 'var(--text-main)' }}>Estrutura organizacional.<br/>Colunas: <code>Secretaria</code>, <code>Setor</code></p>
                  <input type="file" accept=".csv" ref={refLocais} onChange={(e) => setFileLocais(e.target.files[0])} className="w-full text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-main)' }} />
                </div>
                <button onClick={() => realizarUpload('locais', fileLocais, refLocais)} disabled={!fileLocais || loadingImport.locais} className="w-full py-3 rounded-xl font-black text-white shadow-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all">
                  {loadingImport.locais ? 'Enviando...' : 'Importar Locais'}
                </button>
              </div>

              <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-yellow-500 text-lg mb-6 shadow-inner" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>2</div>
                  <h4 className="font-black text-lg mb-2 tracking-tight" style={{ color: 'var(--color-yellow)' }}>Tipos de Equipamento</h4>
                  <p className="text-xs font-medium mb-6 leading-relaxed opacity-70" style={{ color: 'var(--text-main)' }}>Categorias e especificações.<br/>Colunas: <code>Nome</code>, <code>Campos</code></p>
                  <input type="file" accept=".csv" ref={refTipos} onChange={(e) => setFileTipos(e.target.files[0])} className="w-full text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-main)' }} />
                </div>
                <button onClick={() => realizarUpload('categorias', fileTipos, refTipos)} disabled={!fileTipos || loadingImport.tipos} className="w-full py-3 rounded-xl font-black text-white shadow-lg bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all">
                  {loadingImport.tipos ? 'Criando...' : 'Importar Tipos'}
                </button>
              </div>

              <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-red-500 text-lg mb-6 shadow-inner" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>3</div>
                  <h4 className="font-black text-lg mb-2 tracking-tight" style={{ color: 'var(--color-red)' }}>Inventário Geral</h4>
                  <p className="text-xs font-medium mb-6 leading-relaxed opacity-70" style={{ color: 'var(--text-main)' }}>Planilha mestre de ativos.<br/>Colunas: <code>Patrimonio</code>, <code>Status</code>, <code>Marca</code>...</p>
                  <input type="file" accept=".csv" ref={refAtivos} onChange={(e) => setFileAtivos(e.target.files[0])} className="w-full text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-main)' }} />
                </div>
                <button onClick={() => realizarUpload('ativos', fileAtivos, refAtivos)} disabled={!fileAtivos || loadingImport.ativos} className="w-full py-3 rounded-xl font-black text-white shadow-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all">
                  {loadingImport.ativos ? 'Injetando...' : 'Injetar Máquinas'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PRIVILÉGIOS COM AVATAR */}
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

      {/* MODAL DE EXCLUSÃO */}
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
    </div>
  );
}