import React, { useState } from 'react';
import api from '../api/api';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PrinterCard({ imp, abrirModalEdicao }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [loadingGrafico, setLoadingGrafico] = useState(false);

  const isOnline = imp.status?.toUpperCase() === 'ONLINE' || imp.status?.toUpperCase() === 'ATIVO';
  const alertaToner = imp.alerta_critico || false;

  const toggleExpand = async () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && dadosGrafico.length === 0) {
      setLoadingGrafico(true);
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

  const renderMiniBar = (label, valueStr) => {
    let percentage = 0;
    if (valueStr && valueStr.includes('%')) percentage = parseFloat(valueStr.replace('%', ''));
    else return <span className="text-[10px] text-gray-400 font-bold opacity-40">N/A</span>;

    let barColor = percentage <= 15 ? 'bg-red-500' : percentage <= 30 ? 'bg-amber-400' : 'bg-emerald-500';

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

  return (
    <div className="rounded-2xl transition-all overflow-hidden border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: alertaToner ? '#ef4444' : 'var(--border-light)' }}>
      {/* LINHA DE RESUMO */}
      <div onClick={toggleExpand} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-8 py-5 items-center cursor-pointer hover:bg-gray-500/5 transition-colors">
        <div className="col-span-1">
          <div className={`w-3 h-3 rounded-full shadow-sm ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
        </div>
        <div className="col-span-3 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: 'var(--text-main)' }}>{imp.nome_personalizado || imp.modelo}</p>
          <p className="text-[10px] font-bold opacity-50 truncate" style={{ color: 'var(--text-muted)' }}>{imp.specs?.ip || 'Sem IP'} • SN: {imp.serial || imp.specs?.serial || 'N/A'}</p>
        </div>
        <div className="col-span-3 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: 'var(--text-main)' }}>{imp.secretaria || 'S/N'}</p>
          <p className="text-[10px] font-bold opacity-50 truncate" style={{ color: 'var(--text-muted)' }}>{imp.local || 'Local não definido'}</p>
        </div>
        <div className="col-span-2">{renderMiniBar("Toner", imp.specs?.toner)}</div>
        <div className="col-span-2">{renderMiniBar("Cilindro", imp.specs?.cilindro)}</div>
        <div className="col-span-1 flex justify-center items-center gap-3">
          <button onClick={(e) => abrirModalEdicao(imp, e)} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-all active:scale-90">✏️</button>
          <span className={`text-xs opacity-30 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {/* PAINEL EXPANDIDO */}
      {isExpanded && (
        <div className="p-8 border-t bg-gray-500/[0.02] flex flex-col xl:flex-row gap-10 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-full xl:w-[40%] space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Especificações Técnicas</h4>
            <div className="grid grid-cols-2 gap-6">
              <div><p className="text-[9px] uppercase font-black opacity-40 mb-1">Modelo de Fábrica</p><p className="text-sm font-bold truncate">{imp.modelo}</p></div>
              <div><p className="text-[9px] uppercase font-black opacity-40 mb-1">Patrimônio</p><p className="text-sm font-black text-blue-500">{imp.patrimonio || 'S/P'}</p></div>
              <div><p className="text-[9px] uppercase font-black opacity-40 mb-1">Setor / Sala</p><p className="text-sm font-bold truncate">{imp.setor || 'Não Definido'}</p></div>
              <div><p className="text-[9px] uppercase font-black opacity-40 mb-1">Última Leitura</p><p className="text-sm font-bold italic opacity-60">{imp.ultima_comunicacao ? new Date(imp.ultima_comunicacao + 'Z').toLocaleString('pt-BR') : 'Nunca'}</p></div>
            </div>
          </div>
          <div className="hidden xl:block w-px bg-gray-500/10"></div>
          <div className="w-full xl:flex-1 space-y-4">
            <div className="flex items-center justify-between">
               <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Evolução de Faturamento</h4>
               <div className="text-right">
                  <span className="text-[9px] font-black opacity-40 block">CONTADOR TOTAL</span>
                  <span className="text-2xl font-black text-blue-600">{parseInt(imp.specs?.paginas_totais || 0).toLocaleString('pt-BR')}</span>
               </div>
            </div>
            <div className="h-44 w-full">
              {loadingGrafico ? <div className="h-full flex items-center justify-center text-xs font-black opacity-30 italic">Processando telemetria...</div> : 
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" /><XAxis dataKey="data" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} /><YAxis hide /><RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} /><Line type="monotone" dataKey="paginas" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} /></LineChart>
                </ResponsiveContainer>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}