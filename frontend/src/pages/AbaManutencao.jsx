import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api'; // <-- CAMINHO CORRIGIDO!

export default function AbaManutencao({ historicoManut, carregarDados }) {
  const [modalRestore, setModalRestore] = useState({ aberto: false, log: null, motivo: '' });
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';

  // Sua função original de cores restaurada
  const getStatusBadge = (status) => {
    const s = status?.toUpperCase() || 'ATIVO';
    if (s === 'ATIVO') return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-green-200" style={{backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)'}}>{s}</span>;
    if (s === 'MANUTENÇÃO') return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-yellow-200" style={{backgroundColor: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)'}}>{s}</span>;
    if (s === 'SUCATA') return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border border-gray-200" style={{backgroundColor: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)'}}>{s}</span>;
    return <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm bg-blue-100 text-blue-700">{s}</span>;
  };

  const handleRestaurar = async () => {
    if (!modalRestore.motivo) return toast.warning("Justificativa obrigatória para a auditoria.");
    try {
      // 1. Pega os dados atuais da máquina
      const res = await api.get(`/api/inventario/ficha/detalhes/${modalRestore.log.patrimonio}`);
      const maquina = res.data;

      // 2. Atualiza status para ATIVO
      await api.put(`/api/inventario/ficha/editar/${maquina.patrimonio}`, {
        ...maquina,
        status: 'ATIVO',
        usuario_acao: usuarioAtual,
      });

      // 3. Registra na auditoria
      await api.post('/api/auditoria/', {
        usuario: usuarioAtual,
        acao: 'RESTAURAÇÃO DE SUCATA',
        detalhes: `Patrimônio ${maquina.patrimonio} restaurado para ATIVO. Motivo: ${modalRestore.motivo}`
      });

      toast.success("Máquina restaurada e ativada com sucesso! ♻️");
      setModalRestore({ aberto: false, log: null, motivo: '' });
      if(carregarDados) carregarDados(); // Recarrega a tabela e apaga a notificação!
    } catch (e) { toast.error("Erro ao restaurar a máquina."); }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-3xl border shadow-xl bg-white overflow-hidden" style={{ borderColor: 'var(--border-light)' }}>
        
        <div className="p-5 border-b bg-gray-50 flex items-center gap-3" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border" style={{ borderColor: 'var(--border-light)' }}>📋</div>
          <h3 className="font-black text-sm uppercase tracking-widest text-gray-700">Histórico de Ordens de Serviço e Descartes</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b" style={{ borderColor: 'var(--border-light)' }}>
              <tr>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Data</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Patrimônio</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Movimentação</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest text-gray-400">O.S. (Milvus)</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Motivo / Destino</th>
                <th className="p-4 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {historicoManut.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center font-bold text-gray-400 italic">Nenhum registro encontrado.</td></tr>
              ) : (
                historicoManut.map(reg => (
                  <tr key={reg.id} className="border-b last:border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:z-10 relative bg-white" style={{ borderColor: 'var(--border-light)', outline: '1px solid transparent' }}>
                    <td className="p-4 text-xs font-bold text-gray-500">{new Date(reg.data_registro).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 font-mono font-black text-blue-600">{reg.patrimonio}</td>
                    
                    <td className="p-4 flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{reg.status_anterior} ➔</span>
                      {getStatusBadge(reg.status_novo)}
                    </td>
                    
                    <td className="p-4 font-bold text-gray-700">{reg.os_referencia || '-'}</td>
                    
                    <td className="p-4 text-xs font-medium text-gray-500">
                      {reg.motivo} 
                      {reg.destino && <span className="block mt-1 font-black text-[10px] uppercase tracking-widest text-red-500">Destino: {reg.destino}</span>}
                    </td>

                    <td className="p-4 text-right">
                      {/* BOTÃO DE RESTAURAR - SÓ APARECE PARA SUCATA */}
                      {reg.status_novo === 'SUCATA' && (
                        <button onClick={() => setModalRestore({ aberto: true, log: reg, motivo: '' })} 
                                className="px-3 py-1.5 rounded-lg border border-green-200 text-[10px] font-black uppercase tracking-widest text-green-600 hover:bg-green-50 hover:border-green-400 transition-all active:scale-95 shadow-sm bg-white">
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

      {/* MODAL PARA O MOTIVO DA RESTAURAÇÃO */}
      {modalRestore.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-2xl bg-white border border-green-100 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-4 text-green-600 mx-auto shadow-inner">♻️</div>
            <h3 className="text-xl font-black tracking-tight mb-2 text-center text-gray-900">Restaurar Ativo</h3>
            <p className="text-xs font-bold uppercase tracking-widest mb-6 text-center text-gray-400">Patrimônio {modalRestore.log.patrimonio}</p>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase opacity-50 text-green-600 text-center">JUSTIFICATIVA DA RESTAURAÇÃO *</label>
              <textarea autoFocus className="w-full p-4 rounded-xl border font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-green-500/20 min-h-[100px] text-center" placeholder="Ex: Equipamento consertado ou inserido por engano..." value={modalRestore.motivo} onChange={e => setModalRestore({...modalRestore, motivo: e.target.value})} />
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleRestaurar} className="w-full py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all active:scale-95">Confirmar Restauração</button>
              <button onClick={() => setModalRestore({ aberto: false, log: null, motivo: '' })} className="w-full py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancelar operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}