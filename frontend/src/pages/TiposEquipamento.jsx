import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function TiposEquipamento() {
    const [categorias, setCategorias] = useState([]);
    const [dicionario, setDicionario] = useState([]);
    const [busca, setBusca] = useState('');
    const [modal, setModal] = useState({ aberto: false, modo: 'criar', dados: null });
    
    // Formulário
    const [nomeTipo, setNomeTipo] = useState('');
    const [camposSelecionados, setCamposSelecionados] = useState([]);
    
    // Buscador / Select Multiplo
    const [buscaProp, setBuscaProp] = useState('');
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        carregarTudo();
        const handleClickFora = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMostrarDropdown(false); };
        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, []);

    const carregarTudo = async () => {
        try {
            const [resCat, resDic] = await Promise.all([api.get('/api/inventario/categorias'), api.get('/api/inventario/propriedades')]);
            setCategorias(resCat.data); setDicionario(resDic.data);
        } catch(e) {}
    };

    const parseCampos = (cfg) => {
        if (!cfg) return [];
        try {
            let p = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
            return Array.isArray(p) ? p.map(i => typeof i === 'string' ? i : i.nome).filter(Boolean) : [];
        } catch(e) { return []; }
    };

    const abrirModal = (modo, cat = null) => {
        setModal({ aberto: true, modo, dados: cat });
        setNomeTipo(cat ? cat.nome : '');
        setCamposSelecionados(cat ? parseCampos(cat.campos_config) : []);
        setBuscaProp('');
    };

    const toggleCampo = (nomeCampo) => {
        if (camposSelecionados.includes(nomeCampo)) {
            setCamposSelecionados(camposSelecionados.filter(c => c !== nomeCampo));
        } else {
            setCamposSelecionados([...camposSelecionados, nomeCampo]);
        }
    };

    const salvar = async () => {
        if (!nomeTipo.trim()) return toast.warning("O nome do tipo é obrigatório.");
        const payload = { nome: nomeTipo, campos_config: camposSelecionados.map(c => ({ nome: c })) };
        try {
            if (modal.modo === 'editar') await api.put(`/api/inventario/categorias/${modal.dados.id}`, payload);
            else await api.post('/api/inventario/categorias', payload);
            toast.success("Salvo com sucesso!");
            setModal({aberto: false}); carregarTudo();
        } catch(e) { toast.error("Erro ao salvar."); }
    };

    const deletar = async (id) => {
        if(!window.confirm("Atenção: Máquinas vinculadas a este tipo perderão a referência visual. Excluir?")) return;
        try { await api.delete(`/api/inventario/categorias/${id}`); carregarTudo(); } catch(e) {}
    };

    const propsFiltradas = dicionario.filter(p => p.nome.toLowerCase().includes(buscaProp.toLowerCase()));

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            
            {/* Header e Busca Padrão do Sistema */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                <div className="relative w-full md:w-1/2">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50">🔍</span>
                    <input 
                        value={busca} 
                        onChange={e => setBusca(e.target.value)} 
                        placeholder="Buscar Categoria de Equipamento..." 
                        className="w-full pl-12 p-4 rounded-xl border outline-none font-bold text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all" 
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                    />
                </div>
                <button onClick={() => abrirModal('criar')} className="w-full md:w-auto px-8 py-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap shadow-md shadow-blue-500/30">➕ Criar Novo Tipo</button>
            </div>

            {/* Grid de Cards Claros e Padronizados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categorias.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase())).map(cat => {
                    const campos = parseCampos(cat.campos_config).filter(c => c.toLowerCase() !== 'par_vinculo');
                    return (
                        <div key={cat.id} className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-lg" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                            <div>
                                <h4 className="font-black text-xl mb-4 tracking-tight" style={{ color: 'var(--text-main)' }}>{cat.nome}</h4>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {campos.length === 0 ? (
                                        <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-60" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>Somente Marca e Modelo</span> 
                                    ) : (
                                        campos.map((c, i) => (
                                            <span key={i} className="text-[9px] font-black uppercase border px-3 py-1.5 rounded-lg tracking-widest text-blue-600 bg-blue-50/50 border-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50">
                                                {c}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 border-t pt-5 mt-auto" style={{ borderColor: 'var(--border-light)' }}>
                                <button onClick={() => abrirModal('editar', cat)} className="flex-1 py-3 rounded-xl text-xs font-black transition-colors uppercase tracking-widest hover:opacity-80" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>✏️ Editar</button>
                                <button onClick={() => deletar(cat.id)} className="py-3 px-6 rounded-xl text-xs font-black transition-colors bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/40">🗑️ Excluir</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Clean com Variáveis CSS */}
            {modal.aberto && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setModal({aberto: false})}>
                    <div className="w-full max-w-2xl rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
                        
                        <div className="p-6 border-b flex items-center gap-4 shrink-0" style={{ borderColor: 'var(--border-light)' }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}>🖥️</div>
                            <div>
                                <h3 className="font-black text-xl tracking-tight" style={{ color: 'var(--text-main)' }}>{modal.modo === 'criar' ? 'Novo Tipo de Equipamento' : 'Editar Tipo de Equipamento'}</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Montagem de Estrutura</p>
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <label className="block text-[10px] font-black uppercase opacity-60 mb-2 ml-1" style={{ color: 'var(--text-main)' }}>Nome Oficial do Equipamento *</label>
                                <input value={nomeTipo} onChange={e => setNomeTipo(e.target.value)} placeholder="Ex: Roteador, Switch, Nobreak..." className="w-full p-4 rounded-xl border outline-none font-black text-lg focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
                            </div>

                            <div className="relative p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                                <label className="block text-[11px] font-black uppercase text-amber-600 mb-4 tracking-[0.2em] flex items-center gap-2">📚 Atribuir Propriedades (Dicionário)</label>
                                
                                <div className="relative" ref={dropdownRef}>
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50">🔍</span>
                                    <input 
                                        value={buscaProp} 
                                        onChange={e => {setBuscaProp(e.target.value); setMostrarDropdown(true);}} 
                                        onFocus={() => setMostrarDropdown(true)} 
                                        placeholder="Buscar e adicionar propriedades..." 
                                        className="w-full pl-12 p-4 rounded-xl border outline-none font-bold text-sm focus:ring-2 focus:ring-amber-500/20 shadow-sm" 
                                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                    
                                    {mostrarDropdown && (
                                        <div className="absolute z-50 w-full mt-2 border shadow-2xl rounded-xl max-h-60 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                                            {propsFiltradas.length === 0 ? <p className="p-4 text-xs text-center font-bold text-red-500 bg-red-50/50">Propriedade não encontrada. Crie ela no Dicionário primeiro.</p> : 
                                                propsFiltradas.map(p => {
                                                    const selecionado = camposSelecionados.includes(p.nome);
                                                    return (
                                                        <div key={p.id} onClick={() => toggleCampo(p.nome)} className={`p-4 border-b cursor-pointer transition-colors flex items-center justify-between hover:opacity-80`} style={{ borderColor: 'var(--border-light)', backgroundColor: selecionado ? 'var(--bg-input)' : 'transparent' }}>
                                                            <span className="text-sm font-bold" style={{ color: selecionado ? 'var(--color-blue)' : 'var(--text-main)' }}>{p.nome}</span>
                                                            {selecionado && <span className="text-blue-600 font-black text-lg">✓</span>}
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-light)' }}>
                                    <p className="text-[9px] font-black uppercase mb-4 opacity-60 tracking-widest" style={{ color: 'var(--text-main)' }}>Propriedades já atreladas a este equipamento:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {camposSelecionados.length === 0 ? <p className="text-xs italic font-bold opacity-40 p-4 border-2 border-dashed rounded-xl w-full text-center" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>Nenhuma propriedade atrelada. Este equipamento só terá Marca e Modelo.</p> : 
                                            camposSelecionados.map(c => (
                                                <div key={c} className="flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                                                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>{c}</span>
                                                    <button onClick={() => toggleCampo(c)} className="w-6 h-6 rounded-lg flex items-center justify-center opacity-50 hover:opacity-100 transition-colors" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--color-red)' }}>✖</button>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t flex justify-end gap-4 shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-light)' }}>
                            <button onClick={() => setModal({aberto:false})} className="px-8 py-3.5 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all" style={{ color: 'var(--text-main)' }}>Cancelar</button>
                            <button onClick={salvar} className="px-10 py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all active:scale-95">💾 Salvar Estrutura</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}