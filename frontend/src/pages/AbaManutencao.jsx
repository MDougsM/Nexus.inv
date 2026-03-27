import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function AbaManutencao({ historicoManut, carregarDados }) {
  const [modalRestore, setModalRestore] = useState({ aberto: false, log: null, motivo: '' });
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';

  const getStatusBadge = (status) => {
    const s = status?.toUpperCase() || 'ATIVO';
    if (s === 'ATIVO') return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-green-500/30 text-green-500 bg-green-500/10">{s}</span>;
    if (s === 'MANUTENÇÃO') return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-yellow-500/30 text-yellow-500 bg-yellow-500/10">{s}</span>;
    if (s === 'SUCATA') return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-red-500/30 text-red-500 bg-red-500/10">{s}</span>;
    return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm bg-blue-500/10 text-blue-500">{s}</span>;
  };

  const handleRestaurar = async () => {
    if (!modalRestore.motivo) return toast.warning("Justificativa obrigatória para a auditoria.");
    try {
      const res = await api.get(`/api/inventario/ficha/detalhes/${modalRestore.log.patrimonio}`);
      const maquina = res.data;

      await api.put(`/api/inventario/ficha/editar/${maquina.patrimonio}`, {
        ...maquina,
        status: 'ATIVO',
        usuario_acao: usuarioAtual,
      });

      await api.post('/api/auditoria/', {
        usuario: usuarioAtual,
        acao: 'RESTAURAÇÃO DE SUCATA',
        detalhes: `Patrimônio ${maquina.patrimonio} restaurado para ATIVO. Motivo: ${modalRestore.motivo}`
      });

      toast.success("Máquina restaurada e ativada com sucesso! ♻️");
      setModalRestore({ aberto: false, log: null, motivo: '' });
      if(carregarDados) carregarDados(); 
    } catch (e) { toast.error("Erro ao restaurar a máquina."); }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-3xl border shadow-xl overflow-hidden transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        
        <div className="p-5 border-b flex items-center gap-3 transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
          <div className="w-8 h-8 rounded-full shadow-sm flex items-center justify-center border text-lg" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>📋</div>
          <h3 className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Histórico de Ordens de Serviço e Descartes</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <tr>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Data</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Patrimônio</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Movimentação</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>O.S. (Milvus)</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Motivo / Destino</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest opacity-50 text-right" style={{ color: 'var(--text-main)' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {historicoManut.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center font-bold opacity-50 italic" style={{ color: 'var(--text-main)' }}>Nenhum registro encontrado.</td></tr>
              ) : (
                historicoManut.map(reg => (
                  <tr key={reg.id} className="border-b last:border-0 transition-all duration-300 hover:shadow-lg hover:bg-gray-500/5 relative" style={{ borderColor: 'var(--border-light)' }}>
                    <td className="p-4 text-xs font-bold opacity-80" style={{ color: 'var(--text-main)' }}>{new Date(reg.data_registro).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 font-mono font-black text-blue-500">{reg.patrimonio}</td>
                    
                    <td className="p-4 flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>{reg.status_anterior} ➔</span>
                      {getStatusBadge(reg.status_novo)}
                    </td>
                    
                    <td className="p-4 font-bold opacity-80" style={{ color: 'var(--text-main)' }}>{reg.os_referencia || '-'}</td>
                    
                    <td className="p-4 text-xs font-medium opacity-80" style={{ color: 'var(--text-main)' }}>
                      {reg.motivo} 
                      {reg.destino && <span className="block mt-1 font-black text-[10px] uppercase tracking-widest text-red-500">Destino: {reg.destino}</span>}
                    </td>

                    <td className="p-4 text-right">
                      {reg.status_novo === 'SUCATA' && (
                        <button onClick={() => setModalRestore({ aberto: true, log: reg, motivo: '' })} 
                                className="px-3 py-1.5 rounded-lg border border-green-500/30 text-[10px] font-black uppercase tracking-widest text-green-500 hover:bg-green-500/10 transition-all active:scale-95 shadow-sm bg-transparent">
                          ♻️ Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalRestore.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-green-500/30 animate-scale-up" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-3xl mb-4 text-green-500 mx-auto shadow-inner border border-green-500/20">♻️</div>
            <h3 className="text-xl font-black tracking-tight mb-2 text-center" style={{ color: 'var(--text-main)' }}>Restaurar Ativo</h3>
            <p className="text-xs font-bold uppercase tracking-widest mb-6 text-center opacity-50" style={{ color: 'var(--text-main)' }}>Patrimônio {modalRestore.log.patrimonio}</p>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-green-500 text-center tracking-widest">JUSTIFICATIVA DA RESTAURAÇÃO *</label>
              <textarea autoFocus className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-green-500/20 min-h-[100px] text-center transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Ex: Equipamento consertado ou inserido por engano..." value={modalRestore.motivo} onChange={e => setModalRestore({...modalRestore, motivo: e.target.value})} />
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleRestaurar} className="w-full py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all active:scale-95">Confirmar Restauração</button>
              <button onClick={() => setModalRestore({ aberto: false, log: null, motivo: '' })} className="w-full py-3 rounded-xl font-bold hover:bg-gray-500/10 transition-all" style={{ color: 'var(--text-main)' }}>Cancelar operação</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}