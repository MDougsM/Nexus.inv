import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardDiretoria from '../components/Cadastro/DashboardDiretoria'; // INJETANDO O PAINEL AQUI!

export default function Dashboard() {
  // Controle de Abas
  const [abaAtiva, setAbaAtiva] = useState('geral');
  
  // Guardando os dados brutos para enviar para a Diretoria
  const [ativosTotais, setAtivosTotais] = useState([]);
  const [categoriasTotais, setCategoriasTotais] = useState([]);

  // Seus estados originais
  const [stats, setStats] = useState({ total: 0, ativos: 0, manutencao: 0, sucata: 0 });
  const [dadosStatus, setDadosStatus] = useState([]);
  const [dadosCategoria, setDadosCategoria] = useState([]);
  const [logsRecentes, setLogsRecentes] = useState([]); 
  const [loading, setLoading] = useState(true);
  
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
      
      // Alimentando a inteligência da Diretoria
      setAtivosTotais(ativos);
      setCategoriasTotais(categorias);
      
      setLogsRecentes(resAuditoria.data.reverse().slice(0, 8));

      let a = 0, m = 0, s = 0;
      let contagemCat = {};

      ativos.forEach(item => {
        const st = (item.status || 'ATIVO').toUpperCase();
        if (st === 'ATIVO') a++;
        else if (st === 'MANUTENÇÃO') m++;
        else if (st === 'SUCATA') s++;

        const catName = categorias.find(c => c.id === item.categoria_id)?.nome || 'Sem Categoria';
        contagemCat[catName] = (contagemCat[catName] || 0) + 1;
      });

      setStats({ total: ativos.length, ativos: a, manutencao: m, sucata: s });

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
    return { i: '📌', c: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full pt-20 animate-pulse">
      <div className="text-4xl mb-4">🚀</div>
      <div className="text-gray-400 font-black uppercase tracking-widest text-xs">A processar telemetria...</div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* CABEÇALHO COM NAVEGAÇÃO DE ABAS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-full sm:w-auto">
          <h2 className="text-3xl font-black tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>Centro de Inteligência</h2>
          
          <div className="flex gap-6 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setAbaAtiva('geral')} 
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-all ${abaAtiva === 'geral' ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ color: abaAtiva === 'geral' ? 'var(--color-blue)' : 'var(--text-main)', marginBottom: '-1px' }}
            >
              <span className="text-lg">🌍</span> Visão Geral
            </button>
            <button 
              onClick={() => setAbaAtiva('diretoria')} 
              className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-bold text-sm transition-all ${abaAtiva === 'diretoria' ? 'border-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ color: abaAtiva === 'diretoria' ? 'var(--color-blue)' : 'var(--text-main)', marginBottom: '-1px' }}
            >
              <span className="text-lg">📊</span> Painel da Diretoria
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/cadastro')} className="hidden sm:flex items-center gap-2 px-6 py-3 mb-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
          Aceder ao Inventário Completo ➔
        </button>
      </div>


      {/* CONTEÚDO 1: A SUA VISÃO GERAL (TELEMETRIA E FEED) */}
      {abaAtiva === 'geral' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-muted)' }}>Taxa de operabilidade do parque tecnológico.</p>
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
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
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
                              <p className="text-[9px] font-black text-blue-500 uppercase mt-1.5 flex items-center gap-1.5">
                                <span className="opacity-50">👤</span> {log.usuario}
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

      {/* CONTEÚDO 2: O SEU NOVO PAINEL DA DIRETORIA MÓVEL/FILTRÁVEL */}
      {abaAtiva === 'diretoria' && (
        <DashboardDiretoria ativos={ativosTotais} categorias={categoriasTotais} />
      )}

    </div>
  );
}