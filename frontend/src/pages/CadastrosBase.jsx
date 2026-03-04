import React, { useState } from 'react';
import TiposEquipamento from './TiposEquipamento';
import Unidades from './Unidades';
import Usuarios from './Usuarios';

export default function CadastrosBase() {
  const [abaAtiva, setAbaAtiva] = useState('tipos');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Cadastros Auxiliares</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Gerencie os parâmetros básicos que alimentam o sistema de inventário.</p>
      </div>

      {/* NAVEGAÇÃO POR ABAS (TABS) */}
      <div className="flex space-x-1 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <button
          onClick={() => setAbaAtiva('tipos')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            abaAtiva === 'tipos' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent hover:border-gray-300'
          }`}
          style={{ color: abaAtiva === 'tipos' ? 'var(--color-blue)' : 'var(--text-muted)' }}
        >
          🏷️ Tipos de Equipamentos
        </button>
        
        <button
          onClick={() => setAbaAtiva('unidades')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            abaAtiva === 'unidades' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent hover:border-gray-300'
          }`}
          style={{ color: abaAtiva === 'unidades' ? 'var(--color-blue)' : 'var(--text-muted)' }}
        >
          🏢 Secretarias e Setores
        </button>

        <button
          onClick={() => setAbaAtiva('usuarios')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'usuarios' ? 'border-blue-600 text-blue-600' : 'border-transparent hover:border-gray-300'}`}
            style={{ color: abaAtiva === 'usuarios' ? 'var(--color-blue)' : 'var(--text-muted)' }}
        >
            👥 Gestão de Usuários
        </button>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      <div className="pt-4 animate-fade-in">
        {abaAtiva === 'tipos' && <TiposEquipamento />}
        {abaAtiva === 'unidades' && <Unidades />}
        {abaAtiva === 'usuarios' && <Usuarios />}
      </div>
    </div>
  );
}