import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { FaFileExcel, FaSearch, FaCheckSquare, FaSquare } from 'react-icons/fa';

export default function AbaRelatoriosPrint({ secretarias }) {
  const [filtros, setFiltros] = useState({ dataInicio: '', dataFim: '', patrimonio: '' });
  const [secSelecionadas, setSecSelecionadas] = useState([]);
  const [setoresSelecionados, setSetoresSelecionados] = useState([]);
  const [resultado, setResultado] = useState([]);
  const [loading, setLoading] = useState(false);

  // Quando escolhe uma secretaria, marca todos os setores dela automaticamente
  const toggleSecretaria = (secNome) => {
    const isSelecionada = secSelecionadas.includes(secNome);
    let novasSecs = isSelecionada ? secSelecionadas.filter(s => s !== secNome) : [...secSelecionadas, secNome];
    setSecSelecionadas(novasSecs);

    const secObj = secretarias.find(s => s.nome === secNome);
    if (secObj && secObj.setores) {
      const nomeSetores = secObj.setores.map(setor => setor.nome);
      if (isSelecionada) {
        setSetoresSelecionados(prev => prev.filter(s => !nomeSetores.includes(s)));
      } else {
        setSetoresSelecionados(prev => [...new Set([...prev, ...nomeSetores])]);
      }
    }
  };

  const toggleSetor = (setorNome) => {
    setSetoresSelecionados(prev => prev.includes(setorNome) ? prev.filter(s => s !== setorNome) : [...prev, setorNome]);
  };

  const buscarRelatorio = async () => {
    if (!filtros.dataInicio || !filtros.dataFim) return toast.warn("Selecione data de início e fim.");
    if (secSelecionadas.length === 0) return toast.warn("Selecione ao menos uma secretaria.");
    
    setLoading(true);
    try {
      const payload = { ...filtros, secretarias: secSelecionadas, setores: setoresSelecionados };
      const res = await api.post('/api/inventario/relatorios/faturamento', payload);
      setResultado(res.data);
      if(res.data.length === 0) toast.info("Nenhuma leitura encontrada.");
    } catch (e) { toast.error("Erro ao gerar relatório."); }
    setLoading(false);
  };

  const exportarCSV = () => {
    let csv = "\uFEFFPatrimonio;Modelo;Secretaria;Setor;Contador Inicial;Contador Final;Consumo\n";
    resultado.forEach(r => csv += `${r.patrimonio};${r.modelo};${r.secretaria};${r.setor};${r.inicial};${r.final};${r.consumo}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Faturamento_Nexus_${filtros.dataInicio}_a_${filtros.dataFim}.csv`;
    link.click();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="p-6 rounded-2xl border bg-[var(--bg-card)] flex flex-col gap-6" style={{ borderColor: 'var(--border-light)' }}>
        
        {/* Filtros Básicos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="block text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Início</label><input type="date" className="w-full p-2.5 rounded-xl border bg-[var(--bg-input)] font-bold outline-none" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }} onChange={e => setFiltros({...filtros, dataInicio: e.target.value})} /></div>
          <div><label className="block text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Fim</label><input type="date" className="w-full p-2.5 rounded-xl border bg-[var(--bg-input)] font-bold outline-none" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }} onChange={e => setFiltros({...filtros, dataFim: e.target.value})} /></div>
          <div><label className="block text-[10px] font-black uppercase opacity-50 mb-1" style={{ color: 'var(--text-main)' }}>Patrimônio (Opcional)</label><input type="text" placeholder="Ex: S/P_123" className="w-full p-2.5 rounded-xl border bg-[var(--bg-input)] font-bold outline-none" style={{ color: 'var(--text-main)', borderColor: 'var(--border-light)' }} onChange={e => setFiltros({...filtros, patrimonio: e.target.value})} /></div>
          <div className="flex items-end gap-2">
            <button onClick={buscarRelatorio} className="flex-1 bg-blue-600 text-white p-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"><FaSearch /> {loading ? '...' : 'Gerar'}</button>
            {resultado.length > 0 && <button onClick={exportarCSV} className="bg-emerald-600 text-white p-2.5 rounded-xl font-bold flex items-center justify-center hover:bg-emerald-700 transition-all"><FaFileExcel /></button>}
          </div>
        </div>

        {/* Multi-Select de Secretarias e Setores */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
          <label className="block text-[10px] font-black uppercase opacity-50 mb-3" style={{ color: 'var(--text-main)' }}>Filtro de Localização (Selecione um ou mais)</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {secretarias.map(sec => (
              <div key={sec.id} className="p-4 rounded-xl border bg-gray-50/5" style={{ borderColor: 'var(--border-light)' }}>
                <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={() => toggleSecretaria(sec.nome)}>
                  {secSelecionadas.includes(sec.nome) ? <FaCheckSquare className="text-blue-500 text-lg" /> : <FaSquare className="text-gray-300 text-lg" />}
                  <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{sec.nome}</span>
                </div>
                
                {secSelecionadas.includes(sec.nome) && sec.setores && sec.setores.length > 0 && (
                  <div className="pl-6 flex flex-col gap-1 mt-2 border-l-2 border-blue-500/20">
                    {sec.setores.map(setor => (
                      <div key={setor.id} className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100" onClick={() => toggleSetor(setor.nome)}>
                        {setoresSelecionados.includes(setor.nome) ? <FaCheckSquare className="text-emerald-500" /> : <FaSquare className="text-gray-300" />}
                        <span className="font-bold text-[11px]" style={{ color: 'var(--text-main)' }}>{setor.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* TABELA DE RESULTADOS... (MANTIDA IGUAL AO CÓDIGO ANTERIOR) */}
      {resultado.length > 0 && (
        <div className="rounded-2xl border overflow-hidden bg-[var(--bg-card)] shadow-sm" style={{ borderColor: 'var(--border-light)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-input)] text-[10px] font-black uppercase opacity-60" style={{ color: 'var(--text-main)' }}>
                <th className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>Equipamento</th>
                <th className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>Local</th>
                <th className="p-4 border-b text-right" style={{ borderColor: 'var(--border-light)' }}>Inicial</th>
                <th className="p-4 border-b text-right" style={{ borderColor: 'var(--border-light)' }}>Final</th>
                <th className="p-4 border-b text-right text-blue-500" style={{ borderColor: 'var(--border-light)' }}>Faturado</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {resultado.map((r, idx) => (
                <tr key={idx} className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                  <td className="p-4"><p className="text-blue-500 font-black">{r.patrimonio}</p><p className="text-[10px] opacity-60" style={{ color: 'var(--text-muted)' }}>{r.modelo}</p></td>
                  <td className="p-4"><p>{r.secretaria}</p><p className="text-[10px] opacity-60" style={{ color: 'var(--text-muted)' }}>{r.setor}</p></td>
                  <td className="p-4 text-right opacity-60">{r.inicial.toLocaleString('pt-BR')}</td>
                  <td className="p-4 text-right opacity-60">{r.final.toLocaleString('pt-BR')}</td>
                  <td className="p-4 text-right text-blue-500 font-black text-lg">{r.consumo.toLocaleString('pt-BR')} <span className="text-[10px] uppercase opacity-50 ml-1">págs</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}