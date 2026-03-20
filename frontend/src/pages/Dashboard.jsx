import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

  // 🚀 NOVO ESTADO: Filtro para a aba Nexus Print
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

  // 🚀 LÓGICA DINÂMICA: Calcula os dados da aba de Impressão baseada no Filtro
  const impressorasRaw = ativosTotais.filter(item => {
    const catName = (categoriasTotais.find(c => c.id === item.categoria_id)?.nome || '').toUpperCase();
    
    // 🚀 O TRUQUE: Lê a alma da máquina. Se tiver Toner ou Cilindro, é impressora e vai pro painel!
    let din = {};
    try { 
        din = typeof item.dados_dinamicos === 'string' ? JSON.parse(item.dados_dinamicos.replace(/'/g, '"').replace(/None/g, 'null')) : (item.dados_dinamicos || {}); 
    } catch(e) {}
    
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
    
    // Status Online
    if (item.ultima_comunicacao) {
      if ((agoraData - new Date(item.ultima_comunicacao + 'Z')) / (1000 * 60 * 60 * 24) < 3) pOnline++;
    }

    // Secretarias
    const secName = item.secretaria || 'Não Informada';
    contagemSecPrint[secName] = (contagemSecPrint[secName] || 0) + 1;
    if (!detalheSec[secName]) detalheSec[secName] = { secretaria: secName, impressoras: 0, paginas_totais: 0 };
    detalheSec[secName].impressoras++;

    // Lendo Specs JSON de forma segura
    let specs = {};
    try { specs = typeof item.especificacoes === 'string' ? JSON.parse(item.especificacoes) : (item.especificacoes || {}); } catch(e) {}
    try { 
      let din = typeof item.dados_dinamicos === 'string' ? JSON.parse(item.dados_dinamicos.replace(/'/g, '"').replace(/None/g, 'null')) : (item.dados_dinamicos || {}); 
      specs = { ...specs, ...din };
    } catch(e) {}

    // Páginas e Toner
    if (specs.paginas_totais || specs['Páginas Impressas']) pPaginas += parseInt(specs.paginas_totais || specs['Páginas Impressas']) || 0;
    let toner = specs.toner || specs['% Toner'];
    if (toner && toner !== 'N/A' && typeof toner === 'string' && toner.includes('%')) {
      if (parseFloat(toner.replace('%', '')) <= 15) pCritico++;
    }
  });

  const chartSecPrint = Object.keys(contagemSecPrint).map(k => ({ name: k, Quantidade: contagemSecPrint[k] })).sort((a,b) => b.Quantidade - a.Quantidade);
  const tableSecPrint = Object.values(detalheSec).sort((a,b) => b.paginas_totais - a.paginas_totais);

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

      {/* ABA GERAL (INTACTA) */}
      {abaAtiva === 'geral' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl shadow-inner border relative" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-emerald-400 opacity-20"></span>
                  📡
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Agentes Online</p>
                  <h3 className="text-3xl font-black tracking-tighter text-emerald-400">{stats.online}</h3>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>💻</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Total de Ativos</p>
                  <h3 className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>{stats.total}</h3>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>✅</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Em Operação</p>
                  <h3 className="text-3xl font-black tracking-tighter text-emerald-500">{stats.ativos}</h3>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer group" onClick={() => navigate('/cadastro?filtroStatus=MANUTENÇÃO')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner border group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>⚠️</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Em Manutenção</p>
                  <h3 className="text-3xl font-black tracking-tighter text-amber-500">{stats.manutencao}</h3>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer group" onClick={() => navigate('/cadastro?filtroStatus=SUCATA')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-red-500 text-2xl shadow-inner border group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>🗑️</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Descartados</p>
                  <h3 className="text-3xl font-black tracking-tighter text-red-500">{stats.sucata}</h3>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer group" onClick={() => navigate('/cadastro?filtroStatus=OFFLINE')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-gray-400 text-2xl shadow-inner border group-hover:bg-gray-500/10 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                  <span className="group-hover:animate-bounce">👻</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Desaparecidos</p>
                  <h3 className="text-3xl font-black tracking-tighter text-gray-400">{stats.desaparecidos}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="p-8 rounded-3xl transition-all" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-6 opacity-60" style={{ color: 'var(--text-muted)' }}>Top 5 - Volume de Categorias</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosCategoria} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: '900'}} width={130} />
                      <Tooltip cursor={{fill: 'rgba(150,150,150,0.1)'}} contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                      <Bar dataKey="Quantidade" radius={[0, 8, 8, 0]} barSize={20}>
                        {dadosCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981'][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
                <div className="w-full md:w-1/2">
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 opacity-60" style={{ color: 'var(--text-muted)' }}>Distribuição de Status</h4>
                  <div className="space-y-3">
                    {dadosStatus.map(s => (
                      <div key={s.name} className="flex items-center justify-between p-3 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-full shadow-md" style={{ backgroundColor: s.color }}></div>
                          <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{s.name}</span>
                        </div>
                        <span className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-1/2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dadosStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                        {dadosStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} /> )}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="xl:col-span-1">
              <div className="rounded-3xl h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-input)' }}>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    <h4 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Feed do Sistema</h4>
                  </div>
                  <button onClick={() => navigate('/auditoria')} className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors">Ver Tudo</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {logsRecentes.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-xs font-bold italic opacity-50" style={{ color: 'var(--text-muted)' }}>Aguardando telemetria...</div>
                  ) : (
                    logsRecentes.map((log, i) => {
                      const ui = getMiniIcon(log.acao);
                      return (
                        <div key={i} className="p-3.5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                          <div className="flex items-start gap-4">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm border flex-shrink-0 ${ui.c}`}>
                              {ui.i}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest truncate pr-2" style={{ color: 'var(--text-main)' }}>{log.acao}</span>
                                <span className="text-[8px] font-black uppercase opacity-60" style={{ color: 'var(--text-muted)' }}>{new Date(log.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <p className="text-[11px] font-medium truncate leading-tight opacity-80" style={{ color: 'var(--text-muted)' }}>
                                {log.detalhes || `Ação executada por ${log.usuario}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 A NOVA ABA DE IMPRESSÃO (DINÂMICA) */}
      {abaAtiva === 'impressao' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* SEÇÃO DE FILTROS */}
          <div className="p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-5" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <h4 className="text-[11px] font-black uppercase text-blue-500 tracking-[2px] mb-0 flex items-center gap-2">🔍 FILTRAR PAINEL</h4>
              <select 
                  className="w-full md:max-w-xs px-5 py-3 rounded-2xl border text-sm font-bold focus:ring-2 outline-none transition-all cursor-pointer" 
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                  value={filtroSecretaria} 
                  onChange={(e) => setFiltroSecretaria(e.target.value)}
              >
                  <option value="Todas">Todas as Secretarias</option>
                  {listaTodasSecretarias.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          </div>

          {/* CAIXINHAS DINÂMICAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl transition-all" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>🖨️</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Impressoras Monitoradas</p>
                  <h3 className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>{pTotal}</h3>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl transition-all" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>📡</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Status Online (Ativas)</p>
                  <h3 className="text-3xl font-black tracking-tighter text-emerald-500">{pOnline}</h3>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl transition-all cursor-pointer group" onClick={() => navigate('/nexus-print')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-red-500 text-2xl shadow-inner border group-hover:bg-red-500/10 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                  <span className="group-hover:animate-pulse">🩸</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Toner Crítico (&lt; 15%)</p>
                  <h3 className="text-3xl font-black tracking-tighter text-red-500">{pCritico}</h3>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl transition-all" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>📄</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Total Páginas Impressas</p>
                  <h3 className="text-3xl font-black tracking-tighter text-amber-500">{pPaginas.toLocaleString('pt-BR')}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* TABELA DE VOLUME DE IMPRESSÕES */}
            <div className="p-8 rounded-3xl space-y-6" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
                <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black uppercase text-blue-500 tracking-[2px]">🏢 Volume de Impressões por Secretaria</h4>
                </div>
                <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="border-b sticky top-0 bg-[var(--bg-card)] z-10 text-[var(--text-muted)] text-[11px] font-black uppercase tracking-widest" style={{ borderColor: 'var(--border-light)' }}>
                            <tr>
                                <th className="px-4 py-3 text-left">Secretaria</th>
                                <th className="px-4 py-3 text-right">Qtd</th>
                                <th className="px-4 py-3 text-right">Páginas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableSecPrint.map((item) => (
                                <tr key={item.secretaria} className="border-b last:border-0 hover:bg-black/5 transition-colors" style={{ borderColor: 'var(--border-light)' }}>
                                    <td className="px-4 py-4 font-bold text-[var(--text-main)]">{item.secretaria}</td>
                                    <td className="px-4 py-4 text-right font-black text-orange-500 text-base">{item.impressoras}</td>
                                    <td className="px-4 py-4 text-right font-black text-[var(--text-main)] opacity-80 text-base">{item.paginas_totais.toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                            {tableSecPrint.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="text-center py-6 text-[var(--text-muted)] italic opacity-70">Nenhuma secretaria encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-6">
              {/* GRÁFICO: DISTRIBUIÇÃO DE IMPRESSORAS POR SECRETARIA */}
              <div className="p-8 rounded-3xl" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[11px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Top Impressoras (Secretarias)</h4>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartSecPrint.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: '900'}} width={130} />
                      <Tooltip cursor={{fill: 'rgba(150,150,150,0.1)'}} contentStyle={{ borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                      <Bar dataKey="Quantidade" radius={[0, 8, 8, 0]} barSize={15}>
                        {chartSecPrint.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CALL TO ACTION: ABRIR A CENTRAL */}
              <div className="p-8 rounded-3xl flex flex-col justify-center items-start" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>🖨️</div>
                     <h4 className="text-xl font-black" style={{ color: 'var(--text-main)' }}>Central de Impressão</h4>
                  </div>
                  <p className="text-sm opacity-80 mb-4 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                    Visualize os níveis de toner, status de rede e gerencie a movimentação do seu parque.
                  </p>
                  <button onClick={() => navigate('/nexus-print')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                    Acessar Nexus Print ➔
                  </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {abaAtiva === 'diretoria' && (
        <DashboardDiretoria ativos={ativosTotais} categorias={categoriasTotais} />
      )}

    </div>
  );
}