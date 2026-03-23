import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/api';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CardNexus({ imp, expandedId, setExpandedId, selecionados, handleSelectOne, abrirFicha, abrirEdicao, setModalStatus, setModalExcluir, setModalTransferencia }) {
  const isOnline = imp.status?.toUpperCase() === 'ONLINE' || imp.status?.toUpperCase() === 'ATIVO';
  const isExpanded = expandedId === imp.id;
  const alertaToner = imp.alerta_critico || false;
  
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [loadingGrafico, setLoadingGrafico] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  
  const [filtroTempo, setFiltroTempo] = useState('dia');
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuAberto(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExpand = async () => {
    if (isExpanded) {
      setExpandedId(null);
    } else {
      setExpandedId(imp.id);
      setLoadingGrafico(true);
      try {
        const idSeguro = encodeURIComponent(imp.patrimonio);
        const res = await api.get(`/api/inventario/leituras/${idSeguro}`);
        setDadosGrafico(res.data);
      } catch (e) {} finally { setLoadingGrafico(false); }
    }
  };

  const dadosProcessados = React.useMemo(() => {
      if (!dadosGrafico || dadosGrafico.length === 0) return [];

      const agrupado = {};
      dadosGrafico.forEach(item => {
          if (!item.data_raw) return;
          const [data, hora] = item.data_raw.split(" ");
          const [ano, mes, dia] = data.split("-");
          const [h, m, s] = hora.split(":");

          let chave = "";
          let label = "";

          if (filtroTempo === 'hora') {
              chave = `${data} ${h}`;
              label = `${dia}/${mes} ${h}h`;
          } else if (filtroTempo === 'dia') {
              chave = data;
              label = `${dia}/${mes}`;
          } else if (filtroTempo === 'mes') {
              chave = `${ano}-${mes}`;
              label = `${mes}/${ano}`;
          }

          if (!agrupado[chave] || item.paginas > agrupado[chave].paginas) {
              agrupado[chave] = { data_simplificada: label, paginas: item.paginas, raw: item.data_raw };
          }
      });

      return Object.values(agrupado)
          .sort((a, b) => a.raw.localeCompare(b.raw))
          .slice(-10); 
  }, [dadosGrafico, filtroTempo]);

  const renderMiniBar = (label, valueStr) => {
    let percentage = 0;
    if (valueStr && valueStr.includes('%')) percentage = parseFloat(valueStr.replace('%', ''));
    else return <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--text-muted)' }}>N/A</span>;
    
    let barColor = 'bg-emerald-500';
    if (percentage <= 30) barColor = 'bg-amber-400';
    if (percentage <= 15) barColor = 'bg-red-500';

    return (
      <div className="w-full max-w-[120px]">
        <div className="flex justify-between items-center mb-1">
           <span className="text-[9px] font-bold opacity-60" style={{ color: 'var(--text-main)' }}>{label}</span>
           <span className={`text-[10px] font-bold ${percentage <= 15 ? 'text-red-500' : ''}`} style={{ color: percentage > 15 ? 'var(--text-main)' : '' }}>{percentage}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className={`transition-all border-b last:border-b-0 relative ${menuAberto ? 'z-40' : 'z-10'}`} style={{ borderColor: 'var(--border-light)' }}>
      
      {/* LINHA PRINCIPAL DA TABELA */}
      <div onClick={toggleExpand} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-3 items-center cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: alertaToner ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
        
        <div className="col-span-1 flex items-center gap-3">
          <input type="checkbox" checked={selecionados.includes(imp.patrimonio)} onChange={(e) => handleSelectOne(e, imp.patrimonio)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 cursor-pointer rounded border-gray-300"/>
          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
        </div>

        <div className="col-span-3 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>{imp.nome_personalizado || imp.modelo}</p>
          <p className="text-[11px] opacity-60 truncate" style={{ color: 'var(--text-muted)' }}>{imp.specs?.ip || imp.specs?.IP || 'Sem IP'} • SN: {imp.serial || imp.specs?.serial || imp.specs?.Serial || 'N/A'}</p>
        </div>

        <div className="col-span-3 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>{imp.secretaria || 'S/N'}</p>
          <p className="text-[11px] opacity-60 truncate" style={{ color: 'var(--text-muted)' }}>{imp.local || imp.setor || 'Local não definido'}</p>
        </div>

        <div className="col-span-2">{renderMiniBar("Toner", imp.specs?.['% Toner'] || imp.specs?.toner)}</div>
        <div className="col-span-2">{renderMiniBar("Cilindro", imp.specs?.['% Drum'] || imp.specs?.cilindro)}</div>

        {/* BOTÕES DE AÇÃO */}
        <div className="col-span-1 flex justify-end items-center gap-2 relative" ref={menuRef}>
          <button 
            onClick={(e) => { e.stopPropagation(); abrirFicha(imp.id); }} 
            className="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100 transition-all text-sm bg-white" 
            title="Ver Ficha"
          >
            👁️
          </button>
          <button onClick={(e) => { e.stopPropagation(); setMenuAberto(!menuAberto); }} className="px-3 py-1.5 border rounded flex items-center gap-1 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-sm">
            Opções <span className="text-[8px] ml-1 opacity-50">▼</span>
          </button>
          {menuAberto && (
            <div className="absolute top-10 right-0 w-44 bg-white rounded-xl shadow-xl border py-2 z-50 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
               <button onClick={(e) => { e.stopPropagation(); setMenuAberto(false); abrirEdicao(imp, e); }} className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-gray-50 text-blue-600 transition-colors border-b" style={{ borderColor: 'var(--border-light)' }}>✏️ Editar / Configurar</button>
               <button onClick={(e) => { e.stopPropagation(); setMenuAberto(false); setModalStatus({ aberto: true, ativos: [imp] }); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-gray-700 transition-colors">🔄 Alterar Status</button>
               <button onClick={(e) => { e.stopPropagation(); setMenuAberto(false); setModalTransferencia({ aberto: true, ativos: [imp.patrimonio] }); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-gray-700 transition-colors">🚚 Transferir</button>
               <button onClick={(e) => { e.stopPropagation(); setMenuAberto(false); setModalExcluir({ aberto: true, ativos: [imp] }); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-red-50 text-red-600 transition-colors">🗑️ Excluir</button>
            </div>
          )}
        </div>
      </div>

      {/* ÁREA EXPANDIDA */}
      {isExpanded && (
        <div className="p-6 flex flex-col xl:flex-row gap-8 border-t" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-light)' }}>
          
          <div className="w-full xl:w-[40%] space-y-5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Especificações Técnicas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Modelo Original</p><p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>{imp.modelo}</p></div>
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Patrimônio</p><p className="text-sm font-black text-blue-500">{imp.patrimonio || 'S/P'}</p></div>
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Endereço IP</p><p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>{imp.specs?.ip || imp.specs?.IP || 'Desconhecido'}</p></div>
              
              {/* 🚀 O HOSTNAME FOI ADICIONADO AQUI, NO LADO DIREITO */}
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Hostname</p><p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>{imp.specs?.hostname || imp.specs?.Hostname || 'Desconhecido'}</p></div>
              
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Setor / Sala</p><p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>{imp.setor || 'Não Definido'}</p></div>
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Serial Number</p><p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>{imp.serial || imp.specs?.serial || imp.specs?.Serial || 'Desconhecido'}</p></div>
              <div><p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Última Leitura</p><p className="text-sm font-bold italic opacity-60" style={{ color: 'var(--text-muted)' }}>{imp.ultima_comunicacao ? new Date(imp.ultima_comunicacao + 'Z').toLocaleString('pt-BR') : 'Nunca'}</p></div>
            </div>

            {(() => {
              const tVal = parseFloat(imp.specs?.['% Toner'] || imp.specs?.toner || 100);
              const dVal = parseFloat(imp.specs?.['% Drum'] || imp.specs?.cilindro || 100);
              const menorNivel = Math.min(tVal, dVal);

              let statusColor = 'emerald';
              let statusText = '✅ Suprimentos operando dentro da normalidade.';
              
              if (menorNivel <= 15) { statusColor = 'red'; statusText = '🚨 CRÍTICO: Troca de suprimento necessária imediatamente!'; } 
              else if (menorNivel <= 30) { statusColor = 'amber'; statusText = '⚠️ ATENÇÃO: Suprimento baixo, programe a troca.'; }

              return (
                <div className={`mt-6 p-4 rounded-xl border bg-${statusColor}-50 border-${statusColor}-200`}>
                   <p className="text-[9px] uppercase font-black mb-2" style={{ color: 'var(--text-muted)' }}>Status de Suprimentos</p>
                   <div className={`text-${statusColor}-600 font-bold text-xs ${menorNivel <= 15 ? 'animate-pulse font-black' : ''}`}>{statusText}</div>
                </div>
              );
            })()}
          </div>

          <div className="w-full xl:flex-1 space-y-3 xl:pl-6 xl:border-l" style={{ borderColor: 'var(--border-light)' }}>
             <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Faturamento (Páginas)</h4>
                    <select 
                        className="text-[10px] px-2 py-1 rounded border font-bold outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                        value={filtroTempo}
                        onChange={(e) => setFiltroTempo(e.target.value)}
                    >
                        <option value="hora">Por Hora</option>
                        <option value="dia">Por Dia</option>
                        <option value="mes">Por Mês</option>
                    </select>
                </div>
                
                <div className="text-right">
                   <span className="text-[9px] font-black block" style={{ color: 'var(--text-muted)' }}>CONTADOR TOTAL</span>
                   <span className="text-2xl font-black text-blue-600">
                     {parseInt(imp.specs?.['Páginas Impressas'] || imp.specs?.paginas_totais || 0).toLocaleString('pt-BR')}
                   </span>
                </div>
             </div>
             
             <div className="h-36 w-full">
               {loadingGrafico ? ( <div className="h-full flex items-center justify-center text-xs italic opacity-50" style={{ color: 'var(--text-muted)' }}>Carregando histórico...</div> ) : 
               dadosProcessados.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={dadosProcessados} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" opacity={0.5} />
                     <XAxis dataKey="data_simplificada" tick={{fontSize: 10, fill: 'var(--text-muted)', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--text-muted)' }} width={45} domain={['auto', 'auto']} />
                     <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }} cursor={false} />
                     <Line type="monotone" dataKey="paginas" name="Páginas Impressas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, stroke: '#3b82f6', fill: '#fff' }} />
                   </LineChart>
                 </ResponsiveContainer>
               ) : ( <div className="h-full flex items-center justify-center text-xs italic opacity-50" style={{ color: 'var(--text-muted)' }}>Aguardando coletas automáticas do agente</div> )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}