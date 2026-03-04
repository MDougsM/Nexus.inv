import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../api/api';
import * as XLSX from 'xlsx';

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Controle do Pop-up Minimalista do Motivo
  const [modalMotivo, setModalMotivo] = useState({ aberto: false, log: null });

  useEffect(() => {
    api.get('/api/auditoria/')
       .then(res => setLogs(res.data))
       .catch(() => toast.error("Erro ao buscar dados"))
       .finally(() => setLoading(false));
  }, []);

  const logsFiltrados = logs.filter(log => 
    log.usuario?.toLowerCase().includes(filtro.toLowerCase()) ||
    log.acao?.toLowerCase().includes(filtro.toLowerCase())
  );

  const exportarParaExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(logsFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");
    XLSX.writeFile(workbook, "Log_Auditoria.xlsx");
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in relative">
      
      {/* CABEÇALHO */}
      <div className="rounded-xl shadow-sm border p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border" style={{ backgroundColor: 'var(--badge-blue-bg)', borderColor: 'var(--border-light)' }}>🛡️</div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Rastreabilidade (LGPD)</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Histórico imutável de todas as transações realizadas no sistema.</p>
          </div>
        </div>
        <button onClick={exportarParaExcel} className="px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-green)', color: '#fff' }}>
          📊 Exportar p/ Excel (.csv)
        </button>
      </div>

      {/* FILTROS */}
      <div className="rounded-xl shadow-sm border p-4 mb-8 flex gap-4 items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="flex-1 relative">
          <span className="absolute left-3 top-2.5 opacity-50" style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input 
            type="text" placeholder="Filtrar por usuário, ação..." 
            className="w-full pl-10 p-2.5 rounded-lg border outline-none text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
            value={filtro} onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <div className="text-xs font-bold px-4 py-2.5 rounded border" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}>
          Total: {logsFiltrados.length} registro(s)
        </div>
      </div>

      {/* TIMELINE (LINHA DO TEMPO) */}
      <div className="relative pl-4 md:pl-8">
        <div className="absolute top-0 bottom-0 left-6 md:left-10 w-0.5" style={{ backgroundColor: 'var(--border-light)' }}></div>

        {loading ? <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Carregando caixa-preta...</div> : null}

        {logsFiltrados.map((log) => {
          let badge = { bg: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)' };
          if (log.acao === 'LOGIN') badge = { bg: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)' };
          if (log.acao === 'CRIACAO' || log.acao === 'IMPORTACAO') badge = { bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' };
          if (log.acao === 'EXCLUSAO') badge = { bg: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' };
          if (log.acao === 'EDICAO' || log.acao === 'TRANSFERENCIA') badge = { bg: 'var(--badge-blue-bg)', color: 'var(--badge-blue-text)' };

          const dataObj = new Date(log.data_hora);
          
          return (
            <div key={log.id} className="relative mb-8 pl-10 md:pl-12 group">
              <div className="absolute left-[-1.5rem] md:left-[-0.5rem] top-6 w-4 h-4 rounded-full border-4 shadow-sm z-10" style={{ backgroundColor: 'var(--color-blue)', borderColor: 'var(--bg-page)' }}></div>
              
              <div className="p-5 rounded-xl border shadow-sm transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg hover:-translate-y-1 cursor-default" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: badge.bg, color: badge.color }}>
                      {log.acao}
                    </span>
                    <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                      👤 <span className="capitalize">{log.usuario}</span>
                    </span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    {dataObj.toLocaleDateString('pt-BR')} • {dataObj.toLocaleTimeString('pt-BR')}
                  </div>
                </div>

                <div className="pl-1">
                  <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-main)' }}>Operação no Sistema</p>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border gap-4" style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-light)' }}>
                    
                    <p className="text-sm italic truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                      {log.detalhes}
                    </p>
                    
                    {/* Botão renderizado APENAS se houver a palavra "Motivo" no log */}
                    {log.detalhes && log.detalhes.includes('Motivo:') && (
                      <button 
                        onClick={() => setModalMotivo({ aberto: true, log })}
                        className="text-[10px] font-bold px-3 py-1.5 rounded transition-colors hover:brightness-95 whitespace-nowrap shadow-sm border"
                        style={{ backgroundColor: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)', borderColor: 'rgba(245, 158, 11, 0.2)' }}
                      >
                        🔑 VER MOTIVO
                      </button>
                    )}

                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* POP-UP MINIMALISTA (MODAL DO MOTIVO) */}
      {modalMotivo.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setModalMotivo({ aberto: false, log: null })}>
          <div className="w-full max-w-lg rounded-xl shadow-2xl border p-6 transform transition-all scale-100" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-start mb-4 border-b pb-4" style={{ borderColor: 'var(--border-light)' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Detalhes da Operação</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Realizada por <strong className="capitalize">{modalMotivo.log?.usuario}</strong></p>
              </div>
              <button onClick={() => setModalMotivo({ aberto: false, log: null })} className="text-2xl leading-none opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-main)' }}>&times;</button>
            </div>
            
            <div className="p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>
              {modalMotivo.log?.detalhes}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setModalMotivo({ aberto: false, log: null })} 
                className="px-6 py-2 rounded-lg font-bold transition-opacity hover:opacity-90 shadow-md" 
                style={{ backgroundColor: 'var(--color-blue)', color: '#fff' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}