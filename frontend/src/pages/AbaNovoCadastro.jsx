import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api'; // <-- CAMINHO CORRIGIDO!
import { parseCamposDinamicos } from '../utils/helpers'; // <-- CAMINHO CORRIGIDO!

export default function AbaNovoCadastro({ 
  categorias, secretarias, usuarioAtual, carregarDados, setAbaAtiva, 
  ativoClonado, setAtivoClonado 
}) {
  const [formNovo, setFormNovo] = useState({
    patrimonio: '',
    categoria_id: '',
    marca: '',
    modelo: '',
    dados_dinamicos: {}
  });
  
  const [secIdNovo, setSecIdNovo] = useState('');
  const [setorNovo, setSetorNovo] = useState('');
  const [setoresNovo, setSetoresNovo] = useState([]);

  useEffect(() => {
    if (ativoClonado) {
      toast.info(`📋 Clonando dados do ativo ${ativoClonado.patrimonio}...`);
      
      let dinDinamicos = {};
      if (typeof ativoClonado.dados_dinamicos === 'string') {
        try { dinDinamicos = JSON.parse(ativoClonado.dados_dinamicos); } catch(e){}
      } else {
        dinDinamicos = ativoClonado.dados_dinamicos || {};
      }

      setFormNovo({
        patrimonio: '', 
        categoria_id: ativoClonado.categoria_id,
        marca: ativoClonado.marca || '',
        modelo: ativoClonado.modelo || '',
        dados_dinamicos: dinDinamicos
      });

      const sec = secretarias.find(s => s.nome === ativoClonado.secretaria);
      if (sec) {
        setSecIdNovo(sec.id);
        api.get(`/api/unidades/secretarias/${sec.id}/setores`).then(res => {
          setSetoresNovo(res.data);
          setSetorNovo(ativoClonado.setor || '');
        });
      }
    }
  }, [ativoClonado, secretarias]);


  const limparFormNovo = () => {
    setFormNovo({ patrimonio: '', categoria_id: '', marca: '', modelo: '', dados_dinamicos: {} });
    setSecIdNovo(''); setSetorNovo(''); setSetoresNovo([]);
    if (setAtivoClonado) setAtivoClonado(null); 
  };

  const handleMudarCategoriaNovo = (e) => {
    const cid = e.target.value;
    setFormNovo({ ...formNovo, categoria_id: cid, dados_dinamicos: {} });
  };

  const handleMudarSecretariaNovo = async (e) => {
    const id = e.target.value; setSecIdNovo(id); setSetorNovo('');
    if (!id) { setSetoresNovo([]); return; }
    try { const res = await api.get(`/api/unidades/secretarias/${id}/setores`); setSetoresNovo(res.data); } catch(e){}
  };

  const salvarNovoCadastro = async (e) => {
    e.preventDefault();
    if (!formNovo.categoria_id) return toast.warn("Selecione o tipo de equipamento.");
    if (!secIdNovo || !setorNovo) return toast.warn("Selecione o local.");

    const payload = {
      ...formNovo,
      secretaria: secretarias.find(s => s.id == secIdNovo)?.nome,
      setor: setorNovo,
      status: 'ATIVO',
      usuario_acao: usuarioAtual
    };

    try {
      await api.post('/api/inventario/', payload);
      
      toast.success("✅ Ativo cadastrado com sucesso!");
      limparFormNovo();
      carregarDados();
      setAbaAtiva('lista'); 
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail === "Patrimônio já cadastrado.") {
        toast.error("❌ Este Patrimônio já existe no sistema!");
      } else {
        toast.error("Erro ao salvar cadastro.");
      }
    }
  };

  const camposDinamicosNovo = formNovo.categoria_id ? parseCamposDinamicos(categorias.find(c => c.id == formNovo.categoria_id)) : [];

  return (
    <div className="max-full animate-fade-in pb-10">
      <div className="p-8 rounded-3xl border shadow-xl transition-all relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        
        {ativoClonado && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse"></div>
        )}

        <div className="flex items-center gap-4 border-b pb-6 mb-6" style={{ borderColor: 'var(--border-light)' }}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg ${ativoClonado ? 'bg-blue-600 shadow-blue-500/30' : 'bg-gray-900 shadow-gray-500/30'}`}>
            {ativoClonado ? '📋' : '➕'}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
              {ativoClonado ? 'Clonando Máquina' : 'Novo Ativo'}
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>
              {ativoClonado ? `Baseado no P. ${ativoClonado.patrimonio}` : 'Adicionar ao inventário'}
            </p>
          </div>
        </div>

        <form onSubmit={salvarNovoCadastro} className="space-y-8">
          
          <div className="p-6 rounded-3xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <h3 className="text-xs font-black uppercase tracking-[2px] mb-6 text-blue-500 flex items-center gap-2"><span>1.</span> Identidade Principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Patrimônio (Opcional)</label>
                <input 
                  autoFocus={!!ativoClonado} 
                  value={formNovo.patrimonio} 
                  onChange={e => setFormNovo({...formNovo, patrimonio: e.target.value})} 
                  placeholder="Deixe em branco para auto-gerar" 
                  className="w-full p-4 rounded-xl border outline-none font-black text-lg focus:ring-2 focus:ring-blue-500/20 transition-all" 
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Tipo de Equipamento *</label>
                <select required value={formNovo.categoria_id} onChange={handleMudarCategoriaNovo} className="w-full p-4 rounded-xl border font-black text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                  <option value="">Selecione a Categoria...</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          {formNovo.categoria_id && (
            <div className="p-6 rounded-3xl border animate-fade-in" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h3 className="text-xs font-black uppercase tracking-[2px] mb-6 text-blue-500 flex items-center gap-2"><span>2.</span> Especificações Técnicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Marca</label><input value={formNovo.marca} onChange={e => setFormNovo({...formNovo, marca: e.target.value})} className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/></div>
                <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Modelo</label><input value={formNovo.modelo} onChange={e => setFormNovo({...formNovo, modelo: e.target.value})} className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/></div>
              </div>

              {camposDinamicosNovo.length > 0 && (
                <>
                  <hr className="my-6 border-dashed" style={{ borderColor: 'var(--border-light)' }} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {camposDinamicosNovo.map(c => (
                      <div key={c} className="p-3 rounded-2xl border transition-all focus-within:border-blue-500 focus-within:shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                        <label className="block text-[9px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>{c}</label>
                        <input className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none" style={{ color: 'var(--text-main)' }} placeholder={`Ex: ${c}...`} value={formNovo.dados_dinamicos[c] || ''} onChange={e => setFormNovo({...formNovo, dados_dinamicos: {...formNovo.dados_dinamicos, [c]: e.target.value}})} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-6 rounded-3xl border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <h3 className="text-xs font-black uppercase tracking-[2px] mb-6 text-blue-500 flex items-center gap-2"><span>3.</span> Localização Física</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Secretaria / Prédio *</label><select required value={secIdNovo} onChange={handleMudarSecretariaNovo} className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}><option value="">Selecione...</option>{secretarias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>Setor / Sala *</label><select required value={setorNovo} onChange={e => setSetorNovo(e.target.value)} disabled={setoresNovo.length === 0} className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}><option value="">Selecione...</option>{setoresNovo.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}</select></div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-4">
            <button type="button" onClick={() => { limparFormNovo(); setAbaAtiva('lista'); }} className="px-6 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all" style={{ color: 'var(--text-main)' }}>Cancelar</button>
            <button type="submit" className={`px-10 py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 ${ativoClonado ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-gray-900 hover:bg-black shadow-gray-500/30'}`}>
              {ativoClonado ? 'Salvar Clone' : 'Salvar Equipamento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}