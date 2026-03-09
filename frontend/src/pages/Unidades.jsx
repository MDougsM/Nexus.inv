import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Unidades() {
  const [secretarias, setSecretarias] = useState([]);
  const [setores, setSetores] = useState([]);
  
  // Controle de UI
  const [nomeSec, setNomeSec] = useState('');
  const [nomeSetor, setNomeSetor] = useState('');
  const [secExpandida, setSecExpandida] = useState(null); // Controla qual aba está aberta
  
  // Controle de Modais
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, tipo: '', id: null, nome: '' });
  const [modalEdicao, setModalEdicao] = useState({ aberto: false, tipo: '', id: null, nomeAntigo: '', nomeNovo: '' });
  const [motivo, setMotivo] = useState('');

  const usuarioAtual = localStorage.getItem('usuario');

  const carregarDados = async () => {
    try {
      const [resSec, resSet] = await Promise.all([
        api.get('/api/unidades/secretarias'),
        api.get('/api/unidades/setores')
      ]);
      setSecretarias(resSec.data);
      setSetores(resSet.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { carregarDados(); }, []);

  const toggleExpand = (id) => {
    setSecExpandida(secExpandida === id ? null : id);
    setNomeSetor(''); // Limpa o input do setor ao trocar de aba
  };

  // --- FUNÇÕES DE CRIAÇÃO ---
  const salvarSecretaria = async () => {
    if (!nomeSec) return toast.warn("Preencha o nome da secretaria.");
    try {
      await api.post('/api/unidades/secretarias', { nome: nomeSec, usuario_acao: usuarioAtual });
      toast.success("Secretaria cadastrada!");
      setNomeSec(''); 
      carregarDados();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar."); }
  };

  const salvarSetor = async (secretariaId) => {
    if (!nomeSetor) return toast.warn("Preencha o nome do setor.");
    try {
      await api.post('/api/unidades/setores', { nome: nomeSetor, secretaria_id: secretariaId, usuario_acao: usuarioAtual });
      toast.success("Setor cadastrado!");
      setNomeSetor(''); 
      carregarDados();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao salvar."); }
  };

  // --- FUNÇÕES DE EDIÇÃO ---
  const confirmarEdicao = async () => {
    if (!motivo || !modalEdicao.nomeNovo) return toast.warn("Novo nome e motivo são obrigatórios.");
    try {
      const endpoint = modalEdicao.tipo === 'Secretaria' 
        ? `/api/unidades/secretarias/${modalEdicao.id}` 
        : `/api/unidades/setores/${modalEdicao.id}`;
        
      await api.put(endpoint, { nome: modalEdicao.nomeNovo, usuario_acao: usuarioAtual, motivo: motivo });
      
      toast.success(`${modalEdicao.tipo} atualizada com sucesso!`);
      setModalEdicao({ aberto: false, tipo: '', id: null, nomeAntigo: '', nomeNovo: '' });
      setMotivo('');
      carregarDados();
    } catch (e) { toast.error(e.response?.data?.detail || "Erro ao editar."); }
  };

  // --- FUNÇÕES DE EXCLUSÃO ---
  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn("O motivo é obrigatório.");
    try {
      const endpoint = modalExclusao.tipo === 'Secretaria' 
        ? `/api/unidades/secretarias/${modalExclusao.id}` 
        : `/api/unidades/setores/${modalExclusao.id}`;
        
      await api.delete(endpoint, { data: { usuario: usuarioAtual, motivo: motivo } });
      
      toast.success(`${modalExclusao.tipo} excluída com sucesso!`);
      setModalExclusao({ aberto: false, tipo: '', id: null, nome: '' });
      setMotivo('');
      carregarDados();
    } catch (e) { toast.error("Erro ao excluir. Verifique dependências."); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      
      {/* 1. CADASTRO DE NOVA SECRETARIA (TOPO) */}
      <div className="p-6 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end" style={{backgroundColor:'var(--bg-card)', borderColor:'var(--border-light)'}}>
        <div className="w-full">
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--color-blue)' }}>NOVA SECRETARIA / UNIDADE PAI</label>
          <input 
            value={nomeSec} 
            onChange={e => setNomeSec(e.target.value)} 
            placeholder="Ex: SECRETARIA DE SAÚDE" 
            className="w-full p-3 rounded-lg border outline-none transition-colors" 
            style={{backgroundColor:'var(--bg-input)', borderColor:'var(--border-light)', color:'var(--text-main)'}}
          />
        </div>
        <button onClick={salvarSecretaria} className="w-full md:w-auto px-8 py-3 text-white rounded-lg font-bold transition-opacity hover:opacity-90 whitespace-nowrap" style={{backgroundColor:'var(--color-blue)'}}>
          Criar Secretaria
        </button>
      </div>

      {/* 2. LISTA ACORDEÃO (SECRETARIAS E SETORES ANINHADOS) */}
      <div className="space-y-4">
        {secretarias.length === 0 && (
          <div className="p-8 text-center border rounded-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}>
            Nenhuma secretaria cadastrada. Crie uma acima para começar.
          </div>
        )}

        {secretarias.map(sec => {
          const isExpanded = secExpandida === sec.id;
          const setoresDestaSec = setores.filter(s => s.secretaria_id === sec.id);

          return (
            <div key={sec.id} className="rounded-xl border shadow-sm overflow-hidden transition-all" style={{backgroundColor:'var(--bg-card)', borderColor: isExpanded ? 'var(--color-blue)' : 'var(--border-light)'}}>
              
              {/* CABEÇALHO DA SECRETARIA (CLICÁVEL) */}
              <div 
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => toggleExpand(sec.id)}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--color-blue)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>{sec.nome}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{setoresDestaSec.length} setores vinculados</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 sm:mt-0">
                  <button onClick={(e) => { e.stopPropagation(); setModalEdicao({ aberto: true, tipo: 'Secretaria', id: sec.id, nomeAntigo: sec.nome, nomeNovo: sec.nome }) }} className="px-3 py-1.5 rounded text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors">EDITAR</button>
                  <button onClick={(e) => { e.stopPropagation(); setModalExclusao({ aberto: true, tipo: 'Secretaria', id: sec.id, nome: sec.nome }) }} className="px-3 py-1.5 rounded text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">EXCLUIR</button>
                </div>
              </div>

              {/* ÁREA EXPANDIDA (SETORES) */}
              {isExpanded && (
                <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-page)' }}>
                  
                  {/* CADASTRAR SETOR DENTRO DESTA SECRETARIA */}
                  <div className="flex gap-3 mb-6 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                    <input 
                      autoFocus
                      value={nomeSetor} 
                      onChange={e => setNomeSetor(e.target.value)} 
                      placeholder={`Novo setor em ${sec.nome}... (Ex: RH, ALMOXARIFADO)`} 
                      className="flex-1 p-2.5 rounded-lg border outline-none" 
                      style={{backgroundColor:'var(--bg-input)', borderColor:'var(--border-light)', color:'var(--text-main)'}}
                    />
                    <button onClick={() => salvarSetor(sec.id)} className="px-6 py-2.5 text-white rounded-lg font-bold transition-opacity hover:opacity-90" style={{backgroundColor:'var(--color-green)'}}>
                      Adicionar Setor
                    </button>
                  </div>

                  {/* LISTA DE SETORES CORRIGIDA */}
                  {setoresDestaSec.length === 0 ? (
                    <div className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Nenhum setor cadastrado nesta secretaria.</div>
                  ) : (
                    <div className="space-y-2">
                      {setoresDestaSec.map(setor => (
                        <div key={setor.id} className="flex justify-between items-center p-3 rounded-lg border transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                          <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{setor.nome}</span>
                          <div className="flex gap-2">
                            <button onClick={() => setModalEdicao({ aberto: true, tipo: 'Setor', id: setor.id, nomeAntigo: setor.nome, nomeNovo: setor.nome })} className="px-3 py-1 rounded text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors">Editar</button>
                            <button onClick={() => setModalExclusao({ aberto: true, tipo: 'Setor', id: setor.id, nome: setor.nome })} className="px-3 py-1 rounded text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Remover</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------- */}
      {/* MODAL DE EDIÇÃO COM RESPOSTAS RÁPIDAS */}
      {/* ------------------------------------------- */}
      {modalEdicao.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-blue)' }}>Editar {modalEdicao.tipo}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Alterar o nome de <strong>{modalEdicao.nomeAntigo}</strong>.</p>
            
            <input autoFocus className="w-full p-3 rounded-lg border outline-none mb-4" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={modalEdicao.nomeNovo} onChange={e => setModalEdicao({...modalEdicao, nomeNovo: e.target.value})} />
            
            <div className="mb-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-[10px] font-black uppercase opacity-80 text-blue-500">Motivo da alteração *</label>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      const textoAtual = motivo.trim() ? `${motivo} - ` : '';
                      setMotivo(textoAtual + e.target.value);
                      e.target.value = ""; 
                    }
                  }}
                  className="text-[10px] p-1.5 rounded-lg border font-bold outline-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                >
                  <option value="">⚡ Respostas Rápidas...</option>
                  <option value="Correção de Digitação">Correção de Digitação</option>
                  <option value="Atualização de Nomenclatura">Atualização de Nomenclatura</option>
                  <option value="Reestruturação de Setores">Reestruturação de Setores</option>
                  <option value="Mudança de Prédio/Endereço">Mudança de Prédio/Endereço</option>
                </select>
              </div>
              <textarea 
                className="w-full p-3 rounded-lg border outline-none min-h-[80px]" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                placeholder="Selecione uma resposta rápida acima ou digite o motivo aqui..." 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)} 
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => {setModalEdicao({ aberto: false, tipo: '', id: null, nomeAntigo: '', nomeNovo: '' }); setMotivo('')}} className="px-4 py-2 rounded font-bold" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={confirmarEdicao} className="px-4 py-2 rounded font-bold text-white bg-blue-500 hover:bg-blue-600">Salvar Alteração</button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------- */}
      {/* MODAL DE EXCLUSÃO COM RESPOSTAS RÁPIDAS */}
      {/* ------------------------------------------- */}
      {modalExclusao.aberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <h3 className="text-lg font-bold text-red-500 mb-2">Excluir {modalExclusao.tipo}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-main)' }}>
              Apagar <strong>{modalExclusao.nome}</strong>? 
              {modalExclusao.tipo === 'Secretaria' && " Isso vai apagar TODOS os setores vinculados a ela!"}
            </p>

            <div className="mb-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-[10px] font-black uppercase opacity-80 text-red-500">Motivo da exclusão *</label>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      const textoAtual = motivo.trim() ? `${motivo} - ` : '';
                      setMotivo(textoAtual + e.target.value);
                      e.target.value = ""; 
                    }
                  }}
                  className="text-[10px] p-1.5 rounded-lg border font-bold outline-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                >
                  <option value="">⚡ Respostas Rápidas...</option>
                  <option value="Setor Desativado/Extinto">Setor Desativado/Extinto</option>
                  <option value="Cadastro Duplicado">Cadastro Duplicado</option>
                  <option value="Erro de Lançamento">Erro de Lançamento</option>
                  <option value="Reestruturação Organizacional">Reestruturação Organizacional</option>
                </select>
              </div>
              <textarea 
                className="w-full p-3 rounded-lg border outline-none min-h-[100px]" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                placeholder="Selecione uma resposta rápida acima ou digite o motivo aqui..." 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)} 
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => {setModalExclusao({ aberto: false, tipo: '', id: null, nome: '' }); setMotivo('')}} className="px-4 py-2 rounded font-bold" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={confirmarExclusao} className="px-4 py-2 rounded font-bold text-white bg-red-500 hover:bg-red-600">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}