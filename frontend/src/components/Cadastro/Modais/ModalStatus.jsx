import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../../api/api';

export default function ModalStatus({ 
  modalStatus, setModalStatus, formStatus, setFormStatus, 
  usuarioAtual, carregarDados, setSelecionados 
}) {
  if (!modalStatus.aberto) return null;

  const confirmarStatusMassa = async () => {
    if (!formStatus.motivo) return toast.warn("O motivo é obrigatório.");
    if (formStatus.novo_status === 'SUCATA' && !formStatus.destino) return toast.warn("Informe o destino da sucata.");
    
    try {
      const promises = modalStatus.ativos.map(ativo => 
        api.post('/api/manutencao/alterar-status', { 
          patrimonio: ativo.patrimonio, 
          novo_status: formStatus.novo_status, 
          os_referencia: formStatus.os_referencia, 
          motivo: formStatus.motivo, 
          destino: formStatus.destino, 
          usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual 
        })
      );
      await Promise.all(promises); 
      toast.success(`Status atualizado com sucesso!`); 
      setModalStatus({ aberto: false, ativos: [] }); 
      setFormStatus({ novo_status: 'MANUTENÇÃO', os_referencia: '', motivo: '', destino: '' }); 
      setSelecionados([]); 
      carregarDados();
    } catch (e) { toast.error("Erro ao alterar o status."); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setModalStatus({ aberto: false, ativos: [] })}>
      <div className="w-full max-w-lg rounded-xl shadow-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>Mudar Status</h3>
        <p className="text-sm font-mono mb-4 font-bold" style={{ color: 'var(--color-blue)' }}>
          {modalStatus.ativos.length === 1 ? `Patrimônio: ${modalStatus.ativos[0].patrimonio}` : `LOTE: ${modalStatus.ativos.length} itens selecionados`}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>AÇÃO / NOVO STATUS</label>
            <select className="w-full p-3 rounded-lg border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.novo_status} onChange={e => setFormStatus({...formStatus, novo_status: e.target.value})}>
              <option value="ATIVO">✅ Retornar para Ativo (Em Uso)</option>
              <option value="MANUTENÇÃO">⚠️ Enviar para Manutenção (Conserto)</option>
              <option value="SUCATA">🗑️ Marcar como SUCATA (Descarte)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Nº O.S. (Opcional)</label>
              <input placeholder="Ex: OS-9982" className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.os_referencia} onChange={e => setFormStatus({...formStatus, os_referencia: e.target.value})} />
            </div>
            {formStatus.novo_status === 'SUCATA' && ( 
              <div className="col-span-2 md:col-span-1 animate-fade-in">
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-red)' }}>DESTINO DO DESCARTE *</label>
                <input placeholder="Ex: Leilão, Doação" className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.destino} onChange={e => setFormStatus({...formStatus, destino: e.target.value})} />
              </div> 
            )}
          </div>
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>DIAGNÓSTICO / MOTIVO GERAL *</label>
            <textarea placeholder="Descreva o motivo..." className="w-full p-3 rounded-lg border outline-none min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.motivo} onChange={e => setFormStatus({...formStatus, motivo: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
          <button onClick={() => setModalStatus({ aberto: false, ativos: [] })} className="px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
          <button onClick={confirmarStatusMassa} className="px-6 py-2 rounded-lg font-bold text-white shadow-md hover:opacity-90 bg-blue-600">Aplicar Status</button>
        </div>
      </div>
    </div>, document.body
  );
}