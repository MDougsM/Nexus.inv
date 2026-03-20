import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { FaTrash, FaClock, FaPlus, FaCheckSquare, FaSquare, FaFileDownload, FaFileCsv, FaPlay } from 'react-icons/fa';

export default function AbaAgendamentos({ secretarias }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [relatoriosProntos, setRelatoriosProntos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [secSelecionadas, setSecSelecionadas] = useState([]);
  const [setoresSelecionados, setSetoresSelecionados] = useState([]);
  
  const [novo, setNovo] = useState({
    nome: '',
    dia_inicio_ciclo: 1, // NOVO
    dia_fim_ciclo: 30,   // NOVO
    dia_do_mes: 1,
    horario: '08:00',
    emails_destino: 'sistema@local'
  });

  const carregarDados = async () => {
    try {
      const [resAg, resGerados] = await Promise.all([
        api.get('/api/agendamentos/'),
        api.get('/api/agendamentos/gerados') // Busca os relatórios já prontos do Banco de Dados
      ]);
      setAgendamentos(resAg.data);
      setRelatoriosProntos(resGerados.data);
    } catch (e) { console.error("Erro ao carregar dados", e); }
  };

  useEffect(() => { carregarDados(); }, []);

  const toggleSecretaria = (secNome) => {
    const isSelecionada = secSelecionadas.includes(secNome);
    let novasSecs = isSelecionada ? secSelecionadas.filter(s => s !== secNome) : [...secSelecionadas, secNome];
    setSecSelecionadas(novasSecs);

    const secObj = secretarias.find(s => s.nome === secNome);
    if (secObj && secObj.setores) {
      const nomeSetores = secObj.setores.map(setor => setor.nome);
      if (isSelecionada) {
        setSetoresSelecionados(prev => prev.filter(s => !nomeSetores.includes(s)));
      } else {
        setSetoresSelecionados(prev => [...new Set([...prev, ...nomeSetores])]);
      }
    }
  };

  const toggleSetor = (setorNome) => {
    setSetoresSelecionados(prev => prev.includes(setorNome) ? prev.filter(s => s !== setorNome) : [...prev, setorNome]);
  };

  const criarAgendamento = async (e) => {
    e.preventDefault();
    if (!novo.nome) return toast.warn("Preencha o nome da rotina.");
    if (secSelecionadas.length === 0) return toast.warn("Selecione ao menos uma secretaria.");
    
    setLoading(true);
    try {
      const payload = { ...novo, secretarias: secSelecionadas, setores: setoresSelecionados };
      await api.post('/api/agendamentos/', payload);
      toast.success("Rotina programada com sucesso! ⏱️");
      setNovo({ nome: '', dia_do_mes: 1, horario: '08:00', emails_destino: 'sistema@local' });
      setSecSelecionadas([]);
      setSetoresSelecionados([]);
      carregarDados();
    } catch (e) { toast.error("Erro ao agendar rotina."); }
    setLoading(false);
  };

  const deletarAgendamento = async (id) => {
    if (!window.confirm("Cancelar este robô?")) return;
    try {
      await api.delete(`/api/agendamentos/${id}`);
      toast.success("Robô cancelado!");
      carregarDados();
    } catch (e) { toast.error("Erro ao remover."); }
  };

  const forcarGeracao = async (id) => {
    try {
      toast.info("⏳ Gerando relatório...");
      await api.post(`/api/agendamentos/${id}/gerar-agora`);
      toast.success("✅ Relatório gerado e salvo no cofre!");
      carregarDados(); // Recarrega o cofre automaticamente para mostrar o arquivo
    } catch (e) {
      toast.error("❌ Erro ao gerar relatório manualmente.");
    }
  };

  const baixarRelatorioGerado = async (id, nome_relatorio) => {
    try {
      const response = await api.get(`/api/agendamentos/gerados/download/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 🚀 Descobre qual é a extensão pelo nome que salvamos no banco
      const extensao = nome_relatorio.includes('(PDF)') ? '.pdf' : '.csv';
      link.setAttribute('download', `Faturamento_${nome_relatorio.replace(/ /g, '_')}${extensao}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error("Erro ao transferir ficheiro.");
    }
  };

  const deletarRelatorioGerado = async (id) => {
    if (!window.confirm("Apagar este relatório do servidor permanentemente?")) return;
    try {
      await api.delete(`/api/agendamentos/gerados/${id}`);
      toast.success("Registo apagado.");
      carregarDados(); // Recarrega as listas
    } catch (e) { toast.error("Erro ao apagar ficheiro."); }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      
      {/* 🚀 FORMULÁRIO DE CRIAÇÃO DO ROBÔ */}
      <div className="p-6 rounded-3xl border shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>
          <span className="text-blue-500 text-lg"><FaClock /></span> Programar Novo Fechamento
        </h3>
        <form onSubmit={criarAgendamento} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Nome da Rotina</label>
              <input required value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} placeholder="Ex: Fechamento Contrato X" className="w-full p-3 rounded-xl border font-bold outline-none focus:ring-2 focus:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Dia do Mês</label>
              <input required type="number" min="1" max="31" value={novo.dia_do_mes} onChange={e => setNovo({...novo, dia_do_mes: parseInt(e.target.value)})} className="w-full p-3 rounded-xl border font-bold outline-none text-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Hora de Execução</label>
              <input required type="time" value={novo.horario} onChange={e => setNovo({...novo, horario: e.target.value})} className="w-full p-3 rounded-xl border font-bold outline-none text-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }} />
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
            <label className="block text-[10px] font-black uppercase opacity-50 mb-3" style={{ color: 'var(--text-main)' }}>Locais e Setores do Relatório</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[250px] overflow-y-auto custom-scrollbar p-2">
              {secretarias.map(sec => (
                <div key={sec.id} className="p-4 rounded-xl border bg-gray-50/5" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={() => toggleSecretaria(sec.nome)}>
                    {secSelecionadas.includes(sec.nome) ? <FaCheckSquare className="text-blue-500 text-lg" /> : <FaSquare className="text-gray-300 text-lg" />}
                    <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{sec.nome}</span>
                  </div>
                  {secSelecionadas.includes(sec.nome) && sec.setores && sec.setores.length > 0 && (
                    <div className="pl-6 flex flex-col gap-1 mt-2 border-l-2 border-blue-500/20">
                      {sec.setores.map(setor => (
                        <div key={setor.id} className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100" onClick={() => toggleSetor(setor.nome)}>
                          {setoresSelecionados.includes(setor.nome) ? <FaCheckSquare className="text-emerald-500" /> : <FaSquare className="text-gray-300" />}
                          <span className="font-bold text-[11px]" style={{ color: 'var(--text-main)' }}>{setor.nome}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
              <FaPlus /> Adicionar Robô
            </button>
          </div>
        </form>
      </div>

      {/* 🚀 AS DUAS LISTAS LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LISTA ESQUERDA: ROBÔS ATIVOS */}
        <div className="rounded-3xl border shadow-xl flex flex-col h-[400px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}><span className="text-emerald-500 text-lg">⚙️</span> Robôs Ativos</h3>
            <span className="px-3 py-1 rounded-full border shadow-sm text-[10px] font-black uppercase opacity-80" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>{agendamentos.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {agendamentos.length === 0 ? (
              <div className="p-10 text-center opacity-50 font-bold italic" style={{ color: 'var(--text-main)' }}>Sem rotinas agendadas.</div>
            ) : (
              <div className="space-y-3">
                {agendamentos.map(ag => (
                  <div key={ag.id} className="p-4 rounded-xl border flex items-center justify-between hover:bg-gray-500/5 transition-all" style={{ borderColor: 'var(--border-light)' }}>
                    <div>
                      <div className="font-black text-sm text-blue-500">{ag.nome}</div>
                      <div className="text-[10px] font-bold uppercase opacity-60 mt-1" style={{ color: 'var(--text-main)' }}>Dia {ag.dia_do_mes} às {ag.horario}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => forcarGeracao(ag.id)} className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-95" title="Forçar Geração Agora">
                        <FaPlay />
                      </button>
                      <button onClick={() => deletarAgendamento(ag.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all active:scale-95" title="Cancelar Robô">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LISTA DIREITA: ARQUIVOS GERADOS DO BANCO (COFRE) */}
        <div className="rounded-3xl border shadow-xl flex flex-col h-[400px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <div className="p-5 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}><span className="text-blue-500 text-lg">📁</span> Cofre de Relatórios Prontos</h3>
            <span className="px-3 py-1 rounded-full border shadow-sm text-[10px] font-black uppercase opacity-80" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>{relatoriosProntos.length}</span>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {relatoriosProntos.length === 0 ? (
              <div className="p-10 text-center opacity-50 font-bold italic" style={{ color: 'var(--text-main)' }}>O sistema ainda não gerou relatórios.</div>
            ) : (
              <div className="space-y-3">
                {relatoriosProntos.map((arq) => (
                  <div key={arq.id} className="p-3 rounded-xl border flex items-center gap-4 hover:shadow-md transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl border border-emerald-500/20">
                      <FaFileCsv />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-black text-sm truncate" style={{ color: 'var(--text-main)' }} title={arq.nome}>{arq.nome}</div>
                      <div className="text-[10px] font-bold uppercase opacity-60 mt-0.5 flex gap-2" style={{ color: 'var(--text-main)' }}>
                        <span>Emitido a {arq.data_emissao}</span>
                        <span>•</span>
                        <span>{arq.tamanho}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 border-l pl-3" style={{ borderColor: 'var(--border-light)' }}>
                      <button onClick={() => baixarRelatorioGerado(arq.id, arq.nome)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-all active:scale-95" title="Baixar CSV">
                        <FaFileDownload className="text-lg" />
                      </button>
                      <button onClick={() => deletarRelatorioGerado(arq.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all active:scale-95" title="Apagar Definitivamente">
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}