import React from 'react';

export default function AbaManutencao({ historicoManut }) {
  const getStatusBadge = (status) => {
    const s = status?.toUpperCase() || 'ATIVO';
    if (s === 'ATIVO') return <span className="px-2 py-1 text-[10px] font-bold rounded" style={{backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)'}}>{s}</span>;
    if (s === 'MANUTENÇÃO') return <span className="px-2 py-1 text-[10px] font-bold rounded" style={{backgroundColor: 'var(--badge-yellow-bg)', color: 'var(--badge-yellow-text)'}}>{s}</span>;
    if (s === 'SUCATA') return <span className="px-2 py-1 text-[10px] font-bold rounded" style={{backgroundColor: 'var(--badge-gray-bg)', color: 'var(--badge-gray-text)'}}>{s}</span>;
    return <span className="px-2 py-1 text-[10px] font-bold rounded bg-blue-100 text-blue-700">{s}</span>;
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="p-4 border-b font-bold flex items-center gap-2" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
          <span>📋 Histórico de Ordens de Serviço e Descartes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>
              <tr>
                <th className="p-4 font-semibold text-xs uppercase">Data</th>
                <th className="p-4 font-semibold text-xs uppercase">Patrimônio</th>
                <th className="p-4 font-semibold text-xs uppercase">Movimentação</th>
                <th className="p-4 font-semibold text-xs uppercase">O.S. (Milvus)</th>
                <th className="p-4 font-semibold text-xs uppercase">Motivo / Destino</th>
              </tr>
            </thead>
            <tbody>
              {historicoManut.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted">Nenhum registro encontrado.</td></tr>
              ) : (
                historicoManut.map(reg => (
                  <tr key={reg.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border-light)' }}>
                    <td className="p-4 text-xs font-bold" style={{color:'var(--text-muted)'}}>{new Date(reg.data_registro).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 font-mono font-bold" style={{color:'var(--color-blue)'}}>{reg.patrimonio}</td>
                    <td className="p-4"><span className="text-[10px] uppercase font-bold text-gray-500">{reg.status_anterior} ➡️ </span>{getStatusBadge(reg.status_novo)}</td>
                    <td className="p-4 font-bold" style={{color:'var(--text-main)'}}>{reg.os_referencia || '-'}</td>
                    <td className="p-4 text-xs italic" style={{color:'var(--text-muted)'}}>{reg.motivo} {reg.destino && <span className="block mt-1 font-bold" style={{color: 'var(--color-red)'}}>Destino Final: {reg.destino}</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}