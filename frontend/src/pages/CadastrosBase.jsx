import React, { useState } from 'react';
import TiposEquipamento from './TiposEquipamento';
import Unidades from './Unidades';
import DicionarioPropriedades from './DicionarioPropriedades';

export default function CadastrosBase() {
  const [abaAtiva, setAbaAtiva] = useState('tipos');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
        <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Cadastros Auxiliares</h2>
        <p className="text-sm font-medium opacity-60 mt-1" style={{ color: 'var(--text-muted)' }}>Gerencie os parâmetros globais da infraestrutura</p>
      </div>

      {/* Navegação Estilo Tabs Padrão Nexus */}
      <div className="flex space-x-1 border-b overflow-x-auto custom-scrollbar" style={{ borderColor: 'var(--border-light)' }}>
        <button
          onClick={() => setAbaAtiva('tipos')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            abaAtiva === 'tipos' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
          }`}
          style={{ color: abaAtiva === 'tipos' ? 'var(--color-blue)' : 'var(--text-main)' }}
        >
          🏷️ Tipos de Equipamentos
        </button>

        <button
          onClick={() => setAbaAtiva('dicionario')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            abaAtiva === 'dicionario' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
          }`}
          style={{ color: abaAtiva === 'dicionario' ? 'var(--color-blue)' : 'var(--text-main)' }}
        >
          📚 Dicionário de Propriedades
        </button>
        
        <button
          onClick={() => setAbaAtiva('unidades')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            abaAtiva === 'unidades' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
          }`}
          style={{ color: abaAtiva === 'unidades' ? 'var(--color-blue)' : 'var(--text-main)' }}
        >
          🏛️ Unidades e Localidades
        </button>
      </div>

      <div className="pt-6">
        {abaAtiva === 'tipos' && <TiposEquipamento />}
        {abaAtiva === 'dicionario' && <DicionarioPropriedades />}
        {abaAtiva === 'unidades' && <Unidades />}
      </div>
    </div>
  );
}