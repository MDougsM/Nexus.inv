import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Unidades() {
  const [unidades, setUnidades] = useState([]);
  const [novaUnidade, setNovaUnidade] = useState('');
  const [expandidos, setExpandidos] = useState({});
  
  // Controle de Modais
  const [modalEdit, setModalEdit] = useState({ aberto: false, item: null, novoNome: '' });
  const [modalDel, setModalDel] = useState({ aberto: false, item: null });
  const [motivo, setMotivo] = useState('');

  const usuarioAtual = localStorage.getItem('usuario') || 'Admin';

  const presetsEdicao = ["Correção de Digitação", "Atualização de Nomenclatura", "Reestruturação de Setores", "Mudança de Prédio"];
  const presetsExclusao = ["Setor Desativado", "Cadastro Duplicado", "Erro de Lançamento", "Reestruturação Organizacional"];

  const carregarDados = async () => {
    try {
      const response = await api.get('/api/unidades/');
      setUnidades(response.data);
    } catch (error) { toast.error('Erro ao carregar dados.'); }
  };

  useEffect(() => { carregarDados(); }, []);

  const toggleGrupo = (id) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  // --- AÇÕES ---
  const handleCriar = async (nome, tipo, paiId = null) => {
    if (!nome.trim()) return;
    try {
      await api.post('/api/unidades/', { nome: nome.toUpperCase(), tipo, pai_id: paiId, usuario_acao: usuarioAtual });
      toast.success("Cadastrado!");
      setNovaUnidade('');
      carregarDados();
    } catch (e) { toast.error("Erro ao criar."); }
  };

  const confirmarEdicao = async () => {
    if (!motivo.trim() || !modalEdit.novoNome.trim()) return toast.warn("Nome e Motivo são obrigatórios.");
    try {
      await api.put(`/api/unidades/${modalEdit.item.id}`, {
        nome: modalEdit.novoNome.toUpperCase(),
        tipo: modalEdit.item.tipo,
        usuario_acao: usuarioAtual,
        motivo: motivo
      });
      toast.success("Alteração salva!");
      fecharModais();
      carregarDados();
    } catch (e) { toast.error("Erro na edição."); }
  };

  const confirmarExclusao = async () => {
    if (!motivo.trim()) return toast.warn("Justificativa obrigatória.");
    try {
      await api.delete(`/api/unidades/${modalDel.item.id}`, { data: { usuario: usuarioAtual, motivo: motivo } });
      toast.success("Removido!");
      fecharModais();
      carregarDados();
    } catch (e) { toast.error("Erro ao excluir."); }
  };

  const fecharModais = () => {
    setModalEdit({ aberto: false, item: null, novoNome: '' });
    setModalDel({ aberto: false, item: null });
    setMotivo('');
  };

  const unidadesRaiz = unidades.filter(u => u.pai_id === null);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      
      {/* CADASTRO TOPO */}
      <div className="p-6 rounded-2xl border bg-white shadow-sm flex gap-3 items-end" style={{ borderColor: 'var(--border-light)' }}>
        <div className="flex-1">
          <label className="block text-[10px] font-black text-blue-600 uppercase mb-2">Nova Unidade / Secretaria</label>
          <input value={novaUnidade} onChange={e => setNovaUnidade(e.target.value)} placeholder="NOME DA SECRETARIA..." className="w-full p-3 rounded-xl border bg-gray-50 outline-none font-bold uppercase" />
        </div>
        <button onClick={() => handleCriar(novaUnidade, 'SECRETARIA')} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95">ADICIONAR</button>
      </div>

      {/* LISTA ACORDEÃO */}
      <div className="space-y-3">
        {unidadesRaiz.sort((a,b)=>a.nome.localeCompare(b.nome)).map(raiz => {
          const isExpanded = expandidos[raiz.id];
          const filhos = unidades.filter(u => u.pai_id === raiz.id);

          return (
            <div key={raiz.id} className="rounded-2xl border bg-white overflow-hidden shadow-sm transition-all" style={{ borderColor: 'var(--border-light)' }}>
              <div className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`} onClick={() => toggleGrupo(raiz.id)}>
                <div className="flex items-center gap-4">
                  <span className="text-xl">{isExpanded ? '📂' : '📁'}</span>
                  <div>
                    <h4 className="font-black text-sm text-gray-800 uppercase">{raiz.nome}</h4>
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{filhos.length} SETORES VINCULADOS</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModalEdit({ aberto: true, item: raiz, novoNome: raiz.nome })} className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors">✏️</button>
                  <button onClick={() => setModalDel({ aberto: true, item: raiz })} className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors">🗑️</button>
                  <span className="ml-4 opacity-30 font-black text-lg">{isExpanded ? '−' : '＋'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-gray-50/50 border-t p-4 space-y-2 animate-fade-in">
                  {filhos.sort((a,b)=>a.nome.localeCompare(b.nome)).map(filho => (
                    <div key={filho.id} className="flex items-center justify-between pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm group">
                      <span className="font-bold text-sm text-gray-600 uppercase"><span className="text-gray-300 mr-2">↳</span>{filho.nome}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => setModalEdit({ aberto: true, item: filho, novoNome: filho.nome })} className="p-1 hover:text-blue-600">✏️</button>
                         <button onClick={() => setModalDel({ aberto: true, item: filho })} className="p-1 hover:text-red-500 text-lg">×</button>
                      </div>
                    </div>
                  ))}
                  <input 
                    placeholder="Adicionar novo setor... (Enter ↵)" 
                    onKeyDown={e => e.key === 'Enter' && (handleCriar(e.target.value, 'SETOR', raiz.id), e.target.value='')}
                    className="ml-10 w-[calc(100%-40px)] p-2 bg-transparent border-b border-dashed border-gray-300 outline-none text-[11px] font-bold focus:border-blue-500 uppercase"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODAIS (PORTAIS) --- */}

      {/* MODAL EDIÇÃO */}
      {modalEdit.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 bg-blue-600 text-white font-black uppercase tracking-tighter">✏️ Editar Unidade</div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Novo Nome</label>
                <input value={modalEdit.novoNome} onChange={e => setModalEdit({...modalEdit, novoNome: e.target.value})} className="w-full p-3 rounded-xl border bg-gray-50 font-bold uppercase outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Motivo da Alteração</label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descreva o motivo..." className="w-full p-3 rounded-xl border bg-gray-50 font-bold outline-none min-h-[80px]" />
                <div className="flex flex-wrap gap-2 mt-2">
                   {presetsEdicao.map(p => (
                     <button key={p} onClick={() => setMotivo(p)} className="text-[9px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">{p}</button>
                   ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={fecharModais} className="flex-1 py-3 font-black text-gray-400 uppercase text-xs">Cancelar</button>
                <button onClick={confirmarEdicao} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 uppercase text-xs">Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL EXCLUSÃO */}
      {modalDel.aberto && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[9999] backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 bg-red-600 text-white font-black uppercase tracking-tighter">⚠️ Confirmar Exclusão</div>
            <div className="p-6 space-y-5">
              <p className="text-sm font-bold text-gray-600 text-center italic">Deseja realmente remover permanentemente a unidade <strong>"{modalDel.item.nome}"</strong>?</p>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Justificativa da Exclusão</label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Obrigatório para auditoria..." className="w-full p-3 rounded-xl border bg-gray-50 font-bold outline-none min-h-[80px]" />
                <div className="flex flex-wrap gap-2 mt-2">
                   {presetsExclusao.map(p => (
                     <button key={p} onClick={() => setMotivo(p)} className="text-[9px] font-black px-2 py-1 bg-red-50 text-red-600 rounded-md border border-red-100 hover:bg-red-600 hover:text-white transition-all">{p}</button>
                   ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={fecharModais} className="flex-1 py-3 font-black text-gray-400 uppercase text-xs">Voltar</button>
                <button onClick={confirmarExclusao} className="flex-[2] py-3 bg-red-600 text-white font-black rounded-xl shadow-lg shadow-red-200 uppercase text-xs">Confirmar Remoção</button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

    </div>
  );
}