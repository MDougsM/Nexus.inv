import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import AbaNovoCadastro from './AbaNovoCadastro';
import AbaManutencao from './AbaManutencao';
import ModaisEdicao from '../components/Cadastro/ModaisEdicao';
import ModaisOperacao from '../components/Cadastro/ModaisOperacao';
import { getNomeTipoEquipamento, getStatusExibido, getStatusPriority } from '../utils/helpers';
import BarraPesquisa from '../components/Cadastro/BarraPesquisa';
import BarraAcoesLote from '../components/Cadastro/BarraAcoesLote';
import TabelaInventario from '../components/Cadastro/TabelaInventario';
import TerminalRemoto from '../components/Cadastro/TerminalRemoto';
import MapaRede from '../components/MapaRede';

export default function Cadastro() {
  if (localStorage.getItem('empresa') === 'NEXUS_MASTER') return null;
  const [abaAtiva, setAbaAtiva] = useState('lista'); 
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  const location = useLocation();
  const [ativoClonado, setAtivoClonado] = useState(null);

  const [ativos, setAtivos] = useState([]);
  const [historicoManut, setHistoricoManut] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DO PAINEL DE FILTROS
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAgente, setFiltroAgente] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  
  // 🚀 NOVOS ESTADOS: Multi-select para Secretarias e Setores
  const [filtroSecretarias, setFiltroSecretarias] = useState([]);
  const [filtroSetores, setFiltroSetores] = useState([]);

  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [selecionados, setSelecionados] = useState([]); 
  const [dropdownAberto, setDropdownAberto] = useState(null); 

  const [modalFicha, setModalFicha] = useState({ aberto: false, dados: null });
  const [modalQR, setModalQR] = useState({ aberto: false, ativo: null });
  const [modalQRLote, setModalQRLote] = useState({ aberto: false, ativos: [] }); 
  const [modalEdicao, setModalEdicao] = useState({ aberto: false, ativo: null, form: {dados_dinamicos:{}} });
  const [modalEdicaoMassa, setModalEdicaoMassa] = useState({ aberto: false, ativos: [] });
  const [modalTerminal, setModalTerminal] = useState({ aberto: false, ativo: null });
  const [modalStatus, setModalStatus] = useState({ aberto: false, ativos: [] });
  const [formStatus, setFormStatus] = useState({ novo_status: 'MANUTENÇÃO', os_referencia: '', motivo: '', destino: '' });
  const [modalTransferencia, setModalTransferencia] = useState({ aberto: false, ativos: [] });
  const [formTransfer, setFormTransfer] = useState({ nova_secretaria: '', novo_setor: '', motivo: '' });
  const [modalExcluir, setModalExcluir] = useState({ aberto: false, ativos: [] });
  const [motivoExclusao, setMotivoExclusao] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resAtivos, resCat, resSec, resManut] = await Promise.all([ 
        api.get('/api/inventario/'), api.get('/api/inventario/categorias'), 
        api.get('/api/unidades/'), api.get('/api/manutencao/historico') 
      ]);
      setAtivos(resAtivos.data); 
      setCategorias(resCat.data); 
      setSecretarias(resSec.data); 
      setHistoricoManut(resManut.data);
    } catch (e) { toast.error('Erro ao conectar.'); } finally { setLoading(false); }
  };

  useEffect(() => {
    carregarDados();
    const params = new URLSearchParams(location.search);
    if (params.get('busca')) setBuscaGeral(params.get('busca'));
    if (params.get('filtroStatus')) {
      const s = params.get('filtroStatus').toUpperCase();
      if (s === 'ONLINE' || s === 'OFFLINE') setFiltroAgente(s);
      else setFiltroStatus(s);
      setPaginaAtual(1);
    }
  }, [location]);

  // =========================================================================
  // 🧠 OPÇÕES DINÂMICAS PARA OS DROPDOWNS
  // =========================================================================
  const opcoesCategorias = useMemo(() => [...new Set(ativos.map(a => getNomeTipoEquipamento(a, categorias)))].filter(Boolean).sort(), [ativos, categorias]);
  const opcoesMarcas = useMemo(() => [...new Set(ativos.map(a => a.marca))].filter(Boolean).sort(), [ativos]);
  
  const secretariasDisponiveis = useMemo(() => {
    return [...new Set(ativos.map(a => a.unidade?.nome || a.secretaria || 'Não Alocado'))].filter(Boolean).sort();
  }, [ativos]);

  const setoresDisponiveis = useMemo(() => {
    let ativosBase = ativos;
    if (filtroSecretarias.length > 0) {
      ativosBase = ativos.filter(a => filtroSecretarias.includes(a.unidade?.nome || a.secretaria || 'Não Alocado'));
    }
    return [...new Set(ativosBase.map(a => a.unidade?.tipo || a.setor || 'Sem Setor'))].filter(Boolean).sort();
  }, [ativos, filtroSecretarias]);

  const verificarOnline = (ultima_comunicacao) => {
    if (!ultima_comunicacao) return false;
    return ((new Date() - new Date(ultima_comunicacao + 'Z')) / (1000 * 60)) < 4320;
  };

  // =========================================================================
  // 🎯 MOTOR DE FILTRAGEM FINAL
  // =========================================================================
  const ativosFiltrados = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    let resultado = ativos;

    // 1. Status e Agente (com a lógica de Desaparecidos)
    if (filtroStatus === 'ATIVO') {
      resultado = resultado.filter(a => {
         if (a.status?.toUpperCase() !== 'ATIVO' && a.status?.toUpperCase() !== 'ONLINE') return false;
         if (!a.ultima_atualizacao) return false;
         const anoData = new Date(a.ultima_atualizacao + (a.ultima_atualizacao.includes('Z') ? '' : 'Z')).getFullYear();
         return anoData === anoAtual;
      });
    } else if (filtroStatus === 'DESAPARECIDOS') {
      resultado = resultado.filter(a => {
         if (a.status?.toUpperCase() !== 'ATIVO' && a.status?.toUpperCase() !== 'ONLINE') return false;
         if (!a.ultima_atualizacao) return true;
         const anoData = new Date(a.ultima_atualizacao + (a.ultima_atualizacao.includes('Z') ? '' : 'Z')).getFullYear();
         return anoData < anoAtual;
      });
    } else if (filtroStatus) {
      resultado = resultado.filter(a => (a.status?.toUpperCase() || 'ATIVO') === filtroStatus);
    }

    if (filtroAgente) {
      resultado = resultado.filter(a => {
        const online = verificarOnline(a.ultima_comunicacao);
        if (filtroAgente === 'ONLINE') return online;
        if (filtroAgente === 'OFFLINE') return !online;
        return true;
      });
    }

    // 2. Categoria e Marca
    if (filtroCategoria) resultado = resultado.filter(a => (getNomeTipoEquipamento(a, categorias) || '') === filtroCategoria);
    if (filtroMarca) resultado = resultado.filter(a => a.marca === filtroMarca);

    // 3. 🚀 Filtro Múltiplo: Secretarias
    if (filtroSecretarias.length > 0) {
      resultado = resultado.filter(a => filtroSecretarias.includes(a.unidade?.nome || a.secretaria || 'Não Alocado'));
    }

    // 4. 🚀 Filtro Múltiplo: Setores
    if (filtroSetores.length > 0) {
      resultado = resultado.filter(a => filtroSetores.includes(a.unidade?.tipo || a.setor || 'Sem Setor'));
    }

    // 5. Busca Geral Livre
    if (buscaGeral) {
      const termos = buscaGeral.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      resultado = resultado.filter(a => {
        const tipoNome = getNomeTipoEquipamento(a, categorias)?.toLowerCase() || '';
        let dinStr = '';
        try { dinStr = typeof a.dados_dinamicos === 'object' ? JSON.stringify(a.dados_dinamicos) : String(a.dados_dinamicos || ''); } catch(e){}
        const stringTotal = `${a.patrimonio} ${a.marca} ${a.modelo} ${a.nome_personalizado} ${tipoNome} ${a.secretaria} ${a.setor} ${dinStr}`.toLowerCase();
        return termos.every(termo => stringTotal.includes(termo));
      });
    }

    // Ordenação Final (Maior prioridade primeiro, depois Data)
    return resultado.sort((a, b) => {
      const pA = getStatusPriority(getStatusExibido(a));
      const pB = getStatusPriority(getStatusExibido(b));
      if (pA !== pB) return pA - pB;
      const dataA = a.ultima_atualizacao ? new Date(a.ultima_atualizacao) : new Date(0);
      const dataB = b.ultima_atualizacao ? new Date(b.ultima_atualizacao) : new Date(0);
      return dataB - dataA;
    });
  }, [ativos, filtroStatus, filtroAgente, filtroCategoria, filtroMarca, filtroSecretarias, filtroSetores, buscaGeral, categorias]);

  // =========================================================================
  // 📄 PAGINAÇÃO E SELEÇÃO
  // =========================================================================
  const totalPaginas = Math.ceil(ativosFiltrados.length / itensPorPagina) || 1;
  const ativosPaginaAtual = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return ativosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [ativosFiltrados, paginaAtual, itensPorPagina]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const novos = e.target.list.map(a => a.patrimonio);
      setSelecionados([...new Set([...selecionados, ...novos])]);
    } else {
      const remover = e.target.list.map(a => a.patrimonio);
      setSelecionados(selecionados.filter(s => !remover.includes(s)));
    }
  };

  const handleSelectOne = (e, patrimonio) => {
    if (e.target.checked) setSelecionados([...selecionados, patrimonio]);
    else setSelecionados(selecionados.filter(s => s !== patrimonio));
  };

  // =========================================================================
  // 🛠️ FUNÇÕES DE MODAIS
  // =========================================================================
  const parseJSONSeguro = (dado) => {
      if (!dado) return {};
      if (typeof dado === 'object') return dado;
      try { return JSON.parse(dado.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true')); } 
      catch(e) { return {}; }
  };

  const normalizarDinamicosParaModais = (din, uuid_persistente, modelo) => {
      const n = { ...din };
      n.ip = n.ip || n.IP || n['Endereço IP'] || '';
      n.hostname = n.hostname || n.Hostname || n.Modelo || modelo || '';
      n.serial = n.serial || n.Serial || n['Número de Série'] || uuid_persistente || '';
      n.paginas_totais = n.paginas_totais || n['Páginas Impressas'] || '';
      n.toner = n.toner || n['% Toner'] || '';
      n.cilindro = n.cilindro || n['% Drum'] || '';
      n.IP = n.ip; n.Hostname = n.hostname; n.Serial = n.serial; n['Páginas Impressas'] = n.paginas_totais; n['% Toner'] = n.toner; n['% Drum'] = n.cilindro;
      return n;
  };

  const abrirFicha = async (patrimonio) => { 
    try { 
      const res = await api.get(`/api/inventario/ficha/detalhes/${encodeURIComponent(patrimonio)}`);
      let payload = res.data;
      if (payload.ativo) {
          let din = parseJSONSeguro(payload.ativo.dados_dinamicos);
          payload.ativo.dados_dinamicos = normalizarDinamicosParaModais(din, payload.ativo.uuid_persistente, payload.ativo.modelo);
      }
      setModalFicha({ aberto: true, dados: payload }); 
    } catch (e) { toast.error("Erro ao carregar a ficha."); } 
  };
  
  const abrirEdicao = (ativo, e) => { 
    if(e) e.stopPropagation(); 
    let din = parseJSONSeguro(ativo.dados_dinamicos);
    let dinAdaptado = normalizarDinamicosParaModais(din, ativo.uuid_persistente, ativo.modelo);
    setModalEdicao({ 
      aberto: true, 
      ativo, 
      form: { 
        ...ativo, 
        nome_personalizado: ativo.nome_personalizado || '', 
        dados_dinamicos: dinAdaptado 
      } 
    }); 
  };

  // =========================================================================
  // 📊 EXPORTAÇÃO DE DADOS
  // =========================================================================
  const exportarParaExcel = () => {
    if (ativosFiltrados.length === 0) return toast.warn("Nenhum dado para exportar.");
    const ativosExportar = selecionados.length > 0 ? ativosFiltrados.filter(a => selecionados.includes(a.patrimonio)) : ativosFiltrados;

    let chavesDinamicas = new Set();
    const ativosComDinamicos = ativosExportar.map(a => {
       const dyn = parseJSONSeguro(a.dados_dinamicos);
       Object.keys(dyn).forEach(k => chavesDinamicas.add(k));
       return { ...a, dynParsed: dyn };
    });
    const colunasExtras = Array.from(chavesDinamicas).sort();

    let csv = "Patrimônio;Status;Equipamento;Marca;Modelo;Nome/Apelido;Equip. Próprio;Secretaria;Setor";
    if (colunasExtras.length > 0) csv += ";" + colunasExtras.join(";");
    csv += "\n";

    ativosComDinamicos.forEach(a => {
      const catNome = getNomeTipoEquipamento(a, categorias) || 'Sem Categoria';
      const sec = (a.secretaria || '').replace(/;/g, ',');
      const set = (a.setor || '').replace(/;/g, ',');
      const mar = (a.marca || '').replace(/;/g, ',');
      const mod = (a.modelo || '').replace(/;/g, ',');
      const apelido = (a.nome_personalizado || '').replace(/;/g, ',');
      const proprio = a.dominio_proprio ? 'SIM' : 'NÃO';
      
      let linha = `${a.patrimonio};${a.status};${catNome};${mar};${mod};${apelido};${proprio};${sec};${set}`;
      
      colunasExtras.forEach(col => {
          const val = (a.dynParsed[col] || '').toString().replace(/;/g, ',');
          linha += `;${val}`;
      });
      csv += linha + "\n";
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Inventario_Nexus_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Planilha gerada com ${ativosExportar.length} registros e todos os detalhes! 📊`);
  };

  const exportarParaPDF = () => {
    if (ativosFiltrados.length === 0) return toast.warn("Nenhum dado para exportar.");
    const ativosExportar = selecionados.length > 0 ? ativosFiltrados.filter(a => selecionados.includes(a.patrimonio)) : ativosFiltrados;

    const empresaNome = localStorage.getItem('empresaNome') || 'Nexus Inventory';
    const empresaDoc = localStorage.getItem('empresaDoc') || '';
    const agora = new Date();
    const dataArquivo = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text(empresaNome, 14, 18);
    doc.setFontSize(10);
    if (empresaDoc) doc.text(empresaDoc, 14, 26);
    doc.text(`Relatório Detalhado de Equipamentos - ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`, 14, empresaDoc ? 36 : 26);

    const formatarDetalhes = (ativo) => {
      let linhas = [];
      if (ativo.nome_personalizado) linhas.push(`Apelido: ${ativo.nome_personalizado}`);
      if (ativo.dominio_proprio) linhas.push(`[Equipamento Próprio]`);
      const dyn = parseJSONSeguro(ativo.dados_dinamicos);
      if (dyn && typeof dyn === 'object') {
        Object.entries(dyn).forEach(([key, val]) => {
          if (val && val !== '-' && val !== 'N/A' && val !== '') linhas.push(`${key}: ${val}`);
        });
      }
      return linhas.length > 0 ? linhas.join('\n') : 'Sem detalhes extras';
    };

    const headers = [["Patrimônio", "Equipamento", "Localização", "Status", "Especificações Técnicas"]];
    const body = ativosExportar.map(a => [
      a.patrimonio || '-',
      `${getNomeTipoEquipamento(a, categorias) || 'Sem Categoria'}\n${a.marca || '-'} ${a.modelo || '-'}`,
      `${a.secretaria || '-'}\nSetor: ${a.setor || '-'}`,
      a.status || '-',
      formatarDetalhes(a)
    ]);

    autoTable(doc, {
      head: headers,
      body,
      startY: empresaDoc ? 42 : 34,
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: '#2563EB', textColor: '#ffffff', fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' } 
      },
      alternateRowStyles: { fillColor: '#F8FAFC' },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Inventario_Nexus_${dataArquivo}.pdf`);
    toast.success(`PDF gerado com ${ativosExportar.length} registros e especificações completas! 📄`);
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
        <button onClick={() => setAbaAtiva('mapa')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'mapa' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span>🕸️</span> Topologia de Rede</button>
      </div>

      {abaAtiva === 'lista' && (
        <div className="space-y-4 animate-fade-in">
          
          <BarraPesquisa 
            buscaGeral={buscaGeral} setBuscaGeral={setBuscaGeral}
            filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
            filtroAgente={filtroAgente} setFiltroAgente={setFiltroAgente}
            filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria}
            filtroMarca={filtroMarca} setFiltroMarca={setFiltroMarca}
            
            // 🚀 Aqui passamos os novos estados para a Barra de Pesquisa:
            filtroSecretarias={filtroSecretarias} setFiltroSecretarias={setFiltroSecretarias}
            filtroSetores={filtroSetores} setFiltroSetores={setFiltroSetores}
            secretariasDisponiveis={secretariasDisponiveis} setoresDisponiveis={setoresDisponiveis}
            
            opcoesCategorias={opcoesCategorias} opcoesMarcas={opcoesMarcas} 
            setPaginaAtual={setPaginaAtual} exportarParaExcel={exportarParaExcel} exportarParaPDF={exportarParaPDF} totalFiltrados={ativosFiltrados.length}
          />

          <BarraAcoesLote 
            selecionados={selecionados} setSelecionados={setSelecionados} ativosFiltrados={ativosFiltrados}
            setModalQRLote={setModalQRLote} setModalTransferencia={setModalTransferencia} setModalEdicaoMassa={setModalEdicaoMassa}
            setModalStatus={setModalStatus} setModalExcluir={setModalExcluir} setMotivoExclusao={setMotivoExclusao}
          />

          <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="overflow-x-auto min-h-[400px]">
              <TabelaInventario 
                ativosPaginaAtual={ativosPaginaAtual} selecionados={selecionados}
                handleSelectAll={handleSelectAll} handleSelectOne={handleSelectOne}
                categorias={categorias} dropdownAberto={dropdownAberto} setDropdownAberto={setDropdownAberto}
                abrirFicha={abrirFicha} setModalQR={setModalQR} setAtivoClonado={setAtivoClonado}
                setAbaAtiva={setAbaAtiva} abrirEdicao={abrirEdicao} setModalTransferencia={setModalTransferencia}
                setModalStatus={setModalStatus} formStatus={formStatus} setFormStatus={setFormStatus}
                setModalExcluir={setModalExcluir} setMotivoExclusao={setMotivoExclusao} setModalTerminal={setModalTerminal}
              />
            </div>

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
      {abaAtiva === 'mapa' && <div className="mt-4 animate-fade-in"><MapaRede ativos={ativos} /></div>}

      <ModaisEdicao modalEdicao={modalEdicao} setModalEdicao={setModalEdicao} modalEdicaoMassa={modalEdicaoMassa} setModalEdicaoMassa={setModalEdicaoMassa} categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setSelecionados={setSelecionados} ativos={ativos} />
      {modalTerminal.aberto && <TerminalRemoto ativo={modalTerminal.ativo} onClose={() => setModalTerminal({ aberto: false, ativo: null })} usuarioAtual={usuarioAtual} />}
      <ModaisOperacao modalFicha={modalFicha} setModalFicha={setModalFicha} modalQR={modalQR} setModalQR={setModalQR} modalQRLote={modalQRLote} setModalQRLote={setModalQRLote} modalStatus={modalStatus} setModalStatus={setModalStatus} formStatus={formStatus} setFormStatus={setFormStatus} modalTransferencia={modalTransferencia} setModalTransferencia={setModalTransferencia} formTransfer={formTransfer} setFormTransfer={setFormTransfer} modalExcluir={modalExcluir} setModalExcluir={setModalExcluir} motivoExclusao={motivoExclusao} setMotivoExclusao={setMotivoExclusao} categorias={categorias} secretarias={secretarias} usuarioAtual={usuarioAtual} carregarDados={carregarDados} setSelecionados={setSelecionados} />
    </div>
  );
}