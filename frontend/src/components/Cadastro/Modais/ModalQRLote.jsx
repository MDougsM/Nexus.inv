import React from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getNomeTipoEquipamento } from '../../../utils/helpers';

export default function ModalQRLote({ modalQRLote, setModalQRLote, categorias }) {
  if (!modalQRLote.aberto) return null;
  const tenantAtual = localStorage.getItem('tenant_id') || 'NEWPC';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white" onClick={() => setModalQRLote({ aberto: false, ativos: [] })}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-8 print:p-0" style={{ backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8 border-b pb-4 print:hidden" style={{ borderColor: 'var(--border-light)' }}>
          <div>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Impressão em Lote ({modalQRLote.ativos.length})</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>As etiquetas serão ajustadas em uma grade na folha A4.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalQRLote({aberto: false, ativos: []})} className="px-5 py-2.5 rounded-lg font-bold" style={{ color: 'var(--text-muted)' }}>Voltar</button>
            <button onClick={() => window.print()} className="px-6 py-2.5 rounded-lg font-bold text-white shadow-md bg-blue-600 hover:bg-blue-700">🖨️ Iniciar Impressão</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4 print:w-full">
          {modalQRLote.ativos.map((ativo, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl text-center page-break-inside-avoid print:border-gray-800 print:border-solid print:rounded-none">
               <h4 className="font-black text-xs tracking-widest mb-2 border-b w-full pb-2">NEXUS CONTROL</h4>
               <div className="bg-white p-1 rounded-md">
                 <QRCodeSVG value={`${window.location.origin}/consulta/${tenantAtual}/${ativo.patrimonio}`} size={90} level="H" includeMargin={false} />
               </div>
               <p className="mt-3 font-mono font-black text-lg tracking-wider">{ativo.patrimonio}</p>
               <p className="text-[10px] font-bold uppercase truncate w-full mt-1" style={{ color: 'var(--text-muted)' }}>{getNomeTipoEquipamento(ativo, categorias) || 'Ativo'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>, document.body
  );
}