import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function ConsultaQR() {
  const { tenant, patrimonio } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [modo, setModo] = useState('VISITANTE');

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // Usa o axios direto para poder injetar o tenant no header dinamicamente
        const token = localStorage.getItem('token');
        const headers = { 'x-empresa': tenant };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        
        const res = await axios.get(`${baseURL}/api/inventario/qr-access/${patrimonio}`, { headers });
        
        setDados(res.data.dados_basicos);
        setModo(res.data.access_level);
      } catch (error) {
        toast.error("Ativo não encontrado ou erro de acesso.");
        setDados(false); // false indica erro/não achou
      } finally {
        setLoading(false);
      }
    };

    buscarDados();
  }, [tenant, patrimonio]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-gray-500 uppercase tracking-widest text-sm">Consultando Base de Dados...</p>
        </div>
      </div>
    );
  }

  if (dados === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Ativo Inativo</h2>
          <p className="text-sm text-gray-500 font-bold mb-6">Este patrimônio não existe ou foi removido da base.</p>
          <button onClick={() => window.location.href = '/'} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Ir para a Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* HEADER GOVERNAMENTAL */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6 rounded-b-[40px] shadow-lg shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">🏛️</span>
            <span className="font-black tracking-widest text-xs opacity-80 uppercase">{tenant}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border ${modo === 'EDITOR' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-white/10 border-white/20 text-white/70'}`}>
            MODO {modo}
          </span>
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-1">Patrimônio Público</p>
        <h1 className="text-4xl font-black tracking-tight mb-1">{dados.patrimonio}</h1>
        <p className="text-sm font-bold opacity-90">{dados.equipamento}</p>
      </div>

      {/* CORPO DA FICHA */}
      <div className="flex-1 p-6 space-y-4 -mt-4 z-10">
        
        {/* Card de Status */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Operacional</p>
            <p className={`font-black text-lg ${dados.status === 'ATIVO' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {dados.status}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${dados.status === 'ATIVO' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            {dados.status === 'ATIVO' ? '✅' : '⚠️'}
          </div>
        </div>

        {/* Card de Localização */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-3">
            <span className="text-blue-500 text-xl">📍</span>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Localização</h3>
          </div>
          <div>
            <p className="font-black text-sm text-gray-700">{dados.unidade || 'Não alocado'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Unidade Administrativa</p>
          </div>
        </div>

        {/* ÁREA DO EDITOR (Aparece só se estiver logado) */}
        {modo === 'EDITOR' ? (
          <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 animate-fade-in mt-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-800 mb-4 flex items-center gap-2">
              <span>⚡</span> Ações Rápidas do Técnico
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 text-blue-700 font-bold text-xs flex flex-col items-center gap-2 active:scale-95 transition-all">
                <span className="text-xl">🛠️</span>
                Mudar Status
              </button>
              <button className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 text-blue-700 font-bold text-xs flex flex-col items-center gap-2 active:scale-95 transition-all">
                <span className="text-xl">🚚</span>
                Transferir
              </button>
            </div>
            <button onClick={() => navigate('/')} className="w-full mt-3 py-3 bg-blue-600 text-white font-black text-sm rounded-xl shadow-md active:scale-95 transition-all">
              Abrir Sistema Completo
            </button>
          </div>
        ) : (
          /* BOTÃO PARA LOGIN DE TÉCNICO */
          <div className="mt-8 pt-8 border-t border-gray-200">
            <button onClick={() => navigate('/login')} className="w-full py-4 bg-gray-900 text-white font-black text-sm rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              <span>🔐</span> Sou Técnico / Fazer Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}