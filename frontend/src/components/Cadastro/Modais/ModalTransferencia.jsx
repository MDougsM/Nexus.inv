import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../../api/api';

export default function ModalTransferencia({ 
  modalTransferencia, setModalTransferencia, formTransfer, setFormTransfer, 
  secretarias, usuarioAtual, carregarDados, setSelecionados 
}) {
  if (!modalTransferencia.aberto) return null;

  // 1. Identifica qual Secretaria o usuário escolheu no primeiro campo
  const unidadeSelecionada = secretarias.find(s => String(s.id) === String(formTransfer.nova_secretaria));

  // 2. FILTRO INTELIGENTE 1: Mostra no 1º campo apenas quem pode ser "Pai" (Prefeitura ou Secretarias)
  const unidadesPai = useMemo(() => {
    return secretarias.filter(s => s.pai_id === null || s.tipo === 'PREFEITURA' || s.tipo === 'SECRETARIA');
  }, [secretarias]);

  // 3. FILTRO INTELIGENTE 2: Puxa instantaneamente apenas os setores "filhos" da secretaria escolhida!
  const setoresDisponiveis = useMemo(() => {
    if (!formTransfer.nova_secretaria) return [];
    return secretarias.filter(s => String(s.pai_id) === String(formTransfer.nova_secretaria));
  }, [secretarias, formTransfer.nova_secretaria]);

  const confirmarTransferencia = async () => {
    if (!formTransfer.nova_secretaria || !formTransfer.novo_setor || !formTransfer.motivo) {
      return toast.warn("Preencha todos os campos.");
    }
    
    // O seu backend espera receber o Nome da secretaria para gravar no ativo, e não o ID.
    const destinoSecretaria = unidadeSelecionada?.nome || formTransfer.nova_secretaria;
    
    try {
      const promises = modalTransferencia.ativos.map(ativo => api.post('/api/transferencias/', { 
        patrimonio: typeof ativo === 'string' ? ativo : ativo.patrimonio, 
        nova_secretaria: destinoSecretaria, 
        novo_setor: formTransfer.novo_setor,
        motivo: formTransfer.motivo, 
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual 
      }));
      
      await Promise.all(promises);
      toast.success(`Transferência realizada com sucesso!`); 
      setModalTransferencia({ aberto: false, ativos: [] }); 
      setFormTransfer({ nova_secretaria: '', novo_setor: '', motivo: '' });
      setSelecionados([]); 
      carregarDados();
    } catch (e) { toast.error("Erro ao transferir os equipamentos."); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setModalTransferencia({ aberto: false, ativos: [] })}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl border p-7" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🚚</span>
          <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Transferir de Local</h3>
        </div>
        
        <p className="text-sm font-mono mt-1 mb-6 font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg inline-block border border-blue-100 dark:border-blue-800">
          {modalTransferencia.ativos.length === 1 
            ? `Patrimônio Alvo: ${typeof modalTransferencia.ativos[0] === 'string' ? modalTransferencia.ativos[0] : modalTransferencia.ativos[0].patrimonio}` 
            : `MOVIMENTAÇÃO EM LOTE: ${modalTransferencia.ativos.length} itens selecionados`}
        </p>

        <div className="space-y-4">
          
          {/* CAMPO 1: SECRETARIA */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>NOVA LOCALIDADE / SECRETARIA</label>
            <select 
                className="w-full p-3 rounded-xl border outline-none font-bold shadow-sm transition-all focus:ring-2 focus:ring-blue-500/30" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                value={formTransfer.nova_secretaria} 
                onChange={e => setFormTransfer({...formTransfer, nova_secretaria: e.target.value, novo_setor: ''})}
            >
              <option value="">Selecione a Unidade Alvo...</option>
              {unidadesPai.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.tipo})</option>)}
            </select>
          </div>

          {/* CAMPO 2: SETOR */}
          <div>
            <label className="block text-[10px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>NOVO SETOR / SALA *</label>
            {formTransfer.nova_secretaria ? (
              setoresDisponiveis.length > 0 ? (
                <select
                  className="w-full p-3 rounded-xl border outline-none font-bold shadow-sm transition-all focus:ring-2 focus:ring-blue-500/30"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                  value={formTransfer.novo_setor}
                  onChange={e => setFormTransfer({...formTransfer, novo_setor: e.target.value})}
                >
                  <option value="">Selecione o setor...</option>
                  {setoresDisponiveis.map(setor => (
                    <option key={setor.id} value={setor.nome}>{setor.nome}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Digite o setor (não há setores cadastrados para esta secretaria)..."
                  className="w-full p-3 rounded-xl border outline-none font-bold shadow-sm"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                  value={formTransfer.novo_setor}
                  onChange={e => setFormTransfer({...formTransfer, novo_setor: e.target.value})}
                />
              )
            ) : (
              <input
                type="text"
                disabled
                placeholder="Selecione a Secretaria primeiro"
                className="w-full p-3 rounded-xl border outline-none font-bold opacity-40 cursor-not-allowed"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                value=""
              />
            )}
          </div>

          {/* CAMPO 3: MOTIVO */}
          <div>
             <div className="flex justify-between items-center mb-1.5 mt-2">
                 <label className="block text-[10px] font-black uppercase opacity-60" style={{ color: 'var(--text-main)' }}>MOTIVO DA TRANSFERÊNCIA *</label>
                 <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        const textoAtual = formTransfer.motivo.trim() ? `${formTransfer.motivo} - ` : '';
                        setFormTransfer({...formTransfer, motivo: textoAtual + e.target.value});
                        e.target.value = ""; 
                      }
                    }}
                    className="text-[9px] p-1.5 rounded-lg border outline-none cursor-pointer font-bold shadow-sm"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-light)' }}
                 >
                    <option value="">⚡ Respostas Rápidas...</option>
                    <option value="Remanejamento de Setor">Remanejamento de Setor</option>
                    <option value="Atendimento a Chamado">Atendimento a Chamado</option>
                    <option value="Substituição de Equipamento">Substituição de Equipamento</option>
                    <option value="Devolução para Almoxarifado">Devolução para Almoxarifado</option>
                 </select>
             </div>
             <textarea 
                placeholder="Detalhe o motivo da movimentação..."
                className="w-full p-3 rounded-xl border outline-none min-h-[90px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-500/30" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                value={formTransfer.motivo} 
                onChange={e => setFormTransfer({...formTransfer, motivo: e.target.value})} 
             />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-8 border-t pt-5" style={{ borderColor: 'var(--border-light)' }}>
          <button onClick={() => setModalTransferencia({ aberto: false, ativos: [] })} className="px-5 py-2.5 font-black uppercase text-xs opacity-60 hover:opacity-100 transition-opacity">Cancelar</button>
          <button onClick={confirmarTransferencia} className="px-6 py-2.5 rounded-xl font-black uppercase text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-95">🚚 Confirmar Transferência</button>
        </div>
      </div>
    </div>, document.body
  );
}