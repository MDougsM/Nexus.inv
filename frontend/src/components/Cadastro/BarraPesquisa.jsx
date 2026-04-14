import React from 'react';

export default function BarraPesquisa({ 
  buscaGeral, setBuscaGeral, 
  filtroStatus, setFiltroStatus,
  filtroAgente, setFiltroAgente,
  filtroCategoria, setFiltroCategoria,
  filtroMarca, setFiltroMarca,
  filtroUnidade, setFiltroUnidade,
  opcoesCategorias, opcoesMarcas, opcoesUnidades,
  setPaginaAtual, exportarParaExcel, exportarParaPDF, totalFiltrados
}) {
  
  const limparFiltros = () => {
    setBuscaGeral(''); setFiltroStatus(''); setFiltroAgente('');
    setFiltroCategoria(''); setFiltroMarca(''); setFiltroUnidade('');
    setPaginaAtual(1);
  };

  const filtrosAtivos = buscaGeral || filtroStatus || filtroAgente || filtroCategoria || filtroMarca || filtroUnidade;

  return (
    <div className="p-5 rounded-3xl shadow-md border space-y-4 transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
      
      {/* LINHA 1: BUSCA GERAL & EXPORTAÇÃO */}
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        
        {/* Container da Esquerda: Label + Input */}
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>
            Pesquisa Livre Omnisciente
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input 
              type="text" 
              placeholder="Patrimônio, marca, sala, IP, software..." 
              value={buscaGeral} 
              onChange={(e) => {setBuscaGeral(e.target.value); setPaginaAtual(1);}} 
              className="w-full h-[45px] pl-12 pr-4 rounded-xl border outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm" 
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
            />
          </div>
        </div>

        {/* Container da Direita: Botões Lado a Lado */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={exportarParaExcel} 
            className="h-[45px] px-6 flex items-center justify-center gap-2 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 text-xs whitespace-nowrap"
          >
            <span className="text-sm">📊</span> <span>Exportar ({totalFiltrados})</span>
          </button>
          
          <button 
            onClick={exportarParaPDF} 
            className="h-[45px] px-6 flex items-center justify-center gap-2 rounded-xl font-black text-white bg-slate-800 hover:bg-slate-900 shadow-lg shadow-slate-900/30 transition-all active:scale-95 text-xs whitespace-nowrap"
          >
            <span className="text-sm">📄</span> <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* LINHA 2: FILTROS CIRÚRGICOS (NOC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
        
        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Comunicação Agente</label>
          <select value={filtroAgente} onChange={(e) => {setFiltroAgente(e.target.value); setPaginaAtual(1);}} className="w-full h-[40px] px-3 rounded-xl border outline-none text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
            <option value="">Todos na Rede</option>
            <option value="ONLINE">🟢 Apenas Online</option>
            <option value="OFFLINE">🔴 Apenas Offline</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Status do Ativo</label>
          <select value={filtroStatus} onChange={(e) => {setFiltroStatus(e.target.value); setPaginaAtual(1);}} className="w-full h-[40px] px-3 rounded-xl border outline-none text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
            <option value="">Todos os Status</option>
            <option value="ATIVO">Em Operação (Ativo)</option>
            <option value="MANUTENÇÃO">Em Manutenção</option>
            <option value="SUCATA">Descartado (Sucata)</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Tipo de Equipamento</label>
          <select value={filtroCategoria} onChange={(e) => {setFiltroCategoria(e.target.value); setPaginaAtual(1);}} className="w-full h-[40px] px-3 rounded-xl border outline-none text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
            <option value="">Todas as Categorias</option>
            {opcoesCategorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Marca / Fabricante</label>
          <select value={filtroMarca} onChange={(e) => {setFiltroMarca(e.target.value); setPaginaAtual(1);}} className="w-full h-[40px] px-3 rounded-xl border outline-none text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
            <option value="">Todas as Marcas</option>
            {opcoesMarcas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Unidade / Localidade</label>
          <select value={filtroUnidade} onChange={(e) => {setFiltroUnidade(e.target.value); setPaginaAtual(1);}} className="w-full h-[40px] px-3 rounded-xl border outline-none text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
            <option value="">Todas as Localidades</option>
            {opcoesUnidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* BOTÃO LIMPAR FILTROS */}
        {filtrosAtivos && (
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end mt-1 animate-fade-in">
            <button onClick={limparFiltros} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-5 py-2.5 rounded-xl transition-colors border border-red-200">
               Limpar Todos os Filtros ✖
            </button>
          </div>
        )}

      </div>
    </div>
  );
}