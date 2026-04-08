import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalDashboardAvancado({ ativo, onClose, parseJSONSeguro }) {
  const [abaAtiva, setAbaAtiva] = useState('geral');

  const dadosDin = parseJSONSeguro(ativo.dados_dinamicos);
  let advAntigo = dadosDin?.dados_avancados || {};
  if (typeof advAntigo === 'string') advAntigo = parseJSONSeguro(advAntigo);
  const adv = { ...advAntigo, ...dadosDin };

  const placaMae = adv.placa_mae || 'N/A';
  const nucleos = adv.nucleos_cpu || 'N/A';
  const telemetria = adv.telemetria || { cpu_percent: 0, ram_percent: 0 };
  const discos = Array.isArray(adv.discos_logicos) ? adv.discos_logicos : [];
  const redes = Array.isArray(adv.redes) ? adv.redes : [];
  const gpus = Array.isArray(adv.gpu) ? adv.gpu : [];
  const softwares = Array.isArray(adv.softwares) ? adv.softwares : [];
  const servicos = Array.isArray(adv.servicos) ? adv.servicos : [];
  const slotsRam = Array.isArray(adv.memoria_ram_slots) ? adv.memoria_ram_slots : [];
  const impressoras = Array.isArray(adv.impressoras) ? adv.impressoras : [];
  const scanners = Array.isArray(adv.scanners_e_webcams) ? adv.scanners_e_webcams : [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in print:hidden" onClick={onClose}>
      <div className="w-full max-w-7xl h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }} onClick={e => e.stopPropagation()}>
        
        {/* CABEÇALHO DO DASHBOARD */}
        <div className="p-6 border-b bg-gradient-to-r from-slate-900 to-gray-800 text-white shadow-md">
           <div className="flex justify-between items-center">
             <div>
               <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                  <span className="bg-blue-600 p-2 rounded-xl shadow-lg">💻</span> Inventário Profundo
               </h2>
               <p className="text-xs text-blue-200 mt-1 font-mono uppercase tracking-widest font-bold">
                  {ativo.patrimonio} • {ativo.hostname || 'Hostname Desconhecido'}
               </p>
             </div>
             <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-red-500 rounded-xl flex items-center justify-center text-xl transition-all border border-white/10">&times;</button>
           </div>
           
           <div className="flex gap-2 mt-6 overflow-x-auto custom-scrollbar pb-2">
             {[
               { id: 'geral', icon: '📋', label: 'Geral & Segurança' },
               { id: 'hardware', icon: '⚙️', label: 'Hardware' },
               { id: 'armazenamento', icon: '💾', label: 'Armazenamento' },
               { id: 'rede', icon: '🌐', label: 'Redes & Periféricos' },
               { id: 'softwares', icon: '📦', label: `Softwares (${softwares.length})` },
               { id: 'servicos', icon: '🛠️', label: `Serviços (${servicos.length})` }
             ].map(aba => (
               <button key={aba.id} onClick={() => setAbaAtiva(aba.id)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${abaAtiva === aba.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                 {aba.icon} {aba.label}
               </button>
             ))}
           </div>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/5">
          
          {/* ABA: GERAL E SEGURANÇA */}
          {abaAtiva === 'geral' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-500/20" style={{ backgroundColor: 'var(--bg-input)' }}>
                   <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Usuário Logado</p>
                   <p className="font-black text-xl text-blue-600 flex items-center gap-2">👤 {adv.usuario_pc || ativo.usuario_pc || 'Nenhum'}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-500/20" style={{ backgroundColor: 'var(--bg-input)' }}>
                   <p className="text-[10px] uppercase font-black text-gray-400 mb-1">IP Externo (WAN)</p>
                   <p className="font-black text-xl text-emerald-600 flex items-center gap-2">🌍 {adv.ip_externo || 'Não Coletado'}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-500/20" style={{ backgroundColor: 'var(--bg-input)' }}>
                   <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Uptime (Ligado há)</p>
                   <p className="font-black text-xl text-purple-600 flex items-center gap-2">⏳ {adv.saude?.uptime || 'Desconhecido'}</p>
                </div>
              </div>

              <section className="bg-red-500/5 p-6 rounded-3xl border border-red-500/20 shadow-sm">
                <h3 className="text-red-500 font-black uppercase tracking-widest mb-6 flex items-center gap-2">🛡️ Auditoria Ciber e Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-500/10">
                      <p className="text-[10px] uppercase font-black text-gray-400 mb-2">Status do Antivírus</p>
                      {adv.seguranca?.antivirus && adv.seguranca.antivirus.length > 0 ? (
                         adv.seguranca.antivirus.map((av, i) => (
                           <div key={i} className="mb-2 last:mb-0 flex justify-between items-center">
                             <p className="font-black text-sm text-gray-800">{av.nome}</p>
                             <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${av.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{av.status}</span>
                           </div>
                         ))
                      ) : <p className="font-black text-sm text-red-600">⚠️ Desprotegido</p>}
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-500/10">
                      <p className="text-[10px] uppercase font-black text-gray-400 mb-1">BitLocker (Criptografia)</p>
                      <p className={`font-black text-lg ${adv.seguranca?.bitlocker?.includes('Ativo') ? 'text-emerald-600' : 'text-red-600'}`}>{adv.seguranca?.bitlocker || 'Desativado / N/A'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-500/10">
                      <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Licença do Windows</p>
                      <p className={`font-black text-sm mb-1 ${adv.seguranca?.licenca_windows?.status?.includes('Licenciado') ? 'text-emerald-600' : 'text-red-600'}`}>{adv.seguranca?.licenca_windows?.status || 'Não Verificado'}</p>
                      <p className="font-mono text-[10px] bg-gray-100 p-1.5 rounded font-bold text-gray-600 break-all">{adv.licenca_key || 'Chave Oculta / OEM'}</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ABA: HARDWARE */}
          {abaAtiva === 'hardware' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                    <p className="text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-muted)' }}>Placa Mãe</p>
                    <p className="text-xl font-black truncate" style={{ color: 'var(--text-main)' }}>{placaMae}</p>
                 </div>
                 <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                    <p className="text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-muted)' }}>Processamento</p>
                    <p className="text-xl font-black" style={{ color: 'var(--text-main)' }}>{nucleos} Threads</p>
                 </div>
                 <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                    <p className="text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-muted)' }}>Esforço Atual (Telemetria)</p>
                    <div className="flex gap-4 mt-1">
                       <div className="flex-1 bg-blue-500/10 rounded-lg p-2 flex items-center justify-between border border-blue-500/20"><span className="text-xs font-bold text-blue-600 uppercase">CPU</span><span className="text-lg font-black text-blue-600">{telemetria.cpu_percent}%</span></div>
                       <div className="flex-1 bg-purple-500/10 rounded-lg p-2 flex items-center justify-between border border-purple-500/20"><span className="text-xs font-bold text-purple-600 uppercase">RAM</span><span className="text-lg font-black text-purple-600">{telemetria.ram_percent}%</span></div>
                    </div>
                 </div>
              </div>

              <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80" style={{ color: 'var(--text-main)' }}>🧠 Módulos de Memória (Slots)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {slotsRam.length === 0 ? <p className="text-sm opacity-50 col-span-full">Nenhum módulo detalhado encontrado.</p> : slotsRam.map((ram, i) => (
                   <div key={i} className="p-5 rounded-2xl shadow-sm border relative overflow-hidden" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                      <div className="absolute -right-4 -top-4 text-6xl opacity-5">🧠</div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2" style={{ color: 'var(--text-muted)' }}>{ram.slot}</p>
                      <p className="text-2xl font-black text-purple-600">{ram.capacidade_gb} GB</p>
                      <div className="flex justify-between items-end mt-3">
                         <p className="text-xs font-bold truncate w-2/3" style={{ color: 'var(--text-main)' }} title={ram.fabricante}>{ram.fabricante}</p>
                         <p className="text-xs font-mono font-bold px-2 py-1 bg-black/5 rounded-md" style={{ color: 'var(--text-muted)' }}>{ram.velocidade_mhz} MHz</p>
                      </div>
                   </div>
                ))}
              </div>

              <h3 className="text-lg font-black uppercase tracking-widest mb-4 mt-8 flex items-center gap-2 opacity-80" style={{ color: 'var(--text-main)' }}>🎮 Adaptadores de Vídeo (GPU)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {gpus.length === 0 ? <p className="text-sm opacity-50">Sem GPU dedicada.</p> : gpus.map((g, i) => (
                    <div key={i} className="p-5 rounded-2xl shadow-sm border flex justify-between items-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                       <div><p className="font-black text-lg" style={{ color: 'var(--text-main)' }}>{g.nome}</p><p className="text-xs font-mono opacity-60 mt-1" style={{ color: 'var(--text-muted)' }}>Driver: {g.driver}</p></div>
                       <span className="text-sm font-black px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">{g.vram_mb} MB</span>
                    </div>
                 ))}
              </div>
            </div>
          )}

          {/* ABA: ARMAZENAMENTO */}
          {abaAtiva === 'armazenamento' && (
            <div className="space-y-6 animate-fade-in">
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-500/20 w-full md:w-1/3 mb-6" style={{ backgroundColor: 'var(--bg-input)' }}>
                   <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Saúde Geral (S.M.A.R.T)</p>
                   <p className={`font-black text-lg ${adv.saude?.armazenamento?.includes('OK') ? 'text-emerald-600' : 'text-red-600'}`}>{adv.saude?.armazenamento || 'Desconhecido'}</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {discos.length === 0 ? <p className="text-sm opacity-50">Nenhum disco detectado.</p> : discos.map((d, i) => {
                    const percentLivre = Math.round((d.livre_gb / d.tamanho_gb) * 100);
                    return (
                      <div key={i} className="p-6 rounded-3xl shadow-sm border bg-white" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
                         <div className="flex justify-between items-center mb-4">
                           <div className="flex items-center gap-3"><span className="text-3xl">💿</span><span className="font-black text-2xl" style={{ color: 'var(--text-main)' }}>{d.drive}</span></div>
                           <span className={`text-xs font-black px-3 py-1 rounded-lg ${percentLivre < 15 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{percentLivre}% Livre</span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-3 mb-4"><div className={`h-3 rounded-full ${percentLivre < 15 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${percentLivre}%` }}></div></div>
                         <div className="flex justify-between text-sm font-bold"><span style={{ color: 'var(--text-muted)' }}>Livre: {d.livre_gb} GB</span><span style={{ color: 'var(--text-main)' }}>Total: {d.tamanho_gb} GB</span></div>
                      </div>
                    );
                 })}
               </div>
            </div>
          )}

          {/* ABA: REDE E PERIFÉRICOS */}
          {abaAtiva === 'rede' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
               <div>
                 <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80" style={{ color: 'var(--text-main)' }}>🌐 Interfaces de Rede</h3>
                 <div className="space-y-4">
                   {redes.length === 0 ? <p className="text-sm opacity-50">Nenhuma rede detectada.</p> : redes.map((r, i) => (
                     <div key={i} className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{r.descricao}</p>
                          {r.status && <span className={`text-[9px] px-2 py-1 rounded font-bold uppercase ${r.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{r.status}</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md">IPv4: {r.ip}</span>
                          <span className="text-[10px] font-mono font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded-md">MAC: {r.mac}</span>
                          {r.velocidade && <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-md">{r.velocidade} Mbps</span>}
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="space-y-8">
                 <div>
                   <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80" style={{ color: 'var(--text-main)' }}>🖨️ Impressoras ({impressoras.length})</h3>
                   <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {impressoras.length === 0 ? <p className="text-sm opacity-50">Nenhuma mapeada.</p> : impressoras.map((imp, i) => (
                         <div key={i} className="p-3 border rounded-xl flex items-center justify-between" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-card)' }}>
                            <div className="w-2/3"><div className="flex items-center gap-2"><p className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>{imp.nome}</p>{imp.padrao && <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded">Padrão</span>}</div><p className="text-[10px] font-mono mt-1 opacity-60" style={{ color: 'var(--text-muted)' }}>{imp.porta}</p></div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${imp.tipo === 'Rede' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{imp.tipo}</span>
                         </div>
                      ))}
                   </div>
                 </div>

                 <div>
                   <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80" style={{ color: 'var(--text-main)' }}>📷 Scanners e Imagem ({scanners.length})</h3>
                   <div className="flex flex-wrap gap-2">
                      {scanners.length === 0 ? <p className="text-sm opacity-50">Nenhum scanner detectado.</p> : scanners.map((scan, i) => (
                         <span key={i} className="text-xs font-bold px-3 py-1.5 rounded border shadow-sm flex items-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                            {scan}
                         </span>
                      ))}
                   </div>
                 </div>
               </div>
            </div>
          )}

          {/* ABA: SOFTWARES */}
          {abaAtiva === 'softwares' && (
            <div className="animate-fade-in">
              <div className="rounded-2xl border overflow-hidden shadow-sm bg-white" style={{ borderColor: 'var(--border-light)' }}>
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 text-[10px] uppercase font-black backdrop-blur-md bg-white/90" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
                    <tr>
                      <th className="p-4 border-r" style={{ borderColor: 'var(--border-light)' }}>Nome do Programa</th>
                      <th className="p-4 border-r hidden sm:table-cell" style={{ borderColor: 'var(--border-light)' }}>Fabricante</th>
                      <th className="p-4">Versão</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: 'var(--bg-card)' }}>
                    {softwares.length === 0 ? (
                      <tr><td colSpan="3" className="p-6 text-center font-bold opacity-50">Nenhum software listado.</td></tr>
                    ) : softwares.map((s, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-black/5 transition-all" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="p-4 font-bold border-r" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>{s.nome}</td>
                        <td className="p-4 opacity-70 border-r hidden sm:table-cell" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }}>{s.fabricante}</td>
                        <td className="p-4 font-mono text-[10px] opacity-70 font-bold" style={{ color: 'var(--text-main)' }}>{s.versao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA: SERVIÇOS */}
          {abaAtiva === 'servicos' && (
            <div className="animate-fade-in">
              <div className="flex flex-wrap content-start gap-2 p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                 {servicos.length === 0 ? <p className="text-sm opacity-50">Nenhum serviço listado.</p> : servicos.map((srv, i) => (
                    <span key={i} title={srv.nome} className="text-[10px] font-bold px-2.5 py-1.5 rounded-md border shadow-sm hover:scale-105 transition-all cursor-default" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
                      {srv.display || srv.nome}
                    </span>
                 ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}