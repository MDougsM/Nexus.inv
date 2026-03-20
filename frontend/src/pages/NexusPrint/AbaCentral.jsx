import React from 'react';
import CardNexus from './CardNexus';
import { FaSearch, FaSatelliteDish } from 'react-icons/fa';

export default function AbaCentralPrint({ 
    ativos, filtros, setFiltros, secretariasList, selecionados, setSelecionados, 
    handleSelectAll, handleSelectOne, dispararColeta, exportarRelatorio,
    expandedId, setExpandedId, abrirFicha, abrirEdicao, 
    setModalStatus, setModalExcluir, setModalTransferencia 
}) {

  const ativosFiltrados = ativos.filter(imp => {
    const texto = filtros.pesquisa.toLowerCase();
    const nome = (imp.nome_personalizado || imp.modelo || '').toLowerCase();
    const ip = (imp.specs?.ip || imp.specs?.IP || '').toLowerCase();
    const sn = (imp.serial || imp.specs?.serial || '').toLowerCase();
    const p = (imp.patrimonio || '').toLowerCase();
    const matchPesquisa = !texto || nome.includes(texto) || ip.includes(texto) || sn.includes(texto) || p.includes(texto);
    const matchSec = filtros.secretaria === 'Todas' || (imp.secretaria || 'Não Informada') === filtros.secretaria;
    
    let matchSup = true;
    if (filtros.suprimento !== 'Todos') {
        const tVal = parseFloat(imp.specs?.['% Toner'] || imp.specs?.toner || 100);
        const dVal = parseFloat(imp.specs?.['% Drum'] || imp.specs?.cilindro || 100);
        const menorNivel = Math.min(tVal, dVal);
        if (filtros.suprimento === 'Normal') matchSup = menorNivel > 30;
        if (filtros.suprimento === 'Atenção') matchSup = menorNivel > 15 && menorNivel <= 30;
        if (filtros.suprimento === 'Crítico') matchSup = menorNivel <= 15;
    }
    return matchPesquisa && matchSec && matchSup;
  });

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* 🚀 BARRA DE AÇÕES (Sua Original) */}
      <div className="p-4 rounded-2xl flex flex-col md:flex-row gap-4 border items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="flex flex-1 w-full gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-[var(--text-main)]" />
                  <input 
                      type="text" 
                      placeholder="Buscar Nome, IP, Serial..." 
                      value={filtros.pesquisa}
                      onChange={e => setFiltros({...filtros, pesquisa: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border font-bold text-sm outline-none transition-all"
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                  />
              </div>
              <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: 'var(--border-light)' }}>
                  <select className="py-2.5 px-3 rounded-xl border text-sm font-bold outline-none cursor-pointer" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={filtros.secretaria} onChange={e => setFiltros({...filtros, secretaria: e.target.value})}>
                      {secretariasList.map(s => <option key={s} value={s}>{s === 'Todas' ? 'Todas as Secretarias' : s}</option>)}
                  </select>
                  <select className="py-2.5 px-3 rounded-xl border text-sm font-bold outline-none cursor-pointer" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={filtros.suprimento} onChange={e => setFiltros({...filtros, suprimento: e.target.value})}>
                      <option value="Todos">Todos os Níveis</option>
                      <option value="Normal">🟢 Normal (&gt;30%)</option>
                      <option value="Atenção">🟡 Atenção (&lt;30%)</option>
                      <option value="Crítico">🔴 Crítico (&lt;15%)</option>
                  </select>
              </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={exportarRelatorio} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all whitespace-nowrap">
                   Exportar Tudo
              </button>
              <button onClick={dispararColeta} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 shadow-lg transition-all whitespace-nowrap">
                  <FaSatelliteDish /> Forçar Leitura
              </button>
          </div>
      </div>

      {/* 🚀 TABELA COM OS CARDS */}
      <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b text-[10px] font-black uppercase tracking-widest opacity-60" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-input)' }}>
          <div className="col-span-1 flex items-center gap-3">
            <input type="checkbox" onChange={(e) => handleSelectAll(e, ativosFiltrados)} checked={selecionados.length === ativosFiltrados.length && ativosFiltrados.length > 0} className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
            <span>STS</span>
          </div>
          <div className="col-span-3">Identificação</div>
          <div className="col-span-3">Localização</div>
          <div className="col-span-2">Toner Nível</div>
          <div className="col-span-2">Cilindro Nível</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {ativosFiltrados.map(imp => (
            <CardNexus 
              key={imp.id} imp={imp} expandedId={expandedId} setExpandedId={setExpandedId} 
              selecionados={selecionados} handleSelectOne={handleSelectOne} 
              abrirFicha={() => abrirFicha(imp.id)} 
              abrirEdicao={() => abrirEdicao(imp)} 
              setModalStatus={setModalStatus} 
              setModalExcluir={setModalExcluir} 
              setModalTransferencia={setModalTransferencia} 
            />
          ))}
        </div>
      </div>

    </div>
  );
}