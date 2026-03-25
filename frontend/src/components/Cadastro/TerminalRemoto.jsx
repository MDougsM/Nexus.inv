import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import { FaTerminal, FaPlay, FaSync, FaTimes } from 'react-icons/fa';

export default function TerminalRemoto({ ativo, onClose, usuarioAtual }) {
  const [script, setScript] = useState('');
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHist, setLoadingHist] = useState(true);

  const carregarHistorico = async () => {
    setLoadingHist(true);
    try {
      const res = await api.get(`/api/comandos/maquina/${ativo.patrimonio}`);
      setHistorico(res.data);
    } catch (e) {
      toast.error("Erro ao buscar histórico do terminal.");
    } finally {
      setLoadingHist(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
    // Auto-refresh a cada 10 segundos para ver se o comando terminou
    const interval = setInterval(carregarHistorico, 10000);
    return () => clearInterval(interval);
  }, [ativo.patrimonio]);

  const dispararComando = async () => {
    if (!script.trim()) return toast.warn("Digite um comando válido.");
    setLoading(true);
    try {
      await api.post('/api/comandos/enviar', {
        patrimonio: ativo.patrimonio,
        uuid_persistente: ativo.uuid_persistente || ativo.specs?.serial || ativo.serial,
        script_content: script,
        usuario_emissor: usuarioAtual
      });
      toast.success("Comando enviado para a fila! 🚀");
      setScript('');
      carregarHistorico();
    } catch (e) {
      toast.error("Erro ao enfileirar comando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[100] p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-4xl bg-[#0f172a] rounded-2xl shadow-2xl border border-blue-500/30 overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
        
        {/* HEADER HACKER */}
        <div className="p-4 bg-[#020617] border-b border-blue-900/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <FaTerminal className="text-emerald-400 text-xl" />
            <div>
              <h3 className="text-emerald-400 font-black tracking-widest uppercase text-sm font-mono">Nexus Command ▾ {ativo.patrimonio}</h3>
              <p className="text-blue-400/50 text-[10px] font-mono">Alvo: {ativo.specs?.ip || 'IP Desconhecido'} | {ativo.marca} {ativo.modelo}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={carregarHistorico} className="text-blue-400 hover:text-emerald-400 transition-colors" title="Atualizar Logs"><FaSync className={loadingHist ? 'animate-spin' : ''} /></button>
            <button onClick={onClose} className="text-red-500 hover:text-red-400 transition-colors"><FaTimes className="text-xl" /></button>
          </div>
        </div>

        {/* ÁREA DE RESPOSTAS (LOGS) */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#020617] font-mono text-xs space-y-4 custom-scrollbar">
          {historico.length === 0 ? (
            <div className="text-emerald-400/30 text-center py-10">Nenhum comando enviado para esta máquina ainda.</div>
          ) : (
            historico.map(cmd => (
              <div key={cmd.id} className="border border-blue-900/30 rounded bg-[#0f172a]/50 p-3">
                <div className="flex justify-between items-start mb-2 border-b border-blue-900/30 pb-2">
                  <div className="text-blue-400">
                    <span className="text-emerald-500 font-bold">[{cmd.usuario_emissor}]</span> executou:
                    <div className="text-gray-300 mt-1 pl-2 border-l-2 border-emerald-500/30 whitespace-pre-wrap">{cmd.script_content}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${cmd.status === 'PENDENTE' ? 'bg-yellow-500/20 text-yellow-500' : cmd.status === 'EXECUTANDO' ? 'bg-blue-500/20 text-blue-500 animate-pulse' : cmd.status === 'ERRO' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {cmd.status}
                  </span>
                </div>
                <div className="text-gray-400 mt-2">
                  <span className="text-blue-500/50">Saída do Terminal:</span>
                  <div className="mt-1 bg-black/50 p-2 rounded text-emerald-300/80 whitespace-pre-wrap overflow-x-auto">
                    {cmd.output_log || (cmd.status === 'PENDENTE' ? 'Aguardando o Agente buscar a ordem...' : 'Aguardando processamento...')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* INPUT DE COMANDO */}
        <div className="p-4 bg-[#0f172a] border-t border-blue-900/50 shrink-0">
          <label className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold mb-2 uppercase tracking-widest">
            <span>&gt;_</span> PowerShell / CMD Script
          </label>
          <div className="flex gap-2">
            <textarea 
              value={script} 
              onChange={e => setScript(e.target.value)} 
              placeholder="Ex: ipconfig /all"
              className="flex-1 bg-[#020617] border border-blue-900/50 rounded p-3 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500/50 transition-colors min-h-[60px]"
            />
            <button 
              onClick={dispararComando} 
              disabled={loading}
              className="w-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-50 active:scale-95"
            >
              <FaPlay />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}