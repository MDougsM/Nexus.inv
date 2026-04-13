import React, { useState, useMemo } from 'react';
import { getStatusBadge, getNomeTipoEquipamento } from '../../utils/helpers';
import { QRCodeSVG } from 'qrcode.react';

export default function TabelaInventario({
  ativosPaginaAtual, // Lista original (apesar do nome, usaremos ela para os filtros locais)
  selecionados,
  handleSelectAll,
  handleSelectOne,
  categorias,
  dropdownAberto,
  setDropdownAberto,
  abrirFicha,
  setModalQR,
  setAtivoClonado,
  setAbaAtiva,
  abrirEdicao,
  setModalTransferencia,
  setModalStatus,
  formStatus,
  setFormStatus,
  setModalExcluir,
  setMotivoExclusao,
  setModalTerminal
}) {
  const [linhaExpandida, setLinhaExpandida] = useState(null);
  
  // --- ESTADOS DOS FILTROS AVANÇADOS ---
  const [filtroDropdownStatus, setFiltroDropdownStatus] = useState('');
  const [filtroDropdownCategoria, setFiltroDropdownCategoria] = useState('');
  const [filtroDropdownUnidade, setFiltroDropdownUnidade] = useState('');

  // 🚀 Pega a empresa atual para o QR Code
  const tenantAtual = localStorage.getItem('tenant_id') || 'NEWPC'; 

  const toggleLinha = (id) => setLinhaExpandida(linhaExpandida === id ? null : id);

  const isOnline = (ultimaComunicacao) => {
    if (!ultimaComunicacao) return false;
    const dataComunicacao = new Date(ultimaComunicacao + 'Z'); 
    const agora = new Date();
    const diferencaMinutos = (agora - dataComunicacao) / (1000 * 60);
    return diferencaMinutos >= 0 && diferencaMinutos < 4320; 
  };

  const formatarDataUltimoAcesso = (isoDate) => {
    if (!isoDate) return 'Nunca sincronizado';
    return new Date(isoDate + 'Z').toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const parseJSONSeguro = (dado) => {
      if (!dado) return {};
      if (typeof dado === 'object') return dado;
      try { 
        return JSON.parse(dado.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true')); 
      } 
      catch(e) { return {}; }
  };

  // --- LÓGICA DE FILTRAGEM ---
  
  // 1. Gera as listas únicas para popular os Dropdowns baseadas nos dados atuais
  const opcoesStatus = useMemo(() => {
    const statusSet = new Set(ativosPaginaAtual.map(a => a.status).filter(Boolean));
    return Array.from(statusSet).sort();
  }, [ativosPaginaAtual]);

  const opcoesCategorias = useMemo(() => {
    const catSet = new Set(ativosPaginaAtual.map(a => getNomeTipoEquipamento(a, categorias)).filter(Boolean));
    return Array.from(catSet).sort();
  }, [ativosPaginaAtual, categorias]);

  const opcoesUnidades = useMemo(() => {
    const unidadeSet = new Set(ativosPaginaAtual.map(a => a.unidade?.nome || a.secretaria).filter(Boolean));
    return Array.from(unidadeSet).sort();
  }, [ativosPaginaAtual]);

  // 2. Aplica os filtros na lista sendo exibida
  const ativosFiltradosTabela = useMemo(() => {
    return ativosPaginaAtual.filter(ativo => {
      let matchStatus = true;
      let matchCategoria = true;
      let matchUnidade = true;

      if (filtroDropdownStatus) {
        matchStatus = ativo.status === filtroDropdownStatus;
      }
      
      if (filtroDropdownCategoria) {
         const catNome = getNomeTipoEquipamento(ativo, categorias) || '';
         matchCategoria = catNome === filtroDropdownCategoria;
      }
      
      if (filtroDropdownUnidade) {
         const uniNome = ativo.unidade?.nome || ativo.secretaria || '';
         matchUnidade = uniNome === filtroDropdownUnidade;
      }

      return matchStatus && matchCategoria && matchUnidade;
    });
  }, [ativosPaginaAtual, filtroDropdownStatus, filtroDropdownCategoria, filtroDropdownUnidade, categorias]);

  // Handler para limpar os filtros locais da tabela
  const limparFiltros = () => {
     setFiltroDropdownStatus('');
     setFiltroDropdownCategoria('');
     setFiltroDropdownUnidade('');
  };

  const filtrosAtivos = filtroDropdownStatus || filtroDropdownCategoria || filtroDropdownUnidade;

  return (
    <div className="flex-1 overflow-x-auto mt-2 min-h-[350px] pb-20">
      <table className="w-full text-left text-sm">
        <thead style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)' }}>
          {/* --- LINHA DOS FILTROS DROPDOWN --- */}
          <tr>
             <th colSpan="2" className="p-2 border-r" style={{ borderColor: 'var(--border-light)' }}>
               {filtrosAtivos && (
                  <button 
                    onClick={limparFiltros}
                    className="w-full text-[10px] uppercase font-black text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  >
                     Limpar Filtros ✖
                  </button>
               )}
             </th>
             <th className="p-2 hidden sm:table-cell border-r" style={{ borderColor: 'var(--border-light)' }}>
                <select 
                   value={filtroDropdownStatus} 
                   onChange={(e) => setFiltroDropdownStatus(e.target.value)}
                   className="w-full text-xs font-bold p-1 rounded outline-none cursor-pointer text-gray-600 bg-white border border-gray-200 hover:border-blue-400"
                >
                   <option value="">Status...</option>
                   {opcoesStatus.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </th>
             <th className="p-2 border-r" style={{ borderColor: 'var(--border-light)' }}>
                <select 
                   value={filtroDropdownCategoria} 
                   onChange={(e) => setFiltroDropdownCategoria(e.target.value)}
                   className="w-full text-xs font-bold p-1 rounded outline-none cursor-pointer text-gray-600 bg-white border border-gray-200 hover:border-blue-400"
                >
                   <option value="">Equipamento...</option>
                   {opcoesCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </th>
             <th className="p-2 hidden md:table-cell border-r" style={{ borderColor: 'var(--border-light)' }}>
                <select 
                   value={filtroDropdownUnidade} 
                   onChange={(e) => setFiltroDropdownUnidade(e.target.value)}
                   className="w-full text-xs font-bold p-1 rounded outline-none cursor-pointer text-gray-600 bg-white border border-gray-200 hover:border-blue-400"
                >
                   <option value="">Localização...</option>
                   {opcoesUnidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
             </th>
             <th className="p-2 text-center text-[10px] font-black uppercase text-gray-400">
                {ativosFiltradosTabela.length} itens
             </th>
          </tr>

          {/* --- LINHA DOS TÍTULOS ORIGINAIS --- */}
          <tr>
            <th className="p-4 w-10">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded cursor-pointer" 
                checked={selecionados.length === ativosFiltradosTabela.length && ativosFiltradosTabela.length > 0} 
                onChange={(e) => handleSelectAll({ ...e, target: { ...e.target, checked: e.target.checked, list: ativosFiltradosTabela }})} 
              />
            </th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>Patrimônio / Máquina</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60 hidden sm:table-cell" style={{ color: 'var(--text-main)' }}>Status</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>Equipamento</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60 hidden md:table-cell" style={{ color: 'var(--text-main)' }}>Unidade / Local</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60 text-right" style={{ color: 'var(--text-main)' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {ativosFiltradosTabela.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-12 text-center opacity-50 font-bold" style={{ color: 'var(--text-main)' }}>
                <div className="text-4xl mb-4">{ativosPaginaAtual.length > 0 ? "🕵️‍♂️" : "📭"}</div>
                {ativosPaginaAtual.length > 0 ? "Nenhum equipamento bate com os filtros aplicados." : "Nenhum equipamento encontrado."}
              </td>
            </tr>
          ) : (
            ativosFiltradosTabela.map(ativo => {
              const din = parseJSONSeguro(ativo.dados_dinamicos);
              const adv = typeof din.dados_avancados === 'string' ? parseJSONSeguro(din.dados_avancados) : (din.dados_avancados || {});
              const online = isOnline(ativo.ultima_comunicacao);

              return (
                <React.Fragment key={ativo.id}>
                  {/* LINHA PRINCIPAL */}
                  <tr 
                    onClick={() => toggleLinha(ativo.id)} 
                    className="border-b transition-all duration-300 hover:bg-black/5 relative cursor-pointer" 
                    style={{ borderColor: 'var(--border-light)', backgroundColor: selecionados.includes(ativo.patrimonio) ? 'rgba(85, 110, 230, 0.05)' : (linhaExpandida === ativo.id ? 'var(--bg-input)' : 'transparent') }}
                  >
                    <td className="p-4 w-10" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded cursor-pointer" 
                        checked={selecionados.includes(ativo.patrimonio)} 
                        onChange={(e) => handleSelectOne(e, ativo.patrimonio)} 
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-black" style={{ color: 'var(--color-blue)' }}>{ativo.patrimonio}</div>

                        <div className="group relative flex items-center justify-center ml-1">
                          <span className="relative flex h-2.5 w-2.5">
                            {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${online ? 'bg-emerald-500' : 'bg-gray-400/50'}`}></span>
                          </span>
                          
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-lg z-50">
                            {online ? (
                               <span className="font-bold text-emerald-400">🟢 Agente Online</span>
                            ) : (
                               <div className="flex flex-col items-center">
                                  <span className="font-bold text-gray-300 mb-0.5">⚪ Agente Offline</span>
                                  <span className="text-[9px] text-gray-400">Visto em: {formatarDataUltimoAcesso(ativo.ultima_comunicacao)}</span>
                               </div>
                            )}
                          </div>
                        </div>

                        {ativo.dominio_proprio && <span className="flex items-center justify-center text-[15px]" title="🔖 Equipamento Próprio">🔖</span>}
                      </div>

                      {ativo.nome_personalizado && (
                        <div className="text-[10px] font-black uppercase mt-1 px-2 py-0.5 rounded inline-block truncate max-w-[150px]" style={{ backgroundColor: 'var(--border-light)', color: 'var(--text-muted)' }} title={ativo.nome_personalizado}>
                           {ativo.nome_personalizado}
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4 hidden sm:table-cell">{getStatusBadge(ativo.status)}</td>
                    
                    <td className="p-4">
                      <div className="font-black text-xs md:text-sm" style={{color: 'var(--text-main)'}}>{getNomeTipoEquipamento(ativo, categorias) || '-'}</div>
                      <div className="text-[10px] font-bold opacity-60 mt-0.5" style={{color:'var(--text-main)'}}>{ativo.marca} {ativo.modelo}</div>
                    </td>
                    
                    <td className="p-4 hidden md:table-cell">
                      <div className="font-black text-xs uppercase text-blue-600">
                        {ativo.unidade ? ativo.unidade.nome : (ativo.secretaria || 'Não Alocado')}
                      </div>
                      <div className="text-[10px] font-bold opacity-60 mt-0.5" style={{color:'var(--text-main)'}}>
                        {ativo.unidade ? ativo.unidade.tipo : (ativo.setor || '-')}
                      </div>
                    </td>
                    
                    <td className="p-4 flex justify-end items-center gap-2 relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => abrirFicha(ativo.patrimonio)} title="Ficha Completa" className="p-1.5 rounded transition-all hover:bg-gray-500/10 border shadow-sm hover:scale-105" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>👁️</button>
                      <button onClick={() => setModalQR({ aberto: true, ativo })} title="Imprimir Etiqueta" className="p-1.5 rounded transition-all hover:bg-gray-500/10 border shadow-sm hover:scale-105" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>🖨️</button>
                      
                      <div>
                        <button onClick={() => setDropdownAberto(dropdownAberto === ativo.id ? null : ativo.id)} className="flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold transition-all hover:bg-gray-500/10 shadow-sm" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>Opções ▾</button>
                        
                        {dropdownAberto === ativo.id && (
                           <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border z-50 overflow-hidden animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                              <button onClick={() => { setAtivoClonado(ativo); setAbaAtiva('novo'); setDropdownAberto(null); }} className="w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-blue-500/10 font-black border-b" style={{ color: 'var(--color-blue)', borderColor: 'var(--border-light)' }}>📋 Clonar Máquina</button>
                              <button onClick={() => {abrirEdicao(ativo); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-500/10 font-medium" style={{ color: 'var(--text-main)' }}>✏️ Editar Cadastro</button>
                              <button onClick={() => {setModalTransferencia({ aberto: true, ativos: [ativo] }); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-500/10 font-medium" style={{ color: 'var(--text-main)' }}>🚚 Transferir Local</button>
                              <button onClick={() => {setModalStatus({ aberto: true, ativos: [ativo] }); setFormStatus({...formStatus, novo_status: ativo.status === 'MANUTENÇÃO' ? 'ATIVO' : 'MANUTENÇÃO'}); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-500/10 font-medium" style={{ color: 'var(--text-main)' }}>🛠️ Alterar Status</button>
                              <button onClick={() => { setModalTerminal({ aberto: true, ativo: ativo }); setDropdownAberto(null); }} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-emerald-500/10 font-bold" style={{ color: 'var(--color-green)' }}>&gt;_ Terminal Remoto</button>
                              <div className="border-t my-1" style={{ borderColor: 'var(--border-light)' }}></div>
                              <button onClick={() => {setModalExcluir({ aberto: true, ativos: [ativo] }); setMotivoExclusao(''); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 font-bold" style={{ color: 'var(--color-red)' }}>🗑️ Excluir Definitivo</button>
                           </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* QUICK VIEW (VISÃO RÁPIDA) */}
                  {linhaExpandida === ativo.id && (
                    <tr className="border-b animate-fade-in" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                       <td colSpan="6" className="p-4 relative">
                          <div className="flex flex-wrap gap-3 items-center">
                             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm bg-white" style={{ borderColor: 'var(--border-light)' }}>
                                <span className="text-sm opacity-50">👤</span>
                                <div>
                                   <p className="text-[8px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Usuário Logado</p>
                                   <p className="text-xs font-bold truncate max-w-[120px]" style={{ color: 'var(--color-blue)' }}>{din.usuario_pc || adv.usuario_pc || 'Não Logado'}</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm bg-white" style={{ borderColor: 'var(--border-light)' }}>
                                <span className="text-sm opacity-50">⏳</span>
                                <div>
                                   <p className="text-[8px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Último Login / Sinc</p>
                                   <p className={`text-xs font-bold ${online ? 'text-emerald-600' : 'text-amber-600'}`}>{formatarDataUltimoAcesso(ativo.ultima_comunicacao)}</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm bg-white" style={{ borderColor: 'var(--border-light)' }}>
                                <span className="text-sm opacity-50">🌐</span>
                                <div>
                                   <p className="text-[8px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>IP Local</p>
                                   <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-main)' }}>{din.ip || din.IP || 'N/A'}</p>
                                </div>
                             </div>

                             {din.ram && (
                               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm bg-white hidden md:flex" style={{ borderColor: 'var(--border-light)' }}>
                                  <span className="text-sm opacity-50">⚡</span>
                                  <div>
                                     <p className="text-[8px] font-black uppercase opacity-50" style={{ color: 'var(--text-main)' }}>RAM</p>
                                     <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{din.ram}</p>
                                  </div>
                               </div>
                             )}

                             {online && (
                                <button 
                                   onClick={(e) => { e.stopPropagation(); setModalTerminal({ aberto: true, ativo: ativo }); }}
                                   className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95"
                                >
                                   <span className="font-mono font-black text-xs">&gt;_ Terminal</span>
                                </button>
                             )}
                          </div>
                       </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}