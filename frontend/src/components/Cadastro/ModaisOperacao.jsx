import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import { QRCodeSVG } from 'qrcode.react';
import { parseCamposDinamicos, getNomeTipoEquipamento, getStatusBadge } from '../../utils/helpers';

export default function ModaisOperacao({
  modalFicha, setModalFicha, modalQR, setModalQR, modalQRLote, setModalQRLote,
  modalStatus, setModalStatus, formStatus, setFormStatus,
  modalTransferencia, setModalTransferencia, formTransfer, setFormTransfer,
  modalExcluir, setModalExcluir, motivoExclusao, setMotivoExclusao,
  categorias, secretarias, usuarioAtual, carregarDados, setSelecionados
}) {
  const [secSelecionadaId, setSecSelecionadaId] = useState('');
  const [setoresTransfer, setSetoresTransfer] = useState([]);

  const deletarEquipamentoMassa = async () => {
    if (!motivoExclusao.trim()) return toast.warn("A justificativa é obrigatória.");
    try {
      const promises = modalExcluir.ativos.map(ativo => api.delete(`/api/inventario/${ativo.patrimonio}`, { params: { usuario_acao: usuarioAtual, motivo: motivoExclusao } }));
      await Promise.all(promises); toast.success(`${modalExcluir.ativos.length} equipamento(s) apagado(s)!`); setModalExcluir({ aberto: false, ativos: [] }); setMotivoExclusao(''); setSelecionados([]); carregarDados();
    } catch (e) { toast.error("Erro ao deletar."); }
  };

  const confirmarStatusMassa = async () => {
    if (!formStatus.motivo) return toast.warn("Motivo é obrigatório.");
    if (formStatus.novo_status === 'SUCATA' && !formStatus.destino) return toast.warn("Informe o destino.");
    try {
      const promises = modalStatus.ativos.map(ativo => api.post('/api/manutencao/alterar-status', { patrimonio: ativo.patrimonio, novo_status: formStatus.novo_status, os_referencia: formStatus.os_referencia, motivo: formStatus.motivo, destino: formStatus.destino, usuario_acao: usuarioAtual }));
      await Promise.all(promises); toast.success(`Status atualizado!`); setModalStatus({ aberto: false, ativos: [] }); setFormStatus({ novo_status: 'MANUTENÇÃO', os_referencia: '', motivo: '', destino: '' }); setSelecionados([]); carregarDados();
    } catch (e) { toast.error("Erro ao alterar status."); }
  };

  const handleSecretariaTransfer = async (e) => {
    const id = e.target.value; setSecSelecionadaId(id);
    if (!id) { setFormTransfer({ ...formTransfer, nova_secretaria: '', novo_setor: '' }); setSetoresTransfer([]); return; }
    setFormTransfer({ ...formTransfer, nova_secretaria: secretarias.find(s => s.id == id)?.nome, novo_setor: '' });
    try { const res = await api.get(`/api/unidades/secretarias/${id}/setores`); setSetoresTransfer(res.data); } catch(e){}
  };

  const confirmarTransferenciaMassa = async () => {
    if (!formTransfer.nova_secretaria || !formTransfer.novo_setor || !formTransfer.motivo) return toast.warn("Preencha todos os campos.");
    try {
      const promises = modalTransferencia.ativos.map(ativo => api.post('/api/transferencias/', { patrimonio: ativo.patrimonio, nova_secretaria: formTransfer.nova_secretaria, novo_setor: formTransfer.novo_setor, motivo: formTransfer.motivo, usuario_acao: usuarioAtual }));
      await Promise.all(promises); toast.success(`Transferido(s)!`); setModalTransferencia({ aberto: false, ativos: [] }); setFormTransfer({ nova_secretaria: '', novo_setor: '', motivo: '' }); setSecSelecionadaId(''); setSelecionados([]); carregarDados();
    } catch (e) { toast.error("Erro ao transferir."); }
  };

  return (
    <>
      {modalFicha.aberto && modalFicha.dados && (() => { 
        const { ativo, historico } = modalFicha.dados;
        const camposPermitidos = parseCamposDinamicos(categorias.find(c => c.id === ativo.categoria_id));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalFicha({ aberto: false, dados: null })}>
            <div className="w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-light)' }}>
                <div><h3 className="text-xl font-black text-white uppercase tracking-tight">Ficha Técnica: {ativo.patrimonio}</h3><p className="text-xs font-bold text-blue-400 uppercase tracking-widest mt-1">{getNomeTipoEquipamento(ativo, categorias)} • {ativo.marca} {ativo.modelo}</p></div>
                <button onClick={() => setModalFicha({ aberto: false, dados: null })} className="text-white text-3xl opacity-50 hover:opacity-100">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 custom-scrollbar" style={{ backgroundColor: 'var(--bg-page)' }}>
                <div className="lg:col-span-1 space-y-6">
                  <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                    <h4 className="text-xs font-black mb-4 uppercase text-blue-500">📍 Localização & Status</h4>
                    <div className="space-y-3">
                      <div><p className="text-[10px] font-bold opacity-50" style={{ color: 'var(--text-muted)' }}>Secretaria</p><p className="font-bold" style={{ color: 'var(--text-main)' }}>{ativo.secretaria}</p></div>
                      <div><p className="text-[10px] font-bold opacity-50" style={{ color: 'var(--text-muted)' }}>Setor</p><p className="font-bold" style={{ color: 'var(--text-main)' }}>{ativo.setor}</p></div>
                      <div><p className="text-[10px] font-bold opacity-50 mt-2 mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>{getStatusBadge(ativo.status)}</div>
                    </div>
                  </div>
                  {ativo.dados_dinamicos && camposPermitidos.length > 0 && (
                    <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                      <h4 className="text-xs font-black mb-4 uppercase text-blue-500">⚙️ Especificações</h4>
                      <div className="space-y-3">
                        {camposPermitidos.map((campoNome) => ( ativo.dados_dinamicos[campoNome] ? (
                            <div key={campoNome} className="border-b pb-2 last:border-0" style={{ borderColor: 'var(--border-light)' }}><p className="text-[10px] font-bold opacity-50 uppercase" style={{ color: 'var(--text-muted)' }}>{campoNome}</p><p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{ativo.dados_dinamicos[campoNome]}</p></div>
                        ) : null ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-2 p-6 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                  <h4 className="text-xs font-black mb-6 uppercase text-blue-500">📜 Linha do Tempo</h4>
                  <div className="relative pl-6 border-l-2" style={{ borderColor: 'var(--border-light)' }}>
                    {historico.length === 0 ? <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Nenhum histórico encontrado.</p> :
                     historico.map((log, idx) => (
                      <div key={idx} className="mb-6 relative">
                        <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 shadow-sm" style={{ backgroundColor: 'var(--color-blue)', borderColor: 'var(--bg-card)' }}></div>
                        <div className="text-[10px] font-bold opacity-50" style={{ color: 'var(--text-muted)' }}>{new Date(log.data_hora).toLocaleDateString()} • {log.acao}</div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{log.usuario}</p>
                        <p className="text-xs italic mt-1 p-2 rounded border" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>{log.detalhes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                <button onClick={() => setModalFicha({ aberto: false, dados: null })} className="px-6 py-2 rounded-lg font-bold text-sm" style={{ color: 'var(--text-muted)' }}>Fechar</button>
              </div>
            </div>
          </div> 
        );
      })()}

      {modalQR.aberto && ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalQR({ aberto: false, ativo: null })}>
          <div className="w-full max-w-sm rounded-xl shadow-2xl border p-8 flex flex-col items-center text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-2xl mb-1" style={{ color: 'var(--text-main)' }}>NEXUS.INV</h3>
            <p className="text-xs font-bold uppercase mb-6 border-b pb-4 w-full" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>Patrimônio Oficial</p>
            <div className="p-4 border-4 rounded-2xl shadow-sm mb-6 bg-white"><QRCodeSVG value={`${window.location.origin}/consulta/${modalQR.ativo?.patrimonio}`} size={180} level="H" includeMargin={false} /></div>
            <div className="text-4xl font-black font-mono mb-2" style={{ color: 'var(--text-main)' }}>{modalQR.ativo?.patrimonio}</div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{getNomeTipoEquipamento(modalQR.ativo, categorias)} • {modalQR.ativo?.marca}</div>
            <button onClick={() => window.print()} className="mt-8 w-full py-3 rounded-lg font-bold text-white shadow-md hover:opacity-90" style={{ backgroundColor: 'var(--color-blue)' }}>🖨️ Imprimir Etiqueta</button>
            <button onClick={() => setModalQR({ aberto: false, ativo: null })} className="mt-3 w-full py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Fechar</button>
          </div>
        </div> 
      )}

      {modalQRLote.aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white print:block" onClick={() => setModalQRLote({ aberto: false, ativos: [] })}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-8 print:p-0 print:shadow-none print:border-none print:max-h-none print:w-full" style={{ backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8 border-b pb-4 print:hidden" style={{ borderColor: 'var(--border-light)' }}>
              <div><h3 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Impressão em Lote ({modalQRLote.ativos.length})</h3><p className="text-sm" style={{ color: 'var(--text-muted)' }}>As etiquetas serão ajustadas em uma grade na folha A4.</p></div>
              <div className="flex gap-3"><button onClick={() => setModalQRLote({aberto: false, ativos: []})} className="px-5 py-2.5 rounded-lg font-bold" style={{ color: 'var(--text-muted)' }}>Voltar</button><button onClick={() => window.print()} className="px-6 py-2.5 rounded-lg font-bold text-white shadow-md" style={{ backgroundColor: 'var(--color-blue)' }}>🖨️ Iniciar Impressão</button></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4 print:w-full">
              {modalQRLote.ativos.map((ativo, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl text-center page-break-inside-avoid print:border-gray-800 print:border-solid print:rounded-none" style={{ borderColor: 'var(--border-light)' }}>
                   <h4 className="font-black text-xs tracking-widest mb-2 border-b w-full pb-2" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>NEXUS.INV</h4>
                   <div className="bg-white p-1 rounded-md"><QRCodeSVG value={`${window.location.origin}/consulta/${ativo.patrimonio}`} size={90} level="H" includeMargin={false} /></div>
                   <p className="mt-3 font-mono font-black text-lg tracking-wider" style={{ color: 'var(--text-main)' }}>{ativo.patrimonio}</p>
                   <p className="text-[10px] font-bold uppercase truncate w-full mt-1" style={{ color: 'var(--text-muted)' }}>{getNomeTipoEquipamento(ativo, categorias) || 'Ativo'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalStatus.aberto && ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalStatus({ aberto: false, ativos: [] })}>
          <div className="w-full max-w-lg rounded-xl shadow-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-main)' }}>Mudar Status</h3>
            <p className="text-sm font-mono mb-4 font-bold" style={{ color: 'var(--color-blue)' }}>{modalStatus.ativos.length === 1 ? `Patrimônio: ${modalStatus.ativos[0].patrimonio}` : `LOTE: ${modalStatus.ativos.length} itens selecionados`}</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>AÇÃO / NOVO STATUS</label><select className="w-full p-3 rounded-lg border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.novo_status} onChange={e => setFormStatus({...formStatus, novo_status: e.target.value})}><option value="ATIVO">✅ Retornar para Ativo (Em Uso)</option><option value="MANUTENÇÃO">⚠️ Enviar para Manutenção (Conserto)</option><option value="SUCATA">🗑️ Marcar como SUCATA (Descarte)</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Nº O.S. DO MILVUS (Opcional)</label><input placeholder="Ex: OS-9982" className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.os_referencia} onChange={e => setFormStatus({...formStatus, os_referencia: e.target.value})} /></div>
                {formStatus.novo_status === 'SUCATA' && ( <div className="col-span-2 md:col-span-1 animate-fade-in"><label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-red)' }}>DESTINO DO DESCARTE *</label><input placeholder="Ex: Leilão, Doação" className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.destino} onChange={e => setFormStatus({...formStatus, destino: e.target.value})} /></div> )}
              </div>
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>DIAGNÓSTICO / MOTIVO GERAL *</label><textarea placeholder="Descreva o motivo..." className="w-full p-3 rounded-lg border outline-none min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formStatus.motivo} onChange={e => setFormStatus({...formStatus, motivo: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalStatus({ aberto: false, ativos: [] })} className="px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={confirmarStatusMassa} className="px-6 py-2 rounded-lg font-bold text-white shadow-md hover:opacity-90" style={{ backgroundColor: 'var(--color-blue)' }}>Aplicar Status</button>
            </div>
          </div>
        </div> 
      )}

      {modalTransferencia.aberto && ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalTransferencia({ aberto: false, ativos: [] })}>
          <div className="w-full max-w-lg rounded-xl shadow-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Transferir de Local</h3>
            <p className="text-sm font-mono mt-1 mb-4 font-bold" style={{ color: 'var(--color-blue)' }}>{modalTransferencia.ativos.length === 1 ? `Patrimônio: ${modalTransferencia.ativos[0].patrimonio}` : `LOTE: ${modalTransferencia.ativos.length} itens selecionados`}</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOVA SECRETARIA DESTINO</label><select className="w-full p-3 rounded-lg border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={secSelecionadaId} onChange={handleSecretariaTransfer}><option value="">Selecione...</option>{secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>NOVO SETOR DESTINO</label><select className="w-full p-3 rounded-lg border outline-none disabled:opacity-50" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formTransfer.novo_setor} onChange={e => setFormTransfer({...formTransfer, novo_setor: e.target.value})} disabled={setoresTransfer.length === 0}><option value="">Selecione...</option>{setoresTransfer.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}</select></div>
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>MOTIVO DA TRANSFERÊNCIA *</label><textarea className="w-full p-3 rounded-lg border outline-none min-h-[80px]" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formTransfer.motivo} onChange={e => setFormTransfer({...formTransfer, motivo: e.target.value})} /></div>
            </div>
            <div className="flex gap-3 justify-end mt-6 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalTransferencia({ aberto: false, ativos: [] })} className="px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={confirmarTransferenciaMassa} className="px-6 py-2 rounded font-bold text-white shadow-md hover:opacity-90" style={{ backgroundColor: 'var(--color-blue)' }}>Confirmar Transferência</button>
            </div>
          </div>
        </div> 
      )}

      {modalExcluir.aberto && ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalExcluir({ aberto: false, ativos: [] })}>
          <div className="w-full max-w-md rounded-xl shadow-2xl border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--color-red)' }} onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">🗑️</div><h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Excluir Definitivamente?</h3><p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Você está prestes a apagar <strong style={{ color: 'var(--color-red)' }}>{modalExcluir.ativos.length}</strong> registro(s). Esta ação <strong className="underline">não pode ser desfeita</strong>.</p>
            <div className="text-left mb-6"><label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-red)' }}>JUSTIFICATIVA DA EXCLUSÃO *</label><textarea autoFocus placeholder="Ex: Erro na importação..." className="w-full p-3 rounded-lg border outline-none min-h-[80px] text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={motivoExclusao} onChange={e => setMotivoExclusao(e.target.value)} /></div>
            <div className="flex gap-3 justify-center border-t pt-4" style={{ borderColor: 'var(--border-light)' }}><button onClick={() => setModalExcluir({ aberto: false, ativos: [] })} className="px-4 py-2 rounded font-bold" style={{ color: 'var(--text-muted)' }}>Cancelar</button><button onClick={deletarEquipamentoMassa} className="px-6 py-2 rounded font-bold text-white shadow-md hover:opacity-90" style={{ backgroundColor: 'var(--color-red)' }}>Confirmar Exclusão</button></div>
          </div>
        </div> 
      )}
    </>
  );
}