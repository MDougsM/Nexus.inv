import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import { parseCamposDinamicos } from '../../utils/helpers';

export default function ModaisEdicao({ 
  modalEdicao, setModalEdicao, modalEdicaoMassa, setModalEdicaoMassa,
  categorias, secretarias, usuarioAtual, carregarDados, setSelecionados 
}) {
  const [formEdicaoMassa, setFormEdicaoMassa] = useState({ marca: '', modelo: '', dados_dinamicos: {} });

  // Sincroniza campos dinâmicos ao abrir o lote (Fix para Impressora)
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

  const salvarEdicao = async () => {
    try {
      await api.put(`/api/inventario/ficha/editar/${modalEdicao.ativo.patrimonio}`, { 
        ...modalEdicao.form, 
        categoria_id: parseInt(modalEdicao.form.categoria_id), 
        usuario_acao: usuarioAtual 
      });
      toast.success("🚀 Ativo atualizado com sucesso!");
      setModalEdicao({ aberto: false, ativo: null, form: {dados_dinamicos:{}} });
      carregarDados();
    } catch (e) { toast.error("Erro ao salvar alterações."); }
  };

  const salvarLote = async () => {
    try {
      const promises = modalEdicaoMassa.ativos.map(ativo => {
        let dinAtuais = {};
        if (typeof ativo.dados_dinamicos === 'string') try { dinAtuais = JSON.parse(ativo.dados_dinamicos); } catch(e){}
        else if (ativo.dados_dinamicos) dinAtuais = ativo.dados_dinamicos;

        const novosDinamicos = { ...dinAtuais };
        Object.keys(formEdicaoMassa.dados_dinamicos).forEach(k => {
          if (formEdicaoMassa.dados_dinamicos[k]?.trim()) {
            novosDinamicos[k] = formEdicaoMassa.dados_dinamicos[k];
          }
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

  return (
    <>
      {/* MODAL INDIVIDUAL - DESIGN PREMIUM */}
      {modalEdicao.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setModalEdicao({ aberto: false, form: {dados_dinamicos:{}} })}>
          <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-scale-up" style={{backgroundColor: 'var(--bg-card)'}} onClick={e => e.stopPropagation()}>
            
            {/* Header com Gradiente Sutil */}
            <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-light)', background: 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)' }}>
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">✏️</div>
              <div>
                <h3 className="text-xl font-black tracking-tight" style={{color: 'var(--text-main)'}}>Editar Ativo</h3>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest" style={{color: 'var(--text-muted)'}}>Correção de dados cadastrais</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Patrimônio</label>
                  <input className="w-full p-3 rounded-xl border bg-gray-50/50 font-mono font-bold text-blue-600 cursor-not-allowed" value={modalEdicao.form.patrimonio} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Tipo de Equipamento</label>
                  <select className="w-full p-3 rounded-xl border font-bold transition-all focus:ring-2 focus:ring-blue-500/20 outline-none" value={modalEdicao.form.categoria_id} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, categoria_id: e.target.value}})} style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)'}}>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Marca</label><input className="w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20" style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)'}} value={modalEdicao.form.marca || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, marca: e.target.value}})} /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Modelo</label><input className="w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20" style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)'}} value={modalEdicao.form.modelo || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, modelo: e.target.value}})} /></div>
              </div>

              {/* Seção de Campos Técnicos com Visual de Cards */}
              <div className="pt-6 border-t" style={{borderColor: 'var(--border-light)'}}>
                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[2px] mb-4 flex items-center gap-2">⚙️ Especificações Técnicas</h4>
                <div className="grid grid-cols-2 gap-5">
                  {parseCamposDinamicos(categorias.find(c => c.id == modalEdicao.form.categoria_id)).map(c => (
                    <div key={c} className="space-y-1 p-3 rounded-2xl border bg-gray-50/30" style={{borderColor: 'var(--border-light)'}}>
                      <label className="text-[9px] font-black uppercase opacity-60">{c}</label>
                      <input className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none focus:ring-0" style={{color: 'var(--text-main)'}} value={modalEdicao.form.dados_dinamicos?.[c] || ''} onChange={e => setModalEdicao({...modalEdicao, form: {...modalEdicao.form, dados_dinamicos: {...modalEdicao.form.dados_dinamicos, [c]: e.target.value}}})} placeholder={`Definir ${c}...`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer com Ações */}
            <div className="p-6 border-t flex justify-end gap-3" style={{backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-light)'}}>
              <button onClick={() => setModalEdicao({ aberto: false, form: {dados_dinamicos:{}} })} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
              <button onClick={salvarEdicao} className="px-8 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOTE - DESIGN FOCADO EM PRODUTIVIDADE */}
      {modalEdicaoMassa.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setModalEdicaoMassa({ aberto: false, ativos: [] })}>
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
                    {camposMassa.map(c => (
                      <div key={c} className="p-4 rounded-2xl border transition-all focus-within:border-blue-500 focus-within:shadow-sm" style={{backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)'}}>
                        <label className="block text-[10px] font-black uppercase opacity-50 mb-1">{c}</label>
                        <input placeholder="Manter original em todos..." className="w-full bg-transparent border-none p-0 text-base font-bold outline-none" style={{color: 'var(--text-main)'}} value={formEdicaoMassa.dados_dinamicos[c] || ''} onChange={e => setFormEdicaoMassa({...formEdicaoMassa, dados_dinamicos: {...formEdicaoMassa.dados_dinamicos, [c]: e.target.value}})} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="text-5xl">⚠️</div>
                  <div className="max-w-xs mx-auto">
                    <h4 className="font-black text-lg" style={{color: 'var(--text-main)'}}>Mistura de Tipos</h4>
                    <p className="text-sm" style={{color: 'var(--text-muted)'}}>Para editar especificações técnicas, selecione apenas itens do mesmo tipo (Ex: só Impressoras).</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{borderColor: 'var(--border-light)'}}>
              <button onClick={() => setModalEdicaoMassa({ aberto: false, ativos: [] })} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
              <button disabled={!categoriaMassa} onClick={salvarLote} className="px-8 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-30 shadow-lg shadow-blue-500/30 transition-all active:scale-95">Aplicar no Lote</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}