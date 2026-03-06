import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardDiretoria({ ativos, categorias }) {
  // Estado para guardar quais categorias o usuário quer ver (IDs)
  const [filtrosCategoria, setFiltrosCategoria] = useState([]);

  // Função para ligar/desligar uma categoria no filtro
  const toggleFiltro = (id) => {
    if (filtrosCategoria.includes(id)) {
      setFiltrosCategoria(filtrosCategoria.filter(catId => catId !== id));
    } else {
      setFiltrosCategoria([...filtrosCategoria, id]);
    }
  };

  // 🧠 INTELIGÊNCIA: Recalcula todos os dados sempre que o filtro mudar
  const dadosProcessados = useMemo(() => {
    // 1. Filtrar os ativos
    const ativosFiltrados = ativos.filter(ativo => 
      filtrosCategoria.length === 0 ? true : filtrosCategoria.includes(ativo.categoria_id)
    );

    // 2. Contar Status
    let qtdAtivos = 0; let qtdManutencao = 0; let qtdSucata = 0;
    
    // 3. Contar Setores/Secretarias para o Gráfico de Barras
    const contagemSetores = {};

    ativosFiltrados.forEach(a => {
      if (a.status === 'ATIVO') qtdAtivos++;
      else if (a.status === 'MANUTENÇÃO') qtdManutencao++;
      else if (a.status === 'SUCATA') qtdSucata++;

      const local = a.secretaria || 'Não Informado';
      contagemSetores[local] = (contagemSetores[local] || 0) + 1;
    });

    // Formatar dados para o Recharts (Pizza)
    const dadosStatus = [
      { name: 'Em Operação', value: qtdAtivos, color: '#10B981' }, // Verde
      { name: 'Manutenção', value: qtdManutencao, color: '#F59E0B' }, // Laranja
      { name: 'Sucata (Descarte)', value: qtdSucata, color: '#EF4444' } // Vermelho
    ].filter(d => d.value > 0); // Só mostra se tiver mais de zero

    // Formatar dados para o Recharts (Barras Top 5)
    const dadosTopSetores = Object.keys(contagemSetores)
      .map(key => ({ nome: key, quantidade: contagemSetores[key] }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5); // Pega apenas os 5 maiores

    return { total: ativosFiltrados.length, qtdAtivos, qtdManutencao, qtdSucata, dadosStatus, dadosTopSetores };
  }, [ativos, filtrosCategoria]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
      
      {/* CABEÇALHO E FILTROS DE CATEGORIA */}
      <div className="p-6 rounded-3xl shadow-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
        <h2 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <span className="text-blue-500">📊</span> Inteligência de Parque (Dashboard)
        </h2>
        
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-main)' }}>Filtrar Visão por Equipamento:</p>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFiltrosCategoria([])} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtrosCategoria.length === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent border hover:bg-gray-500/10'}`}
              style={{ borderColor: filtrosCategoria.length === 0 ? 'transparent' : 'var(--border-light)', color: filtrosCategoria.length === 0 ? '#fff' : 'var(--text-main)' }}
            >
              ♾️ Todos os Tipos
            </button>
            {categorias.map(cat => (
              <button 
                key={cat.id}
                onClick={() => toggleFiltro(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filtrosCategoria.includes(cat.id) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent border hover:bg-gray-500/10'}`}
                style={{ borderColor: filtrosCategoria.includes(cat.id) ? 'transparent' : 'var(--border-light)', color: filtrosCategoria.includes(cat.id) ? '#fff' : 'var(--text-main)' }}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <span className="text-[10px] font-black uppercase opacity-50 tracking-widest" style={{ color: 'var(--text-main)' }}>Total Filtrado</span>
          <span className="text-4xl font-black mt-1" style={{ color: 'var(--color-blue)' }}>{dadosProcessados.total}</span>
        </div>
        <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-center border-b-4 border-b-green-500" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <span className="text-[10px] font-black uppercase opacity-50 tracking-widest" style={{ color: 'var(--text-main)' }}>Em Operação</span>
          <span className="text-3xl font-black mt-1 text-green-500">{dadosProcessados.qtdAtivos}</span>
        </div>
        <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-center border-b-4 border-b-yellow-500" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <span className="text-[10px] font-black uppercase opacity-50 tracking-widest" style={{ color: 'var(--text-main)' }}>Em Manutenção</span>
          <span className="text-3xl font-black mt-1 text-yellow-500">{dadosProcessados.qtdManutencao}</span>
        </div>
        <div className="p-6 rounded-3xl border shadow-sm flex flex-col justify-center border-b-4 border-b-red-500" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <span className="text-[10px] font-black uppercase opacity-50 tracking-widest" style={{ color: 'var(--text-main)' }}>Descartados</span>
          <span className="text-3xl font-black mt-1 text-red-500">{dadosProcessados.qtdSucata}</span>
        </div>
      </div>

      {/* ÁREA DOS GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* GRÁFICO 1: SAÚDE DO PARQUE (PIZZA) */}
        <div className="p-6 rounded-3xl border shadow-sm flex flex-col h-[400px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6" style={{ color: 'var(--text-main)' }}>Saúde dos Equipamentos</h3>
          <div className="flex-1 w-full">
            {dadosProcessados.total === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-30 font-bold" style={{ color: 'var(--text-main)' }}>Sem dados para exibir</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosProcessados.dadosStatus} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                    {dadosProcessados.dadosStatus.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: TOP 5 SETORES (BARRAS) */}
        <div className="p-6 rounded-3xl border shadow-sm flex flex-col h-[400px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>
          <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6" style={{ color: 'var(--text-main)' }}>Top 5 Locais com Mais Equipamentos</h3>
          <div className="flex-1 w-full">
            {dadosProcessados.dadosTopSetores.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center opacity-30 font-bold" style={{ color: 'var(--text-main)' }}>Sem dados para exibir</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosProcessados.dadosTopSetores} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'var(--text-main)' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="quantidade" fill="var(--color-blue)" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}