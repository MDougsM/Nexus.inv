import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, ReactFlowProvider, NodeResizer, 
  Handle, Position, MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-toastify';
import api from '../api/api';
import { getNomeTipoEquipamento } from '../utils/helpers';

// 🚀 1. EXTRAÇÃO DE IP E ÍCONES INTELIGENTES
const extrairIP = (ativo) => {
  if (ativo.ip) return ativo.ip;
  try {
    const din = typeof ativo.dados_dinamicos === 'string' ? JSON.parse(ativo.dados_dinamicos) : (ativo.dados_dinamicos || {});
    return din?.ip || din?.IP || din?.['Endereço IP'] || 'S/N';
  } catch (e) { return 'S/N'; }
};

const getIconePorCategoria = (tipoNome) => {
  const t = tipoNome.toLowerCase();
  if (t.includes('switch') || t.includes('roteador') || t.includes('hub')) return '🖧';
  if (t.includes('servidor') || t.includes('server')) return '🗄️';
  if (t.includes('impressora') || t.includes('multifuncional')) return '🖨️';
  if (t.includes('notebook') || t.includes('laptop')) return '💻';
  if (t.includes('telefone') || t.includes('voip')) return '☎️';
  if (t.includes('câmera') || t.includes('dvr')) return '📹';
  return '🖥️'; // Default PC
};

// ==========================================
// 🚀 2. COMPONENTES VISUAIS (NÓS ROBUSTOS)
// ==========================================

const ContainerNode = ({ data, selected }) => (
  <>
    <NodeResizer color="#3b82f6" isVisible={selected} minWidth={250} minHeight={200} />
    <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', border: `2px ${selected ? 'solid #3b82f6' : 'dashed #475569'}`, borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(2, 6, 23, 0.7)', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="text-lg">🔲</span> {data.label}
      </div>
    </div>
  </>
);

const AtivoNode = ({ data, selected }) => (
  <div className={`relative transition-transform duration-200 ${selected ? 'scale-105' : ''}`} style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', color: '#fff', border: `2px solid ${data.corStatus || '#10b981'}`, borderRadius: '14px', padding: '14px', width: 170, textAlign: 'center', boxShadow: selected ? `0 0 20px ${data.corStatus}80` : '0 6px 12px rgba(0,0,0,0.5)' }}>
    {/* Conector Topo */}
    <Handle type="target" position={Position.Top} style={{ background: data.corStatus || '#10b981', width: '14px', height: '14px', border: '3px solid #0f172a' }} />
    
    <div className="text-3xl mb-2 drop-shadow-md">{data.icon}</div>
    <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px' }}>{data.patrimonio}</div>
    <div style={{ fontSize: '9px', opacity: 0.6, textTransform: 'uppercase', marginTop: '2px' }}>{data.tipo}</div>
    
    {/* Bloco de IP estilo terminal */}
    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', marginTop: '6px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
      {data.ip}
    </div>
    
    {/* Conector Fundo */}
    <Handle type="source" position={Position.Bottom} style={{ background: data.corStatus || '#10b981', width: '14px', height: '14px', border: '3px solid #0f172a' }} />
  </div>
);

const nodeTypes = { container: ContainerNode, ativo: AtivoNode };

// ==========================================
// 🚀 3. CONSTRUTOR DO MAPA
// ==========================================
function ConstrutorMapa({ ativos }) {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState([]);

  // CARREGAR DADOS DO BANCO
  useEffect(() => {
    const carregarMapa = async () => {
      try {
        const [resMapa, resCat] = await Promise.all([
          api.get('/api/inventario/topologia').catch(() => ({ data: null })),
          api.get('/api/inventario/categorias').catch(() => ({ data: [] }))
        ]);
        
        setCategorias(resCat.data || []);

        if (resMapa.data && Array.isArray(resMapa.data.nodes)) {
          const nosValidos = resMapa.data.nodes.filter(n => n.type === 'ativo' || n.type === 'container' || n.type === 'pc' || n.type === 'switch');
          
          // Compatibilidade com nós velhos (converte pc e switch velhos para o novo AtivoNode)
          const nosConvertidos = nosValidos.map(n => {
             if (n.type === 'pc' || n.type === 'switch') {
                return { ...n, type: 'ativo', data: { ...n.data, icon: n.type === 'switch' ? '🖧' : '💻', tipo: n.type.toUpperCase() } };
             }
             return n;
          });

          if (nosConvertidos.length > 0) {
            setNodes(nosConvertidos);
            setEdges(resMapa.data.edges || []);
          }
        }
      } catch (error) { 
        console.error("Erro topologia."); 
      } finally { 
        setCarregando(false); 
      }
    };
    carregarMapa();
  }, [setNodes, setEdges]);

  const salvarTopologia = async () => {
    try {
      const loadingToast = toast.loading("Salvando topologia...");
      await api.post('/api/inventario/topologia', { nodes, edges });
      toast.update(loadingToast, { render: "Topologia global salva!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) { toast.error("Erro ao salvar mapa."); }
  };

  // 🚀 CONEXÃO DE CABOS COM SETA E RÓTULO (ROBUSTEZ)
  const onConnect = useCallback((params) => {
    const caboEstilizado = { 
      ...params, 
      type: 'smoothstep', 
      animated: true, 
      style: { stroke: '#38bdf8', strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' } 
    };
    setEdges((eds) => addEdge(caboEstilizado, eds));
  }, [setEdges]);

  const onEdgeDoubleClick = (event, edge) => {
    const label = window.prompt("Rótulo do Cabo (ex: Porta 24, Link Óptico):", edge.label || "");
    if (label !== null) {
        setEdges(eds => eds.map(e => e.id === edge.id ? { 
          ...e, label, 
          labelStyle: { fill: '#fff', fontWeight: 900, fontSize: 12 }, 
          labelBgStyle: { fill: '#0f172a', color: '#0f172a', stroke: '#38bdf8', strokeWidth: 1 },
          labelBgPadding: [8, 4], labelBgBorderRadius: 4
        } : e));
    }
  };

  // DRAG & DROP LOGIC
  const onDragStart = (event, type, payload = null) => {
    event.dataTransfer.setData('type', type);
    if (payload) event.dataTransfer.setData('payload', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('type');
    if (!type || !reactFlowInstance) return;

    let position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    let newNode = null;

    const containerAlvo = nodes.find(n => 
        n.type === 'container' &&
        position.x >= n.position.x && position.x <= n.position.x + (n.width || 400) &&
        position.y >= n.position.y && position.y <= n.position.y + (n.height || 300)
    );

    let parentNodeId = undefined;
    if (containerAlvo) {
        parentNodeId = containerAlvo.id;
        position = { x: position.x - containerAlvo.position.x, y: position.y - containerAlvo.position.y };
    }

    if (type === 'container') {
      const nomeSetor = window.prompt("Nome do Agrupador (ex: Rack Servidores, VLAN 10):", "NOVA REDE");
      if (!nomeSetor) return;
      newNode = {
        id: `container-${Date.now()}`, type: 'container', position,
        data: { label: nomeSetor.toUpperCase() }, style: { width: 500, height: 400 }, zIndex: -1,
      };
    } 
    else if (type === 'ativo') {
      const ativoInfo = JSON.parse(event.dataTransfer.getData('payload'));
      const ip = extrairIP(ativoInfo);
      const isOnline = ativoInfo.status?.toUpperCase() === 'ATIVO'; 
      const corStatus = isOnline ? '#10b981' : '#ef4444';
      const tipoNome = getNomeTipoEquipamento(ativoInfo, categorias) || 'Dispositivo';
      const icon = getIconePorCategoria(tipoNome);

      newNode = {
        id: `node-${ativoInfo.patrimonio}`, type: 'ativo', position, parentNode: parentNodeId,
        data: { patrimonio: ativoInfo.patrimonio, ip, corStatus, icon, tipo: tipoNome }
      };
    }

    if (newNode) setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, nodes, setNodes, categorias]);

  const ativosDisponiveis = ativos.filter(a => a.status !== 'SUCATA' && !nodes.some(n => n.id === `node-${a.patrimonio}`));
  const ativosFiltrados = ativosDisponiveis.filter(a => {
    if (!termoBusca) return true;
    const termo = termoBusca.toLowerCase();
    const tipo = getNomeTipoEquipamento(a, categorias)?.toLowerCase() || '';
    return a.patrimonio?.toLowerCase().includes(termo) || extrairIP(a).toLowerCase().includes(termo) || tipo.includes(termo);
  });

  if (carregando) return <div className="p-10 text-center font-bold">Iniciando Servidor Gráfico...</div>;

  return (
    <div className="flex h-[78vh] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#020617] animate-fade-in relative mt-4">
      
      <button onClick={salvarTopologia} className="absolute top-4 right-4 z-50 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-black tracking-widest uppercase shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all active:scale-95 border border-blue-400">
        💾 Salvar Rede
      </button>

      {/* BARRA LATERAL */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-40 shadow-xl">
        <div className="p-5 border-b border-slate-800 bg-slate-950">
           <h3 className="text-white font-black uppercase tracking-widest text-[13px] flex items-center gap-2"><span>🕸️</span> Construtor Core</h3>
           <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">Arraste os nós para o canvas. Duplo-clique em um cabo para rotulá-lo. (DELETE apaga itens)</p>
        </div>

        {/* 🚀 AQUI O FAKE SWITCH MORREU. FICOU SÓ O AGRUPADOR DE REDE */}
        <div className="p-5 border-b border-slate-800">
           <div onDragStart={(e) => onDragStart(e, 'container')} draggable className="w-full bg-slate-800 border-2 border-dashed border-indigo-500 text-indigo-400 py-3 rounded-xl text-center text-[11px] font-black cursor-grab hover:bg-slate-700 hover:shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all flex items-center justify-center gap-2">
             <span className="text-xl">🔲</span> CRIAR AGRUPADOR (VLAN / RACK)
           </div>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900">
            <input type="text" placeholder="Buscar IP, Patrimônio ou Tipo..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-inner" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
           <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ativos Não Mapeados</p>
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-black">{ativosFiltrados.length}</span>
           </div>
           
           <div className="space-y-2 pr-1">
             {ativosFiltrados.length === 0 ? <p className="text-xs text-slate-600 italic font-bold">Todos os ativos visíveis já estão mapeados.</p> : ativosFiltrados.map(ativo => {
               const tipoNome = getNomeTipoEquipamento(ativo, categorias) || 'Desconhecido';
               const icon = getIconePorCategoria(tipoNome);
               const isOnline = ativo.status?.toUpperCase() === 'ATIVO';

               return (
                 <div key={ativo.patrimonio} onDragStart={(e) => onDragStart(e, 'ativo', ativo)} draggable className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 cursor-grab hover:border-blue-500 hover:bg-slate-800 transition-all flex items-center gap-3 group">
                   <div className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">{icon}</div>
                   <div className="flex-1 overflow-hidden">
                     <p className="text-xs font-black text-white truncate">{ativo.patrimonio}</p>
                     <p className="text-[9px] font-bold text-slate-400 truncate uppercase">{tipoNome}</p>
                   </div>
                   <div className={`w-2 h-2 rounded-full shadow-sm ${isOnline ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
                 </div>
               )
             })}
           </div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="flex-1 h-full relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick} // 🚀 RÓTULOS NOS CABOS AQUI!
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#475569" gap={25} size={2} />
          <Controls style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155', fill: '#38bdf8' }} />
          <MiniMap maskColor="rgba(2, 6, 23, 0.85)" nodeColor="#3b82f6" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MapaRedeWrapper({ ativos }) {
  return (
    <ReactFlowProvider>
      <ConstrutorMapa ativos={ativos} />
    </ReactFlowProvider>
  );
}