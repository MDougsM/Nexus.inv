import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';

export default function DashboardPrint({ 
  filtroSecretaria, setFiltroSecretaria, listaTodasSecretarias, pTotal, pOnline, pCritico, pPaginas, 
  tableSecPrint, chartSecPrint, borderStrong, ultimaLeituraGeral 
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 🚀 AVISO DA ÚLTIMA LEITURA */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-r from-blue-500/10 to-transparent" style={{ borderColor: 'var(--border-light)' }}>
         <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center text-lg shadow-md">⏱️</div>
         <div>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-muted)' }}>Última Coleta de Páginas da Rede</p>
             <p className="font-black text-sm text-blue-600">
                 {ultimaLeituraGeral ? ultimaLeituraGeral.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Aguardando telemetria dos Agentes...'}
             </p>
         </div>
      </div>

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
  );
}