import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function AssistenteMigracao({ usuarioAtual }) {
  const [fileLocais, setFileLocais] = useState(null);
  const [fileTipos, setFileTipos] = useState(null);
  const [fileAtivos, setFileAtivos] = useState(null);
  const [loadingImport, setLoadingImport] = useState({ locais: false, tipos: false, ativos: false });
  
  const refLocais = useRef();
  const refTipos = useRef();
  const refAtivos = useRef();

  const realizarUpload = async (tipo, file, ref) => {
    if (!file) return toast.warn("Selecione um arquivo CSV primeiro.");
    if (!file.name.endsWith('.csv')) return toast.warn("Formato inválido! Use .csv");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("usuario", usuarioAtual);

    setLoadingImport(prev => ({...prev, [tipo]: true}));
    
    try {
      const res = await api.post(`/api/importacao/${tipo}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success(`✅ ${res.data.message}`, { autoClose: 5000 });
      if(tipo === 'locais') setFileLocais(null);
      if(tipo === 'categorias') setFileTipos(null);
      if(tipo === 'ativos') setFileAtivos(null);
      if(ref.current) ref.current.value = '';
    } catch (e) {
      toast.error(e.response?.data?.detail || `Erro ao processar ${tipo}.`);
    } finally {
      setLoadingImport(prev => ({...prev, [tipo]: false}));
    }
  };

  return (
    <div className="pt-4 animate-fade-in space-y-8">
      <div>
        <h3 className="font-black text-2xl tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>Assistente de Migração</h3>
        <p className="text-sm font-bold opacity-50 uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Siga a ordem estrutural do banco de dados</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-blue-500 text-lg mb-6 shadow-inner" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>1</div>
              <h4 className="font-black text-lg mb-2 tracking-tight" style={{ color: 'var(--color-blue)' }}>Locais & Setores</h4>
              <p className="text-xs font-medium mb-6 leading-relaxed opacity-70" style={{ color: 'var(--text-main)' }}>Estrutura organizacional.<br/>Colunas: <code>Secretaria</code>, <code>Setor</code></p>
              <input type="file" accept=".csv" ref={refLocais} onChange={(e) => setFileLocais(e.target.files[0])} className="w-full text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-main)' }} />
            </div>
            <button onClick={() => realizarUpload('locais', fileLocais, refLocais)} disabled={!fileLocais || loadingImport.locais} className="w-full py-3 rounded-xl font-black text-white shadow-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all">
              {loadingImport.locais ? 'Enviando...' : 'Importar Locais'}
            </button>
          </div>

          <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-yellow-500 text-lg mb-6 shadow-inner" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>2</div>
              <h4 className="font-black text-lg mb-2 tracking-tight" style={{ color: 'var(--color-yellow)' }}>Tipos de Equipamento</h4>
              <p className="text-xs font-medium mb-6 leading-relaxed opacity-70" style={{ color: 'var(--text-main)' }}>Categorias e especificações.<br/>Colunas: <code>Nome</code>, <code>Campos</code></p>
              <input type="file" accept=".csv" ref={refTipos} onChange={(e) => setFileTipos(e.target.files[0])} className="w-full text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-main)' }} />
            </div>
            <button onClick={() => realizarUpload('categorias', fileTipos, refTipos)} disabled={!fileTipos || loadingImport.tipos} className="w-full py-3 rounded-xl font-black text-white shadow-lg bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all">
              {loadingImport.tipos ? 'Criando...' : 'Importar Tipos'}
            </button>
          </div>

          <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-red-500 text-lg mb-6 shadow-inner" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>3</div>
              <h4 className="font-black text-lg mb-2 tracking-tight" style={{ color: 'var(--color-red)' }}>Inventário Geral</h4>
              <p className="text-xs font-medium mb-6 leading-relaxed opacity-70" style={{ color: 'var(--text-main)' }}>Planilha mestre de ativos.<br/>Colunas: <code>Patrimonio</code>, <code>Status</code>, <code>Marca</code>...</p>
              <input type="file" accept=".csv" ref={refAtivos} onChange={(e) => setFileAtivos(e.target.files[0])} className="w-full text-xs font-bold mb-6 opacity-80" style={{ color: 'var(--text-main)' }} />
            </div>
            <button onClick={() => realizarUpload('ativos', fileAtivos, refAtivos)} disabled={!fileAtivos || loadingImport.ativos} className="w-full py-3 rounded-xl font-black text-white shadow-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all">
              {loadingImport.ativos ? 'Injetando...' : 'Injetar Máquinas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}