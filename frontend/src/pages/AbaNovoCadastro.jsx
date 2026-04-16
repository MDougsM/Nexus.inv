import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';

export default function AbaNovoCadastro({ 
  categorias, secretarias, usuarioAtual, carregarDados, setAbaAtiva, 
  ativoClonado, setAtivoClonado, ativos 
}) {
  const [formNovo, setFormNovo] = useState({
    patrimonio: '',
    categoria_id: '',
    marca: '',
    modelo: '',
    nome_personalizado: '', 
    dominio_proprio: false, 
    dados_dinamicos: {}
  });
  
  const [secIdNovo, setSecIdNovo] = useState('');
  const [setorNovo, setSetorNovo] = useState('');
  const [setoresNovo, setSetoresNovo] = useState([]);

  // 🚀 ESTADOS DO CMDB / BUSCADOR INTELIGENTE
  const [vinculoCMDB, setVinculoCMDB] = useState({ patrimonio_alvo: '', tipo_vinculo: 'PAI' }); 
  const [buscaVinculo, setBuscaVinculo] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
        nome_personalizado: ativoClonado.nome_personalizado || '', 
        dominio_proprio: ativoClonado.dominio_proprio || false,
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
    setFormNovo({ patrimonio: '', categoria_id: '', marca: '', modelo: '', nome_personalizado: '', dominio_proprio: false, dados_dinamicos: {} });
    setSecIdNovo(''); 
    setSetorNovo(''); 
    setSetoresNovo([]);
    setVinculoCMDB({ patrimonio_alvo: '', tipo_vinculo: 'PAI' }); 
    setBuscaVinculo('');
    if (setAtivoClonado) setAtivoClonado(null); 
  };

  const handleMudarCategoriaNovo = (e) => {
    const cid = e.target.value;
    setFormNovo({ ...formNovo, categoria_id: cid, dados_dinamicos: {} });
  };

  const secretariasOrdenadas = useMemo(() => {
    const apenasPais = secretarias.filter(s => {
      if (s.secretaria_id || s.parent_id || s.unidade_pai_id || s.unidade_id) return false;
      if (s.tipo && (s.tipo.toUpperCase() === 'SETOR' || s.tipo.toUpperCase() === 'SALA')) return false;
      return true; 
    });
    return apenasPais.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }, [secretarias]);

  const handleMudarSecretariaNovo = async (e) => {
    const id = e.target.value; 
    setSecIdNovo(id); 
    setSetorNovo('');
    
    if (!id) { 
      setSetoresNovo([]); 
      return; 
    }

    const sec = secretarias.find(s => String(s.id) === String(id));
    if (sec && sec.setores && Array.isArray(sec.setores) && sec.setores.length > 0) {
      setSetoresNovo(sec.setores);
      return;
    }

    const filhosSoltos = secretarias.filter(s => 
      String(s.secretaria_id) === String(id) || 
      String(s.parent_id) === String(id) || 
      String(s.unidade_pai_id) === String(id)
    );

    if (filhosSoltos.length > 0) {
      setSetoresNovo(filhosSoltos);
      return;
    }

    try { 
      const res = await api.get(`/api/unidades/secretarias/${id}/setores`); 
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSetoresNovo(res.data); 
      } else {
        setSetoresNovo([]);
      }
    } catch(err) { 
      setSetoresNovo([]); 
    }
  };

  // 🔎 FECHAR DROPDOWN AO CLICAR FORA
  useEffect(() => {
    const handleClickFora = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setMostrarDropdown(false);
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  // 🔎 FILTRO INTELIGENTE DE MÁQUINAS
  const ativosParaVinculo = useMemo(() => {
      if (!buscaVinculo) return [];
      const termo = buscaVinculo.toLowerCase();
      return (ativos || []).filter(a => {
          let ip = "";
          try { ip = a.dados_dinamicos?.IP || a.dados_dinamicos?.ip || ""; } catch(e){}
          const strBusca = `${a.patrimonio} ${a.nome_personalizado || ''} ${a.modelo || ''} ${a.marca || ''} ${ip}`.toLowerCase();
          return strBusca.includes(termo);
      }).slice(0, 8); 
  }, [buscaVinculo, ativos]);

  const selecionarVinculo = (ativoSelecionado) => {
      setVinculoCMDB({ ...vinculoCMDB, patrimonio_alvo: ativoSelecionado.patrimonio });
      setBuscaVinculo(`${ativoSelecionado.patrimonio} • ${ativoSelecionado.nome_personalizado || ativoSelecionado.modelo || 'Sem Modelo'}`);
      setMostrarDropdown(false);
  };

  const salvarNovoCadastro = async (e) => {
    e.preventDefault();
    if (!formNovo.categoria_id) return toast.warn("Selecione o tipo de equipamento.");
    if (!secIdNovo || !setorNovo) return toast.warn("Selecione o local.");

    let patrimonioFinal = formNovo.patrimonio.trim();

    const payload = {
      ...formNovo,
      patrimonio: patrimonioFinal,
      secretaria: secretarias.find(s => s.id == secIdNovo)?.nome,
      setor: setorNovo,
      status: 'ATIVO',
      usuario_acao: usuarioAtual
    };

    try {
      const res = await api.post('/api/inventario/', payload);
      const nomeGerado = res.data.patrimonio_gerado || patrimonioFinal;
      
      // 🚀 CRIA O VÍNCULO SE O USUÁRIO PREENCHEU A TOPOLOGIA
      if (vinculoCMDB.patrimonio_alvo.trim()) {
         try {
            const payloadVinculo = {
                patrimonio_alvo: vinculoCMDB.patrimonio_alvo,
                tipo_vinculo: vinculoCMDB.tipo_vinculo,
                tipo_relacao: "VINCULADO"
            };
            await api.post(`/api/inventario/vinculos/${encodeURIComponent(nomeGerado)}`, payloadVinculo);
            toast.success(`✅ Ativo cadastrado e vinculado a ${vinculoCMDB.patrimonio_alvo}!`);
         } catch (vErr) {
            toast.error(`Ativo cadastrado, mas o vínculo falhou: ${vErr.response?.data?.detail || 'Máquina alvo não encontrada'}`);
         }
      } else {
         toast.success(`✅ Ativo cadastrado! Etiqueta: ${nomeGerado}`);
      }
      
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

  const categoriaSelecionada = categorias.find(c => String(c.id) === String(formNovo.categoria_id));
  let camposFormulario = [];
  
  if (categoriaSelecionada && categoriaSelecionada.campos_config) {
    let cfg = categoriaSelecionada.campos_config;
    try {
      if (typeof cfg === 'string') cfg = JSON.parse(cfg);
      if (Array.isArray(cfg)) camposFormulario = cfg.map(item => typeof item === 'string' ? item : item.nome).filter(Boolean);
    } catch (e) { console.error("Erro ao processar campos dinâmicos:", e); }
  }

  const setoresOrdenados = [...setoresNovo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10 mt-4">
      <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border ${ativoClonado ? 'bg-blue-600 border-blue-500/50' : 'bg-green-600 border-green-500/50'}`} style={{ color: '#fff' }}>
          {ativoClonado ? '📋' : '✨'}
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
            {ativoClonado ? 'Clonagem de Ativo' : 'Cadastro de Novo Ativo'}
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: ativoClonado ? 'var(--color-blue)' : 'var(--color-green)' }}>
            {ativoClonado ? `Baseado no Patrimônio ${ativoClonado.patrimonio}` : 'Adicione um novo equipamento ao inventário'}
          </p>
        </div>
      </div>

      <form onSubmit={salvarNovoCadastro} className="space-y-6">
        
        {/* ================= BLOCO 1: IDENTIDADE ================= */}
        <div className="p-8 rounded-3xl border shadow-xl transition-all relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          {ativoClonado && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse"></div>}
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">🏷️</span>
                <div>
                <h4 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>Identidade Principal</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-main)' }}>Dados básicos do equipamento</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">🔖 Equipamento Próprio?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formNovo.dominio_proprio} onChange={e => setFormNovo({...formNovo, dominio_proprio: e.target.checked})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Patrimônio (Opcional)</label>
              <input 
                autoFocus={!!ativoClonado} 
                value={formNovo.patrimonio} 
                onChange={e => setFormNovo({...formNovo, patrimonio: e.target.value})} 
                placeholder="Deixe em branco para auto-gerar" 
                className="w-full p-4 rounded-xl border font-black text-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Tipo de Equipamento *</label>
              <select 
                required 
                value={formNovo.categoria_id} 
                onChange={handleMudarCategoriaNovo} 
                className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm cursor-pointer" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
              >
                <option value="">Selecione a Categoria...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Nome Personalizado / Apelido</label>
              <input 
                value={formNovo.nome_personalizado} 
                onChange={e => setFormNovo({...formNovo, nome_personalizado: e.target.value})} 
                placeholder="Ex: PC Recepção, Servidor..." 
                className="w-full p-4 rounded-xl border font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors shadow-sm" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}
              />
            </div>
          </div>
        </div>

        {/* ================= BLOCO 2: ESPECIFICAÇÕES ================= */}
        {formNovo.categoria_id && (
          <div className="p-8 rounded-3xl border shadow-xl transition-all animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3 mb-8 pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <span className="text-2xl">⚙️</span>
              <div>
                <h4 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>Especificações Técnicas</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-main)' }}>Marca, modelo e dados extras</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Marca do Equipamento</label>
                <input 
                  value={formNovo.marca} 
                  onChange={e => setFormNovo({...formNovo, marca: e.target.value})} 
                  placeholder="Ex: Dell, HP, Mercusys..." 
                  className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" 
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Modelo</label>
                <input 
                  value={formNovo.modelo} 
                  onChange={e => setFormNovo({...formNovo, modelo: e.target.value})} 
                  placeholder="Ex: Optiplex 3020..." 
                  className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" 
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            {camposFormulario.length > 0 && (
              <div className="p-6 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-light)' }}>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Campos Exclusivos da Categoria</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {camposFormulario.map(c => {
                    if (c.toLowerCase().includes('apelido') || c.toLowerCase().includes('par_vinculo')) return null;
                    return (
                      <div key={c}>
                        <label className="block text-[9px] font-black uppercase opacity-80 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>{c}</label>
                        <input 
                          className="w-full p-3.5 rounded-xl border font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" 
                          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} 
                          placeholder={`Definir ${c}...`} 
                          value={formNovo.dados_dinamicos[c] || ''} 
                          onChange={e => setFormNovo({...formNovo, dados_dinamicos: {...formNovo.dados_dinamicos, [c]: e.target.value}})} 
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= BLOCO 3: LOCALIZAÇÃO ================= */}
        <div className="p-8 rounded-3xl border shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="flex items-center gap-3 mb-8 pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <span className="text-2xl">📍</span>
            <div>
              <h4 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>Localização Física</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-main)' }}>Onde o equipamento será instalado</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Secretaria / Prédio *</label>
              <select 
                required 
                value={secIdNovo} 
                onChange={handleMudarSecretariaNovo} 
                className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm cursor-pointer" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
              >
                <option value="">Selecione o Local...</option>
                {secretariasOrdenadas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Setor / Sala *</label>
              <select 
                required 
                value={setorNovo} 
                onChange={e => setSetorNovo(e.target.value)} 
                disabled={setoresNovo.length === 0} 
                className="w-full p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm disabled:opacity-50 cursor-pointer" 
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
              >
                <option value="">Selecione o Setor...</option>
                {setoresOrdenados.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 🚀 ================= BLOCO 4: VÍNCULO CMDB COM BUSCADOR INTELIGENTE ================= */}
        <div className="p-8 rounded-3xl border shadow-xl transition-all bg-indigo-50/30 dark:bg-indigo-900/10" style={{ borderColor: 'var(--border-light)' }}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-3">
               <span className="text-2xl">🔗</span>
               <div>
                  <h4 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>Topologia (Opcional)</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-main)' }}>Vincule a uma máquina existente</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="relative w-full" ref={dropdownRef}>
               <label className="block text-[10px] font-black uppercase opacity-60 mb-1 ml-1" style={{ color: 'var(--text-main)' }}>Pesquisar Equipamento Existente</label>
               <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50">🔍</span>
                  <input 
                     value={buscaVinculo} 
                     onChange={e => { setBuscaVinculo(e.target.value); setVinculoCMDB({...vinculoCMDB, patrimonio_alvo: ''}); setMostrarDropdown(true); }}
                     onFocus={() => setMostrarDropdown(true)}
                     placeholder="Digite patrimônio, IP ou nome..." 
                     className="w-full pl-10 p-4 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm bg-white" 
                     style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                  />
               </div>
               
               {/* DROPDOWN BUSCADOR */}
               {mostrarDropdown && buscaVinculo && ativosParaVinculo.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden" style={{borderColor: 'var(--border-light)'}}>
                     {ativosParaVinculo.map(a => (
                        <div key={a.patrimonio} onClick={() => selecionarVinculo(a)} className="p-3 hover:bg-indigo-50 cursor-pointer border-b transition-colors flex items-center justify-between" style={{borderColor: 'var(--border-light)'}}>
                           <div>
                              <span className="font-black text-indigo-600">{a.patrimonio}</span>
                              <span className="ml-2 text-xs font-bold text-gray-600">{a.nome_personalizado || a.modelo || 'S/N'}</span>
                           </div>
                           <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{a.dados_dinamicos?.IP || a.dados_dinamicos?.ip || 'Sem IP'}</span>
                        </div>
                     ))}
                  </div>
               )}
            </div>
            
            <div className="flex flex-col gap-2">
               <label className="block text-[10px] font-black uppercase opacity-60 ml-1" style={{ color: 'var(--text-main)' }}>A nova máquina é:</label>
               <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setVinculoCMDB({...vinculoCMDB, tipo_vinculo: 'PAI'})} 
                    className={`flex-1 p-4 rounded-xl border font-black text-xs transition-all ${vinculoCMDB.tipo_vinculo === 'PAI' ? 'bg-indigo-600 text-white shadow-lg border-indigo-500' : 'bg-white opacity-60 hover:opacity-100'}`} 
                    style={{ borderColor: vinculoCMDB.tipo_vinculo !== 'PAI' ? 'var(--border-light)' : '', color: vinculoCMDB.tipo_vinculo !== 'PAI' ? 'var(--text-main)' : '' }}
                  >
                     DEPENDENTE (Filho)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setVinculoCMDB({...vinculoCMDB, tipo_vinculo: 'FILHO'})} 
                    className={`flex-1 p-4 rounded-xl border font-black text-xs transition-all ${vinculoCMDB.tipo_vinculo === 'FILHO' ? 'bg-indigo-600 text-white shadow-lg border-indigo-500' : 'bg-white opacity-60 hover:opacity-100'}`} 
                    style={{ borderColor: vinculoCMDB.tipo_vinculo !== 'FILHO' ? 'var(--border-light)' : '', color: vinculoCMDB.tipo_vinculo !== 'FILHO' ? 'var(--text-main)' : '' }}
                  >
                     SUPERIOR (Pai)
                  </button>
               </div>
               
               {vinculoCMDB.patrimonio_alvo && (
                  <p className="text-[10px] text-indigo-600 font-bold ml-1 mt-1">
                     {vinculoCMDB.tipo_vinculo === 'PAI' 
                       ? `A nova máquina será alocada DENTRO do ${vinculoCMDB.patrimonio_alvo}.` 
                       : `A máquina ${vinculoCMDB.patrimonio_alvo} ficará DENTRO da nova máquina.`}
                  </p>
               )}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
          <button 
            type="button" 
            onClick={() => { limparFormNovo(); setAbaAtiva('lista'); }} 
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all hover:bg-gray-500/10" 
            style={{ color: 'var(--text-main)' }}
          >
            Cancelar Operação
          </button>
          <button 
            type="submit" 
            className={`w-full sm:w-auto px-10 py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-95 ${ativoClonado ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'}`}
          >
            {ativoClonado ? '💾 Salvar Clone' : '✨ Cadastrar Equipamento'}
          </button>
        </div>
      </form>
    </div>
  );
}