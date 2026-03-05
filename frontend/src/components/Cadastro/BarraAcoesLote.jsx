import React from 'react';

export default function BarraAcoesLote({
  selecionados,
  setSelecionados,
  ativosFiltrados,
  setModalQRLote,
  setModalTransferencia,
  setModalEdicaoMassa,
  setModalStatus,
  setModalExcluir,
  setMotivoExclusao
}) {
  
  if (selecionados.length === 0) return null;

  // Função para pegar os objetos completos das máquinas selecionadas
  const getAtivosSelecionados = () => ativosFiltrados.filter(a => selecionados.includes(a.patrimonio));

  return (
    <div className="p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl border animate-scale-up z-10 relative" style={{ backgroundColor: 'var(--color-blue)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>
      
      <div className="flex items-center gap-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/20 font-black text-lg shadow-inner">{selecionados.length}</span>
        <div>
          <span className="font-black text-base tracking-tight block">Itens Selecionados</span>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 block">Ação em lote ativada</span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setModalQRLote({ aberto: true, ativos: getAtivosSelecionados() })} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs transition-all backdrop-blur-sm active:scale-95 shadow-sm">🖨️ QRs</button>
        <button onClick={() => setModalTransferencia({ aberto: true, ativos: getAtivosSelecionados() })} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs transition-all backdrop-blur-sm active:scale-95 shadow-sm">🚚 Transferir</button>
        <button onClick={() => setModalEdicaoMassa({ aberto: true, ativos: getAtivosSelecionados() })} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs transition-all backdrop-blur-sm active:scale-95 shadow-sm">✏️ Editar Lote</button>
        <button onClick={() => setModalStatus({ aberto: true, ativos: getAtivosSelecionados() })} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs transition-all backdrop-blur-sm active:scale-95 shadow-sm">🛠️ Status</button>
        
        <div className="w-px h-8 bg-white/20 mx-1 hidden sm:block"></div>
        
        <button onClick={() => { setMotivoExclusao(''); setModalExcluir({ aberto: true, ativos: getAtivosSelecionados() }); }} className="px-4 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 font-bold text-xs transition-all shadow-lg active:scale-95 border border-red-400/50">🗑️ Excluir</button>
        <button onClick={() => setSelecionados([])} className="px-4 py-2.5 rounded-xl opacity-60 hover:opacity-100 font-bold text-xs transition-all hover:bg-white/5">&times; Cancelar</button>
      </div>
    </div>
  );
}