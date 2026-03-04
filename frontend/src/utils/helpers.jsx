import React from 'react';

export const parseCamposDinamicos = (categoria) => {
  if (!categoria || !categoria.campos_config) return [];
  let config = categoria.campos_config;
  if (typeof config === 'string') {
    try { 
      const parsed = JSON.parse(config);
      return Array.isArray(parsed) ? parsed.map(c => typeof c === 'object' ? c.nome : c) : [];
    } catch (e) { 
      return config.split(',').map(s => s.trim()).filter(Boolean); 
    }
  }
  return Array.isArray(config) ? config.map(c => typeof c === 'object' ? c.nome : c) : [];
};

export const getStatusBadge = (status) => {
  const s = status?.toUpperCase() || 'ATIVO';
  const styles = {
    'ATIVO': { bg: 'var(--badge-green-bg)', text: 'var(--badge-green-text)' },
    'MANUTENÇÃO': { bg: 'var(--badge-yellow-bg)', text: 'var(--badge-yellow-text)' },
    'SUCATA': { bg: 'var(--badge-gray-bg)', text: 'var(--badge-gray-text)' }
  };
  const current = styles[s] || { bg: '#ebf4ff', text: '#1e40af' };
  return (
    <span className="px-2 py-1 text-[10px] font-bold rounded shadow-sm border" 
          style={{ backgroundColor: current.bg, color: current.text, borderColor: 'rgba(0,0,0,0.1)' }}>
      {s}
    </span>
  );
};

export const getNomeTipoEquipamento = (ativo, categorias) => {
  const cat = categorias.find(c => c.id === ativo.categoria_id);
  return cat?.nome || ativo.categoria?.nome || "Equipamento";
};