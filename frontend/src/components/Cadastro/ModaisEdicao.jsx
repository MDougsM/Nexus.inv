import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../../api/api';
import { parseCamposDinamicos } from '../../utils/helpers';

export default function ModaisEdicao({ 
  modalEdicao, setModalEdicao, modalEdicaoMassa, setModalEdicaoMassa,
  categorias, secretarias, usuarioAtual, carregarDados, setSelecionados 
}) {
  const [formEdicaoMassa, setFormEdicaoMassa] = useState({ marca: '', modelo: '', dados_dinamicos: {} });
  const [motivoEdicao, setMotivoEdicao] = useState('');

  useEffect(() => {
    if (modalEdicaoMassa.aberto && modalEdicaoMassa.ativos.length > 0) {
      const catId = modalEdicaoMassa.ativos[0].categoria_id;
      const categoria = categorias.find(c => c.id === catId);
      const campos = parseCamposDinamicos(categoria);
      const iniciais = {};
      campos.forEach(c => { iniciais[c] = ''; });
      setFormEdicaoMassa({ marca: '', modelo: '', dados_dinamicos: iniciais });
    }
  }, [modalEdicaoMassa.aberto, modalEdicaoMassa.ativos, categorias]);

  useEffect(() => {
    if (modalEdicao.aberto) {
      setMotivoEdicao('');
    }
  }, [modalEdicao.aberto]);

  const salvarEdicao = async () => {
    if (!motivoEdicao.trim()) return toast.warning("O motivo da alteração é obrigatório.");
    if (!modalEdicao.form.patrimonio || !modalEdicao.form.patrimonio.trim()) return toast.warning("O Patrimônio não pode ficar vazio.");

    try {
        await api.put(`/api/inventario/ficha/editar/${modalEdicao.ativo.patrimonio}`, {
            ...modalEdicao.form,
            usuario_acao: usuarioAtual,
            motivo: motivoEdicao 
        });

        toast.success("Cadastro atualizado com sucesso!");
        setModalEdicao({ aberto: false, ativo: null, form: {dados_dinamicos:{}} });
        carregarDados();
    } catch (e) { toast.error("Erro ao salvar edição."); }
  };

  const salvarLote = async () => {
    try {
      const promises = modalEdicaoMassa.ativos.map(ativo => {
        let dinAtuais = {};
        if (typeof ativo.dados_dinamicos === 'string') try { dinAtuais = JSON.parse(ativo.dados_dinamicos); } catch(e){}
        else if (ativo.dados_dinamicos) dinAtuais = ativo.dados_dinamicos;

        const novosDinamicos = { ...dinAtuais };
        Object.keys(formEdicaoMassa.dados_dinamicos).forEach(k => {
          if (formEdicaoMassa.dados_dinamicos[k]?.trim()) novosDinamicos[k] = formEdicaoMassa.dados_dinamicos[k];
        });

        return api.put(`/api/inventario/ficha/editar/${ativo.patrimonio}`, {
          ...ativo,
          marca: formEdicaoMassa.marca || ativo.marca,
          modelo: formEdicaoMassa.modelo || ativo.modelo,
          dados_dinamicos: novosDinamicos,
          usuario_acao: usuarioAtual
        });
      });
      await Promise.all(promises);
      toast.success(`✅ ${modalEdicaoMassa.ativos.length} itens atualizados em lote!`);
      setModalEdicaoMassa({ aberto: false, ativos: [] });
      setSelecionados([]);
      carregarDados();
    } catch (e) { toast.error("Erro no processamento do lote."); }
  };

  const catsSelecionadas = [...new Set(modalEdicaoMassa.ativos.map(a => a.categoria_id))];
  const categoriaMassa = catsSelecionadas.length === 1 ? categorias.find(c => c.id === catsSelecionadas[0]) : null;
  const camposMassa = parseCamposDinamicos(categoriaMassa);
  const camposBloqueados = ['IP', 'Hostname', 'Serial', 'Páginas Impressas', 'Toner', 'Drum', '% Toner', '% Drum'];

  return (
    <>
      {modalEdicao.aberto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setModalEdicao({ aberto: false, form: {dados_dinamicos:{}} })}>
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-scale-up flex flex-col max-h-[90vh]" style={{backgroundColor: 'var(--bg-card)'}} onClick={e => e.stopPropagation()}>
            
            <div className="p-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-light)', background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)' }}>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">✏️</div>
                 <div>
                   <h3 className="text-xl font-black tracking-tight" style={{color: 'var(--text-main)'}}>Editar Ativo</h3>
                   <p className="text-xs font-bold opacity-50 uppercase tracking-widest" style={{color: 'var(--text-muted)'}}>Correção de dados cadastrais</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-widest">🔖 Equipamento Próprio?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={modalEdicao.form.dominio_proprio || false}
                    onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, dominio_proprio: e.target.checked}})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Patrimônio</label>
                  <input value={modalEdicao.form.patrimonio || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, patrimonio: e.target.value}})} className="w-full p-2.5 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Tipo de Equipamento</label>
                  <select className="w-full p-3 rounded-xl border font-bold transition-all focus:ring-2 focus:ring-blue-500/20 outline-none" value={modalEdicao.form.categoria_id} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, categoria_id: e.target.value}})} style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)'}}>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* 🚀 O RÓTULO DO APELIDO AGORA É GLOBAL */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1 text-emerald-600">Nome da Máquina / Apelido</label>
                <input value={modalEdicao.form.nome_personalizado || ''} placeholder="Ex: Recepção Central, PC do Diretor..." onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, nome_personalizado: e.target.value}})} className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Marca</label><input className="w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)'}} value={modalEdicao.form.marca || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, marca: e.target.value}})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Modelo</label><input className="w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)'}} value={modalEdicao.form.modelo || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, modelo: e.target.value}})} /></div>
              </div>

              <div className="pt-6 border-t" style={{borderColor: 'var(--border-light)'}}>
                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[2px] mb-4 flex items-center gap-2">⚙️ Especificações Técnicas</h4>
                <div className="grid grid-cols-2 gap-5">
                  {parseCamposDinamicos(categorias.find(c => c.id == modalEdicao.form.categoria_id)).map(c => {
                    const isBloqueado = camposBloqueados.includes(c);
                    const isObservacao = c === 'observacao';
                    const isParVinculo = c === 'par_vinculo';
                    
                    return (
                      <div key={c} className={`space-y-1 p-3 rounded-2xl border transition-all ${isBloqueado ? 'opacity-60 bg-black/5 cursor-not-allowed' : 'focus-within:border-blue-500 focus-within:shadow-sm'} ${isObservacao ? 'col-span-2' : ''}`} style={{ backgroundColor: isBloqueado ? 'transparent' : 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                        <label className="text-[9px] font-black uppercase opacity-60 flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                          {isParVinculo ? '🔗 Par Vinculado (Patrimônio)' : isObservacao ? '📝 Observação Geral' : c} 
                          {isBloqueado && <span className="text-[8px] text-blue-500">🔒 SENTINEL</span>}
                        </label>
                        
                        {isObservacao ? (
                            <textarea className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none focus:ring-0 min-h-[60px]" style={{color: 'var(--text-main)'}} value={modalEdicao.form.dados_dinamicos?.[c] || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, dados_dinamicos: {...modalEdicao.form.dados_dinamicos, [c]: e.target.value}}})} placeholder="Anotações e detalhes do equipamento..." />
                        ) : (
                            <input disabled={isBloqueado} className={`w-full bg-transparent border-none p-0 text-sm font-bold outline-none ${isBloqueado ? 'cursor-not-allowed' : 'focus:ring-0'}`} style={{color: isBloqueado ? 'var(--text-muted)' : 'var(--text-main)'}} value={modalEdicao.form.dados_dinamicos?.[c] || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, dados_dinamicos: {...modalEdicao.form.dados_dinamicos, [c]: e.target.value}}})} placeholder={isParVinculo ? 'Ex: PM-1234' : `Definir ${c}...`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t" style={{borderColor: 'var(--border-light)'}}>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-[10px] font-black uppercase opacity-80 text-blue-500">Justificativa da Alteração *</label>
                    <select onChange={(e) => { if (e.target.value) { const textoAtual = motivoEdicao.trim() ? `${motivoEdicao} - ` : ''; setMotivoEdicao(textoAtual + e.target.value); e.target.value = ""; } }} className="text-[10px] p-1.5 rounded-lg border font-bold outline-none cursor-pointer hover:bg-gray-500/10 transition-all shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                      <option value="">⚡ Respostas Rápidas...</option>
                      <option value="Atualização Cadastral">Atualização Cadastral</option>
                      <option value="Adicionado Apelido/Nome">Adicionado Apelido/Nome</option>
                      <option value="Mudança de Patrimônio">Mudança de Patrimônio</option>
                      <option value="Correção de Especificações">Correção de Especificações</option>
                      <option value="Upgrade de Hardware">Upgrade de Hardware</option>
                      <option value="Correção de Digitação">Correção de Digitação</option>
                      <option value="Atualização de Domínio Próprio">Atualização de Domínio Próprio</option>
                    </select>
                  </div>
                  <textarea className="w-full p-3 rounded-xl border font-medium outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[80px] transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} placeholder="Selecione uma resposta rápida acima ou digite o motivo aqui..." value={motivoEdicao} onChange={e => setMotivoEdicao(e.target.value)} />
                  <p className="text-[10px] opacity-50 italic" style={{ color: 'var(--text-main)' }}>Este motivo será registrado na auditoria sob o seu usuário.</p>
                </div>
              </div>

            </div>

            <div className="p-6 border-t flex justify-end gap-3 shrink-0" style={{backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-light)'}}>
              <button onClick={() => setModalEdicao({ aberto: false, form: {dados_dinamicos:{}} })} className="px-6 py-2.5 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all" style={{ color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={salvarEdicao} className="px-8 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Salvar Alterações</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL LOTE MANTIDO INTACTO */}
      {modalEdicaoMassa.aberto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setModalEdicaoMassa({ aberto: false, ativos: [] })}>
          {/* ... Código do modal de lote existente ... */}
          <div className="w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10" style={{backgroundColor: 'var(--bg-card)'}} onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center gap-3 bg-blue-600 text-white">
              <div className="text-2xl">⚡</div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Edição em Lote</h3>
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Alterando múltiplos ativos de uma vez</p>
              </div>
            </div>
            <div className="p-8">
              {categoriaMassa ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                    <span className="text-sm font-black">Tipo: {categoriaMassa.nome}</span>
                    <span className="text-xs opacity-60">• {modalEdicaoMassa.ativos.length} itens selecionados</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {camposMassa.map(c => {
                      const isBloqueado = camposBloqueados.includes(c);
                      if(isBloqueado) return null; // Não mostra os travados na edição em lote
                      
                      return (
                        <div key={c} className="p-4 rounded-2xl border transition-all focus-within:border-blue-500 focus-within:shadow-sm" style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)'}}>
                          <label className="block text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>{c}</label>
                          <input placeholder="Manter original em todos..." className="w-full bg-transparent border-none p-0 text-base font-bold outline-none" style={{color: 'var(--text-main)'}} value={formEdicaoMassa.dados_dinamicos[c] || ''} onChange={e => setFormEdicaoMassa({...formEdicaoMassa, dados_dinamicos: {...formEdicaoMassa.dados_dinamicos, [c]: e.target.value}})} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="text-5xl">⚠️</div>
                  <div className="max-w-xs mx-auto">
                    <h4 className="font-black text-lg" style={{color: 'var(--text-main)'}}>Mistura de Tipos</h4>
                    <p className="text-sm opacity-70" style={{color: 'var(--text-main)'}}>Para editar especificações técnicas, selecione apenas itens do mesmo tipo.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3" style={{backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-light)'}}>
              <button onClick={() => setModalEdicaoMassa({ aberto: false, ativos: [] })} className="px-6 py-2.5 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all" style={{ color: 'var(--text-main)' }}>Cancelar</button>
              <button disabled={!categoriaMassa} onClick={salvarLote} className="px-8 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-30 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Aplicar no Lote</button>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}