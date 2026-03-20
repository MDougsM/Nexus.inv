import React from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function PainelFerramentas() {
  
  // 1. Download do Sentinel (Impressoras/SNMP)
  const baixarSentinel = async () => {
    try {
      toast.info("Preparando Instalador Sentinel...");
      const res = await api.get('/api/inventario/download/sentinel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Nexus_Sentinel_Instalador.exe');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download do Sentinel concluído!");
    } catch (e) {
      toast.error("Erro ao baixar o Sentinel. Verifique a API.");
    }
  };

  // 2. Download do Agente (Geral/PCs)
  const baixarAgente = async () => {
    try {
      toast.info("Preparando Instalador do Agente...");
      const res = await api.get('/api/inventario/download/agente', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Nexus_Instalador.exe');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download do Agente concluído!");
    } catch (e) {
      toast.error("Erro ao baixar o Agente. Verifique a API.");
    }
  };

  return (
    <div className="bg-[#1e293b] border border-gray-800 rounded-3xl shadow-xl flex flex-col md:flex-row relative overflow-hidden mb-8">
      
      {/* LADO ESQUERDO: NEXUS SENTINEL */}
      <div className="flex-1 p-6 relative group hover:bg-gray-800/50 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-2xl shadow-inner">🛡️</div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Nexus Sentinel <span className="text-[9px] bg-blue-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">v5.0</span>
              </h3>
              <p className="text-gray-400 text-xs font-bold mt-1">Agente de varredura SNMP (Impressoras).</p>
            </div>
          </div>
          <button 
            onClick={baixarSentinel} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-[11px] uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"
          >
            📥 Baixar Sentinel
          </button>
        </div>
      </div>

      {/* DIVISÓRIA SUTIL */}
      <div className="w-px bg-gray-700 hidden md:block"></div>
      <div className="h-px bg-gray-700 block md:hidden"></div>

      {/* LADO DIREITO: AGENTE NEXUS */}
      <div className="flex-1 p-6 relative group hover:bg-gray-800/50 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner">💻</div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Agente Nexus <span className="text-[9px] bg-purple-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">v4.4</span>
              </h3>
              <p className="text-gray-400 text-xs font-bold mt-1">Agente de telemetria geral para PCs.</p>
            </div>
          </div>
          <button 
            onClick={baixarAgente} 
            className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-black transition-all shadow-lg shadow-purple-600/20 active:scale-95 text-[11px] uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"
          >
            📥 Baixar Agente
          </button>
        </div>
      </div>
      
    </div>
  );
}