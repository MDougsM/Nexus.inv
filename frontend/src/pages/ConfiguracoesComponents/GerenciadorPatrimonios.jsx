import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

export default function GerenciadorPatrimonios() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({ proximo_livre: 'Carregando...', total_usados: 0, lista_usados: [] });
  const [loading, setLoading] = useState(true);
  
  // States para a impressão em lote
  const [rangeInicio, setRangeInicio] = useState('');
  const [rangeFim, setRangeFim] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarStatus();
  }, []);

  const carregarStatus = async () => {
    try {
      const response = await api.get('/api/inventario/patrimonios/status');
      const data = response.data || {};
      setStatus({
        proximo_livre: 'Carregando...',
        total_usados: 0,
        lista_usados: [],
        ...data,
      });
      
      // Sugere o próximo range de 10 etiquetas
      if (data.proximo_livre) {
        const numSugerido = parseInt(data.proximo_livre.replace(/\D/g, ''));
        setRangeInicio(numSugerido);
        setRangeFim(numSugerido + 9);
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor para ler os patrimônios.');
    } finally {
      setLoading(false);
    }
  };

  const irParaAtivo = (patrimonio) => {
    navigate(`/inventario?busca=${patrimonio}`);
  };

  // 🚀 IMPRESSÃO NATIVA: Cria a tela e manda o próprio navegador imprimir!
  const imprimirLoteNativo = (listaPatrimonios) => {
    if (!listaPatrimonios || listaPatrimonios.length === 0) {
      toast.warning('Nenhuma etiqueta válida para imprimir.');
      return;
    }
    
    // Abre a aba invisível/pop-up
    const janelaImpressao = window.open('', '_blank', 'width=800,height=600');
    const urlBase = window.location.origin;

    // Constrói o HTML (Tamanho exato da térmica 50x80 com page-break)
    const htmlEtiquetas = listaPatrimonios.map(pat => `
      <div style="width: 50mm; height: 80mm; padding: 4mm; box-sizing: border-box; text-align: center; font-family: sans-serif; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
        
        <div style="width: 100%;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #1e293b;">NEXUS.INV</h2>
          <p style="margin: 2px 0 0 0; font-size: 7px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Patrimônio Oficial</p>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #cbd5e1; width: 100%;" />
        </div>

        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px; display: inline-block; background: #fff;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlBase + '/consulta/' + pat)}" style="width: 32mm; height: 32mm; display: block;" />
        </div>

        <div style="margin-top: 5px; width: 100%;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #1e293b;">${pat}</h1>
          <p style="margin: 2px 0 0 0; font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase;">EQUIPAMENTO DA REDE</p>
        </div>
        
      </div>
    `).join('');

    // Injeta o HTML na aba e aciona a impressora
    janelaImpressao.document.write(`
      <html>
        <head>
          <title>Impressão de Etiquetas Nexus</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: #fff; }
              @page { size: 50mm 80mm; margin: 0; }
            }
            body { background: #e2e8f0; display: flex; flex-direction: column; align-items: center; }
          </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 800);">
          ${htmlEtiquetas}
        </body>
      </html>
    `);
    janelaImpressao.document.close();
  };

  const gerarImpressaoPorRange = (e) => {
    e.preventDefault();
    const inicio = parseInt(rangeInicio);
    const fim = parseInt(rangeFim);
    if (!inicio || !fim || inicio > fim) return toast.warning('Range inválido.');

    const lista = [];
    for (let i = inicio; i <= fim; i++) {
      // 🚀 Formatado com o seu padrão NXS-XXXX
      const formatado = String(i).padStart(4, '0');
      lista.push(`NXS-${formatado}`); 
    }
    imprimirLoteNativo(lista);
  };

  const gerarImpressaoDaBusca = () => {
    const lista = ativosFiltrados.map(a => a.patrimonio);
    imprimirLoteNativo(lista);
  };

  const ativosFiltrados = (status.lista_usados || []).filter(item => 
    item.patrimonio?.toLowerCase().includes(busca.toLowerCase()) || 
    item.modelo?.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center animate-pulse font-bold" style={{ color: 'var(--text-main)' }}>Carregando Gestor de Patrimônios...</div>;

  return (
    <div className="pt-4 animate-fade-in space-y-6">
      
      {/* CARD 1: GERADOR DE LOTE E RESUMO */}
      <div className="p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row gap-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        
        {/* Lado Esquerdo: Info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-inner bg-green-500/10 text-green-500 border-green-500/20">🏷️</div>
            <div>
              <h3 className="font-black text-xl tracking-tight" style={{ color: 'var(--text-main)' }}>Estoque de Etiquetas</h3>
              <p className="text-xs font-bold opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Geração Contínua de Códigos de Barras</p>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl border flex flex-col justify-center" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <span className="text-xs font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>Próxima Etiqueta Livre Sugerida</span>
            <span className="text-4xl font-black text-blue-500 mt-1">{status.proximo_livre}</span>
            <p className="text-sm font-bold opacity-50 mt-2" style={{ color: 'var(--text-main)' }}>Você tem <b>{status.total_usados}</b> ativos com etiquetas atreladas na rede.</p>
          </div>
        </div>

        {/* Lado Direito: Form de Impressão */}
        <div className="flex-1 p-6 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>🖨️ Imprimir Novo Rolo</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Do Número:</label>
                <input type="number" min="1" value={rangeInicio} onChange={e => setRangeInicio(e.target.value)} className="w-full p-3 rounded-xl border outline-none font-black focus:ring-2 focus:ring-blue-500/20 transition-all text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
              <span className="font-black mt-4 opacity-30" style={{ color: 'var(--text-main)' }}>ATÉ</span>
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase opacity-60 mb-1" style={{ color: 'var(--text-main)' }}>Ao Número:</label>
                <input type="number" min="1" value={rangeFim} onChange={e => setRangeFim(e.target.value)} className="w-full p-3 rounded-xl border outline-none font-black focus:ring-2 focus:ring-blue-500/20 transition-all text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}/>
              </div>
            </div>
            <p className="text-[10px] font-bold opacity-40 mt-3 text-center" style={{ color: 'var(--text-main)' }}>* Será aberta a tela de impressão (Tamanho padrão: 50x80mm).</p>
          </div>
          
          <button onClick={gerarImpressaoPorRange} className="w-full mt-4 px-4 py-3 text-white rounded-xl font-black transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/30 active:scale-95 bg-blue-600 flex justify-center items-center gap-2">
            🖨️ Imprimir Lote de Etiquetas
          </button>
        </div>

      </div>

      {/* CARD 2: LISTA DE EXISTENTES */}
      <div className="p-8 rounded-3xl border shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="font-black text-lg tracking-tight" style={{ color: 'var(--text-main)' }}>Consultar Etiquetas em Uso</h3>
            <p className="text-xs font-bold opacity-50" style={{ color: 'var(--text-main)' }}>Clique num chip para ver a máquina, ou imprima a lista filtrada.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="text" 
              placeholder="🔍 Buscar..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full md:w-64 p-3 rounded-xl border outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20" 
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
            />
            {/* 🚀 BOTÃO DE IMPRIMIR A BUSCA */}
            <button onClick={gerarImpressaoDaBusca} disabled={ativosFiltrados.length === 0} className="px-4 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2">
              🖨️ Imprimir Filtro
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 max-h-96 overflow-y-auto custom-scrollbar p-2">
          {ativosFiltrados.length > 0 ? (
            ativosFiltrados.map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => irParaAtivo(item.patrimonio)}
                title={`Modelo: ${item.modelo}`}
                className="px-4 py-2 rounded-xl font-black text-xs border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
              >
                <span className="text-blue-500">🏷️</span>
                {item.patrimonio}
              </button>
            ))
          ) : (
            <div className="w-full text-center p-10 opacity-50 font-bold text-sm" style={{ color: 'var(--text-main)' }}>
              Nenhuma etiqueta encontrada.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}