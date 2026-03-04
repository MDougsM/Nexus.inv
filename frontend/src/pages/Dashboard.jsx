import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, ativos: 0, manutencao: 0, sucata: 0 });
  const [dadosStatus, setDadosStatus] = useState([]);
  const [dadosCategoria, setDadosCategoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        const [resAtivos, resCat] = await Promise.all([
          api.get('/api/inventario/'),
          api.get('/api/inventario/categorias')
        ]);
        
        const ativos = resAtivos.data;
        const categorias = resCat.data;

        let a = 0, m = 0, s = 0;
        let contagemCat = {};

        ativos.forEach(item => {
          // Contagem de Status
          const st = (item.status || 'ATIVO').toUpperCase();
          if (st === 'ATIVO') a++;
          else if (st === 'MANUTENÇÃO') m++;
          else if (st === 'SUCATA') s++;

          // Contagem de Categorias
          const catName = categorias.find(c => c.id === item.categoria_id)?.nome || 'Sem Categoria';
          contagemCat[catName] = (contagemCat[catName] || 0) + 1;
        });

        setStats({ total: ativos.length, ativos: a, manutencao: m, sucata: s });

        setDadosStatus([
          { name: 'Ativos', value: a, color: '#10b981' }, // Verde
          { name: 'Manutenção', value: m, color: '#f59e0b' }, // Amarelo
          { name: 'Sucata', value: s, color: '#ef4444' } // Vermelho
        ]);

        // Pega o Top 5 categorias com mais máquinas
        const topCategorias = Object.keys(contagemCat)
          .map(k => ({ name: k, Quantidade: contagemCat[k] }))
          .sort((x, y) => y.Quantidade - x.Quantidade)
          .slice(0, 5);
          
        setDadosCategoria(topCategorias);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    carregarEstatisticas();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">A processar métricas...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
      <div>
        <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Visão Geral</h2>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Métricas em tempo real do parque tecnológico.</p>
      </div>

      {/* CARDS DE RESUMO (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl">💻</div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total de Ativos</p>
            <h3 className="text-3xl font-black text-gray-800">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">✅</div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Em Uso (Ativos)</p>
            <h3 className="text-3xl font-black text-green-600">{stats.ativos}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-2xl">⚠️</div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manutenção</p>
            <h3 className="text-3xl font-black text-yellow-600">{stats.manutencao}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">🗑️</div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descartados</p>
            <h3 className="text-3xl font-black text-red-600">{stats.sucata}</h3>
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Pizza (Status) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-1" style={{ borderColor: 'var(--border-light)' }}>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6">Distribuição de Status</h4>
          <div className="h-64">
            <ResponsiveContainer w-full h-full>
              <PieChart>
                <Pie data={dadosStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {dadosStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras (Top Categorias) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-2" style={{ borderColor: 'var(--border-light)' }}>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6">Top 5 - Volume por Categoria</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosCategoria} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280', fontWeight: 'bold'}} width={120} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="flex justify-end">
        <button onClick={() => navigate('/cadastro')} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 shadow-lg">
          Aceder ao Inventário Completo ➔
        </button>
      </div>
    </div>
  );
}