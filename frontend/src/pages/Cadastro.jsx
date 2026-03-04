import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

import AbaNovoCadastro from './AbaNovoCadastro';
import AbaManutencao from './AbaManutencao';
import ModaisEdicao from '../components/Cadastro/ModaisEdicao';
import ModaisOperacao from '../components/Cadastro/ModaisOperacao';
import { getNomeTipoEquipamento, getStatusBadge } from '../utils/helpers';

export default function Cadastro() {
  const [abaAtiva, setAbaAtiva] = useState('lista'); 
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  const location = useLocation();

  const [ativos, setAtivos] = useState([]);
  const [historicoManut, setHistoricoManut] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [selecionados, setSelecionados] = useState([]); 
  const [dropdownAberto, setDropdownAberto] = useState(null); 

  const [modalFicha, setModalFicha] = useState({ aberto: false, dados: null });
  const [modalQR, setModalQR] = useState({ aberto: false, ativo: null });
  const [modalQRLote, setModalQRLote] = useState({ aberto: false, ativos: [] }); 
  const [modalEdicao, setModalEdicao] = useState({ aberto: false, ativo: null, form: {dados_dinamicos:{}} });
  const [modalEdicaoMassa, setModalEdicaoMassa] = useState({ aberto: false, ativos: [] });
  const [modalStatus, setModalStatus] = useState({ aberto: false, ativos: [] });
  const [formStatus, setFormStatus] = useState({ novo_status: 'MANUTENÇÃO', os_referencia: '', motivo: '', destino: '' });
  const [modalTransferencia, setModalTransferencia] = useState({ aberto: false, ativos: [] });
  const [formTransfer, setFormTransfer] = useState({ nova_secretaria: '', novo_setor: '', motivo: '' });
  const [modalExcluir, setModalExcluir] = useState({ aberto: false, ativos: [] });
  const [motivoExclusao, setMotivoExclusao] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resAtivos, resCat, resSec, resManut] = await Promise.all([ api.get('/api/inventario/'), api.get('/api/inventario/categorias'), api.get('/api/unidades/secretarias'), api.get('/api/manutencao/historico') ]);
      setAtivos(resAtivos.data); setCategorias(resCat.data); setSecretarias(resSec.data); setHistoricoManut(resManut.data);
    } catch (e) { toast.error('Erro ao conectar.'); } finally { setLoading(false); }
  };

// ATUALIZE ESTA PARTE NO SEU CADASTRO.JSX
  useEffect(() => {
    carregarDados();
    const params = new URLSearchParams(location.search);
    
    // Filtro normal de busca
    if (params.get('busca')) {
      setBuscaGeral(params.get('busca'));
    }
    
    // FILTRO DA NOTIFICAÇÃO: Se vier um filtro de status pela URL
    const statusURL = params.get('filtroStatus');
    if (statusURL) {
      setFiltroStatus(statusURL.toUpperCase());
      setPaginaAtual(1);
    }
  }, [location]); // Agora ele monitora a URL (location)

  const ativosFiltrados = ativos.filter(a => {
    const termos = buscaGeral.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const tipoNome = getNomeTipoEquipamento(a, categorias)?.toLowerCase() || '';
    const matchBusca = termos.length === 0 || termos.some(termo => a.patrimonio.toLowerCase().includes(termo) || (a.marca && a.marca.toLowerCase().includes(termo)) || (a.modelo && a.modelo.toLowerCase().includes(termo)) || tipoNome.includes(termo));
    const matchStatus = filtroStatus ? (a.status?.toUpperCase() === filtroStatus.toUpperCase()) : true;
    return matchBusca && matchStatus;
  });

  const totalPaginas = Math.ceil(ativosFiltrados.length / itensPorPagina);
  const ativosPaginaAtual = ativosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  
  const handleSelectAll = (e) => setSelecionados(e.target.checked ? ativosPaginaAtual.map(a => a.patrimonio) : []);
  const handleSelectOne = (e, pat) => setSelecionados(prev => e.target.checked ? [...prev, pat] : prev.filter(p => p !== pat));
  const getAtivosSelecionadosObj = () => ativos.filter(a => selecionados.includes(a.patrimonio));

  const abrirFicha = async (patrimonio) => { try { setModalFicha({ aberto: true, dados: (await api.get(`/api/inventario/ficha/detalhes/${patrimonio}`)).data }); } catch (e) { toast.error("Erro."); } };
  const abrirEdicao = (ativo) => { let din = {}; if (typeof ativo.dados_dinamicos === 'string') { try { din = JSON.parse(ativo.dados_dinamicos); } catch(e){} } else if (ativo.dados_dinamicos) { din = ativo.dados_dinamicos; } setModalEdicao({ aberto: true, ativo, form: { ...ativo, dados_dinamicos: din }}); };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative pb-10">
      
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Gestão de Equipamentos</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Busque múltiplos ativos, movimente em lote ou registre manutenções.</p>
      </div>

      <div className="flex space-x-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <button onClick={() => setAbaAtiva('lista')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'lista' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span>🔍</span> Busca e Gestão</button>
        <button onClick={() => setAbaAtiva('novo')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'novo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span>➕</span> Novo Cadastro</button>
        <button onClick={() => setAbaAtiva('manutencao')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'manutencao' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span>📜</span> Histórico & Descartes</button>
      </div>

      {abaAtiva === 'lista' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* BARRA DE PESQUISA ORIGINAL */}
          <div className="p-4 rounded-xl shadow-sm border flex flex-col lg:flex-row gap-4 items-end" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>PESQUISA MÚLTIPLA (Ex: PC-01, Lousa-02)</label>
                <input type="text" placeholder="Separe os itens por vírgula..." value={buscaGeral} onChange={(e) => {setBuscaGeral(e.target.value); setPaginaAtual(1);}} className="w-full p-2.5 rounded-lg border outline-none text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>STATUS</label>
                <select value={filtroStatus} onChange={(e) => {setFiltroStatus(e.target.value); setPaginaAtual(1);}} className="w-full p-2.5 rounded-lg border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}><option value="">Todos</option><option value="ATIVO">Ativos</option><option value="MANUTENÇÃO">Manutenção</option><option value="SUCATA">Sucata (Descartados)</option></select>
              </div>
            </div>
          </div>

          {/* BARRA DE AÇÕES EM LOTE ORIGINAL */}
          {selecionados.length > 0 && (
            <div className="p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                ☑️ {selecionados.length} iten(s) selecionado(s)
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setModalQRLote({ aberto: true, ativos: getAtivosSelecionadosObj() })} className="px-4 py-2.5 rounded font-bold border transition-colors hover:bg-gray-50 text-xs shadow-sm" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>🖨️ Imprimir QRs</button>
                <button onClick={() => setModalTransferencia({ aberto: true, ativos: getAtivosSelecionadosObj() })} className="px-4 py-2.5 rounded font-bold border transition-colors hover:bg-gray-50 text-xs shadow-sm" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>🚚 Transferir</button>
                <button onClick={() => setModalStatus({ aberto: true, ativos: getAtivosSelecionadosObj() })} className="px-4 py-2.5 rounded font-bold border transition-colors hover:bg-gray-50 text-xs shadow-sm" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>🛠️ Mudar Status</button>
                <div className="hidden sm:block border-l mx-1" style={{ borderColor: 'var(--border-light)' }}></div>
                <button onClick={() => setModalEdicaoMassa({ aberto: true, ativos: getAtivosSelecionadosObj() })} className="px-4 py-2.5 rounded font-bold border transition-colors hover:bg-gray-50 text-xs shadow-sm" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>✏️ Editar Lote</button>
                <button onClick={() => { setModalExcluir({ aberto: true, ativos: getAtivosSelecionadosObj() }); setMotivoExclusao(''); }} className="px-4 py-2.5 rounded font-bold border transition-colors text-xs shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200" style={{ borderColor: 'var(--border-light)', color: 'var(--color-red)' }}>🗑️ Excluir</button>
              </div>
            </div>
          )}

          <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm">
                <thead style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
                  <tr>
                    <th className="p-4 w-10"><input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selecionados.length === ativosPaginaAtual.length && ativosPaginaAtual.length > 0} onChange={handleSelectAll} /></th>
                    <th className="p-4 font-semibold">Patrimônio</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Equipamento</th>
                    <th className="p-4 font-semibold">Localização</th>
                    <th className="p-4 font-semibold text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan="6" className="p-8 text-center text-muted">Carregando...</td></tr> : ativosPaginaAtual.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-muted">Nenhum equipamento encontrado.</td></tr> :
                   ativosPaginaAtual.map(ativo => (
                    <tr key={ativo.id} className="border-b last:border-0 transition-colors" style={{ borderColor: 'var(--border-light)', backgroundColor: selecionados.includes(ativo.patrimonio) ? 'rgba(85, 110, 230, 0.05)' : 'transparent' }}>
                      <td className="p-4"><input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selecionados.includes(ativo.patrimonio)} onChange={(e) => handleSelectOne(e, ativo.patrimonio)} /></td>
                      <td className="p-4 font-mono font-bold" style={{ color: 'var(--color-blue)' }}>{ativo.patrimonio}</td>
                      <td className="p-4">{getStatusBadge(ativo.status)}</td>
                      <td className="p-4"><div className="font-bold" style={{color: 'var(--text-main)'}}>{getNomeTipoEquipamento(ativo, categorias) || '-'}</div><div className="text-xs" style={{color:'var(--text-muted)'}}>{ativo.marca} {ativo.modelo}</div></td>
                      <td className="p-4"><div className="font-bold text-xs" style={{color: 'var(--text-main)'}}>{ativo.secretaria || 'N/A'}</div><div className="text-xs" style={{color:'var(--text-muted)'}}>{ativo.setor || 'N/A'}</div></td>
                      
                      {/* O MENU DROPDOWN ORIGINAL RESTAURADO! */}
                      <td className="p-4 flex justify-center items-center gap-2 relative">
                        <button onClick={() => abrirFicha(ativo.patrimonio)} title="Ficha Completa" className="p-1.5 rounded transition-colors hover:bg-gray-100 border text-gray-500 hover:text-gray-800" style={{ borderColor: 'var(--border-light)' }}>👁️</button>
                        <button onClick={() => setModalQR({ aberto: true, ativo })} title="Imprimir Etiqueta" className="p-1.5 rounded transition-colors hover:bg-gray-100 border text-gray-500 hover:text-gray-800" style={{ borderColor: 'var(--border-light)' }}>🖨️</button>
                        
                        <div>
                          <button onClick={() => setDropdownAberto(dropdownAberto === ativo.id ? null : ativo.id)} className="flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold transition-colors hover:bg-gray-50" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                            Opções ▾
                          </button>
                          
                          {dropdownAberto === ativo.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setDropdownAberto(null)}></div>
                              <div className="absolute right-8 top-10 w-48 rounded-lg border shadow-xl z-50 py-1 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                                <button onClick={() => {abrirEdicao(ativo); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 font-medium" style={{ color: 'var(--text-main)' }}>✏️ Editar Cadastro</button>
                                <button onClick={() => {setModalTransferencia({ aberto: true, ativos: [ativo] }); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 font-medium" style={{ color: 'var(--text-main)' }}>🚚 Transferir Local</button>
                                <button onClick={() => {setModalStatus({ aberto: true, ativos: [ativo] }); setFormStatus({...formStatus, novo_status: ativo.status === 'MANUTENÇÃO' ? 'ATIVO' : 'MANUTENÇÃO'}); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 font-medium" style={{ color: 'var(--text-main)' }}>🛠️ Alterar Status</button>
                                <div className="border-t my-1" style={{ borderColor: 'var(--border-light)' }}></div>
                                <button onClick={() => {setModalExcluir({ aberto: true, ativos: [ativo] }); setMotivoExclusao(''); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-50 font-bold" style={{ color: 'var(--color-red)' }}>🗑️ Excluir Definitivo</button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO ORIGINAL */}
            <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-light)' }}>
              <div className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                Mostrar: 
                <select value={itensPorPagina} onChange={(e) => {setItensPorPagina(Number(e.target.value)); setPaginaAtual(1);}} className="ml-2 p-1.5 rounded border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                  <option value={10}>10</option><option value={50}>50</option><option value={100}>100</option><option value={200}>200</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="px-3 py-1.5 rounded border disabled:opacity-50 text-sm font-bold shadow-sm hover:bg-gray-50" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>Anterior</button>
                <span className="text-sm font-bold px-2" style={{ color: 'var(--text-muted)' }}>Pág {paginaAtual} de {totalPaginas || 1}</span>
                <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas || totalPaginas === 0} className="px-3 py-1.5 rounded border disabled:opacity-50 text-sm font-bold shadow-sm hover:bg-gray-50" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>Próxima</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {abaAtiva === 'novo' && <AbaNovoCadastro categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setAbaAtiva={setAbaAtiva} />}
      {abaAtiva === 'manutencao' && <AbaManutencao historicoManut={historicoManut} />}

      {/* COMPONENTES DE MODAIS EXECUTANDO EM SEGUNDO PLANO */}
      <ModaisEdicao modalEdicao={modalEdicao} setModalEdicao={setModalEdicao} modalEdicaoMassa={modalEdicaoMassa} setModalEdicaoMassa={setModalEdicaoMassa} categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setSelecionados={setSelecionados} />
      <ModaisOperacao modalFicha={modalFicha} setModalFicha={setModalFicha} modalQR={modalQR} setModalQR={setModalQR} modalQRLote={modalQRLote} setModalQRLote={setModalQRLote} modalStatus={modalStatus} setModalStatus={setModalStatus} formStatus={formStatus} setFormStatus={setFormStatus} modalTransferencia={modalTransferencia} setModalTransferencia={setModalTransferencia} formTransfer={formTransfer} setFormTransfer={setFormTransfer} modalExcluir={modalExcluir} setModalExcluir={setModalExcluir} motivoExclusao={motivoExclusao} setMotivoExclusao={setMotivoExclusao} categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setSelecionados={setSelecionados} />
    </div>
  );
}