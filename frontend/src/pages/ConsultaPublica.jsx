import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';

export default function ConsultaPublica() {
  const { patrimonio } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const buscarFicha = async () => {
      try {
        const res = await api.get(`/api/inventario/ficha/detalhes/${patrimonio}`);
        setDados(res.data);
      } catch (e) {
        setErro(true);
      }
    };
    buscarFicha();
  }, [patrimonio]);

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full border-t-4 border-red-500">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Ativo não localizado</h2>
          <p className="text-sm text-gray-500 font-medium">O patrimônio <strong className="text-red-500">{patrimonio}</strong> não existe ou foi removido da base de dados.</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-blue-400 font-bold uppercase tracking-widest text-xs">A carregar dados seguros...</p>
      </div>
    );
  }

  const { ativo, historico } = dados;

  const statusCor = ativo.status?.toUpperCase() === 'ATIVO' ? 'bg-green-500 text-white shadow-green-500/30' :
                    ativo.status?.toUpperCase() === 'MANUTENÇÃO' ? 'bg-yellow-500 text-white shadow-yellow-500/30' :
                    'bg-gray-500 text-white shadow-gray-500/30';

  return (
    <div className="min-h-screen bg-gray-100 font-sans sm:p-8 pb-10">
      <div className="max-w-md mx-auto bg-white sm:rounded-3xl shadow-2xl overflow-hidden border-b sm:border border-gray-200 animate-fade-in min-h-screen sm:min-h-0">
        
        {/* HEADER APLICATIVO */}
        <div className="bg-gray-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-[64px] opacity-40"></div>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1 relative z-10">Ficha Técnica Oficial</p>
          <h1 className="text-5xl font-black font-mono text-white tracking-wider relative z-10 drop-shadow-md">{ativo.patrimonio}</h1>
        </div>

        {/* INFO PRINCIPAL COM BADGE FLUTUANTE */}
        <div className="px-6 pb-6 pt-2 text-center border-b border-gray-100 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg ${statusCor}`}>
              {ativo.status || 'Desconhecido'}
            </span>
          </div>
          <h2 className="mt-6 text-lg font-black text-gray-800">{ativo.marca} {ativo.modelo}</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{ativo.categoria?.nome || 'Equipamento'}</p>
        </div>

        {/* LOCALIZAÇÃO (TIPO GPS) */}
        <div className="p-6 bg-blue-50/30 border-b border-gray-100">
          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>📍</span> Localização Atual
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Secretaria</span>
              <span className="block text-sm font-black text-gray-800 leading-tight">{ativo.secretaria || 'N/A'}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
              <span className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Setor</span>
              <span className="block text-sm font-black text-gray-800 leading-tight">{ativo.setor || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* ESPECIFICAÇÕES DINÂMICAS */}
        {ativo.dados_dinamicos && Object.keys(ativo.dados_dinamicos).length > 0 && (
          <div className="p-6 border-b border-gray-100 bg-white">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>⚙️</span> Especificações
            </h4>
            <div className="space-y-2">
              {Object.entries(ativo.dados_dinamicos).map(([chave, valor]) => (
                valor && (
                  <div key={chave} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs font-bold text-gray-500 uppercase">{chave}</span>
                    <span className="text-sm font-black text-gray-800 text-right">{valor}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* NOVIDADE: LINHA DO TEMPO (HISTÓRICO) */}
        <div className="p-6 bg-white">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span>📜</span> Histórico de Movimentação
          </h4>
          
          {historico && historico.length > 0 ? (
            <div className="relative pl-4 border-l-2 border-gray-200 space-y-6">
              {historico.map((log, idx) => (
                <div key={idx} className="relative">
                  {/* Bolinha da timeline */}
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-500"></div>
                  
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {new Date(log.data_hora).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">
                      {log.usuario}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mb-1">{log.acao}</p>
                  <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded border border-gray-100">
                    {log.detalhes}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 font-bold italic text-center py-4 bg-gray-50 rounded-lg">Nenhum histórico registrado.</p>
          )}
        </div>

      </div>
    </div>
  );
}