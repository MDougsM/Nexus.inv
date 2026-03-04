import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function TiposEquipamento() {
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // Estados do formulário em linha (Padrão da Imagem)
  const [novoNome, setNovoNome] = useState('');
  const [novosCampos, setNovosCampos] = useState('');

  // Modal apenas para Edição
  const [modalEdit, setModalEdit] = useState({ aberto: false, id: null, nome: '', campos_texto: '' });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventario/categorias');
      setCategorias(res.data);
    } catch (error) { toast.error('Erro ao carregar tipos de equipamento.'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { carregarDados(); }, []);

  const formatarCamposParaSalvar = (texto) => {
    if (!texto.trim()) return [];
    return texto.split(',').map(c => ({ nome: c.trim(), tipo: 'text' })).filter(c => c.nome !== '');
  };

  // ==========================================
  // ADICIONAR NOVO TIPO (Em linha)
  // ==========================================
  const handleAdicionar = async () => {
    if (!novoNome) return toast.warn("Preencha o nome do tipo de equipamento.");
    try {
      const campos = formatarCamposParaSalvar(novosCampos);
      await api.post('/api/inventario/categorias', { nome: novoNome, campos_config: campos, usuario_acao: usuarioAtual });
      toast.success("Tipo adicionado com sucesso!");
      setNovoNome(''); setNovosCampos('');
      carregarDados();
    } catch (e) { toast.error("Erro ao adicionar tipo."); }
  };

  // ==========================================
  // EDITAR TIPO
  // ==========================================
  const abrirEdicao = (cat) => {
    let textoCampos = '';
    if (cat.campos_config) {
      const lista = typeof cat.campos_config === 'string' ? JSON.parse(cat.campos_config) : cat.campos_config;
      textoCampos = lista.map(c => c.nome).join(', ');
    }
    setModalEdit({ aberto: true, id: cat.id, nome: cat.nome, campos_texto: textoCampos });
  };

  const handleSalvarEdicao = async () => {
    if (!modalEdit.nome) return toast.warn("O nome não pode ficar vazio.");
    try {
      const campos = formatarCamposParaSalvar(modalEdit.campos_texto);
      await api.put(`/api/inventario/categorias/${modalEdit.id}`, { 
        nome: modalEdit.nome, 
        campos_config: campos,
        usuario_acao: usuarioAtual
      });
      toast.success("Atualizado com sucesso!");
      setModalEdit({ aberto: false, id: null, nome: '', campos_texto: '' }); 
      carregarDados();
    } catch (e) { toast.error("Erro ao atualizar."); }
  };

  // ==========================================
  // EXCLUIR TIPO
  // ==========================================
  const handleDeletar = async (id) => {
    if(!window.confirm("Deseja realmente excluir este tipo? Equipamentos associados a ele podem perder a referência.")) return;
    try {
      await api.delete(`/api/inventario/categorias/${id}?usuario_acao=${usuarioAtual}`);
      toast.success("Tipo excluído!");
      carregarDados();
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Não é possível excluir tipos que já estão em uso por equipamentos."); 
    }
  };

  // Filtro de Busca
  const categoriasFiltradas = categorias.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* CONTAINER PRINCIPAL IDÊNTICO AO PRINT */}
      <div className="p-6 rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        
        {/* BARRA DE PESQUISA SUPERIOR */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border mb-8" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-light)' }}>
          <span className="text-lg opacity-50">🔍</span>
          <input 
            type="text" 
            placeholder="Pesquisar em Tipos de Equipamentos..." 
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-main)' }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* LINHA DE ADIÇÃO (INLINE FORM) */}
        <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>NOME DO TIPO</label>
            <input 
              value={novoNome} onChange={e => setNovoNome(e.target.value)}
              className="w-full p-2.5 rounded border outline-none text-sm" 
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
            />
          </div>
          <div className="flex-[2] w-full">
            <label className="block text-[11px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>ESPECIFICAÇÕES TÉCNICAS EXIGIDAS (Separadas por vírgula)</label>
            <input 
              value={novosCampos} onChange={e => setNovosCampos(e.target.value)}
              placeholder="Ex: Processador, Memória RAM, Armazenamento..."
              className="w-full p-2.5 rounded border outline-none text-sm" 
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
            />
          </div>
          <button 
            onClick={handleAdicionar}
            className="px-6 py-2.5 text-sm font-bold text-white rounded transition-opacity hover:opacity-90 w-full md:w-auto shadow-sm"
            style={{ backgroundColor: 'var(--color-blue)', height: '42px' }}
          >
            ADICIONAR
          </button>
        </div>

        {/* TABELA LIMPA (PADRÃO) */}
        <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--border-light)' }}>
          <table className="w-full text-left text-sm mt-4">
            <thead style={{ color: 'var(--text-muted)' }}>
              <tr>
                <th className="pb-3 font-bold text-xs uppercase tracking-wider w-1/4">TIPO / CATEGORIA</th>
                <th className="pb-3 font-bold text-xs uppercase tracking-wider">CAMPOS DINÂMICOS</th>
                <th className="pb-3 font-bold text-xs uppercase tracking-wider text-right w-32">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="3" className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Carregando...</td></tr> : 
               categoriasFiltradas.length === 0 ? <tr><td colSpan="3" className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum tipo de equipamento encontrado.</td></tr> :
               categoriasFiltradas.map(cat => {
                 const campos = typeof cat.campos_config === 'string' ? JSON.parse(cat.campos_config) : cat.campos_config || [];
                 const nomesCampos = campos.map(c => c.nome).join(', ');
                 
                 return (
                   <tr key={cat.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-light)' }}>
                     <td className="py-4 font-bold" style={{ color: 'var(--text-main)' }}>{cat.nome}</td>
                     <td className="py-4" style={{ color: 'var(--text-muted)' }}>
                       {nomesCampos || <span className="italic opacity-50">Nenhuma especificação extra</span>}
                     </td>
                     <td className="py-4 text-right flex justify-end items-center gap-3">
                       <button onClick={() => abrirEdicao(cat)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Editar">✏️</button>
                       <button onClick={() => handleDeletar(cat.id)} className="text-xs font-bold transition-colors uppercase tracking-wider" style={{ color: 'var(--color-red)' }} title="Excluir">EXCLUIR</button>
                     </td>
                   </tr>
                 );
               })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO (MANTIDO PARA CORREÇÕES COMPLEXAS) */}
      {modalEdit.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setModalEdit({aberto: false, id: null, nome: '', campos_texto: ''})}>
          <div className="w-full max-w-md rounded-xl shadow-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-main)' }}>Editar Tipo de Equipamento</h3>
            
            <label className="block text-xs font-bold mb-1 uppercase" style={{ color: 'var(--text-muted)' }}>NOME DO TIPO</label>
            <input value={modalEdit.nome} onChange={e => setModalEdit({...modalEdit, nome: e.target.value})} className="w-full p-2.5 rounded border outline-none mb-4 text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />

            <label className="block text-xs font-bold mb-1 uppercase" style={{ color: 'var(--text-muted)' }}>ESPECIFICAÇÕES TÉCNICAS (Vírgula)</label>
            <textarea value={modalEdit.campos_texto} onChange={e => setModalEdit({...modalEdit, campos_texto: e.target.value})} className="w-full p-2.5 rounded border outline-none min-h-[80px] text-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
            
            <div className="flex gap-3 justify-end mt-4 border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => setModalEdit({aberto: false, id: null, nome: '', campos_texto: ''})} className="px-4 py-2 text-sm font-bold transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={handleSalvarEdicao} className="px-6 py-2 text-sm rounded font-bold text-white shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-blue)' }}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}