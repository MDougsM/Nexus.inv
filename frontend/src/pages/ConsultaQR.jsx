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

        if (!res.data || !res.data.ativo) {
          throw new Error('Ativo não encontrado');
        }

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
    const detalhes = parseJSONSeguro(ativo.dados_dinamicos);
    setFormEdicao({
      patrimonio: ativo.patrimonio || '',
      local: ativo.local || '',
      nome_personalizado: ativo.nome_personalizado || '',
      observacao: detalhes.observacao || ''
    });
  }, [dados]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-gray-500 uppercase tracking-widest text-sm">Consultando Base de Dados...</p>
        </div>
      </div>
    );
  }

  if (dados === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Ativo Inativo</h2>
          <p className="text-sm text-gray-500 font-bold mb-6">Este patrimônio não existe ou foi removido da base.</p>
          <button onClick={() => window.location.href = '/'} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Ir para a Home</button>
        </div>
      </div>
    );
  }

  const parseJSONSeguro = (dado) => {
    if (!dado) return {};
    if (typeof dado === 'object') return dado;
    try { return JSON.parse(dado.replace(/'/g, '"').replace(/None/g, 'null').replace(/False/g, 'false').replace(/True/g, 'true')); } catch (e) { return {}; }
  };

  const ativo = dados.ativo;
  const dinamicos = parseJSONSeguro(ativo.dados_dinamicos);
  const camposExtras = Object.entries(dinamicos).sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  const formatLabel = (label) => label.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  const formatValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (!value && value !== 0) return 'Não informado';
    return value;
  };

  const isEditor = modo === 'EDITOR' || Boolean(usuarioEditor);

  const handleEditorLogin = async (e) => {
    e.preventDefault();
    setEditorError('');
    setEditorLoading(true);

    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const res = await axios.post(`${baseURL}/api/usuarios/login`, {
        empresa: tenant,
        username: editorLogin.username.trim(),
        password: editorLogin.password
      });

      setUsuarioEditor({ username: res.data.username, is_admin: res.data.is_admin });
      setModo('EDITOR');
      setShowLoginForm(false);
      toast.success('Acesso técnico liberado. Agora você pode editar campos limitados.');
    } catch (error) {
      setEditorError(error?.response?.data?.detail || error.message || 'Credenciais inválidas.');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleEditorSave = async () => {
    setEditorError('');
    setEditorLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const token = localStorage.getItem('token');
      const headers = { 'x-empresa': tenant };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        usuario_acao: usuarioEditor?.username || 'Técnico QR',
        patrimonio: formEdicao.patrimonio.trim(),
        local: formEdicao.local.trim(),
        nome_personalizado: formEdicao.nome_personalizado.trim(),
        dados_dinamicos: {
          ...dinamicos,
          observacao: formEdicao.observacao || ''
        }
      };

      await axios.put(`${baseURL}/api/inventario/ficha/editar/${encodeURIComponent(ativo.patrimonio)}`, payload, { headers });

      const novoAtivo = { ...ativo, ...payload, dados_dinamicos: payload.dados_dinamicos };
      setDados(prev => ({ ...prev, ativo: novoAtivo }));
      toast.success('Alterações salvas com sucesso.');

      if (payload.patrimonio !== ativo.patrimonio) {
        window.location.href = `/consulta/${tenant}/${encodeURIComponent(payload.patrimonio)}`;
        return;
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Erro ao salvar alterações.');
    } finally {
      setEditorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6 rounded-b-[40px] shadow-lg shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">🏛️</span>
            <span className="font-black tracking-widest text-xs opacity-80 uppercase">{tenant}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${modo === 'EDITOR' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-white/10 border-white/20 text-white/70'}`}>
            MODO {modo}
          </span>
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-1">Patrimônio Público</p>
        <h1 className="text-4xl font-black tracking-tight mb-1">{ativo.patrimonio}</h1>
        <p className="text-sm font-bold opacity-90">{`${ativo.marca || ''} ${ativo.modelo || ''}`.trim() || 'Equipamento não identificado'}</p>
      </div>

      <div className="flex-1 p-6 space-y-4 -mt-4 z-10">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Informações do Ativo</h2>
                  <p className="text-lg font-black text-gray-900">Ficha completa</p>
                </div>
                <div className="text-right text-xs uppercase tracking-[0.25em] font-black text-gray-400">{ativo.categoria_nome || `Categoria #${ativo.categoria_id || 'N/A'}`}</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Patrimônio', ativo.patrimonio],
                  ['Marca', ativo.marca],
                  ['Modelo', ativo.modelo],
                  ['Nome personalizado', ativo.nome_personalizado],
                  ['Status', ativo.status],
                  ['Domínio próprio', ativo.dominio_proprio],
                  ['Técnico', ativo.tecnico],
                  ['Unidade', ativo.unidade?.nome || ativo.secretaria],
                  ['Tipo de unidade', ativo.unidade?.tipo || ativo.setor],
                  ['Local', ativo.local],
                  ['Última comunicação', ativo.ultima_comunicacao ? new Date(ativo.ultima_comunicacao).toLocaleString('pt-BR') : null],
                  ['Nº licitação', ativo.numero_licitacao],
                  ['Garantia', ativo.data_vencimento_garantia ? new Date(ativo.data_vencimento_garantia).toLocaleDateString('pt-BR') : null],
                  ['Responsável atual', ativo.responsavel_atual],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-gray-50 p-4 border border-gray-100">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500 mb-2">{label}</p>
                    <p className="text-sm font-bold text-gray-900">{formatValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-blue-500 text-2xl">📋</span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-700">Dados adicionais</h3>
                  <p className="text-[10px] text-gray-500">Campos extras registrados para este ativo.</p>
                </div>
              </div>

              {camposExtras.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">Nenhum dado dinâmico disponível.</p>
              ) : (
                <div className="grid gap-3">
                  {camposExtras.map(([campo, valor]) => (
                    <div key={campo} className="rounded-3xl bg-gray-50 p-4 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500 mb-1">{formatLabel(campo)}</p>
                      <p className="text-sm font-bold text-gray-900">{formatValue(valor)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-4">QR Code da máquina</h3>
              <div className="flex items-center justify-center p-4 rounded-3xl bg-gray-50 border border-dashed border-gray-200">
                <div className="inline-flex rounded-3xl bg-white p-4">
                  <QRCodeSVG value={`${window.location.origin}/consulta/${tenant}/${ativo.patrimonio}`} size={220} level="H" includeMargin={false} />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 text-center">Escaneie para abrir esta ficha pública.</p>
            </div>

            {isEditor ? (
              <div className="bg-blue-50 p-6 rounded-3xl shadow-sm border border-blue-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-800 mb-4">Edição limitada liberada</h3>
                <p className="text-sm text-blue-700 font-bold mb-4">Edite apenas os campos permitidos abaixo.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Patrimônio</label>
                    <input value={formEdicao.patrimonio} onChange={(e) => setFormEdicao({...formEdicao, patrimonio: e.target.value})} className="w-full mt-2 p-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Nome da máquina</label>
                    <input value={formEdicao.nome_personalizado} onChange={(e) => setFormEdicao({...formEdicao, nome_personalizado: e.target.value})} className="w-full mt-2 p-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Local</label>
                    <input value={formEdicao.local} onChange={(e) => setFormEdicao({...formEdicao, local: e.target.value})} className="w-full mt-2 p-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Observação</label>
                    <textarea value={formEdicao.observacao} onChange={(e) => setFormEdicao({...formEdicao, observacao: e.target.value})} rows={4} className="w-full mt-2 p-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold outline-none resize-none" />
                  </div>
                  <button onClick={handleEditorSave} disabled={editorLoading} className="w-full py-3 rounded-2xl bg-blue-600 text-white font-black shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                    {editorLoading ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-3">Acesso técnico</h3>
                <p className="text-sm text-gray-600 mb-5">Faça login apenas para editar local, nome, patrimônio e observação.</p>
                {showLoginForm ? (
                  <form onSubmit={handleEditorLogin} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Usuário</label>
                      <input value={editorLogin.username} onChange={(e) => setEditorLogin({...editorLogin, username: e.target.value})} className="w-full mt-2 p-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Senha</label>
                      <input type="password" value={editorLogin.password} onChange={(e) => setEditorLogin({...editorLogin, password: e.target.value})} className="w-full mt-2 p-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold outline-none" />
                    </div>
                    {editorError && <p className="text-red-600 text-sm font-bold">{editorError}</p>}
                    <button type="submit" disabled={editorLoading} className="w-full py-3 rounded-2xl bg-gray-900 text-white font-black shadow-lg hover:bg-gray-800 transition-all disabled:opacity-50">
                      {editorLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                    <button type="button" onClick={() => setShowLoginForm(false)} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-black hover:bg-gray-50 transition-all">
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button onClick={() => setShowLoginForm(true)} className="w-full py-3 rounded-2xl bg-gray-900 text-white font-black shadow-lg hover:bg-gray-800 transition-all">
                    Sou Técnico / Fazer Login
                  </button>
                )}
              </div>
            )}

            {dados.historico && dados.historico.length > 0 && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-4">Últimos registros</h3>
                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                  {dados.historico.map((log, idx) => (
                    <div key={idx} className="rounded-3xl bg-gray-50 p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500">{log.acao}</span>
                        <span className="text-[10px] text-gray-400">{new Date(log.data_hora).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{log.detalhes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}