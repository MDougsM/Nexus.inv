import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../../api/api';
import ModalDashboardAvancado from '../ModalDashboardAvancado';
import { QRCodeSVG } from 'qrcode.react';
import { parseCamposDinamicos, getNomeTipoEquipamento, getStatusBadge } from '../../../utils/helpers';

export default function ModalFicha({ modalFicha, setModalFicha, categorias, usuarioAtual, carregarDados }) {
  const [modalAvancado, setModalAvancado] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  
  // 🚀 ESTADO PARA CARREGAR OS VÍNCULOS DO CMDB
  const [vinculos, setVinculos] = useState({ pais: [], filhos: [] });

  const tenantAtual = localStorage.getItem('tenant_id') || 'NEWPC';
  const isUserAdmin = localStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === true;

  useEffect(() => {
    if (modalFicha.aberto && modalFicha.dados?.ativo) {
       // Busca a árvore genealógica da máquina no CMDB
       api.get(`/api/inventario/vinculos/${encodeURIComponent(modalFicha.dados.ativo.patrimonio)}`)
          .then(res => setVinculos(res.data))
          .catch(() => setVinculos({ pais: [], filhos: [] }));
    }
  }, [modalFicha.aberto, modalFicha.dados]);

  if (!modalFicha.aberto || !modalFicha.dados) return null;

  const { ativo, historico } = modalFicha.dados;
  
  // 🛡️ BLINDAGEM CONTRA TELA BRANCA: Garante que a categoria seja encontrada mesmo se o ID for string
  const categoriaEncontrada = categorias.find(c => String(c.id) === String(ativo.categoria_id));
  const camposPermitidos = parseCamposDinamicos(categoriaEncontrada || null);

  const parseJSONSeguro = (dado) => {
      if (!dado) return {};
      if (typeof dado === 'object') return dado;
      try { return JSON.parse(dado.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true')); } catch(e) { return {}; }
  };

  const dadosDin = parseJSONSeguro(ativo.dados_dinamicos);
  const isVIP = dadosDin?.protecao_c2 === true;

  const toggleProtecaoC2 = async () => {
    if (!window.confirm(`Deseja ${isVIP ? 'REMOVER' : 'ATIVAR'} a Proteção C2 para esta máquina?`)) return;
    setLoadingSecurity(true);
    try {
      const payload = {
        usuario_acao: typeof usuarioAtual === 'object' ? usuarioAtual.nome : usuarioAtual || "Admin",
        motivo: isVIP ? "Remoção de Proteção C2 via Painel" : "Ativação de Proteção C2 (VIP) via Painel",
        dados_dinamicos: { ...dadosDin, protecao_c2: !isVIP }
      };
      await api.put(`/api/inventario/ficha/editar/${encodeURIComponent(ativo.patrimonio)}`, payload);
      toast.success(`Proteção C2 ${!isVIP ? 'ATIVADA' : 'REMOVIDA'} com sucesso!`);
      setModalFicha(prev => ({ ...prev, dados: { ...prev.dados, ativo: { ...prev.dados.ativo, dados_dinamicos: payload.dados_dinamicos } } }));
      if(carregarDados) carregarDados();
    } catch (error) { toast.error("Erro ao comunicar com o servidor."); } finally { setLoadingSecurity(false); }
  };

  const abrirIP = (ip) => {
    if (!ip || ip.trim() === '' || ip.toUpperCase() === 'N/A') return toast.warning("IP não configurado.");
    window.open(`http://${ip.trim()}`, '_blank');
  };

  const pularParaFicha = async (patrimonioAlvo) => {
      try {
          const res = await api.get(`/api/inventario/ficha/detalhes/${encodeURIComponent(patrimonioAlvo)}`);
          let payload = res.data;
          if (payload.ativo) {
              let din = parseJSONSeguro(payload.ativo.dados_dinamicos);
              payload.ativo.dados_dinamicos = { ...din, IP: din.ip || din.IP, Hostname: din.hostname || din.Hostname }; 
          }
          setModalFicha({ aberto: true, dados: payload });
      } catch (e) {
          toast.error("Erro ao carregar os detalhes do ativo vinculado.");
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in print:bg-white print:p-0 print:block" onClick={() => setModalFicha({ aberto: false, dados: null })}>
      <div className="w-full max-w-6xl max-h-[95vh] rounded-3xl shadow-2xl border overflow-hidden flex flex-col print:border-none print:shadow-none print:max-h-none print:h-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
        
        <div className="p-8 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-800 text-white print:bg-none print:text-black print:border-b-2 print:border-black">
          <div className="flex gap-6 items-center">
            <div className="hidden md:flex flex-col items-center bg-white/10 p-4 rounded-2xl border shadow-lg print:flex print:bg-gray-100 print:border-gray-300">
              <div className="bg-white p-2 rounded-xl"><QRCodeSVG value={`${window.location.origin}/consulta/${tenantAtual}/${ativo.patrimonio}`} size={64} level="H" includeMargin={false} /></div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-1 print:text-gray-500">Registro Geral de Ativo</p>
              <h3 className="text-4xl font-black tracking-tight mb-2 text-white print:text-black">{ativo.patrimonio}</h3>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-100 print:text-gray-700">{getNomeTipoEquipamento(ativo, categorias)} • {ativo.marca} {ativo.modelo}</p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-all border border-white/10">🖨️</button>
            <button onClick={() => setModalFicha({ aberto: false, dados: null })} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-red-500 flex items-center justify-center text-2xl transition-all border border-white/10">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar print:p-4">
          
          <div className="lg:col-span-5 space-y-6">
            
            <div className="p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h4 className="text-[11px] font-black mb-6 uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}>📍 Localização Oficial</h4>
              <div className="space-y-4">
                <div><p className="text-[9px] font-black opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Unidade de Lotação</p><p className="font-black text-sm text-blue-600">{ativo.unidade?.nome || ativo.secretaria || 'Não Alocado'}</p></div>
                <div><p className="text-[9px] font-black opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sub-Unidade / Sala</p><p className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{ativo.unidade?.tipo || ativo.setor || '-'}</p></div>
                {getStatusBadge(ativo.status)}
              </div>
            </div>

            <div className="p-6 rounded-3xl border shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 print:border-gray-300">
              <h4 className="text-[11px] font-black mb-4 uppercase tracking-widest flex items-center gap-2 text-amber-700">🏛️ Licitação / Cautela</h4>
              <div className="space-y-4">
                <div><p className="text-[9px] font-black opacity-50 uppercase tracking-widest text-amber-900">Processo Licitatório</p><p className="font-black text-sm text-amber-800">{ativo.numero_licitacao || 'Não Informado'}</p></div>
                <div><p className="text-[9px] font-black opacity-50 uppercase tracking-widest text-amber-900">Garantia / Vigência</p><p className="font-black text-sm text-amber-800">{ativo.data_vencimento_garantia ? new Date(ativo.data_vencimento_garantia).toLocaleDateString('pt-BR') : 'Sem registro'}</p></div>
                <div><p className="text-[9px] font-black opacity-50 uppercase tracking-widest text-amber-900">Servidor com a Cautela</p><p className="font-black text-sm text-amber-800">{ativo.responsavel_atual || 'Sem responsável assinado'}</p></div>
              </div>
            </div>

             {ativo.dados_dinamicos && camposPermitidos.length > 0 && (
              <div className="p-6 rounded-3xl border shadow-sm print:border-gray-300" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}>⚙️ Hardware</h4>
                  <button onClick={() => setModalAvancado(true)} className="bg-blue-600 text-white text-[9px] px-3 py-1.5 rounded-lg uppercase font-bold hover:bg-blue-700 transition-all print:hidden shadow-md shadow-blue-500/30">Ver Avançado 🔎</button>
                </div>
                <div className="space-y-4">
                  {camposPermitidos.map((campo) => {
                    // 🚀 REMOVE O PAR VINCULADO E APELIDOS DA FICHA DE VISUALIZAÇÃO
                    if (campo.toLowerCase().includes('apelido') || campo.toLowerCase().includes('personalizado') || campo.toLowerCase() === 'nome da máquina' || campo.toLowerCase() === 'par_vinculo') return null;

                    if (!dadosDin[campo]) return null;
                    return (
                      <div key={campo}>
                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{campo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-black text-sm flex-1 whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>{dadosDin[campo]}</p>
                          {campo.toUpperCase() === 'IP' && <button onClick={() => abrirIP(dadosDin[campo])} className="w-7 h-7 bg-emerald-600 text-white rounded flex items-center justify-center hover:bg-emerald-700 print:hidden">🌐</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="p-6 rounded-3xl border shadow-sm print:hidden" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                <div className="flex items-center gap-2 mb-4 border-b pb-3" style={{ borderColor: 'var(--border-light)' }}>
                  <span className="text-gray-500 text-lg">🛡️</span>
                  <h4 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Segurança e C2</h4>
                </div>
                <div className="flex flex-col gap-1 mb-5">
                  <span className="text-[9px] font-black opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status de Proteção</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-sm font-black ${isVIP ? 'text-amber-600' : 'text-emerald-600'}`}>{isVIP ? '🔒 MÁXIMA (VIP)' : '🔓 PADRÃO'}</span>
                    {isUserAdmin && (
                      <button onClick={toggleProtecaoC2} disabled={loadingSecurity} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${isVIP ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                        {loadingSecurity ? '...' : (isVIP ? 'Revogar VIP' : 'Tornar VIP')}
                      </button>
                    )}
                  </div>
                </div>
            </div>

          </div>

          <div className="lg:col-span-7 flex flex-col gap-6 print:block">
            
            {/* 🚀 BLOCO DE TOPOLOGIA E RELACIONAMENTOS */}
            {(vinculos?.pais?.length > 0 || vinculos?.filhos?.length > 0) && (
               <div className="p-8 rounded-3xl border shadow-sm print:border-gray-300 bg-indigo-50/20 dark:bg-indigo-900/10" style={{ borderColor: 'var(--border-light)' }}>
                  <h4 className="text-[11px] font-black mb-6 uppercase tracking-widest flex items-center gap-2 text-indigo-600">🕸️ Topologia & Relacionamentos (CMDB)</h4>
                  
                  <div className="space-y-6">
                     {vinculos?.pais?.length > 0 && (
                        <div>
                           <p className="text-[9px] font-black opacity-60 uppercase tracking-widest text-indigo-700 mb-3">⬆️ Equipamento Superior (Este ativo está DENTRO de)</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {vinculos.pais.map(v => (
                                 <div key={v.id_vinculo} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-black/20 border shadow-sm" style={{borderColor: 'var(--border-light)'}}>
                                    <div>
                                       <p className="text-sm font-black font-mono text-indigo-600">{v.patrimonio}</p>
                                       <p className="text-[10px] font-bold opacity-60 truncate max-w-[180px]" style={{color: 'var(--text-main)'}}>{v.nome}</p>
                                    </div>
                                    <button onClick={() => pularParaFicha(v.patrimonio)} title="Abrir Ficha deste Pai" className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors shadow-sm print:hidden">👁️</button>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {vinculos?.filhos?.length > 0 && (
                        <div>
                           <p className="text-[9px] font-black opacity-60 uppercase tracking-widest text-amber-700 mb-3">⬇️ Equipamentos Dependentes (DENTRO deste ativo)</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {vinculos.filhos.map(v => (
                                 <div key={v.id_vinculo} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-black/20 border shadow-sm" style={{borderColor: 'var(--border-light)'}}>
                                    <div>
                                       <p className="text-sm font-black font-mono text-amber-600">{v.patrimonio}</p>
                                       <p className="text-[10px] font-bold opacity-60 truncate max-w-[180px]" style={{color: 'var(--text-main)'}}>{v.nome}</p>
                                    </div>
                                    <button onClick={() => pularParaFicha(v.patrimonio)} title="Abrir Ficha deste Filho" className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center hover:bg-amber-200 transition-colors shadow-sm print:hidden">👁️</button>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {/* Histórico */}
            <div className="p-8 rounded-3xl border shadow-sm flex-1 print:border-none print:shadow-none print:p-0" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
              <h4 className="text-[11px] font-black mb-8 uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}>📜 Ciclo de Vida (Auditoria)</h4>
              <div className="relative pl-8 border-l-2 space-y-8" style={{ borderColor: 'var(--border-light)' }}>
                {historico.length === 0 ? <p className="text-sm font-bold italic opacity-50">Nenhum registro.</p> :
                 historico.map((log, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[41px] top-1.5 w-5 h-5 rounded-full border-4 bg-blue-500"></div>
                    <p className="text-[10px] font-black uppercase text-blue-500">{log.acao} - {new Date(log.data_hora).toLocaleDateString()}</p>
                    <div className="mt-2 p-4 rounded-2xl border text-sm font-medium leading-relaxed" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>{log.detalhes}</div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      {modalAvancado && (
         <ModalDashboardAvancado ativo={ativo} onClose={() => setModalAvancado(false)} parseJSONSeguro={parseJSONSeguro} />
      )}
    </div>, document.body
  );
}