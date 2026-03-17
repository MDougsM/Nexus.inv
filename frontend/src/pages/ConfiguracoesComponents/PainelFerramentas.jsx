import React from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function PainelFerramentas() {
  const baixarAgente = async () => {
    try {
      toast.info("Preparando Instalador...");
      const res = await api.get('/api/inventario/download/agente', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Nexus_Sentinel_Instalador.exe');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download concluído!");
    } catch (e) {
      toast.error("Erro ao baixar o Agente Sentinel.");
    }
  };

  const baixarBackup = async () => {
    try {
      toast.info("Gerando Backup Seguro...");
      const res = await api.get('/api/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NEXUS_Backup_${new Date().toISOString().split('T')[0]}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Backup salvo com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar backup.");
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl flex flex-col md:flex-row relative overflow-hidden mb-8">
      {/* LADO ESQUERDO: NEXUS SENTINEL */}
      <div className="flex-1 p-6 relative group hover:bg-gray-800/50 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-900/30 border border-blue-500/30 flex items-center justify-center text-2xl shadow-inner">🛡️</div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Nexus Sentinel <span className="text-[9px] bg-blue-600 px-2 py-0.5 rounded text-white uppercase tracking-widest">v5.0</span>
              </h3>
              <p className="text-gray-400 text-xs font-bold mt-1">Agente silencioso de varredura SNMP.</p>
            </div>
          </div>
          <button onClick={baixarAgente} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-[11px] uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
            📥 Baixar .EXE
          </button>
        </div>
      </div>

      {/* DIVISÓRIA SUTIL */}
      <div className="w-px bg-gray-800 hidden md:block"></div>
      <div className="h-px bg-gray-800 block md:hidden"></div>

      {/* LADO DIREITO: BACKUP DO SISTEMA */}
      <div className="flex-1 p-6 relative group hover:bg-gray-800/50 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-900/30 border border-green-500/30 flex items-center justify-center text-2xl shadow-inner">💾</div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">Backup do Sistema</h3>
              <p className="text-gray-400 text-xs font-bold mt-1">Download seguro do banco SQLite.</p>
            </div>
          </div>
          <button onClick={baixarBackup} className="bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-xl font-black transition-all shadow-lg shadow-green-600/20 active:scale-95 text-[11px] uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
            ⬇️ Baixar .DB
          </button>
        </div>
      </div>
    </div>
  );
}