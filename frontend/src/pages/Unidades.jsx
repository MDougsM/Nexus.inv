import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function Unidades() {
  const [unidades, setUnidades] = useState([]);
  const [novaUnidade, setNovaUnidade] = useState('');
  const [tipoNovaUnidade, setTipoNovaUnidade] = useState('SECRETARIA');
  const [paiSelecionado, setPaiSelecionado] = useState('');
  
  // Controle de quais "pastas" estão abertas na árvore
  const [expandidos, setExpandidos] = useState({});
  
  const [modalDel, setModalDel] = useState({ aberto: false, item: null });
  const [motivo, setMotivo] = useState('');

  const usuarioAtual = localStorage.getItem('usuario') || 'Admin';

  const carregarDados = async () => {
    try {
      const response = await api.get('/api/unidades/');
      setUnidades(response.data);
      
      const pref = response.data.find(u => u.tipo === 'PREFEITURA');
      if (pref && !paiSelecionado) setPaiSelecionado(pref.id);
    } catch (error) { toast.error('Erro ao carregar unidades.'); }
  };

  useEffect(() => { carregarDados(); }, []);

  const criarUnidade = async (e) => {
    e.preventDefault();
    if (!novaUnidade) return toast.warn('Preencha o nome da unidade.');
    if (!paiSelecionado) return toast.warn('Selecione a qual unidade ela pertence.');

    try {
      await api.post('/api/unidades/', {
        nome: novaUnidade,
        tipo: tipoNovaUnidade,
        pai_id: parseInt(paiSelecionado),
        usuario_acao: usuarioAtual
      });
      toast.success(`${tipoNovaUnidade} cadastrada com sucesso!`);
      setNovaUnidade('');
      carregarDados();
    } catch (error) {
      toast.error('Erro ao criar unidade.');
    }
  };

  const confirmarExclusao = async () => {
    if (!motivo) return toast.warn('Justificativa obrigatória.');
    try {
      await api.delete(`/api/unidades/${modalDel.item.id}`, { data: { usuario: usuarioAtual, motivo } });
      toast.success('Unidade removida definitivamente.');
      setModalDel({ aberto: false, item: null });
      setMotivo('');
      carregarDados();
    } catch (error) { toast.error('Erro ao excluir unidade.'); }
  };

  const toggleExpandir = (id) => {
    setExpandidos(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const getIcone = (tipo) => {
    switch(tipo) {
      case 'PREFEITURA': return '🏛️';
      case 'SECRETARIA': return '🏢';
      case 'DEPARTAMENTO': return '📂';
      case 'SETOR': return '🚪';
      case 'SALA': return '🪑';
      default: return '📍';
    }
  };

  // Mágica para indentar as opções no Dropdown (Pertence a)
  const opcoesHierarquicas = useMemo(() => {
    const resultado = [];
    const construirLista = (paiId, nivel) => {
      const filhas = unidades.filter(u => u.pai_id === paiId);
      filhas.forEach(f => {
        resultado.push({ ...f, nivel });
        construirLista(f.id, nivel + 1);
      });
    };
    construirLista(null, 0);
    return resultado;
  }, [unidades]);

  // Função recursiva para desenhar a árvore visual
  const renderizarArvore = (paiId = null) => {
    const filhas = unidades.filter(u => u.pai_id === paiId);
    if (filhas.length === 0) return null;

    return (
      <div className="space-y-3 mt-2">
        {filhas.map(unidade => {
          const temFilhas = unidades.some(u => u.pai_id === unidade.id);
          const estaExpandido = expandidos[unidade.id] !== false; // Default: Aberto

          return (
            <div key={unidade.id} className="relative animate-fade-in">
              {/* O Card do Item */}
              <div 
                className="flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all hover:shadow-md group" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Botão de Expandir/Recolher */}
                  {temFilhas ? (
                    <button onClick={() => toggleExpandir(unidade.id)} className="w-6 h-6 flex items-center justify-center rounded bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors text-[10px]">
                      {estaExpandido ? '▼' : '▶'}
                    </button>
                  ) : (
                    <div className="w-6 h-6" /> // Espaçador
                  )}
                  
                  <span className="text-xl shadow-sm bg-white dark:bg-black/40 p-1.5 rounded-lg border" style={{ borderColor: 'var(--border-light)' }}>
                    {getIcone(unidade.tipo)}
                  </span>
                  
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{unidade.nome}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>{unidade.tipo}</p>
                  </div>
                </div>
                
                {unidade.tipo !== 'PREFEITURA' && (
                  <button 
                    onClick={() => setModalDel({ aberto: true, item: unidade })} 
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remover Unidade"
                  >
                    🗑️
                  </button>
                )}
              </div>
              
              {/* Linha conectora e filhas */}
              {temFilhas && estaExpandido && (
                <div className="pl-6 ml-[22px] border-l-2 border-dashed mt-3 mb-2" style={{ borderColor: 'var(--border-light)' }}>
                  {renderizarArvore(unidade.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* COLUNA ESQUERDA: Formulário de Criação Ramificada */}
      <div className="lg:col-span-1 space-y-6">
        <div className="p-6 rounded-3xl border shadow-sm sticky top-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center text-xl shadow-inner border border-blue-100 dark:border-blue-800">
              ➕
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Nova Unidade</h3>
              <p className="text-[10px] font-bold uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Adicionar Ramificação</p>
            </div>
          </div>
          
          <form onSubmit={criarUnidade} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Nome da Unidade / Setor</label>
              <input value={novaUnidade} onChange={e => setNovaUnidade(e.target.value)} type="text" placeholder="Ex: Setor de Triagem" className="w-full p-3 rounded-xl border font-bold text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Tipo Estrutural</label>
                <select value={tipoNovaUnidade} onChange={e => setTipoNovaUnidade(e.target.value)} className="w-full p-3 rounded-xl border font-bold text-xs outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                  <option value="SECRETARIA">🏢 Secretaria</option>
                  <option value="DEPARTAMENTO">📂 Departamento</option>
                  <option value="SETOR">🚪 Setor</option>
                  <option value="SALA">🪑 Sala</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Fica dentro de:</label>
                <select value={paiSelecionado} onChange={e => setPaiSelecionado(e.target.value)} className="w-full p-3 rounded-xl border font-bold text-xs outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer truncate" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                  <option value="">Selecione...</option>
                  {opcoesHierarquicas.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nivel > 0 ? `${'│ '.repeat(u.nivel - 1)}└─ ` : ''} {u.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-3.5 mt-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 active:scale-95">
              Cadastrar na Estrutura
            </button>
          </form>
        </div>
      </div>

      {/* COLUNA DIREITA: Árvore Hierárquica */}
      <div className="lg:col-span-2">
        <div className="rounded-3xl border shadow-sm overflow-hidden h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-page)' }}>
            <div>
              <h3 className="font-black text-base tracking-tight" style={{ color: 'var(--text-main)' }}>Mapa da Infraestrutura</h3>
              <p className="text-[10px] font-bold uppercase opacity-50" style={{ color: 'var(--text-main)' }}>Organização Hierárquica do Órgão</p>
            </div>
            <div className="text-2xl opacity-80">🗺️</div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
            {unidades.length === 0 ? (
              <div className="py-12 text-center opacity-40 font-bold" style={{ color: 'var(--text-main)' }}>
                <span className="text-4xl block mb-2">🏗️</span>
                Nenhuma infraestrutura mapeada.
              </div>
            ) : (
              renderizarArvore(null)
            )}
          </div>
        </div>
      </div>

      {/* Modal de Exclusão Blindado */}
      {modalDel.aberto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="p-6 border-b text-center space-y-2 bg-red-50 dark:bg-red-900/10" style={{ borderColor: 'var(--border-light)' }}>
              <div className="w-16 h-16 bg-white dark:bg-black/20 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm border border-red-100 dark:border-red-900/30">⚠️</div>
              <h2 className="text-xl font-black text-red-600 tracking-tight">Atenção Crítica!</h2>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm font-bold text-center leading-relaxed" style={{ color: 'var(--text-main)' }}>
                Deseja realmente remover a unidade <br/> <strong className="text-red-500 text-lg">"{modalDel.item.nome}"</strong>?<br/>
                <span className="text-xs opacity-60">Todas as sub-unidades (setores, salas) dentro dela também serão apagadas.</span>
              </p>
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1.5" style={{ color: 'var(--text-main)' }}>Justificativa Obrigatória</label>
                <input value={motivo} onChange={e => setMotivo(e.target.value)} type="text" placeholder="Motivo da remoção estrutural..." className="w-full p-3 rounded-xl border font-bold outline-none shadow-sm focus:ring-2 focus:ring-red-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalDel({aberto: false, item: null})} className="flex-1 py-3 font-black uppercase text-xs opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-main)' }}>Cancelar</button>
                <button onClick={confirmarExclusao} className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-wider text-xs hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all">Destruir Unidade</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}