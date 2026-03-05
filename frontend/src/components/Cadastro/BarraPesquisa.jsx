import React from 'react';

export default function BarraPesquisa({ 
  buscaGeral, setBuscaGeral, 
  filtroStatus, setFiltroStatus, 
  setPaginaAtual, exportarParaExcel 
}) {
  return (
    <div className="p-4 rounded-3xl shadow-lg border flex flex-col lg:flex-row gap-4 items-end transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* PESQUISA LIVRE */}
        <div className="md:col-span-1">
          <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Pesquisa Livre</label>
          <input 
            type="text" 
            placeholder="Patrimônio, marca, sala..." 
            value={buscaGeral} 
            onChange={(e) => {setBuscaGeral(e.target.value); setPaginaAtual(1);}} 
            className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" 
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
          />
        </div>

        {/* FILTRO DE STATUS */}
        <div className="md:col-span-1">
          <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Filtrar Status</label>
          <select 
            value={filtroStatus} 
            onChange={(e) => {setFiltroStatus(e.target.value); setPaginaAtual(1);}} 
            className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" 
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
          >
            <option value="">Todos os Status</option>
            <option value="ATIVO">Em Operação (Ativos)</option>
            <option value="MANUTENÇÃO">Em Manutenção</option>
            <option value="SUCATA">Descartados (Sucata)</option>
          </select>
        </div>

        {/* BOTÃO EXPORTAR */}
        <div className="md:col-span-1 flex items-end">
          <button 
            onClick={exportarParaExcel} 
            className="w-full h-[50px] flex items-center justify-center gap-2 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all active:scale-95"
          >
            <span className="text-lg">📊</span> <span className="hidden sm:inline">Exportar Relatório</span>
          </button>
        </div>

      </div>
    </div>
  );
}