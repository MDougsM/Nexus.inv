import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function AbaNovoCadastro({ categorias, secretarias, usuarioAtual, carregarDados, setAbaAtiva }) {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [setoresCadastro, setSetoresCadastro] = useState([]);
  const [formData, setFormData] = useState({ patrimonio: '', marca: '', modelo: '', secretaria: '', setor: '', status: 'Ativo' });
  const [dadosDinamicos, setDadosDinamicos] = useState({});
  const [loadingCadastro, setLoadingCadastro] = useState(false);

  const handleCategoriaChange = (e) => {
    const cat = categorias.find(c => c.id === parseInt(e.target.value));
    setCategoriaSelecionada(cat); 
    setDadosDinamicos({});
  };

  const handleSecretariaCadastroChange = async (e) => {
    const id = e.target.value;
    if (!id) { setFormData({...formData, secretaria: '', setor: ''}); setSetoresCadastro([]); return; }
    setFormData({...formData, secretaria: secretarias.find(s => s.id == id).nome, setor: ''});
    try { 
      const res = await api.get(`/api/unidades/secretarias/${id}/setores`); 
      setSetoresCadastro(res.data); 
    } catch(err) { toast.error("Erro ao carregar setores."); }
  };

  const handleCadastrarSubmit = async (e) => {
    e.preventDefault();
    if (!categoriaSelecionada) return toast.warn("Selecione um tipo de equipamento.");
    setLoadingCadastro(true);
    try {
      await api.post('/api/inventario', { 
        ...formData, 
        categoria_id: categoriaSelecionada.id, 
        dados_dinamicos: dadosDinamicos, 
        usuario_acao: usuarioAtual 
      });
      toast.success('Ativo registrado com sucesso!');
      setFormData({ patrimonio: '', marca: '', modelo: '', secretaria: '', setor: '', status: 'Ativo' }); 
      setDadosDinamicos({}); 
      setCategoriaSelecionada(null);
      carregarDados(); 
      setAbaAtiva('lista');
    } catch (error) { 
      toast.error('Erro: Patrimônio duplicado ou falha.'); 
    } finally { 
      setLoadingCadastro(false); 
    }
  };

  return (
    <form onSubmit={handleCadastrarSubmit} className="p-8 rounded-xl shadow-sm border space-y-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
      <div className="pb-6 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-blue)' }}>1. O que você está cadastrando?</label>
        <select required className="w-full p-3 rounded-lg border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} value={categoriaSelecionada?.id || ''} onChange={handleCategoriaChange}>
          <option value="">-- Selecione o Tipo de Equipamento --</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {categoriaSelecionada && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-muted)' }}>2. Identificação e Destino</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>Patrimônio *</label><input required value={formData.patrimonio} onChange={e => setFormData({...formData, patrimonio: e.target.value})} className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} /></div>
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>Status Inicial *</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 rounded border outline-none font-bold" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}><option value="Ativo">Ativo / Em Uso</option><option value="Manutenção">Em Manutenção (Estoque)</option></select></div>
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>Secretaria *</label><select required onChange={handleSecretariaCadastroChange} className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}><option value="">Selecione...</option>{secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
              <div><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>Setor *</label><select required disabled={setoresCadastro.length===0} value={formData.setor} onChange={e => setFormData({...formData, setor: e.target.value})} className="w-full p-2.5 rounded border outline-none disabled:opacity-50" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}><option value="">{setoresCadastro.length===0?'Selecione a secretaria':'Selecione o Setor'}</option>{setoresCadastro.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}</select></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>Marca / Modelo</label><div className="flex gap-2"><input placeholder="Marca" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-1/2 p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} /><input placeholder="Modelo" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-1/2 p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} /></div></div>
            </div>
          </div>
          {categoriaSelecionada.campos_config.length > 0 && (
            <div className="pt-6 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-muted)' }}>3. Especificações Técnicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categoriaSelecionada.campos_config.map((c, i) => (
                  <div key={i}><label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>{c.nome}</label><input value={dadosDinamicos[c.nome] || ''} onChange={e => setDadosDinamicos({...dadosDinamicos, [c.nome]: e.target.value})} className="w-full p-2.5 rounded border outline-none" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} /></div>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={loadingCadastro} className="w-full py-3 mt-4 text-white font-bold rounded-lg hover:opacity-90 shadow-md transition-opacity" style={{ backgroundColor: 'var(--color-green)' }}>{loadingCadastro ? 'Salvando...' : 'Gravar Equipamento'}</button>
        </div>
      )}
    </form>
  );
}