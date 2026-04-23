import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import { getNomeTipoEquipamento, getStatusExibido, getStatusPriority } from '../../utils/helpers';

const STATUS_OPTIONS = ['ATIVO', 'INATIVO', 'MANUTENÇÃO', 'SUCATA'];

const formInicial = {
  patrimonio: '',
  categoria_id: '',
  marca: '',
  modelo: '',
  nome_personalizado: '',
  secretaria: '',
  local: '',
  setor: '',
  dados_dinamicos: {},
};

// 🎨 Mapa de cores para os status
const getStatusTheme = (status) => {
  switch (status?.toUpperCase()) {
    case 'ATIVO': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'bg-emerald-500' };
    case 'INATIVO': return { bg: 'bg-rose-100', text: 'text-rose-700', border: 'bg-rose-500' };
    case 'MANUTENÇÃO': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'bg-amber-500' };
    case 'SUCATA': return { bg: 'bg-slate-200', text: 'text-slate-600', border: 'bg-slate-400' };
    default: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'bg-blue-500' };
  }
};

export default function MobileCrud() {
  const [ativos, setAtivos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [secretarias, setSecretarias] = useState([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  
  const [view, setView] = useState('lista'); 
  const [form, setForm] = useState(formInicial);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [ativoSelecionado, setAtivoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);

  const usuarioAtual = localStorage.getItem('usuario') || 'admin';

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resAtivos, resCat, resSec] = await Promise.all([
        api.get('/api/inventario/'),
        api.get('/api/inventario/categorias'),
        api.get('/api/unidades/')
      ]);
      setAtivos(resAtivos.data || []);
      setCategorias(resCat.data || []);
      setSecretarias(resSec.data || []);
    } catch (e) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const ativosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ativos
      .filter((a) => {
        if (statusFiltro && getStatusExibido(a) !== statusFiltro) return false;
        if (!termo) return true;
        const texto = [
          a.patrimonio,
          a.marca,
          a.modelo,
          a.nome_personalizado,
          a.secretaria,
          a.setor,
          getNomeTipoEquipamento(a, categorias)
        ].join(' ').toLowerCase();
        return texto.includes(termo);
      })
      .sort((a, b) => {
        const prioridadeA = getStatusPriority(getStatusExibido(a));
        const prioridadeB = getStatusPriority(getStatusExibido(b));
        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;
        const dataA = a.ultima_atualizacao ? new Date(a.ultima_atualizacao) : new Date(0);
        const dataB = b.ultima_atualizacao ? new Date(b.ultima_atualizacao) : new Date(0);
        return dataB - dataA;
      });
  }, [ativos, busca, statusFiltro, categorias]);

  const prepararEdicao = (ativo) => {
    setModoEdicao(true);
    setAtivoSelecionado(ativo);
    setForm({
      patrimonio: ativo.patrimonio || '',
      categoria_id: ativo.categoria_id || '',
      marca: ativo.marca || '',
      modelo: ativo.modelo || '',
      nome_personalizado: ativo.nome_personalizado || '',
      secretaria: ativo.secretaria || '',
      local: ativo.local || '',
      setor: ativo.setor || '',
      dados_dinamicos: ativo.dados_dinamicos || {},
    });
    setView('formulario');
  };

  const abrirNovo = () => {
    setModoEdicao(false);
    setAtivoSelecionado(null);
    setForm(formInicial);
    setView('formulario');
  };

  const voltarParaLista = () => {
    setView('lista');
    setModoEdicao(false);
    setAtivoSelecionado(null);
    setForm(formInicial);
  };

  const salvarAtivo = async () => {
    if (!form.categoria_id) return toast.warn('Selecione a categoria.');
    if (!form.marca || !form.modelo) return toast.warn('Marca e modelo são obrigatórios.');

    try {
      if (modoEdicao && ativoSelecionado) {
        await api.put(`/api/inventario/ficha/editar/${encodeURIComponent(ativoSelecionado.patrimonio)}`, {
          ...form,
          categoria_id: Number(form.categoria_id),
          usuario_acao: usuarioAtual,
          motivo: 'Edição via Mobile'
        });
        toast.success('Ativo atualizado!');
      } else {
        await api.post('/api/inventario/', {
          ...form,
          categoria_id: Number(form.categoria_id),
          usuario_acao: usuarioAtual
        });
        toast.success('Ativo cadastrado!');
      }
      voltarParaLista();
      carregarDados();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar ativo.');
    }
  };

  const excluirAtivo = async () => {
    if (!ativoSelecionado) return;
    if (!window.confirm(`ATENÇÃO: Deseja realmente enviar a máquina ${ativoSelecionado.patrimonio} para a lixeira?`)) return;

    try {
      await api.delete(`/api/inventario/${encodeURIComponent(ativoSelecionado.patrimonio)}`, {
        data: { usuario_acao: usuarioAtual, motivo: 'Exclusão via Mobile' }
      });
      toast.success('Ativo removido!');
      voltarParaLista();
      carregarDados();
    } catch (e) {
      toast.error('Erro ao excluir o ativo.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 pb-20 relative font-sans">
      
      {/* =========================================
          VIEW: LISTA DE ATIVOS
      ========================================== */}
      {view === 'lista' && (
        <div className="animate-fade-in mx-auto max-w-2xl">
          
          {/* Header Fixo e Moderno estilo App */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-900 to-blue-700 shadow-md rounded-b-[2rem] px-5 pt-6 pb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Nexus Mobile</h1>
                <p className="text-[11px] text-blue-200 font-bold tracking-widest uppercase mt-1">
                  {loading ? 'Sincronizando...' : `${ativosFiltrados.length} equipamentos`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 text-white font-black">
                {usuarioAtual.charAt(0).toUpperCase()}
              </div>
            </div>
            
            {/* Barra de Pesquisa */}
            <div className="relative mt-2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                placeholder="Buscar patrimônio, marca, setor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none shadow-lg shadow-blue-900/20 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 transition-all"
              />
            </div>

            {/* Filtros em linha */}
            <div className="flex gap-2 mt-5 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              <button onClick={() => setStatusFiltro('')} className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-black transition-all ${!statusFiltro ? 'bg-white text-blue-900 shadow-md' : 'bg-blue-800/50 text-blue-100 border border-blue-400/30'}`}>Todos</button>
              {STATUS_OPTIONS.map((status) => (
                <button key={status} onClick={() => setStatusFiltro(status)} className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-black transition-all ${statusFiltro === status ? 'bg-white text-blue-900 shadow-md' : 'bg-blue-800/50 text-blue-100 border border-blue-400/30'}`}>
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Cards Premium */}
          <div className="mt-6 space-y-4 px-4">
            {ativosFiltrados.length === 0 && !loading ? (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-300 p-10 flex flex-col items-center text-center">
                <span className="text-4xl mb-3">📭</span>
                <p className="text-sm font-bold text-slate-500">Nenhum equipamento localizado.</p>
              </div>
            ) : ativosFiltrados.map((ativo) => {
              const statusAjustado = getStatusExibido(ativo);
              const theme = getStatusTheme(statusAjustado);

              return (
                <div 
                  key={ativo.patrimonio} 
                  onClick={() => prepararEdicao(ativo)}
                  className="bg-white rounded-3xl shadow-sm border border-slate-100/50 p-4 relative overflow-hidden active:scale-[0.98] active:bg-slate-50 transition-all cursor-pointer"
                >
                  {/* Faixa lateral colorida indicando o Status */}
                  <div className={`absolute left-0 top-0 w-1.5 h-full ${theme.border}`}></div>
                  
                  <div className="pl-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ativo.patrimonio}
                      </div>
                      <div className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider ${theme.bg} ${theme.text}`}>
                        {statusAjustado}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-800 leading-tight mt-1">{getNomeTipoEquipamento(ativo, categorias)}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{ativo.marca} {ativo.modelo}</p>
                    
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50/80 rounded-xl px-3 py-2 w-fit border border-slate-100">
                      <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate max-w-[220px] font-semibold tracking-tight">{ativo.secretaria || 'S/ Unidade'} • {ativo.setor || 'S/ Setor'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🚀 FAB: Botão Flutuante */}
          <button 
            onClick={abrirNovo}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-[0_8px_30px_rgba(37,99,235,0.4)] flex items-center justify-center text-white active:scale-90 transition-transform z-50 border-2 border-blue-400/50"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}


      {/* =========================================
          VIEW: FORMULÁRIO NATIVO
      ========================================== */}
      {view === 'formulario' && (
        <div className="animate-slide-up bg-white min-h-screen pb-10">
          
          {/* Header do Form */}
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between">
            <button onClick={voltarParaLista} className="p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-base font-black text-slate-800">{modoEdicao ? 'Editar Máquina' : 'Nova Máquina'}</h2>
            <div className="w-8"></div> {/* Spacer para centralizar */}
          </div>

          <div className="p-5 space-y-5 max-w-2xl mx-auto mt-2">
            
            {/* Categoria */}
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-blue-600">Categoria *</label>
              <div className="relative">
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="w-full rounded-2xl border-0 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none transition-shadow">
                  <option value="">Selecione o tipo...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-slate-500">Marca *</label>
                <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full rounded-2xl border-0 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Ex: Dell" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-slate-500">Modelo *</label>
                <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="w-full rounded-2xl border-0 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="Ex: Optiplex" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-slate-500">Patrimônio</label>
                <input value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} disabled={modoEdicao} className={`w-full rounded-2xl border-0 px-5 py-4 text-sm font-bold outline-none ring-1 ring-slate-200 transition-shadow ${modoEdicao ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500'}`} placeholder="Automático" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-slate-500">Apelido (Opcional)</label>
                <input value={form.nome_personalizado} onChange={(e) => setForm({ ...form, nome_personalizado: e.target.value })} className="w-full rounded-2xl border-0 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-shadow" placeholder="PC-Recepção" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-slate-500">Unidade/Secretaria</label>
                <div className="relative">
                  <select value={form.secretaria} onChange={(e) => setForm({ ...form, secretaria: e.target.value })} className="w-full rounded-xl border-0 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm">
                    <option value="">Selecione um local...</option>
                    {secretarias.map((u) => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest font-black text-slate-500">Sala / Setor</label>
                <input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} className="w-full rounded-xl border-0 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Ex: RH" />
              </div>
            </div>

            {/* Botoes de Ação */}
            <div className="pt-6 pb-8 space-y-3">
              <button onClick={salvarAtivo} className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black tracking-widest uppercase text-white shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-transform">
                {modoEdicao ? 'Salvar Edição' : 'Cadastrar Equipamento'}
              </button>
              
              {modoEdicao && (
                <button onClick={excluirAtivo} className="w-full rounded-2xl bg-rose-50 px-4 py-4 text-sm font-black tracking-widest uppercase text-rose-600 active:bg-rose-100 transition-colors">
                  Excluir Máquina
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Estilos Globais para Mobile */}
      <style dangerouslySetContents={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fadeIn 0.3s ease; }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        /* Impede zoom no iOS ao focar em inputs */
        input, select { font-size: 16px !important; }
      `}} />
    </div>
  );
}