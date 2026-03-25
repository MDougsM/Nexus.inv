import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

// Nossos Componentes Menores!
import DashboardGeral from '../components/Cadastro/DashboardGeral';
import DashboardPrint from '../components/Cadastro/DashboardPrint';
import DashboardDiretoria from '../components/Cadastro/DashboardDiretoria'; 

export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [ativosTotais, setAtivosTotais] = useState([]);
  const [categoriasTotais, setCategoriasTotais] = useState([]);

  const [stats, setStats] = useState({ total: 0, ativos: 0, manutencao: 0, sucata: 0, online: 0, desaparecidos: 0 });
  const [dadosStatus, setDadosStatus] = useState([]);
  const [dadosCategoria, setDadosCategoria] = useState([]);
  const [logsRecentes, setLogsRecentes] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Filtros da aba Nexus Print
  const [filtroSecretaria, setFiltroSecretaria] = useState('Todas');
  
  const navigate = useNavigate();
  const borderStrong = { border: '1.5px solid var(--border-light)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };

  const carregarEstatisticas = async () => {
    try {
      const [resAtivos, resCat, resAuditoria] = await Promise.all([
        api.get('/api/inventario/'),
        api.get('/api/inventario/categorias'),
        api.get('/api/auditoria/') 
      ]);
      
      const ativos = resAtivos.data;
      const categorias = resCat.data;
      
      setAtivosTotais(ativos);
      setCategoriasTotais(categorias);
      setLogsRecentes(resAuditoria.data.reverse().slice(0, 8));

      let a = 0, m = 0, s = 0, online = 0, desaparecidos = 0; 
      let contagemCat = {};
      
      const agora = new Date();
      const limiteOnlineDias = 3; 
      const limiteOfflineDias = 3; 

      ativos.forEach(item => {
        const st = (item.status || 'ATIVO').toUpperCase();
        if (st === 'ATIVO' || st === 'ONLINE') a++;
        else if (st === 'MANUTENÇÃO') m++;
        else if (st === 'SUCATA') s++;

        if (item.ultima_comunicacao) {
          const dataCom = new Date(item.ultima_comunicacao + 'Z');
          const diffMinutos = (agora - dataCom) / (1000 * 60);
          const diffDias = diffMinutos / (60 * 24);

          if (diffDias < limiteOnlineDias) online++;
          if (diffDias > limiteOfflineDias) desaparecidos++;
        } else {
          desaparecidos++; 
        }

        const catName = categorias.find(c => c.id === item.categoria_id)?.nome || 'Sem Categoria';
        contagemCat[catName] = (contagemCat[catName] || 0) + 1;
      });

      setStats({ total: ativos.length, ativos: a, manutencao: m, sucata: s, online: online, desaparecidos: desaparecidos });

      setDadosStatus([
        { name: 'Ativos', value: a, color: '#10b981' }, 
        { name: 'Manutenção', value: m, color: '#f59e0b' }, 
        { name: 'Sucata', value: s, color: '#ef4444' } 
      ]);

      const topCategorias = Object.keys(contagemCat)
        .map(k => ({ name: k, Quantidade: contagemCat[k] }))
        .sort((x, y) => y.Quantidade - x.Quantidade)
        .slice(0, 5);
      setDadosCategoria(topCategorias);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstatisticas();
    const interval = setInterval(carregarEstatisticas, 10000); 
    return () => clearInterval(interval);
  }, []);

  const getMiniIcon = (acao) => {
    const a = acao.toUpperCase();
    if (a.includes('LOGIN')) return { i: '👤', c: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (a.includes('EDIT')) return { i: '✏️', c: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    if (a.includes('RESTAUR')) return { i: '♻️', c: 'text-green-500 bg-green-500/10 border-green-500/20' };
    if (a.includes('EXCLU') || a.includes('DELET')) return { i: '🗑️', c: 'text-red-500 bg-red-500/10 border-red-500/20' };
    if (a.includes('CRIAR') || a.includes('NOVO')) return { i: '✨', c: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
    if (a.includes('ALERTA')) return { i: '🚨', c: 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse' };
    return { i: '📌', c: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
  };

  // ---------------------------------------------
  // LÓGICA PARA A ABA DE IMPRESSÃO (NEXUS PRINT)
  // ---------------------------------------------
  const impressorasRaw = ativosTotais.filter(item => {
    const catName = (categoriasTotais.find(c => c.id === item.categoria_id)?.nome || '').toUpperCase();
    let din = {};
    try { din = typeof item.dados_dinamicos === 'string' ? JSON.parse(item.dados_dinamicos.replace(/'/g, '"').replace(/None/g, 'null')) : (item.dados_dinamicos || {}); } catch(e) {}
    const temToner = din.toner || din['% Toner'] || din.cilindro || din['% Drum'];
    return catName.includes('IMPRESSORA') || catName.includes('MULTIFUNCIONAL') || temToner;
  });

  const listaTodasSecretarias = [...new Set(impressorasRaw.map(i => i.secretaria || 'Não Informada'))].sort();
  const impressorasFiltradas = filtroSecretaria === 'Todas' ? impressorasRaw : impressorasRaw.filter(i => (i.secretaria || 'Não Informada') === filtroSecretaria);

  let pTotal = 0, pOnline = 0, pCritico = 0, pPaginas = 0;
  let contagemSecPrint = {};
  let detalheSec = {};
  const agoraData = new Date();

  impressorasFiltradas.forEach(item => {
    pTotal++;
    
    if (item.ultima_comunicacao) {
      if ((agoraData - new Date(item.ultima_comunicacao + 'Z')) / (1000 * 60 * 60 * 24) < 3) pOnline++;
    }

    const secName = item.secretaria || 'Não Informada';
    contagemSecPrint[secName] = (contagemSecPrint[secName] || 0) + 1;
    if (!detalheSec[secName]) detalheSec[secName] = { secretaria: secName, impressoras: 0, paginas_totais: 0 };
    detalheSec[secName].impressoras++;

    let specs = {};
    try { specs = typeof item.especificacoes === 'string' ? JSON.parse(item.especificacoes) : (item.especificacoes || {}); } catch(e) {}
    try { 
      let din = typeof item.dados_dinamicos === 'string' ? JSON.parse(item.dados_dinamicos.replace(/'/g, '"').replace(/None/g, 'null')) : (item.dados_dinamicos || {}); 
      specs = { ...specs, ...din };
    } catch(e) {}

    let paginasDesseItem = 0;
    if (specs.paginas_totais) paginasDesseItem = parseInt(specs.paginas_totais) || 0;
    else if (specs['Páginas Impressas']) paginasDesseItem = parseInt(specs['Páginas Impressas']) || 0;
    
    pPaginas += paginasDesseItem;
    detalheSec[secName].paginas_totais += paginasDesseItem; 

    let toner = specs.toner || specs['% Toner'];
    if (toner && toner !== 'N/A' && typeof toner === 'string' && toner.includes('%')) {
      if (parseFloat(toner.replace('%', '')) <= 15) pCritico++;
    }
  });

  const chartSecPrint = Object.keys(contagemSecPrint).map(k => ({ name: k, Quantidade: contagemSecPrint[k] })).sort((a,b) => b.Quantidade - a.Quantidade);
  const tableSecPrint = Object.values(detalheSec).sort((a,b) => b.paginas_totais - a.paginas_totais);

  let ultimaLeituraGeral = null;
  impressorasFiltradas.forEach(imp => {
      if (imp.ultima_comunicacao) {
          const dataCom = new Date(imp.ultima_comunicacao + 'Z');
          if (!ultimaLeituraGeral || dataCom > ultimaLeituraGeral) {
              ultimaLeituraGeral = dataCom;
          }
      }
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full pt-20 animate-pulse">
      <div className="text-4xl mb-4">🚀</div>
      <div className="text-gray-400 font-black uppercase tracking-widest text-xs">A processar telemetria...</div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-full sm:w-auto">
          <h2 className="text-3xl font-black tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>Centro de Inteligência</h2>
          
          <div className="flex gap-6 overflow-x-auto custom-scrollbar">
            <button onClick={() => setAbaAtiva('geral')} className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-all ${abaAtiva === 'geral' ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ color: abaAtiva === 'geral' ? 'var(--color-blue)' : 'var(--text-main)', marginBottom: '-1px' }}>
              <span className="text-lg">🌍</span> Visão Geral
            </button>
            <button onClick={() => setAbaAtiva('diretoria')} className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-all ${abaAtiva === 'diretoria' ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ color: abaAtiva === 'diretoria' ? 'var(--color-blue)' : 'var(--text-main)', marginBottom: '-1px' }}>
              <span className="text-lg">📊</span> Painel da Diretoria
            </button>
            <button onClick={() => setAbaAtiva('impressao')} className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-all ${abaAtiva === 'impressao' ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ color: abaAtiva === 'impressao' ? 'var(--color-blue)' : 'var(--text-main)', marginBottom: '-1px' }}>
              <span className="text-lg">🖨️</span> Nexus Print
            </button>
          </div>
        </div>
        <button onClick={() => navigate('/cadastro')} className="hidden sm:flex items-center gap-2 px-6 py-3 mb-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
          Aceder ao Inventário Completo ➔
        </button>
      </div>

      {/* RENDERIZADOR DE ABAS */}
      {abaAtiva === 'geral' && (
        <DashboardGeral 
          stats={stats} 
          dadosCategoria={dadosCategoria} 
          dadosStatus={dadosStatus} 
          logsRecentes={logsRecentes} 
          ativosTotais={ativosTotais} 
          getMiniIcon={getMiniIcon} 
          borderStrong={borderStrong} 
          categorias={categoriasTotais} // 🚀 ADICIONE ESTA LINHA AQUI!
        />
      )}

      {abaAtiva === 'impressao' && (
        <DashboardPrint 
          filtroSecretaria={filtroSecretaria} setFiltroSecretaria={setFiltroSecretaria}
          listaTodasSecretarias={listaTodasSecretarias} pTotal={pTotal} pOnline={pOnline}
          pCritico={pCritico} pPaginas={pPaginas} tableSecPrint={tableSecPrint}
          chartSecPrint={chartSecPrint} borderStrong={borderStrong} 
          ultimaLeituraGeral={ultimaLeituraGeral}
        />
      )}

      {abaAtiva === 'diretoria' && (
        <DashboardDiretoria ativos={ativosTotais} categorias={categoriasTotais} />
      )}

    </div>
  );
}