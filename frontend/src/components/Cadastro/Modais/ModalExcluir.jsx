import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../../api/api';

export default function ModalExcluir({ 
  modalExcluir, setModalExcluir, motivoExclusao, setMotivoExclusao, 
  usuarioAtual, carregarDados, setSelecionados 
}) {
  if (!modalExcluir.aberto) return null;

  const deletarEquipamentoMassa = async () => {
    if (!motivoExclusao.trim()) return toast.warn("A justificativa é obrigatória.");
    try {
      const promises = modalExcluir.ativos.map(ativo => 
        api.delete(`/api/inventario/${ativo.patrimonio}`, { 
          params: { 
            usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual, 
            motivo: motivoExclusao 
          } 
        })
      );
      await Promise.all(promises); 
      toast.success(`${modalExcluir.ativos.length} equipamento(s) movido(s) para a lixeira!`); 
      setModalExcluir({ aberto: false, ativos: [] }); 
      setMotivoExclusao(''); 
      setSelecionados([]); 
      carregarDados();
    } catch (e) { toast.error("Erro ao deletar equipamento."); }
  };

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setModalExcluir({ aberto: false, ativos: [] })}>
      <div className="w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-scale-up flex flex-col" style={{ backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--border-light)', background: 'linear-gradient(to right, rgba(239, 68, 68, 0.05), transparent)' }}>
          <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 text-xl">🗑️</div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-red-600">Remover Equipamento?</h3>
            <p className="text-xs font-bold opacity-60 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>O item será movido para a lixeira local</p>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 font-bold text-sm">
              ⚠️ Você está prestes a apagar <strong>{modalExcluir.ativos.length}</strong> registro(s). Ele deixará de aparecer na lista e não contará mais para faturamento.
          </div>
          <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-[10px] font-black uppercase opacity-80 text-red-600">Justificativa da Exclusão *</label>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      const textoAtual = motivoExclusao.trim() ? `${motivoExclusao} - ` : '';
                      setMotivoExclusao(textoAtual + e.target.value);
                      e.target.value = ""; 
                    }
                  }}
                  className="text-[10px] p-1.5 rounded-lg border font-bold outline-none cursor-pointer hover:bg-gray-500/10 transition-all shadow-sm"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                >
                  <option value="">⚡ Respostas Rápidas...</option>
                  <option value="Atualização Cadastral">Atualização Cadastral</option>
                  <option value="Cadastro Duplicado">Cadastro Duplicado</option>
                  <option value="Máquina Devolvida ao Locador">Máquina Devolvida ao Locador</option>
                  <option value="Equipamento Baixado (Perda Total)">Equipamento Baixado (Perda Total)</option>
                  <option value="Erro de Digitação">Erro de Digitação</option>
                </select>
              </div>
              <textarea 
                className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-red-500/20 min-h-[100px] transition-all" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                placeholder="Selecione uma resposta rápida acima ou digite detalhadamente..." 
                value={motivoExclusao} 
                onChange={e => setMotivoExclusao(e.target.value)} 
              />
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3 shrink-0" style={{backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-light)'}}>
          <button onClick={() => setModalExcluir({ aberto: false, ativos: [] })} className="px-6 py-2.5 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all" style={{ color: 'var(--text-main)' }}>Cancelar</button>
          <button onClick={deletarEquipamentoMassa} className="px-8 py-2.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95">Confirmar Exclusão</button>
        </div>
      </div>
    </div>, document.body
  );
}