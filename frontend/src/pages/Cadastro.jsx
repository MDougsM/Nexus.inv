import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

import AbaNovoCadastro from './AbaNovoCadastro';
import AbaManutencao from './AbaManutencao';
import ModaisEdicao from '../components/Cadastro/ModaisEdicao';
import ModaisOperacao from '../components/Cadastro/ModaisOperacao';
import { getNomeTipoEquipamento, getStatusBadge } from '../utils/helpers';
import BarraPesquisa from '../components/Cadastro/BarraPesquisa';
import BarraAcoesLote from '../components/Cadastro/BarraAcoesLote';
import TabelaInventario from '../components/Cadastro/TabelaInventario';

export default function Cadastro() {
  const [abaAtiva, setAbaAtiva] = useState('lista'); 
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  const location = useLocation();
  const [ativoClonado, setAtivoClonado] = useState(null);

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
    
    const matchBusca = termos.length === 0 || termos.some(termo => 
      a.patrimonio.toLowerCase().includes(termo) || 
      (a.marca && a.marca.toLowerCase().includes(termo)) || 
      (a.modelo && a.modelo.toLowerCase().includes(termo)) || 
      tipoNome.includes(termo) ||
      (a.secretaria && a.secretaria.toLowerCase().includes(termo)) || 
      (a.setor && a.setor.toLowerCase().includes(termo))              
    );
    
    // 🧠 NOVA LÓGICA DE FILTRO (Aceita ONLINE, OFFLINE e Status Normais)
    let matchStatus = true;
    if (filtroStatus === 'ONLINE' || filtroStatus === 'OFFLINE') {
      let isOnline = false;
      if (a.ultima_comunicacao) {
        const dataCom = new Date(a.ultima_comunicacao + 'Z');
        const diffDias = (new Date() - dataCom) / (1000 * 60 * 60 * 24);
        isOnline = diffDias < 3; // Regra dos 3 dias
      }
      matchStatus = (filtroStatus === 'ONLINE') ? isOnline : !isOnline;
    } else if (filtroStatus) {
      matchStatus = a.status?.toUpperCase() === filtroStatus.toUpperCase();
    }

    return matchBusca && matchStatus;
  });

  const totalPaginas = Math.ceil(ativosFiltrados.length / itensPorPagina);
  const ativosPaginaAtual = ativosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  
  const handleSelectAll = (e) => setSelecionados(e.target.checked ? ativosPaginaAtual.map(a => a.patrimonio) : []);
  const handleSelectOne = (e, pat) => setSelecionados(prev => e.target.checked ? [...prev, pat] : prev.filter(p => p !== pat));
  const getAtivosSelecionadosObj = () => ativos.filter(a => selecionados.includes(a.patrimonio));

  const abrirFicha = async (patrimonio) => { 
    try { 
      // Codifica a barra (/) de S/P_ para a web entender sem quebrar a URL
      const patrimonioSeguro = encodeURIComponent(patrimonio);
      const res = await api.get(`/api/inventario/ficha/detalhes/${patrimonioSeguro}`);
      setModalFicha({ aberto: true, dados: res.data }); 
    } catch (e) { 
      toast.error("Erro ao carregar a ficha da máquina."); 
      console.error(e);
    } 
  };
  
  const abrirEdicao = (ativo) => { let din = {}; if (typeof ativo.dados_dinamicos === 'string') { try { din = JSON.parse(ativo.dados_dinamicos); } catch(e){} } else if (ativo.dados_dinamicos) { din = ativo.dados_dinamicos; } setModalEdicao({ aberto: true, ativo, form: { ...ativo, dados_dinamicos: din }}); };

  const exportarParaExcel = () => {
    if (ativosFiltrados.length === 0) return toast.warn("Nenhum dado para exportar.");
    
    // Cabeçalhos das colunas
    let csv = "Patrimônio;Status;Equipamento;Marca;Modelo;Secretaria;Setor\n";
    
    // Preenchendo as linhas com os dados filtrados
    ativosFiltrados.forEach(a => {
      const catNome = getNomeTipoEquipamento(a, categorias) || 'Sem Categoria';
      // Limpando textos para evitar quebra de linha do CSV
      const sec = (a.secretaria || '').replace(/;/g, ',');
      const set = (a.setor || '').replace(/;/g, ',');
      const mar = (a.marca || '').replace(/;/g, ',');
      const mod = (a.modelo || '').replace(/;/g, ',');
      
      csv += `${a.patrimonio};${a.status};${catNome};${mar};${mod};${sec};${set}\n`;
    });
    
    // Criando o arquivo com suporte a acentuação (UTF-8 BOM)
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Inventario_Nexus_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Planilha gerada com ${ativosFiltrados.length} registros! 📊`);
  };

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
          
          {/* BARRA DE PESQUISA MODULARIZADA */}
          <BarraPesquisa 
            buscaGeral={buscaGeral} 
            setBuscaGeral={setBuscaGeral}
            filtroStatus={filtroStatus} 
            setFiltroStatus={setFiltroStatus}
            setPaginaAtual={setPaginaAtual}
            exportarParaExcel={exportarParaExcel}
          />

          {/* BARRA DE AÇÕES EM LOTE MODULARIZADA */}
          <BarraAcoesLote 
            selecionados={selecionados}
            setSelecionados={setSelecionados}
            ativosFiltrados={ativosFiltrados}
            setModalQRLote={setModalQRLote}
            setModalTransferencia={setModalTransferencia}
            setModalEdicaoMassa={setModalEdicaoMassa}
            setModalStatus={setModalStatus}
            setModalExcluir={setModalExcluir}
            setMotivoExclusao={setMotivoExclusao}
          />

          <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="overflow-x-auto min-h-[400px]">
              
              {/* TABELA PRINCIPAL MODULARIZADA */}
          <TabelaInventario 
            ativosPaginaAtual={ativosPaginaAtual}
            selecionados={selecionados}
            handleSelectAll={handleSelectAll}
            handleSelectOne={handleSelectOne}
            categorias={categorias}
            dropdownAberto={dropdownAberto}
            setDropdownAberto={setDropdownAberto}
            abrirFicha={abrirFicha}
            setModalQR={setModalQR}
            setAtivoClonado={setAtivoClonado}
            setAbaAtiva={setAbaAtiva}
            abrirEdicao={abrirEdicao}
            setModalTransferencia={setModalTransferencia}
            setModalStatus={setModalStatus}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            setModalExcluir={setModalExcluir}
            setMotivoExclusao={setMotivoExclusao}
          />
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

      {abaAtiva === 'novo' && <AbaNovoCadastro categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setAbaAtiva={setAbaAtiva} ativoClonado={ativoClonado} setAtivoClonado={setAtivoClonado} ativos={ativos} />}
      {abaAtiva === 'manutencao' && <AbaManutencao historicoManut={historicoManut} carregarDados={carregarDados} />}

      {/* COMPONENTES DE MODAIS EXECUTANDO EM SEGUNDO PLANO */}
      <ModaisEdicao modalEdicao={modalEdicao} setModalEdicao={setModalEdicao} modalEdicaoMassa={modalEdicaoMassa} setModalEdicaoMassa={setModalEdicaoMassa} categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setSelecionados={setSelecionados} ativos={ativos} />
      <ModaisOperacao modalFicha={modalFicha} setModalFicha={setModalFicha} modalQR={modalQR} setModalQR={setModalQR} modalQRLote={modalQRLote} setModalQRLote={setModalQRLote} modalStatus={modalStatus} setModalStatus={setModalStatus} formStatus={formStatus} setFormStatus={setFormStatus} modalTransferencia={modalTransferencia} setModalTransferencia={setModalTransferencia} formTransfer={formTransfer} setFormTransfer={setFormTransfer} modalExcluir={modalExcluir} setModalExcluir={setModalExcluir} motivoExclusao={motivoExclusao} setMotivoExclusao={setMotivoExclusao} categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setSelecionados={setSelecionados} />
    </div>
  );
}