import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/api';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function NexusPrint() {
  // --- Estados de Dados ---
  const [impressorasOriginais, setImpressorasOriginais] = useState([]);
  const [impressorasFiltradas, setImpressorasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null); 
  
  // --- Estados do Gráfico de Faturamento (Missão A) ---
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [loadingGrafico, setLoadingGrafico] = useState(false);

  // --- Estados de Filtro ---
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSecretaria, setFiltroSecretaria] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  
  // --- Estados do Modal de Edição ---
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [impEditando, setImpEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({ nome_personalizado: '', local: '', setor: '' });

  // 📥 FUNÇÃO: Exportar Relatório MPS para Excel/CSV
  const exportarRelatorio = () => {
    const url = `${api.defaults.baseURL || 'http://localhost:8001'}/api/inventario/relatorio/mps/exportar?secretaria=${filtroSecretaria}&local=${filtroLocal}`;
    window.open(url, '_blank');
  };

  // 🔄 FUNÇÃO: Carregar Todas as Multifuncionais
  const carregarImpressoras = async () => {
    try {
      const [resAtivos, resCat] = await Promise.all([
        api.get('/api/inventario/'),
        api.get('/api/inventario/categorias')
      ]);

      const ativos = resAtivos.data;
      const categorias = resCat.data;

      const lista = ativos.map(item => {
        const catName = categorias.find(c => c.id === item.categoria_id)?.nome || '';
        let specs = {};
        let dinamicos = {};
        
        try { specs = typeof item.especificacoes === 'string' ? JSON.parse(item.especificacoes) : (item.especificacoes || {}); } catch(e) {}
        try { dinamicos = typeof item.dados_dinamicos === 'string' ? JSON.parse(item.dados_dinamicos) : (item.dados_dinamicos || {}); } catch(e) {}
        
        // Unifica os dados dinâmicos para a leitura do componente
        return { ...item, categoriaNome: catName, specs: { ...specs, ...dinamicos } };
      }).filter(item => 
        ['IMPRESSORA', 'MULTIFUNCIONAL'].includes(item.categoriaNome.toUpperCase()) || 
        ['IMPRESSORA', 'MULTIFUNCIONAL'].includes((item.tipo || '').toUpperCase())
      );

      setImpressorasOriginais(lista);
      setImpressorasFiltradas(lista);
    } catch (e) {
      console.error("Erro ao carregar impressoras:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarImpressoras(); }, []);

  // 🧠 LÓGICA: Filtros Dinâmicos Encadeados
  const { secretariasDisponiveis, locaisDisponiveis } = useMemo(() => {
    const secs = [...new Set(impressorasOriginais.map(i => i.secretaria).filter(Boolean))].sort();
    
    let locaisFiltrados = impressorasOriginais;
    if (filtroSecretaria) {
      locaisFiltrados = impressorasOriginais.filter(i => i.secretaria === filtroSecretaria);
    }
    const locs = [...new Set(locaisFiltrados.map(i => i.local).filter(Boolean))].sort();
    
    return { secretariasDisponiveis: secs, locaisDisponiveis: locs };
  }, [impressorasOriginais, filtroSecretaria]);

  useEffect(() => {
    let result = impressorasOriginais;

    if (filtroSecretaria) result = result.filter(i => i.secretaria === filtroSecretaria);
    if (filtroLocal) result = result.filter(i => i.local === filtroLocal);

    if (termoBusca) {
      const t = termoBusca.toLowerCase();
      result = result.filter(i => 
        (i.modelo || '').toLowerCase().includes(t) ||
        (i.nome_personalizado || i.nome_exibicao || '').toLowerCase().includes(t) ||
        (i.patrimonio || '').toLowerCase().includes(t) ||
        (i.specs.ip || '').toLowerCase().includes(t) ||
        (i.specs.serial || i.serial || '').toLowerCase().includes(t)
      );
    }

    setImpressorasFiltradas(result);
  }, [termoBusca, filtroSecretaria, filtroLocal, impressorasOriginais]);


  // 📐 LÓGICA: Expandir Linha e Buscar Telemetria Histórica
  const toggleExpand = async (imp) => {
    if (expandedId === imp.id) {
      setExpandedId(null);
    } else {
      setExpandedId(imp.id);
      setLoadingGrafico(true);
      setDadosGrafico([]);
      try {
        const res = await api.get(`/api/inventario/leituras/${imp.patrimonio}`);
        setDadosGrafico(res.data);
      } catch (e) {
        console.error("Erro ao buscar histórico", e);
      } finally {
        setLoadingGrafico(false);
      }
    }
  };

  // ✏️ FUNÇÕES: Edição de Identidade e Localização
  const abrirModalEdicao = (imp, e) => {
    e.stopPropagation();
    setImpEditando(imp);
    setFormEdit({
      nome_personalizado: imp.nome_personalizado || '',
      local: imp.local || '',
      setor: imp.setor || ''
    });
    setModalEditOpen(true);
  };

  const salvarEdicao = async () => {
    try {
      const payload = {
        ...formEdit,
        usuario_acao: localStorage.getItem('usuario') || 'Admin',
        motivo: "Atualização de localização MPS"
      };

      await api.put(`/api/api/inventario/ficha/editar/${impEditando.id}`, payload);
      
      await carregarImpressoras();
      setModalEditOpen(false);
      alert("✅ Multifuncional atualizada com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("❌ Erro ao salvar alterações.");
    }
  };

  // --- RENDERIZADORES AUXILIARES ---
  const renderMiniBar = (label, valueStr) => {
    let percentage = 0;
    if (valueStr && valueStr.includes('%')) {
      percentage = parseFloat(valueStr.replace('%', ''));
    } else {
      return <span className="text-[10px] text-gray-400 font-bold opacity-40">N/A</span>;
    }

    let barColor = 'bg-emerald-500';
    if (percentage <= 30) barColor = 'bg-amber-400';
    if (percentage <= 15) barColor = 'bg-red-500';

    return (
      <div className="w-full max-w-[140px]">
        <div className="flex justify-between items-center mb-1">
           <span className="text-[8px] font-black uppercase opacity-40">{label}</span>
           <span className={`text-[10px] font-black ${percentage <= 15 ? 'text-red-500' : ''}`}>{percentage}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100" style={{ backgroundColor: 'var(--bg-input)' }}>
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full pt-20 animate-pulse">
      <div className="text-4xl mb-4">🖨️</div>
      <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Sincronizando Central de Impressão...</div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in pb-10">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>Central Nexus Print</h2>
          <p className="text-sm font-medium opacity-70" style={{ color: 'var(--text-muted)' }}>Gestão analítica e controle de faturamento MPS.</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {impressorasFiltradas.length} Multifuncionais Monitoradas
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="p-5 rounded-3xl flex flex-col md:flex-row gap-4 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-light)' }}>
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5 block">Busca Inteligente</label>
          <input 
            type="text" 
            placeholder="IP, Modelo, Serial ou Patrimônio..." 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 outline-none transition-all"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
          />
        </div>
        <div className="md:w-60">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5 block">Filtrar Secretaria</label>
          <select 
            value={filtroSecretaria}
            onChange={(e) => { setFiltroSecretaria(e.target.value); setFiltroLocal(''); }} 
            className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 outline-none appearance-none"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
          >
            <option value="">Todas as Secretarias</option>
            {secretariasDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="md:w-60">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1.5 block">Filtrar Local</label>
          <select 
            value={filtroLocal}
            onChange={(e) => setFiltroLocal(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium outline-none appearance-none disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
            disabled={!filtroSecretaria && locaisDisponiveis.length === 0}
          >
            <option value="">Todos os Locais</option>
            {locaisDisponiveis.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="md:w-48 flex items-end">
          <button 
            onClick={exportarRelatorio} 
            className="w-full h-[42px] bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            📊 Exportar CSV
          </button>
        </div>
      </div>

      {/* CABEÇALHO DA TABELA */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>
        <div className="col-span-1">Status</div>
        <div className="col-span-3">Identificação</div>
        <div className="col-span-3">Localização</div>
        <div className="col-span-2">Suprimentos</div>
        <div className="col-span-2">Cilindro</div>
        <div className="col-span-1 text-center">Ações</div>
      </div>

      {/* LISTAGEM DE ATIVOS */}
      <div className="space-y-3">
        {impressorasFiltradas.length === 0 ? (
          <div className="p-20 rounded-3xl text-center border-dashed border-2 opacity-30" style={{ borderColor: 'var(--border-light)' }}>
            <p className="font-black text-sm uppercase tracking-tighter">Nenhum registro localizado</p>
          </div>
        ) : (
          impressorasFiltradas.map(imp => {
            const isOnline = imp.status?.toUpperCase() === 'ONLINE' || imp.status?.toUpperCase() === 'ATIVO';
            const isExpanded = expandedId === imp.id;
            const alertaToner = imp.alerta_critico || false;

            return (
              <div key={imp.id} className="rounded-2xl transition-all overflow-hidden border shadow-sm" 
                   style={{ backgroundColor: 'var(--bg-card)', borderColor: alertaToner ? '#ef4444' : 'var(--border-light)' }}>
                
                {/* LINHA DE RESUMO */}
                <div onClick={() => toggleExpand(imp)} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-8 py-5 items-center cursor-pointer hover:bg-gray-500/5 transition-colors">
                  
                  <div className="col-span-1">
                    <div className={`w-3 h-3 rounded-full shadow-sm ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-black truncate" style={{ color: 'var(--text-main)' }}>
                      {imp.nome_personalizado || imp.modelo}
                    </p>
                    <p className="text-[10px] font-bold opacity-50 truncate" style={{ color: 'var(--text-muted)' }}>
                      {imp.specs.ip || 'Sem IP'} • SN: {imp.serial || imp.specs.serial || 'N/A'}
                    </p>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <p className="text-xs font-black truncate" style={{ color: 'var(--text-main)' }}>{imp.secretaria || 'S/N'}</p>
                    <p className="text-[10px] font-bold opacity-50 truncate" style={{ color: 'var(--text-muted)' }}>{imp.local || 'Local não definido'}</p>
                  </div>

                  <div className="col-span-2">
                    {renderMiniBar("Toner", imp.specs.toner)}
                  </div>

                  <div className="col-span-2">
                    {renderMiniBar("Cilindro", imp.specs.cilindro)}
                  </div>

                  <div className="col-span-1 flex justify-center items-center gap-3">
                    <button 
                        onClick={(e) => abrirModalEdicao(imp, e)} 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-all active:scale-90"
                    >
                      ✏️
                    </button>
                    <span className={`text-xs opacity-30 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {/* PAINEL EXPANDIDO (Gráfico e Detalhes) */}
                {isExpanded && (
                  <div className="p-8 border-t bg-gray-500/[0.02] flex flex-col xl:flex-row gap-10 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
                    
                    {/* Coluna de Dados Técnicos */}
                    <div className="w-full xl:w-[40%] space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Especificações Técnicas</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[9px] uppercase font-black opacity-40 mb-1">Modelo de Fábrica</p>
                          <p className="text-sm font-bold truncate">{imp.modelo}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-black opacity-40 mb-1">Patrimônio</p>
                          <p className="text-sm font-black text-blue-500">{imp.patrimonio || 'S/P'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-black opacity-40 mb-1">Setor / Sala</p>
                          <p className="text-sm font-bold truncate">{imp.setor || 'Não Definido'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-black opacity-40 mb-1">Última Leitura</p>
                          <p className="text-sm font-bold italic opacity-60">
                            {imp.ultima_comunicacao ? new Date(imp.ultima_comunicacao + 'Z').toLocaleString('pt-BR') : 'Nunca'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-2xl border bg-white/5" style={{ borderColor: 'var(--border-light)' }}>
                        <p className="text-[9px] uppercase font-black opacity-40 mb-3">Status de Suprimentos</p>
                        {alertaToner ? (
                            <div className="flex items-center gap-3 text-red-500 font-black text-xs animate-pulse">
                                <span>🚨 ALERTA: Troca de toner necessária imediatamente!</span>
                            </div>
                        ) : (
                            <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-2">
                                <span>✅ Suprimentos operando dentro da normalidade.</span>
                            </div>
                        )}
                      </div>
                    </div>

                    <div className="hidden xl:block w-px bg-gray-500/10"></div>

                    {/* Coluna de Gráfico de Faturamento */}
                    <div className="w-full xl:flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Evolução de Faturamento (Páginas)</h4>
                         <div className="text-right">
                            <span className="text-[9px] font-black opacity-40 block">CONTADOR TOTAL</span>
                            <span className="text-2xl font-black text-blue-600">{parseInt(imp.specs.paginas_totais || 0).toLocaleString('pt-BR')}</span>
                         </div>
                      </div>
                      
                      <div className="h-44 w-full">
                        {loadingGrafico ? (
                          <div className="h-full flex items-center justify-center text-xs font-black opacity-30 italic">Processando telemetria histórica...</div>
                        ) : dadosGrafico.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dadosGrafico}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                              <XAxis dataKey="data" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                              <YAxis hide />
                              <RechartsTooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                              />
                              <Line 
                                type="monotone" 
                                dataKey="paginas" 
                                stroke="#2563eb" 
                                strokeWidth={4} 
                                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} 
                                activeDot={{ r: 6, strokeWidth: 0 }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs opacity-30 font-bold italic">Gráfico em formação (Aguardando próxima leitura diária)</div>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE CONFIGURAÇÃO / EDIÇÃO */}
      {modalEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-scale-up border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            
            <div className="p-8 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <div>
                <h3 className="text-xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>Configurar Multifuncional</h3>
                <p className="text-[10px] font-black uppercase opacity-40 mt-1">SN: {impEditando?.serial || impEditando?.specs?.serial}</p>
              </div>
              <button onClick={() => setModalEditOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors text-2xl">&times;</button>
            </div>

            <div className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Nome na Central (Ex: Recepção)</label>
                <input 
                  type="text" 
                  value={formEdit.nome_personalizado} 
                  onChange={(e) => setFormEdit({...formEdit, nome_personalizado: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl border text-sm font-bold focus:ring-2 outline-none transition-all"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Localização (Escola / Prédio)</label>
                <input 
                  type="text" 
                  value={formEdit.local} 
                  onChange={(e) => setFormEdit({...formEdit, local: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl border text-sm font-bold focus:ring-2 outline-none transition-all"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Setor Interno / Sala</label>
                <input 
                  type="text" 
                  value={formEdit.setor} 
                  onChange={(e) => setFormEdit({...formEdit, setor: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl border text-sm font-bold focus:ring-2 outline-none transition-all"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div className="p-8 border-t flex justify-end gap-4" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-page)' }}>
              <button onClick={() => setModalEditOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-black opacity-40 hover:opacity-100 transition-all">Cancelar</button>
              <button onClick={salvarEdicao} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Salvar Alterações</button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}