import React from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getNomeTipoEquipamento } from '../../../utils/helpers';

export default function ModalQR({ modalQR, setModalQR, categorias }) {
  if (!modalQR.aberto) return null;
  const tenantAtual = localStorage.getItem('tenant_id') || 'NEWPC';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:bg-white print:p-0" onClick={() => setModalQR({ aberto: false, ativo: null })}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl border p-8 flex flex-col items-center text-center print:border-none" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }} onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-2xl mb-1 tracking-tight" style={{ color: 'var(--text-main)' }}>NEXUS.INV</h3>
        <p className="text-[10px] font-black uppercase mb-8 border-b pb-4 w-full tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>Patrimônio Público</p>
        
        <div className="p-4 border rounded-2xl shadow-lg mb-8 bg-white">
          <QRCodeSVG value={`${window.location.origin}/consulta/${tenantAtual}/${modalQR.ativo?.patrimonio}`} size={200} level="H" includeMargin={false} />
        </div>
        
        <div className="text-4xl font-black font-mono mb-2 tracking-wider" style={{ color: 'var(--text-main)' }}>{modalQR.ativo?.patrimonio}</div>
        <div className="text-sm font-bold opacity-80" style={{ color: 'var(--text-muted)' }}>
            {getNomeTipoEquipamento(modalQR.ativo, categorias)} • {modalQR.ativo?.marca}
        </div>
        
        <button onClick={() => window.print()} className="mt-10 w-full py-3.5 rounded-xl font-black text-white bg-blue-600 shadow-lg hover:bg-blue-700 transition-all active:scale-95 print:hidden">🖨️ Imprimir Etiqueta</button>
        <button onClick={() => setModalQR({ aberto: false, ativo: null })} className="mt-3 w-full py-3 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all print:hidden" style={{ color: 'var(--text-main)' }}>Cancelar</button>
      </div>
    </div>, document.body
  );
}