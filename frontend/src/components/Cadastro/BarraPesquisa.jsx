import React, { useState } from 'react';

// =========================================================================
// 🚀 COMPONENTE: DROPDOWN DE MÚLTIPLA ESCOLHA (COM CHECKBOX)
// =========================================================================
const DropdownMultiSelect = ({ titulo, opcoes, selecionados, setSelecionados }) => {
  const [aberto, setAberto] = useState(false);

  const toggleOpcao = (opcao) => {
    if (selecionados.includes(opcao)) {
      setSelecionados(selecionados.filter(item => item !== opcao));
    } else {
      setSelecionados([...selecionados, opcao]);
    }
  };

  const textoBotao = selecionados.length === 0 
    ? `Todos(as)` 
    : selecionados.length === 1 
      ? selecionados[0] 
      : `${selecionados.length} Selecionados`;

  return (
    <div className="relative w-full">
      <button 
        onClick={() => setAberto(!aberto)}
        className="flex items-center justify-between gap-2 px-3 h-[40px] w-full border rounded-xl text-xs font-bold shadow-sm transition-all"
        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
      >
        <span className="truncate">{textoBotao}</span>
        <span className="text-[10px] opacity-60">▼</span>
      </button>

      {aberto && (
        <>
          {/* Fundo invisível para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)}></div>
          
          <div className="absolute top-full left-0 mt-1 w-[260px] max-h-64 overflow-y-auto border rounded-xl shadow-2xl z-50 p-2 animate-fade-in" 
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            
            <button 
              onClick={() => { setSelecionados([]); setAberto(false); }}
              className="w-full text-left px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg mb-1 border-b transition-colors" 
              style={{ borderColor: 'var(--border-light)' }}
            >
              Limpar Seleção
            </button>

            {opcoes.map(opcao => (
              <label key={opcao} className="flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors" style={{ color: 'var(--text-main)' }}>
                <input 
                  type="checkbox" 
                  checked={selecionados.includes(opcao)}
                  onChange={() => toggleOpcao(opcao)}
                  className="rounded w-4 h-4 cursor-pointer text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold truncate" title={opcao}>{opcao}</span>
              </label>
            ))}

            {opcoes.length === 0 && (
              <div className="px-3 py-4 text-center text-xs opacity-50 font-bold" style={{ color: 'var(--text-main)' }}>
                Nenhuma opção disponível
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// =========================================================================
// 🚀 COMPONENTE PRINCIPAL: BARRA DE PESQUISA
// =========================================================================
export default function BarraPesquisa({ 
  buscaGeral, setBuscaGeral, 
  filtroStatus, setFiltroStatus,
  filtroAgente, setFiltroAgente,
  filtroCategoria, setFiltroCategoria,
  filtroMarca, setFiltroMarca,
  
  // 🚀 Novas Props Múltiplas
  filtroSecretarias, setFiltroSecretarias,
  filtroSetores, setFiltroSetores,
  secretariasDisponiveis, setoresDisponiveis,
  
  opcoesCategorias, opcoesMarcas, 
  setPaginaAtual, exportarParaExcel, exportarParaPDF, totalFiltrados
}) {
  
  const limparFiltros = () => {
    setBuscaGeral(''); 
    setFiltroStatus(''); 
    setFiltroAgente('');
    setFiltroCategoria(''); 
    setFiltroMarca(''); 
    setFiltroSecretarias([]); // Limpa secretarias
    setFiltroSetores([]);     // Limpa setores
    setPaginaAtual(1);
  };

  const filtrosAtivos = buscaGeral || filtroStatus || filtroAgente || filtroCategoria || filtroMarca || filtroSecretarias.length > 0 || filtroSetores.length > 0;

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
      {/* 🚀 Alterado para lg:grid-cols-3 xl:grid-cols-6 para caber os 6 filtros alinhados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
        
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
            <option value="DESAPARECIDOS">⚠️ Desaparecidos (S/ Aud. 2026)</option>
            <option value="INATIVO">Inativo / Sem Atualização</option>
            <option value="MANUTENÇÃO">Em Manutenção</option>
            <option value="SUCATA">Descartado (Sucata)</option>
          </select>
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Tipo Equipamento</label>
          <select value={filtroCategoria} onChange={(e) => {setFiltroCategoria(e.target.value); setPaginaAtual(1);}} className="w-full h-[40px] px-3 rounded-xl border outline-none text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
            <option value="">Todas Categorias</option>
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

        {/* 🚀 O NOVO MULTI-SELECT DE UNIDADES */}
        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Unidade / Secretaria</label>
          <DropdownMultiSelect 
            titulo="Unidades" 
            opcoes={secretariasDisponiveis} 
            selecionados={filtroSecretarias} 
            setSelecionados={(selecao) => {
              setFiltroSecretarias(selecao);
              setFiltroSetores([]); // MÁGICA: Limpa o setor se a secretaria mudar
              setPaginaAtual(1);
            }} 
          />
        </div>

        {/* 🚀 O NOVO MULTI-SELECT DE SETORES */}
        <div>
          <label className="block text-[9px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Setor / Local</label>
          <DropdownMultiSelect 
            titulo="Setores" 
            opcoes={setoresDisponiveis} 
            selecionados={filtroSetores} 
            setSelecionados={(selecao) => {
              setFiltroSetores(selecao);
              setPaginaAtual(1);
            }} 
          />
        </div>

        {/* BOTÃO LIMPAR FILTROS */}
        {filtrosAtivos && (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6 flex justify-end mt-1 animate-fade-in">
            <button onClick={limparFiltros} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-5 py-2.5 rounded-xl transition-colors border border-red-200 dark:border-red-800/30">
               Limpar Todos os Filtros ✖
            </button>
          </div>
        )}

      </div>
    </div>
  );
}