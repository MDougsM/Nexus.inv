import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function DicionarioPropriedades() {
    const [propriedades, setPropriedades] = useState([]);
    const [novaProp, setNovaProp] = useState('');
    const [busca, setBusca] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => { carregarProps(); }, []);

    const carregarProps = async () => {
        try {
            const res = await api.get('/api/inventario/propriedades');
            setPropriedades(res.data);
        } catch(e) {}
    };

    const salvar = async (e) => {
        e.preventDefault();
        if(!novaProp.trim()) return;
        try {
            await api.post('/api/inventario/propriedades', { nome: novaProp });
            setNovaProp('');
            toast.success("Propriedade adicionada!");
            carregarProps();
        } catch(e) { toast.error(e.response?.data?.detail || "Erro"); }
    };

    const deletar = async (id) => {
        if(!window.confirm("Apagar esta propriedade do dicionário global?")) return;
        try {
            await api.delete(`/api/inventario/propriedades/${id}`);
            carregarProps();
        } catch(e) {}
    };

    const sincronizarLegado = async () => {
        setIsSyncing(true);
        try {
            const resCats = await api.get('/api/inventario/categorias');
            const todasCategorias = resCats.data;
            const camposExtraidos = new Set();
            
            todasCategorias.forEach(cat => {
                if (!cat.campos_config) return;
                try {
                    const parsed = typeof cat.campos_config === 'string' ? JSON.parse(cat.campos_config) : cat.campos_config;
                    if (Array.isArray(parsed)) {
                        parsed.forEach(campo => {
                            const nomeCampo = typeof campo === 'string' ? campo : campo.nome;
                            if (nomeCampo) camposExtraidos.add(nomeCampo.trim());
                        });
                    }
                } catch (err) { }
            });

            camposExtraidos.delete('par_vinculo');
            camposExtraidos.delete('Par_vinculo');
            
            const nomesExistentes = new Set(propriedades.map(p => p.nome.toLowerCase()));
            const promessasDeCriacao = [];
            camposExtraidos.forEach(campo => {
                if (!nomesExistentes.has(campo.toLowerCase())) {
                    promessasDeCriacao.push(api.post('/api/inventario/propriedades', { nome: campo }));
                }
            });

            if (promessasDeCriacao.length === 0) {
                toast.info("O dicionário já está atualizado com as categorias legadas.");
            } else {
                await Promise.all(promessasDeCriacao);
                toast.success(`${promessasDeCriacao.length} propriedades foram importadas com sucesso!`);
                carregarProps();
            }
        } catch (e) {
            toast.error("Erro ao sincronizar dados legados.");
        } finally {
            setIsSyncing(false);
        }
    };

    const filtradas = propriedades.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Info Banner Padrão Nexus */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-xl border bg-blue-50/50 dark:bg-blue-900/10" style={{ borderColor: 'var(--border-light)' }}>
                <div>
                    <h3 className="text-lg font-black mb-1 text-blue-800 dark:text-blue-400 flex items-center gap-2">
                        <span>📚</span> Dicionário de Propriedades (Campos Dinâmicos)
                    </h3>
                    <p className="text-sm font-medium text-blue-600/80 dark:text-blue-300/80">
                        Crie os campos técnicos (ex: "Endereço IP", "Memória RAM") que serão utilizados na composição das máquinas.
                    </p>
                </div>
                <button 
                    onClick={sincronizarLegado} 
                    disabled={isSyncing}
                    className="px-5 py-2.5 rounded-lg font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-100 transition-all shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                    {isSyncing ? '⏳ Sincronizando...' : '⚡ Importar de Categorias Legadas'}
                </button>
            </div>

            {/* Criação e Busca Minimalistas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={salvar} className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Criar Nova Propriedade</label>
                    <div className="flex items-center gap-2">
                        <input value={novaProp} onChange={e => setNovaProp(e.target.value)} placeholder="Ex: Capacidade SSD..." className="w-full p-3 rounded-lg border outline-none font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                        <button type="submit" className="px-6 py-3 rounded-lg font-black text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap">➕ Adicionar</button>
                    </div>
                </form>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Pesquisar Propriedade</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50">🔍</span>
                        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no dicionário..." className="w-full pl-10 p-3 rounded-lg border outline-none font-medium focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
                    </div>
                </div>
            </div>

            {/* Lista de Tags Clean */}
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-lg opacity-60">🏷️</span>
                    <h4 className="text-base font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Propriedades Cadastradas</h4>
                </div>
                
                {filtradas.length === 0 ? (
                    <div className="text-center py-10 font-bold opacity-50 border border-dashed rounded-xl" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                        Nenhuma propriedade encontrada. Use o botão "Importar" lá em cima!
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {filtradas.map(p => (
                            <div key={p.id} className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-md border transition-all bg-gray-100 dark:bg-black/20" style={{ borderColor: 'var(--border-light)' }}>
                                <span className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>{p.nome}</span>
                                <button onClick={() => deletar(p.id)} className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-colors" title="Apagar">✖</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}