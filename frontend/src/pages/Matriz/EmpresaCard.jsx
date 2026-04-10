import React from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { FaEdit, FaUsers, FaCheckCircle, FaExclamationTriangle, FaCalendarAlt, FaSignInAlt, FaDownload } from 'react-icons/fa';

export default function EmpresaCard({ empresa, onRefresh, onEdit, onManageUsers }) {
  
  const handleConfirmarPagamento = async () => {
    if (!window.confirm(`Confirmar pagamento de R$ ${empresa.valor_contrato} para ${empresa.codigo_acesso}?`)) return;
    try {
      await api.post(`/api/matriz/empresas/${empresa.id}/confirmar-pagamento`);
      toast.success("Ciclo renovado com sucesso!");
      onRefresh();
    } catch (e) { toast.error("Erro ao processar pagamento."); }
  };

  // 🚀 O ACESSO MÁGICO (IMPERSONATION)
  const handleAcessoMagico = () => {
      if (!window.confirm(`Entrar no ambiente de ${empresa.codigo_acesso} como Ghost Admin?`)) return;
      localStorage.setItem('empresa', empresa.codigo_acesso);
      // Mantém o usuário "Nexus" logado e apenas troca a empresa no roteador
      toast.info(`Infiltrando em ${empresa.codigo_acesso}...`);
      setTimeout(() => window.location.href = '/', 1000);
  };

  // 🚀 DOWNLOAD DO BANCO FÍSICO
  const handleDownload = async () => {
      try {
          toast.info("Preparando download seguro...");
          const res = await api.get(`/api/matriz/empresas/${empresa.id}/download`, { responseType: 'blob' });
          
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', empresa.db_nome);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          toast.success("Download do banco concluído!");
      } catch (e) {
          toast.error("Erro ao baixar arquivo do servidor.");
      }
  };

  return (
    <div className={`p-8 rounded-[40px] border-2 transition-all shadow-xl hover:shadow-2xl flex flex-col h-full ${empresa.inadimplente ? 'bg-red-600/5 border-red-500' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-start mb-8">
            <div>
                <h4 className="text-2xl font-black tracking-tighter text-gray-900">{empresa.codigo_acesso}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{empresa.db_nome}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={handleDownload} title="Baixar Banco de Dados" className="p-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                    <FaDownload size={16} />
                </button>
                {empresa.inadimplente ? (
                    <div className="p-3 rounded-2xl bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/40"><FaExclamationTriangle size={16} /></div>
                ) : (
                    <div className="p-3 rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/40"><FaCheckCircle size={16} /></div>
                )}
            </div>
        </div>

        <div className="space-y-4 mb-8 flex-1">
            <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-400">Mensalidade:</span>
                <span className="font-black text-gray-900">R$ {empresa.valor_contrato?.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-400 flex items-center gap-2"><FaCalendarAlt /> Vencimento:</span>
                <span className={`font-black ${empresa.inadimplente ? 'text-red-600' : 'text-blue-600'}`}>Todo dia {empresa.dia_vencimento}</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleAcessoMagico} className="col-span-2 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95">
                <FaSignInAlt /> ACESSAR EMPRESA (GHOST)
            </button>
            <button onClick={handleConfirmarPagamento} className="py-3 rounded-2xl bg-green-600 text-white text-[10px] font-black uppercase hover:bg-green-700 transition-all">
                Dar Baixa / Pago
            </button>
            <button onClick={onManageUsers} className="py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all">
                <FaUsers /> Usuários
            </button>
            <button onClick={onEdit} className="col-span-2 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                <FaEdit /> Editar Contrato
            </button>
        </div>
    </div>
  );
}