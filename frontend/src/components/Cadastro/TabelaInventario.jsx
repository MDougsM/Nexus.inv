import React from 'react';
import { getStatusBadge, getNomeTipoEquipamento } from '../../utils/helpers';

export default function TabelaInventario({
  ativosPaginaAtual,
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
  setMotivoExclusao
}) {

  const isOnline = (ultimaComunicacao) => {
    if (!ultimaComunicacao) return false;
    
    // Converte a data do banco (UTC) para o fuso do navegador
    const dataComunicacao = new Date(ultimaComunicacao + 'Z'); 
    const agora = new Date();
    
    // A diferença em milissegundos convertida para MINUTOS (para mais precisão)
    const diferencaMinutos = (agora - dataComunicacao) / (1000 * 60);
    
    // 3 dias = 4320 minutos. Se a última comunicação for MENOR que 4320 min, é online!
    // E também garante que a diferença não é absurdamente negativa por erro de fuso horário.
    return diferencaMinutos >= 0 && diferencaMinutos < 4320; 
  };
  
  return (
    <div className="flex-1 overflow-x-auto mt-2 min-h-[350px] pb-20">
      <table className="w-full text-left text-sm">
        <thead style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-light)' }}>
          <tr>
            <th className="p-4 w-10"><input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selecionados.length === ativosPaginaAtual.length && ativosPaginaAtual.length > 0} onChange={handleSelectAll} /></th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>Patrimônio</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60 hidden sm:table-cell" style={{ color: 'var(--text-main)' }}>Status</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>Equipamento</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60 hidden md:table-cell" style={{ color: 'var(--text-main)' }}>Localização</th>
            <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-60 text-right" style={{ color: 'var(--text-main)' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {ativosPaginaAtual.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-12 text-center opacity-50 font-bold" style={{ color: 'var(--text-main)' }}>
                <div className="text-4xl mb-4">📭</div>
                Nenhum equipamento encontrado com estes filtros.
              </td>
            </tr>
          ) : (
            ativosPaginaAtual.map(ativo => (
              <tr key={ativo.id} className="border-b last:border-0 transition-all duration-300 hover:shadow-md hover:bg-gray-500/5 relative cursor-pointer" style={{ borderColor: 'var(--border-light)', backgroundColor: selecionados.includes(ativo.patrimonio) ? 'rgba(85, 110, 230, 0.05)' : 'transparent' }}>
                
                {/* CHECKBOX */}
                <td className="p-4 w-10">
                  <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selecionados.includes(ativo.patrimonio)} onChange={(e) => handleSelectOne(e, ativo.patrimonio)} />
                </td>

                {/* PATRIMÔNIO */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="font-mono font-black" style={{ color: 'var(--color-blue)' }}>{ativo.patrimonio}</div>
                    
                    {/* Bolinha Verde (Online) ou Cinza (Offline) */}
                    <div className="group relative flex items-center justify-center">
                      <span className="relative flex h-3 w-3">
                        {isOnline(ativo.ultima_comunicacao) && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline(ativo.ultima_comunicacao) ? 'bg-emerald-500' : 'bg-gray-400/50'}`}></span>
                      </span>
                      
                      {/* Tooltip Hover (Opcional, mas legal) */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg z-50">
                        {isOnline(ativo.ultima_comunicacao) ? '🟢 Agente Online' : '⚪ Agente Offline'}
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* STATUS */}
                <td className="p-4 hidden sm:table-cell">{getStatusBadge(ativo.status)}</td>
                
                {/* EQUIPAMENTO & MARCA */}
                <td className="p-4">
                  <div className="font-black text-xs md:text-sm" style={{color: 'var(--text-main)'}}>{getNomeTipoEquipamento(ativo, categorias) || '-'}</div>
                  <div className="text-[10px] font-bold opacity-60 mt-0.5" style={{color:'var(--text-main)'}}>{ativo.marca} {ativo.modelo}</div>
                  
                  {/* VISÃO MOBILE ESPREMIDA */}
                  <div className="block md:hidden mt-2 space-y-1">
                     {getStatusBadge(ativo.status)}
                     <div className="text-[9px] font-black uppercase text-gray-400">{ativo.secretaria}</div>
                  </div>
                </td>
                
                {/* LOCALIZAÇÃO (Oculta no celular) */}
                <td className="p-4 hidden md:table-cell">
                  <div className="font-black text-xs uppercase" style={{color: 'var(--text-main)'}}>{ativo.secretaria || 'N/A'}</div>
                  <div className="text-[10px] font-bold opacity-60 mt-0.5" style={{color:'var(--text-main)'}}>{ativo.setor || 'N/A'}</div>
                </td>
                
                {/* AÇÕES (👁️, 🖨️ e Opções) */}
                <td className="p-4 flex justify-end items-center gap-2 relative">
                  <button onClick={() => abrirFicha(ativo.patrimonio)} title="Ficha Completa" className="p-1.5 rounded transition-all hover:bg-gray-500/10 border" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>👁️</button>
                  <button onClick={() => setModalQR({ aberto: true, ativo })} title="Imprimir Etiqueta" className="p-1.5 rounded transition-all hover:bg-gray-500/10 border" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>🖨️</button>
                  
                  <div>
                    <button onClick={() => setDropdownAberto(dropdownAberto === ativo.id ? null : ativo.id)} className="flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-bold transition-all hover:bg-gray-500/10" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                      Opções ▾
                    </button>
                    
                    {dropdownAberto === ativo.id && (
                       <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border z-50 overflow-hidden animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                          <button onClick={() => { setAtivoClonado(ativo); setAbaAtiva('novo'); setDropdownAberto(null); }} className="w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-blue-500/10 font-black tracking-wide border-b" style={{ color: 'var(--color-blue)', borderColor: 'var(--border-light)' }}>📋 Clonar Máquina</button>
                          <button onClick={() => {abrirEdicao(ativo); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-500/10 font-medium" style={{ color: 'var(--text-main)' }}>✏️ Editar Cadastro</button>
                          <button onClick={() => {setModalTransferencia({ aberto: true, ativos: [ativo] }); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-500/10 font-medium" style={{ color: 'var(--text-main)' }}>🚚 Transferir Local</button>
                          <button onClick={() => {setModalStatus({ aberto: true, ativos: [ativo] }); setFormStatus({...formStatus, novo_status: ativo.status === 'MANUTENÇÃO' ? 'ATIVO' : 'MANUTENÇÃO'}); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-500/10 font-medium" style={{ color: 'var(--text-main)' }}>🛠️ Alterar Status</button>
                          <div className="border-t my-1" style={{ borderColor: 'var(--border-light)' }}></div>
                          <button onClick={() => {setModalExcluir({ aberto: true, ativos: [ativo] }); setMotivoExclusao(''); setDropdownAberto(null);}} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 font-bold" style={{ color: 'var(--color-red)' }}>🗑️ Excluir Definitivo</button>
                       </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}