import React, { useState } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import { FaTimes, FaSave, FaTools, FaServer } from 'react-icons/fa';

export default function ModalEditarEmpresa({ empresa, onClose, onRefresh }) {
  const [form, setForm] = useState({
      codigo: empresa.codigo_acesso,
      valor: empresa.valor_contrato || 0,
      dia_vencimento: empresa.dia_vencimento || 10,
      ciclo: empresa.ciclo_pagamento || 'MENSAL',
      limite_maquinas: empresa.limite_maquinas ?? 50,
      em_manutencao: empresa.em_manutencao || false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/matriz/empresas/${empresa.id}/atualizar`, form);
      toast.success("Configurações aplicadas com sucesso!");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao atualizar.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"><FaTimes size={24} /></button>
        
        <h3 className="text-3xl font-black text-gray-900 mb-2">Painel de Ajustes do Inquilino</h3>
        <p className="text-sm text-gray-500 mb-8 font-medium">Controle de faturamento, infraestrutura e acessos.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                
                {/* IDENTIDADE E FATURAMENTO */}
                <div className="col-span-2 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <label className="text-[9px] font-black uppercase text-gray-400">Nome da Empresa (ID Acesso)</label>
                    <input className="w-full bg-transparent font-black uppercase mt-1 outline-none text-gray-900" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} />
                </div>
                
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <label className="text-[9px] font-black uppercase text-gray-400">Valor Mensal (R$)</label>
                    <input type="number" className="w-full bg-transparent font-black mt-1 outline-none text-gray-900" value={form.valor} onChange={e => setForm({...form, valor: parseFloat(e.target.value)})} />
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <label className="text-[9px] font-black uppercase text-gray-400">Dia Vencimento</label>
                    <input type="number" min="1" max="31" className="w-full bg-transparent font-black mt-1 outline-none text-gray-900" value={form.dia_vencimento} onChange={e => setForm({...form, dia_vencimento: parseInt(e.target.value)})} />
                </div>

                {/* INFRAESTRUTURA (NOVOS) */}
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <label className="text-[9px] font-black uppercase text-blue-500 flex items-center gap-1"><FaServer /> Limite de Máquinas (Cota)</label>
                    <input type="number" min="0" className="w-full bg-transparent font-black mt-1 outline-none text-blue-900" value={form.limite_maquinas} onChange={e => setForm({...form, limite_maquinas: parseInt(e.target.value)})} />
                    <p className="text-[8px] text-blue-400 font-bold mt-1 uppercase">0 = Ilimitado</p>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col justify-center cursor-pointer" onClick={() => setForm({...form, em_manutencao: !form.em_manutencao})}>
                    <label className="text-[9px] font-black uppercase text-orange-500 flex items-center gap-1"><FaTools /> Modo Manutenção</label>
                    <div className="flex items-center gap-3 mt-2">
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${form.em_manutencao ? 'bg-orange-500' : 'bg-orange-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${form.em_manutencao ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-xs font-black text-orange-900">{form.em_manutencao ? 'ATIVADO' : 'DESATIVADO'}</span>
                    </div>
                </div>

            </div>

            <button type="submit" className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                <FaSave /> SALVAR CONFIGURAÇÕES
            </button>
        </form>
      </div>
    </div>
  , document.body);
}