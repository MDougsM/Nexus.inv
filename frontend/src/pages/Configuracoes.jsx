import React, { useState } from 'react';
import { toast } from 'react-toastify';
import PainelFerramentas from './ConfiguracoesComponents/PainelFerramentas';
import GerenciamentoUsuarios from './ConfiguracoesComponents/GerenciamentoUsuarios';
import AssistenteMigracao from './ConfiguracoesComponents/AssistenteMigracao';

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('usuarios'); 
  const usuarioAtual = localStorage.getItem('usuario') || 'admin';
  const [empresa, setEmpresa] = useState(localStorage.getItem('empresaNome') || '');
  const [doc, setDoc] = useState(localStorage.getItem('empresaDoc') || '');

  const salvarDadosEmpresa = (e) => {
    e.preventDefault();
    localStorage.setItem('empresaNome', empresa);
    localStorage.setItem('empresaDoc', doc);
    toast.success("Informações salvas com sucesso! 🏢");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-blue-500/30">⚙️</div>
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Painel de Controle</h2>
          <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>Preferências, segurança e ferramentas do sistema</p>
        </div>
      </div>

      {/* CAIXA UNIFICADA (Sentinel + Backup) */}
      <PainelFerramentas />

      {/* NAVEGAÇÃO ENTRE ABAS */}
      <div className="flex space-x-8 border-b overflow-x-auto custom-scrollbar" style={{ borderColor: 'var(--border-light)' }}>
        <button onClick={() => setAbaAtiva('usuarios')} className={`pb-4 text-sm font-black tracking-wide border-b-2 transition-all whitespace-nowrap ${abaAtiva === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>👥 Equipe & Usuários</button>
        <button onClick={() => setAbaAtiva('relatorios')} className={`pb-4 text-sm font-black tracking-wide border-b-2 transition-all whitespace-nowrap ${abaAtiva === 'relatorios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🏢 Dados da Organização</button>
        <button onClick={() => setAbaAtiva('migracao')} className={`pb-4 text-sm font-black tracking-wide border-b-2 transition-all whitespace-nowrap ${abaAtiva === 'migracao' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>🚀 Importação de Dados</button>
      </div>

      {/* RENDERIZAÇÃO DAS ABAS */}
      {abaAtiva === 'usuarios' && <GerenciamentoUsuarios usuarioAtual={usuarioAtual} />}
      
      {abaAtiva === 'relatorios' && (
        <div className="pt-4 animate-fade-in">
          <div className="p-8 rounded-3xl border shadow-xl max-w-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>🏢</div>
              <div>
                <h3 className="font-black text-xl tracking-tight" style={{ color: 'var(--text-main)' }}>Identidade da Organização</h3>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Cabeçalhos oficiais de relatórios</p>
              </div>
            </div>
            <form onSubmit={salvarDadosEmpresa} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>NOME DA EMPRESA / INSTITUIÇÃO</label>
                <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex: Secretaria de Tecnologia" className="w-full p-4 rounded-xl border outline-none font-black text-lg focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>CNPJ / DEPARTAMENTO (Opcional)</label>
                <input value={doc} onChange={e => setDoc(e.target.value)} placeholder="Ex: 00.000.000/0001-00" className="w-full p-3 rounded-xl border outline-none font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
              <button type="submit" className="px-8 py-3 text-white rounded-xl font-black transition-all hover:bg-gray-800 shadow-lg active:scale-95 bg-gray-900 border border-gray-700">💾 Salvar Informações</button>
            </form>
          </div>
        </div>
      )}

      {abaAtiva === 'migracao' && <AssistenteMigracao usuarioAtual={usuarioAtual} />}

    </div>
  );
}