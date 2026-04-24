import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../../api/api';

export default function ModalTransferencia({ 
  modalTransferencia, setModalTransferencia, formTransfer, setFormTransfer, 
  secretarias, usuarioAtual, carregarDados, setSelecionados 
}) {
  if (!modalTransferencia.aberto) return null;

  const unidadeSelecionada = secretarias.find(s => s.nome === formTransfer.nova_secretaria);
  const setoresDisponiveis = useMemo(() => {
    if (!unidadeSelecionada) return [];
    if (Array.isArray(unidadeSelecionada.setores) && unidadeSelecionada.setores.length > 0) {
      return unidadeSelecionada.setores;
    }
    return secretarias.filter(s => 
      String(s.secretaria_id) === String(unidadeSelecionada.id) ||
      String(s.parent_id) === String(unidadeSelecionada.id) ||
      String(s.unidade_pai_id) === String(unidadeSelecionada.id)
    );
  }, [secretarias, unidadeSelecionada]);

  const confirmarTransferencia = async () => {
    if (!formTransfer.nova_secretaria || !formTransfer.novo_setor || !formTransfer.motivo) {
      return toast.warn("Preencha todos os campos.");
    }
    try {
      const promises = modalTransferencia.ativos.map(ativo => api.post('/api/transferencias/', { 
        patrimonio: typeof ativo === 'string' ? ativo : ativo.patrimonio, 
        nova_secretaria: formTransfer.nova_secretaria, 
        novo_setor: formTransfer.novo_setor,
        motivo: formTransfer.motivo, 
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual 
      }));
      await Promise.all(promises);
      toast.success(`Transferido(s)!`); 
      setModalTransferencia({ aberto: false, ativos: [] }); 
      setFormTransfer({ nova_secretaria: '', novo_setor: '', motivo: '' });
      setSelecionados([]); 
      carregarDados();
    } catch (e) { toast.error("Erro ao transferir."); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setModalTransferencia({ aberto: false, ativos: [] })}>
      <div className="w-full max-w-lg rounded-xl shadow-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Transferir de Local</h3>
        <p className="text-sm font-mono mt-1 mb-4 font-bold text-blue-500">
          {modalTransferencia.ativos.length === 1 
            ? `Patrimônio: ${typeof modalTransferencia.ativos[0] === 'string' ? modalTransferencia.ativos[0] : modalTransferencia.ativos[0].patrimonio}` 
            : `LOTE: ${modalTransferencia.ativos.length} itens selecionados`}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1 opacity-60">NOVA LOCALIDADE / UNIDADE</label>
            <select 
                className="w-full p-3 rounded-lg border outline-none font-bold" 
                style={{ backgroundColor: 'var(--bg-input)' }} 
                value={formTransfer.nova_secretaria} 
                onChange={e => setFormTransfer({...formTransfer, nova_secretaria: e.target.value, novo_setor: ''})}
            >
              <option value="">Selecione a Unidade Alvo...</option>
              {secretarias.map(s => <option key={s.id} value={s.nome}>{s.nome} ({s.tipo})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 opacity-60">NOVO SETOR / SALA *</label>
            {formTransfer.nova_secretaria ? (
              setoresDisponiveis.length > 0 ? (
                <select
                  className="w-full p-3 rounded-lg border outline-none font-bold"
                  style={{ backgroundColor: 'var(--bg-input)' }}
                  value={formTransfer.novo_setor}
                  onChange={e => setFormTransfer({...formTransfer, novo_setor: e.target.value})}
                >
                  <option value="">Selecione o setor...</option>
                  {setoresDisponiveis.map(setor => (
                    <option key={setor.id || setor.nome || setor} value={setor.nome || setor}>{setor.nome || setor}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Digite o setor ou sala..."
                  className="w-full p-3 rounded-lg border outline-none font-bold"
                  style={{ backgroundColor: 'var(--bg-input)' }}
                  value={formTransfer.novo_setor}
                  onChange={e => setFormTransfer({...formTransfer, novo_setor: e.target.value})}
                />
              )
            ) : (
              <input
                type="text"
                disabled
                placeholder="Selecione a unidade antes de escolher o setor"
                className="w-full p-3 rounded-lg border outline-none font-bold opacity-50 cursor-not-allowed"
                style={{ backgroundColor: 'var(--bg-input)' }}
                value=""
              />
            )}
          </div>
          <div>
             <div className="flex justify-between items-center mb-1">
                 <label className="block text-xs font-bold opacity-60">MOTIVO DA TRANSFERÊNCIA *</label>
                 <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        const textoAtual = formTransfer.motivo.trim() ? `${formTransfer.motivo} - ` : '';
                        setFormTransfer({...formTransfer, motivo: textoAtual + e.target.value});
                        e.target.value = ""; 
                      }
                    }}
                    className="text-[10px] p-1 rounded border outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                  >
                    <option value="">⚡ Rápidas...</option>
                    <option value="Remanejamento de Setor">Remanejamento de Setor</option>
                    <option value="Atendimento a Chamado">Atendimento a Chamado</option>
                  </select>
             </div>
             <textarea 
                placeholder="Detalhe o motivo da movimentação..."
                className="w-full p-3 rounded-lg border outline-none min-h-[80px]" 
                style={{ backgroundColor: 'var(--bg-input)' }} 
                value={formTransfer.motivo} 
                onChange={e => setFormTransfer({...formTransfer, motivo: e.target.value})} 
             />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 border-t pt-4">
          <button onClick={() => setModalTransferencia({ aberto: false, ativos: [] })} className="px-4 py-2 font-bold opacity-60">Cancelar</button>
          <button onClick={confirmarTransferencia} className="px-6 py-2 rounded font-bold text-white bg-blue-600 shadow-md">Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
}