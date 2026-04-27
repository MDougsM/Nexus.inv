import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../../api/api';

export default function ModalTransferencia({ 
  modalTransferencia, setModalTransferencia, formTransfer, setFormTransfer, 
  secretarias, usuarioAtual, carregarDados, setSelecionados 
}) {
  if (!modalTransferencia.aberto) return null;

  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [n3, setN3] = useState('');
  const [n4, setN4] = useState('');
  
  const [nomeN2, setNomeN2] = useState('');
  const [nomeN3, setNomeN3] = useState('');
  const [nomeN4, setNomeN4] = useState('');

  const unidadesPai = useMemo(() => secretarias.filter(s => s.pai_id === null || s.tipo === 'PREFEITURA' || s.tipo === 'SECRETARIA'), [secretarias]);
  const filhosN1 = useMemo(() => secretarias.filter(s => String(s.pai_id) === String(n1)), [secretarias, n1]);
  const filhosN2 = useMemo(() => secretarias.filter(s => String(s.pai_id) === String(n2)), [secretarias, n2]);
  const filhosN3 = useMemo(() => secretarias.filter(s => String(s.pai_id) === String(n3)), [secretarias, n3]);

  const fecharModal = () => {
    setModalTransferencia({ aberto: false, ativos: [] });
    setN1(''); setN2(''); setN3(''); setN4('');
    setNomeN2(''); setNomeN3(''); setNomeN4('');
    setFormTransfer({ nova_secretaria: '', novo_setor: '', motivo: '' });
  };

  const confirmarTransferencia = async () => {
    if (!n1 || !formTransfer.motivo) return toast.warn("A Secretaria e o Motivo são obrigatórios.");
    
    let finalPaiId = parseInt(n1);
    let nomeSecretaria = secretarias.find(s => String(s.id) === String(n1))?.nome || '';
    let nomeFinalSetor = ''; 

    try {
      const nomeUser = typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual;

      if (n2 === 'NOVO' && nomeN2.trim()) {
        const res = await api.post('/api/unidades/', { nome: nomeN2.trim(), tipo: 'DEPARTAMENTO', pai_id: finalPaiId, usuario_acao: nomeUser });
        finalPaiId = res.data.id;
        nomeFinalSetor = res.data.nome;
      } else if (n2 && n2 !== 'NOVO') {
        finalPaiId = parseInt(n2);
        nomeFinalSetor = secretarias.find(s => String(s.id) === String(n2))?.nome || '';
      }

      if ((n3 === 'NOVO' || n2 === 'NOVO') && nomeN3.trim()) {
        const res = await api.post('/api/unidades/', { nome: nomeN3.trim(), tipo: 'SETOR', pai_id: finalPaiId, usuario_acao: nomeUser });
        finalPaiId = res.data.id;
        nomeFinalSetor = res.data.nome;
      } else if (n3 && n3 !== 'NOVO') {
        finalPaiId = parseInt(n3);
        nomeFinalSetor = secretarias.find(s => String(s.id) === String(n3))?.nome || '';
      }

      if ((n4 === 'NOVO' || n3 === 'NOVO' || n2 === 'NOVO') && nomeN4.trim()) {
        const res = await api.post('/api/unidades/', { nome: nomeN4.trim(), tipo: 'SALA', pai_id: finalPaiId, usuario_acao: nomeUser });
        finalPaiId = res.data.id;
        nomeFinalSetor = res.data.nome;
      } else if (n4 && n4 !== 'NOVO') {
        finalPaiId = parseInt(n4);
        nomeFinalSetor = secretarias.find(s => String(s.id) === String(n4))?.nome || '';
      }

      const promises = modalTransferencia.ativos.map(ativo => api.post('/api/transferencias/', { 
        patrimonio: typeof ativo === 'string' ? ativo : ativo.patrimonio, 
        nova_secretaria: nomeSecretaria, 
        novo_setor: nomeFinalSetor, 
        motivo: formTransfer.motivo, 
        usuario_acao: nomeUser 
      }));
      
      await Promise.all(promises);
      toast.success(`Transferência concluída!`); 
      fecharModal();
      if (setSelecionados) setSelecionados([]); 
      carregarDados();
    } catch (e) { toast.error("Erro ao realizar a operação."); }
  };

  const showN3 = (n2 && n2 !== 'NOVO') || (n2 === 'NOVO' && nomeN2.trim());
  const showN4 = (n3 && n3 !== 'NOVO' && n2 !== 'NOVO') || ((n3 === 'NOVO' || n2 === 'NOVO') && nomeN3.trim());

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={fecharModal}>
      <div className="w-full max-w-lg rounded-3xl shadow-2xl border flex flex-col max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
        
        <div className="p-6 border-b shrink-0" style={{ borderColor: 'var(--border-light)' }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center text-xl border border-blue-100 dark:border-blue-800">🚚</div>
            <div>
              <h3 className="text-xl font-black tracking-tight leading-none" style={{ color: 'var(--text-main)' }}>Transferir de Local</h3>
              <p className="text-[10px] font-bold uppercase mt-1 text-blue-500 tracking-widest">
                {modalTransferencia.ativos.length === 1 ? `PATRIMÔNIO: ${typeof modalTransferencia.ativos[0] === 'string' ? modalTransferencia.ativos[0] : modalTransferencia.ativos[0].patrimonio}` : `LOTE: ${modalTransferencia.ativos.length} ITENS`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border" style={{ borderColor: 'var(--border-light)' }}>
            <label className="block text-[10px] font-black uppercase opacity-80 mb-2" style={{ color: 'var(--text-main)' }}>1. Secretaria / Órgão <span className="text-red-500">*</span></label>
            <select className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={n1} onChange={e => { setN1(e.target.value); setN2(''); setN3(''); setN4(''); setNomeN2(''); setNomeN3(''); setNomeN4(''); }}>
              <option value="">Selecione a Secretaria base...</option>
              {unidadesPai.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.tipo})</option>)}
            </select>
          </div>

          {n1 && (
            <div className="pl-5 border-l-2 border-dashed space-y-4 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
              
              <div className="relative">
                <div className="absolute -left-5 top-5 w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}></div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-2" style={{ color: 'var(--text-main)' }}>2. Departamento (Opcional)</label>
                {n2 === 'NOVO' ? (
                  <div className="flex gap-2">
                    {/* 👇 Removido autoFocus daqui */}
                    <input placeholder="Nome do novo departamento..." className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-emerald-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={nomeN2} onChange={e => setNomeN2(e.target.value)} />
                    <button onClick={() => {setN2(''); setNomeN2('');}} className="px-4 rounded-xl border font-black hover:bg-black/5 text-xs" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>✖</button>
                  </div>
                ) : (
                  <select className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={n2} onChange={e => { setN2(e.target.value); setN3(''); setN4(''); }}>
                    <option value="">Nenhum</option>
                    {filhosN1.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    <option value="NOVO" className="font-black text-emerald-600">➕ Cadastrar Novo Departamento...</option>
                  </select>
                )}
              </div>

              {showN3 && (
                <div className="pl-5 border-l-2 border-dashed space-y-4 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="relative">
                    <div className="absolute -left-5 top-5 w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}></div>
                    <label className="block text-[10px] font-black uppercase opacity-60 mb-2" style={{ color: 'var(--text-main)' }}>3. Setor (Opcional)</label>
                    {n3 === 'NOVO' || n2 === 'NOVO' ? (
                      <div className="flex gap-2">
                        {/* 👇 Removido autoFocus daqui */}
                        <input placeholder="Nome do novo setor..." className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-emerald-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={nomeN3} onChange={e => setNomeN3(e.target.value)} />
                        {n2 !== 'NOVO' && <button onClick={() => {setN3(''); setNomeN3('');}} className="px-4 rounded-xl border font-black hover:bg-black/5 text-xs" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>✖</button>}
                      </div>
                    ) : (
                      <select className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={n3} onChange={e => { setN3(e.target.value); setN4(''); }}>
                        <option value="">Nenhum</option>
                        {filhosN2.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        <option value="NOVO" className="font-black text-emerald-600">➕ Cadastrar Novo Setor...</option>
                      </select>
                    )}
                  </div>

                  {showN4 && (
                    <div className="pl-5 border-l-2 border-dashed space-y-4 animate-fade-in" style={{ borderColor: 'var(--border-light)' }}>
                      <div className="relative">
                        <div className="absolute -left-5 top-5 w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--border-light)' }}></div>
                        <label className="block text-[10px] font-black uppercase opacity-60 mb-2" style={{ color: 'var(--text-main)' }}>4. Sala Específica (Opcional)</label>
                        {n4 === 'NOVO' || n3 === 'NOVO' || n2 === 'NOVO' ? (
                          <div className="flex gap-2">
                            {/* 👇 Removido autoFocus daqui */}
                            <input placeholder="Ex: Sala 05..." className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-emerald-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={nomeN4} onChange={e => setNomeN4(e.target.value)} />
                            {(n3 !== 'NOVO' && n2 !== 'NOVO') && <button onClick={() => {setN4(''); setNomeN4('');}} className="px-4 rounded-xl border font-black hover:bg-black/5 text-xs" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>✖</button>}
                          </div>
                        ) : (
                          <select className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={n4} onChange={e => setN4(e.target.value)}>
                            <option value="">Nenhuma</option>
                            {filhosN3.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            <option value="NOVO" className="font-black text-emerald-600">➕ Cadastrar Nova Sala...</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
             <div className="flex justify-between items-center mb-2">
                 <label className="block text-[10px] font-black uppercase opacity-60" style={{ color: 'var(--text-main)' }}>Motivo da Transferência <span className="text-red-500">*</span></label>
                 <select onChange={(e) => { if (e.target.value) { setFormTransfer({...formTransfer, motivo: (formTransfer.motivo.trim() ? `${formTransfer.motivo} - ` : '') + e.target.value}); e.target.value = ""; } }} className="text-[9px] p-1.5 rounded-lg border outline-none cursor-pointer font-bold shadow-sm" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>
                    <option value="">⚡ Rápidas...</option>
                    <option value="Remanejamento de Setor">Remanejamento de Setor</option>
                    <option value="Atendimento a Chamado">Atendimento a Chamado</option>
                 </select>
             </div>
             <textarea placeholder="Detalhe o motivo da movimentação..." className="w-full p-3 rounded-xl border outline-none min-h-[80px] font-medium focus:ring-2 focus:ring-blue-500/30" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={formTransfer.motivo} onChange={e => setFormTransfer({...formTransfer, motivo: e.target.value})} />
          </div>
        </div>

        <div className="p-6 border-t shrink-0 flex gap-3 justify-end bg-black/5 dark:bg-white/5 rounded-b-3xl" style={{ borderColor: 'var(--border-light)' }}>
          <button onClick={fecharModal} className="px-5 py-3 font-black uppercase text-xs opacity-60 hover:opacity-100">Cancelar</button>
          <button onClick={confirmarTransferencia} className="px-6 py-3 rounded-xl font-black uppercase text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg active:scale-95 transition-all">🚚 Confirmar</button>
        </div>
      </div>
    </div>, document.body
  );
}