import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/api';
import EmpresaCard from './EmpresaCard';
import ModalEditarEmpresa from './ModalEditarEmpresa';
import { FaEye, FaPlus, FaBullhorn, FaTrashRestore, FaTimes, FaUndo } from 'react-icons/fa';

export default function PainelMatriz() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaEmpresa, setNovaEmpresa] = useState('');
  
  // Modais
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  
  // States Auxiliares
  const [formBroadcast, setFormBroadcast] = useState({ titulo: '', mensagem: '' });

  const carregarEmpresas = async () => {
    try {
      const res = await api.get('/api/matriz/empresas');
      setEmpresas(res.data);
    } catch (e) { toast.error("Erro ao carregar tenants"); } finally { setLoading(false); }
  };

  useEffect(() => { carregarEmpresas(); }, []);

  const handleCriar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/matriz/empresas', { codigo_acesso: novaEmpresa.trim().toUpperCase() });
      toast.success("Ambiente criado com sucesso!");
      setNovaEmpresa('');
      carregarEmpresas();
    } catch (e) { toast.error("Erro ao provisionar ambiente."); }
  };

  const handleEnviarBroadcast = async (e) => {
      e.preventDefault();
      try {
          await api.post('/api/matriz/broadcast', formBroadcast);
          toast.success("📢 Notícia enviada para todos os clientes ativos!");
          setShowBroadcast(false);
          setFormBroadcast({ titulo: '', mensagem: '' });
      } catch (e) { toast.error("Erro ao enviar notícia."); }
  };

  const abrirLixeira = async () => {
      setShowLixeira(true);
      try {
          const res = await api.get('/api/matriz/lixeira-global');
          setItensLixeira(res.data);
      } catch (e) { toast.error("Erro ao ler lixeiras dos clientes."); }
  };

  const restaurarItem = async (empresa_codigo, patrimonio) => {
      try {
          await api.post('/api/matriz/lixeira-global/restaurar', { empresa_codigo, patrimonio });
          toast.success(`♻️ ${patrimonio} restaurado na empresa ${empresa_codigo}!`);
          abrirLixeira(); // Recarrega a lista
      } catch (e) { toast.error("Erro ao restaurar."); }
  };

  if (loading) return <div className="p-20 text-center font-bold text-gray-500 animate-pulse">Carregando Matriz Global...</div>;

  const totalReceita = empresas.reduce((acc, emp) => acc + (emp.valor_contrato || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-200 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-900 rounded-3xl flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/20"><FaEye size={28} /></div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-red-600">Matriz Nexus SaaS</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">Gestão Global e Faturamento</p>
          </div>
        </div>
        
        {/* NOVOS BOTÕES PREMIUM */}
        <div className="flex gap-3">
            <button onClick={() => setShowBroadcast(true)} className="px-5 py-3 rounded-2xl bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2">
                <FaBullhorn /> Broadcast Global
            </button>
            
            <div className="px-6 py-3 rounded-3xl border border-gray-200 flex gap-8 shadow-sm">
                <div><p className="text-[9px] font-black uppercase text-gray-400">Receita Mensal Estimada</p><p className="text-xl font-black text-green-500">R$ {totalReceita.toFixed(2)}</p></div>
                <div className="w-px bg-gray-200"></div>
                <div><p className="text-[9px] font-black uppercase text-gray-400">Total de Tenants</p><p className="text-xl font-black text-gray-300 text-right">{empresas.length}</p></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
        <div className="p-8 rounded-[40px] bg-gray-900 shadow-2xl border border-gray-800 text-white relative overflow-hidden group">
          <h4 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2"><FaPlus className="text-red-500" /> Novo Tenant</h4>
          <p className="text-[10px] font-bold text-gray-400 mb-8">Provisione um novo banco de dados SQLite instantaneamente.</p>
          <form onSubmit={handleCriar} className="space-y-4">
            <div className="bg-black/50 p-4 rounded-2xl border border-gray-800 focus-within:border-red-500 transition-colors">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-2">Código Único</label>
              <input type="text" required value={novaEmpresa} onChange={(e) => setNovaEmpresa(e.target.value.toUpperCase())} placeholder="EX: EMPRESA_ABC" className="w-full bg-transparent outline-none font-bold text-sm text-white placeholder-gray-700" />
            </div>
            <button type="submit" className="w-full py-4 rounded-2xl bg-red-600 font-black text-sm hover:bg-red-700 shadow-lg shadow-red-500/20 active:scale-95 transition-all">PROVISIONAR AGORA</button>
          </form>
        </div>
        {empresas.map(empresa => (
            <EmpresaCard key={empresa.id} empresa={empresa} onRefresh={carregarEmpresas} onEdit={() => setEmpresaEditando(empresa)} />
        ))}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {empresaEditando && <ModalEditarEmpresa empresa={empresaEditando} onClose={() => setEmpresaEditando(null)} onRefresh={carregarEmpresas} />}

      {/* 📢 MODAL BROADCAST */}
      {showBroadcast && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="bg-white w-full max-w-lg rounded-[40px] p-10 relative">
                  <button onClick={() => setShowBroadcast(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><FaTimes size={20}/></button>
                  <h3 className="text-2xl font-black flex items-center gap-3 text-blue-600 mb-2"><FaBullhorn /> Transmissão Global</h3>
                  <p className="text-xs text-gray-500 font-bold mb-6">Esta mensagem será injetada no log de todos os inquilinos.</p>
                  
                  <form onSubmit={handleEnviarBroadcast} className="space-y-4">
                      <input required placeholder="Título do Comunicado (Ex: Manutenção Agendada)" value={formBroadcast.titulo} onChange={e=>setFormBroadcast({...formBroadcast, titulo: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-blue-500" />
                      <textarea required placeholder="Escreva a mensagem aqui..." rows="4" value={formBroadcast.mensagem} onChange={e=>setFormBroadcast({...formBroadcast, mensagem: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-2xl font-medium outline-none focus:border-blue-500 resize-none"></textarea>
                      <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30">TRANSMITIR AGORA</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}