import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function ConsultaQR() {
  const { tenant, patrimonio } = useParams();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [modo, setModo] = useState('VISITANTE');
  
  // States do Editor
  const [usuarioEditor, setUsuarioEditor] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [editorLogin, setEditorLogin] = useState({ username: '', password: '' });
  const [editorError, setEditorError] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [formEdicao, setFormEdicao] = useState({ patrimonio: '', local: '', nome_personalizado: '', observacao: '' });

  useEffect(() => {
    const buscarDados = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'x-empresa': tenant };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const res = await axios.get(`${baseURL}/api/inventario/ficha/detalhes/${encodeURIComponent(patrimonio)}`, { headers });

        if (!res.data || !res.data.ativo) throw new Error('Ativo não encontrado');

        setDados(res.data);
        setModo(token ? 'EDITOR' : 'VISITANTE');
      } catch (error) {
        toast.error("Ativo não encontrado ou erro de acesso.");
        setDados(false);
      } finally {
        setLoading(false);
      }
    };
    buscarDados();
  }, [tenant, patrimonio]);

  useEffect(() => {
    if (!dados?.ativo) return;
    const ativo = dados.ativo;
    const detalhes = superParse(ativo.dados_dinamicos);
    setFormEdicao({
      patrimonio: ativo.patrimonio || '',
      local: ativo.local || '',
      nome_personalizado: ativo.nome_personalizado || '',
      observacao: detalhes.observacao || ''
    });
  }, [dados]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Decodificando Ativo...</p>
        </div>
      </div>
    );
  }

  if (dados === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border-t-4 border-red-500">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Ativo Inativo</h2>
          <p className="text-sm text-slate-500 font-bold mb-6">Este patrimônio não existe ou foi removido da base.</p>
          <button onClick={() => window.location.href = '/'} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Ir para a Home</button>
        </div>
      </div>
    );
  }

  // 🚀 PARSER TURBINADO: Arruma strings quebradas do Python
  const superParse = (dado) => {
    if (!dado) return {};
    if (typeof dado === 'object') return dado;
    try { return JSON.parse(dado); } catch(e) {}
    try { return JSON.parse(`[${dado}]`); } catch(e) {}
    try {
      let limpo = dado.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true');
      return JSON.parse(limpo);
    } catch (e) {}
    try {
      let limpo = dado.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true');
      return JSON.parse(`[${limpo}]`);
    } catch (e) { return dado; } // Retorna string original se tudo falhar
  };

  const ativo = dados.ativo;
  const dinamicos = superParse(ativo.dados_dinamicos);
  
  // Calcula Status Online
  let isOnline = false;
  if (ativo.ultima_comunicacao) {
    const diffDias = (new Date() - new Date(ativo.ultima_comunicacao + 'Z')) / (1000 * 60 * 60 * 24);
    isOnline = diffDias < 3;
  }

  // Lógica do Editor
  const isEditor = modo === 'EDITOR' || Boolean(usuarioEditor);

  const handleEditorLogin = async (e) => {
    e.preventDefault();
    setEditorError('');
    setEditorLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const res = await axios.post(`${baseURL}/api/usuarios/login`, { empresa: tenant, username: editorLogin.username.trim(), password: editorLogin.password });
      setUsuarioEditor({ username: res.data.username, is_admin: res.data.is_admin });
      setModo('EDITOR');
      setShowLoginForm(false);
      toast.success('Acesso técnico liberado.');
    } catch (error) { setEditorError(error?.response?.data?.detail || 'Credenciais inválidas.'); } finally { setEditorLoading(false); }
  };

  const handleEditorSave = async () => {
    setEditorLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const headers = { 'x-empresa': tenant };
      if (localStorage.getItem('token')) headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;

      const payload = {
        usuario_acao: usuarioEditor?.username || 'Técnico QR',
        patrimonio: formEdicao.patrimonio.trim(),
        local: formEdicao.local.trim(),
        nome_personalizado: formEdicao.nome_personalizado.trim(),
        dados_dinamicos: { ...dinamicos, observacao: formEdicao.observacao || '' }
      };

      await axios.put(`${baseURL}/api/inventario/ficha/editar/${encodeURIComponent(ativo.patrimonio)}`, payload, { headers });
      toast.success('Alterações salvas!');
      if (payload.patrimonio !== ativo.patrimonio) { window.location.href = `/consulta/${tenant}/${encodeURIComponent(payload.patrimonio)}`; return; }
      setDados(prev => ({ ...prev, ativo: { ...ativo, ...payload, dados_dinamicos: payload.dados_dinamicos } }));
    } catch (error) { toast.error('Erro ao salvar alterações.'); } finally { setEditorLoading(false); }
  };

  // 🎨 RENDERIZADORES CUSTOMIZADOS PARA HARDWARE
  const renderDiscos = (discos) => {
    if (!Array.isArray(discos)) return <span className="text-sm font-bold text-slate-700">{discos}</span>;
    return (
      <div className="space-y-3 w-full">
        {discos.map((d, i) => {
          const total = d.tamanho_gb || 1;
          const livre = d.livre_gb || 0;
          const usado = total - livre;
          const pct = Math.min(100, Math.max(0, (usado / total) * 100));
          const corBarra = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-blue-500';
          return (
            <div key={i} className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1">💾 Disco {d.drive}</span>
                <span className="text-[10px] font-bold text-slate-500">{livre.toFixed(1)}GB Livres de {total.toFixed(1)}GB</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden">
                <div className={`${corBarra} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
              </div>
              <p className="text-right text-[9px] font-bold text-slate-400">{pct.toFixed(0)}% Utilizado</p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTabela = (itens, colunas) => {
    if (!Array.isArray(itens) || itens.length === 0) return <span className="text-sm text-slate-500">Nenhum registro.</span>;
    return (
      <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 sticky top-0">
            <tr>{colunas.map(c => <th key={c.key} className="p-2 font-black text-slate-600 uppercase text-[9px] tracking-wider">{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {itens.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {colunas.map(c => <td key={c.key} className="p-2 font-medium text-slate-700 truncate max-w-[150px]" title={item[c.key]}>{item[c.key] || '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Separa dados dinâmicos em Simples vs Complexos
  const chavesOcultas = ['observacao', 'DISCOS LOGICOS', 'DISCOS LÓGICOS', 'SOFTWARES', 'REDES', 'MEMORIA RAM SLOTS', 'SERVICOS', 'IMPRESSORAS'];
  const dadosSimples = Object.entries(dinamicos).filter(([k, v]) => !chavesOcultas.includes(k) && typeof v !== 'object');
  
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col relative font-sans pb-10">
      
      {/* HEADER ENTERPRISE / NOC */}
      <div className="bg-slate-900 text-white p-8 sm:p-10 rounded-b-[40px] shadow-2xl shrink-0 relative overflow-hidden">
        {/* Efeito luminoso de fundo */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600 rounded-full mix-blend-screen filter blur-[80px] opacity-40"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">🏛️</span>
              <span className="font-black tracking-widest text-xs opacity-80 uppercase text-blue-100">{tenant}</span>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${isOnline ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' : 'bg-red-500/20 border-red-400 text-red-400'}`}>
                {isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
              </span>
              <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest border bg-white/10 border-white/20 text-white/70">
                MODO {modo}
              </span>
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 mb-1">Patrimônio / Asset ID</p>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">{ativo.patrimonio}</h1>
            {ativo.nome_personalizado && (
              <h2 className="text-xl sm:text-2xl font-bold text-amber-400 sm:ml-4">"{ativo.nome_personalizado}"</h2>
            )}
          </div>
          <p className="text-sm font-bold text-slate-300">{`${ativo.marca || ''} ${ativo.modelo || ''}`.trim() || 'Hardware não especificado'}</p>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4 -mt-6 z-10 max-w-7xl mx-auto w-full">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] items-start">
          
          {/* COLUNA ESQUERDA: DADOS PRINCIPAIS E HARDWARE */}
          <div className="space-y-4">
            
            {/* CARDS BASE */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><span className="text-blue-500">📋</span> Dados Cadastrais</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Status', ativo.status], ['Usuário', dinamicos.USUÁRIO || ativo.tecnico], ['Domínio', ativo.dominio_proprio],
                  ['Unidade', ativo.unidade?.nome || ativo.secretaria], ['Setor', ativo.unidade?.tipo || ativo.setor], ['Local', ativo.local],
                  ['Nº Licitação', ativo.numero_licitacao], ['Venc. Garantia', ativo.data_vencimento_garantia ? new Date(ativo.data_vencimento_garantia).toLocaleDateString('pt-BR') : 'N/A']
                ].map(([label, value], idx) => (
                  <div key={idx} className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">{label}</p>
                    <p className="text-xs font-bold text-slate-800 truncate" title={value}>{value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SESSÃO HARDWARE DINÂMICA (Renderizadores Customizados) */}
            {(dinamicos['DISCOS LOGICOS'] || dinamicos['DISCOS LÓGICOS']) && (
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                 <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">💽 Armazenamento Local</h2>
                 {renderDiscos(superParse(dinamicos['DISCOS LOGICOS'] || dinamicos['DISCOS LÓGICOS']))}
               </div>
            )}

            {dinamicos['REDES'] && (
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                 <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">🌐 Interfaces de Rede</h2>
                 {renderTabela(superParse(dinamicos['REDES']), [
                   { key: 'descricao', label: 'Adaptador' }, { key: 'ip', label: 'IPv4' }, { key: 'mac', label: 'MAC Address' }, { key: 'status', label: 'Status' }
                 ])}
               </div>
            )}

            {dinamicos['SOFTWARES'] && (
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                 <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">📦 Softwares Instalados</h2>
                 {renderTabela(superParse(dinamicos['SOFTWARES']), [
                   { key: 'nome', label: 'Programa' }, { key: 'versao', label: 'Versão' }, { key: 'fabricante', label: 'Fabricante' }
                 ])}
               </div>
            )}

            {/* RESTANTE DOS DADOS DINÂMICOS SIMPLES */}
            {dadosSimples.length > 0 && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><span className="text-emerald-500">⚡</span> Telemetria & Especificações</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {dadosSimples.map(([campo, valor]) => (
                    <div key={campo} className="rounded-2xl bg-slate-50 p-3 border border-slate-100 flex justify-between items-center">
                      <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 truncate w-1/2" title={campo}>{campo.replace(/_/g, ' ')}</p>
                      <p className="text-xs font-bold text-slate-900 text-right w-1/2 truncate" title={String(valor)}>{String(valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: AÇÕES E QR CODE */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">QR Code Oficial</h3>
              <div className="inline-flex rounded-3xl bg-white p-3 border-2 border-dashed border-slate-200">
                <QRCodeSVG value={`${window.location.origin}/consulta/${tenant}/${ativo.patrimonio}`} size={180} level="H" />
              </div>
            </div>

            {/* ÁREA DO EDITOR */}
            {isEditor ? (
              <div className="bg-blue-50 p-6 rounded-3xl shadow-sm border border-blue-200">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-800 mb-4 flex items-center gap-2"><span>✏️</span> Edição Limitada</h3>
                <div className="space-y-3">
                  {['patrimonio', 'nome_personalizado', 'local'].map(campo => (
                    <div key={campo}>
                      <label className="text-[9px] font-black uppercase tracking-widest text-blue-600/70">{campo.replace('_', ' ')}</label>
                      <input value={formEdicao[campo]} onChange={(e) => setFormEdicao({...formEdicao, [campo]: e.target.value})} className="w-full mt-1 p-2.5 rounded-xl border border-blue-200 bg-white text-xs font-bold outline-none focus:border-blue-500" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-blue-600/70">Observação Técnica</label>
                    <textarea value={formEdicao.observacao} onChange={(e) => setFormEdicao({...formEdicao, observacao: e.target.value})} rows={3} className="w-full mt-1 p-2.5 rounded-xl border border-blue-200 bg-white text-xs font-bold outline-none resize-none" />
                  </div>
                  <button onClick={handleEditorSave} disabled={editorLoading} className="w-full py-3 mt-2 rounded-xl bg-blue-600 text-white text-xs font-black shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-widest">
                    {editorLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Acesso Técnico</h3>
                <p className="text-[10px] text-slate-500 mb-4 font-bold">Autentique-se para editar nomenclaturas e observações in-loco.</p>
                {showLoginForm ? (
                  <form onSubmit={handleEditorLogin} className="space-y-3">
                    <input placeholder="Usuário" value={editorLogin.username} onChange={(e) => setEditorLogin({...editorLogin, username: e.target.value})} className="w-full p-2.5 rounded-xl border bg-slate-50 text-xs font-bold outline-none" />
                    <input type="password" placeholder="Senha" value={editorLogin.password} onChange={(e) => setEditorLogin({...editorLogin, password: e.target.value})} className="w-full p-2.5 rounded-xl border bg-slate-50 text-xs font-bold outline-none" />
                    {editorError && <p className="text-red-500 text-[10px] font-bold text-center">{editorError}</p>}
                    <button type="submit" disabled={editorLoading} className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-all uppercase tracking-widest">Entrar</button>
                    <button type="button" onClick={() => setShowLoginForm(false)} className="w-full py-2 text-slate-500 text-xs font-black uppercase tracking-widest">Cancelar</button>
                  </form>
                ) : (
                  <button onClick={() => setShowLoginForm(true)} className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-black shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest">
                    Fazer Login
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}