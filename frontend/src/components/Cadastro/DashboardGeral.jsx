import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function DashboardGeral({ 
  stats, dadosCategoria, dadosStatus, logsRecentes, ativosTotais, getMiniIcon, borderStrong, categorias 
}) {
  const navigate = useNavigate();
  const [statusDetalhe, setStatusDetalhe] = useState(null);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* OS CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer" onClick={() => navigate('/cadastro?filtroStatus=ONLINE')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
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

        <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer" onClick={() => navigate('/cadastro')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>💻</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Total de Ativos</p>
              <h3 className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer" onClick={() => navigate('/cadastro?filtroStatus=ATIVO')} style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
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

      {/* GRÁFICOS E FEED */}
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

          <div className="p-8 rounded-3xl flex flex-col" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
             <h4 className="text-[11px] font-black uppercase tracking-widest mb-4 opacity-60" style={{ color: 'var(--text-muted)' }}>Distribuição de Status</h4>
             
             {/* Layout ajustado para a Lista e o Gráfico ficarem lado a lado sem quebrar */}
             <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                <div className="w-full md:w-1/2 space-y-3">
                  {dadosStatus.map(s => (
                    <div 
                      key={s.name} 
                      onClick={() => setStatusDetalhe(s.name)} 
                      className="flex items-center justify-between p-3 rounded-xl border shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all hover:scale-105" 
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}
                      title={`Ver lista de ${s.name}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full shadow-md" style={{ backgroundColor: s.color }}></div>
                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{s.name}</span>
                      </div>
                      <span className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                
                <div className="w-full md:w-1/2 h-48 md:h-56 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dadosStatus} cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" paddingAngle={5} dataKey="value" stroke="none">
                        {dadosStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} /> )}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* O filtro das máquinas abre embaixo de tudo */}
             {/* 🚀 NOVO GRÁFICO DINÂMICO DE CATEGORIAS AO CLICAR NO STATUS */}
             {statusDetalhe && (() => {
                  // 1. Filtra as máquinas pelo status clicado
                  const ativosDaLista = ativosTotais.filter(a => {
                    const st = (a.status || 'ATIVO').toUpperCase();
                    if (statusDetalhe === 'Ativos') return st === 'ATIVO' || st === 'ONLINE';
                    if (statusDetalhe === 'Manutenção') return st === 'MANUTENÇÃO';
                    if (statusDetalhe === 'Sucata') return st === 'SUCATA';
                    return false;
                  });

                  // 2. Agrupa essas máquinas por categoria
                  const contagemCatDetalhe = {};
                  ativosDaLista.forEach(a => {
                     const catObj = categorias.find(c => c.id === a.categoria_id);
                     const catName = catObj ? catObj.nome : 'Sem Categoria';
                     contagemCatDetalhe[catName] = (contagemCatDetalhe[catName] || 0) + 1;
                  });

                  // 3. Formata para o Recharts
                  const dadosGraficoDetalhe = Object.keys(contagemCatDetalhe)
                     .map(k => ({ name: k, quantidade: contagemCatDetalhe[k] }))
                     .sort((a,b) => b.quantidade - a.quantidade);

                  return (
                    <div className="w-full mt-6 p-6 rounded-2xl border bg-blue-50/30 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
                      <div className="flex justify-between items-center mb-6">
                        <h5 className="font-black text-[11px] uppercase tracking-widest text-blue-600">📊 Tipos de Equipamento: {statusDetalhe}</h5>
                        <button onClick={() => setStatusDetalhe(null)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm">❌ Fechar</button>
                      </div>

                      {dadosGraficoDetalhe.length === 0 ? (
                         <p className="text-xs opacity-50 font-bold text-center py-6">Nenhum equipamento encontrado neste status.</p>
                      ) : (
                         <div className="h-64 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={dadosGraficoDetalhe} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.2)" />
                               <XAxis 
                                  dataKey="name" 
                                  tick={{fontSize: 9, fontWeight: 'bold', fill: 'var(--text-muted)'}} 
                                  axisLine={false} 
                                  tickLine={false} 
                                  angle={-45} 
                                  textAnchor="end" 
                               />
                               <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: 'var(--text-muted)'}} />
                               <Tooltip 
                                  cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }} 
                               />
                               <Bar dataKey="quantidade" name="Quantidade" radius={[6, 6, 0, 0]} barSize={35}>
                                  {dadosGraficoDetalhe.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981'][index % 5]} />
                                  ))}
                               </Bar>
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                      )}
                    </div>
                  );
             })()}
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
  );
}