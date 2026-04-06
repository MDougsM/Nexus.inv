import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, ReactFlowProvider, NodeResizer, 
  Handle, Position // 🚀 ADICIONE ESTES DOIS AQUI
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-toastify';
import api from '../api/api';

// 🚀 EXTRAÇÃO DE IP
const extrairIP = (ativo) => {
  if (ativo.ip) return ativo.ip;
  try {
    const din = typeof ativo.dados_dinamicos === 'string' ? JSON.parse(ativo.dados_dinamicos) : (ativo.dados_dinamicos || {});
    return din?.ip || din?.IP || din?.['Endereço IP'] || 'Sem IP';
  } catch (e) { return 'Sem IP'; }
};

// ==========================================
// 🚀 COMPONENTES VISUAIS (CUSTOM NODES) COM "TOMADAS"
// ==========================================

const ContainerNode = ({ data, selected }) => (
  <>
    <NodeResizer color="#3b82f6" isVisible={selected} minWidth={200} minHeight={150} />
    <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: `2px dashed ${selected ? '#3b82f6' : '#475569'}`, borderRadius: '12px' }}>
      <div style={{ padding: '10px', color: '#cbd5e1', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', borderBottom: '1px solid rgba(71, 85, 105, 0.5)', background: 'rgba(15, 23, 42, 0.8)', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}>
        {data.label}
      </div>
    </div>
  </>
);

const PcNode = ({ data, selected }) => (
  <div style={{ background: '#1e293b', color: '#fff', border: `2px solid ${data.corStatus || '#10b981'}`, borderRadius: '8px', padding: '10px', width: 150, textAlign: 'center', boxShadow: selected ? '0 0 0 2px white' : 'none' }}>
    {/* 🚀 TOMADA DE ENTRADA (TOP) */}
    <Handle type="target" position={Position.Top} style={{ background: '#3b82f6', width: '8px', height: '8px', border: 'none' }} />
    
    <div style={{ fontSize: '14px', fontWeight: '900' }}>💻 {data.patrimonio}</div>
    <div style={{ fontSize: '10px', opacity: 0.8 }}>{data.ip}</div>
    
    {/* 🚀 TOMADA DE SAÍDA (BOTTOM) */}
    <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6', width: '8px', height: '8px', border: 'none' }} />
  </div>
);

const SwitchNode = ({ data, selected }) => (
  <div style={{ background: '#0f172a', color: '#38bdf8', border: '2px solid #38bdf8', borderRadius: '8px', padding: '15px', fontWeight: '900', width: 200, textAlign: 'center', boxShadow: selected ? '0 0 0 2px white' : 'none' }}>
    {/* 🚀 TOMADA DE ENTRADA (TOP) */}
    <Handle type="target" position={Position.Top} style={{ background: '#38bdf8', width: '10px', height: '10px', border: 'none' }} />
    
    {data.label}
    
    {/* 🚀 TOMADA DE SAÍDA (BOTTOM) */}
    <Handle type="source" position={Position.Bottom} style={{ background: '#38bdf8', width: '10px', height: '10px', border: 'none' }} />
  </div>
);

// Registrando os Nodes
const nodeTypes = { container: ContainerNode, pc: PcNode, switch: SwitchNode };


// ==========================================
// 🚀 COMPONENTE PRINCIPAL DO MAPA
// ==========================================
function ConstrutorMapa({ ativos }) {
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // 1. CARREGAR MAPA (COM FILTRO ANTI-CRASH)
  useEffect(() => {
    const carregarMapa = async () => {
      try {
        const res = await api.get('/api/inventario/topologia');
        
        if (res.data && Array.isArray(res.data.nodes)) {
          // 🚀 FILTRO ANTI-CRASH: Só aceita nós que tenham os nossos novos "types" exatos.
          // Isso descarta automaticamente qualquer sujeira da versão anterior que quebrava a tela!
          const nosValidos = res.data.nodes.filter(n => 
             n.type === 'pc' || n.type === 'switch' || n.type === 'container'
          );

          if (nosValidos.length > 0) {
            setNodes(nosValidos);
            setEdges(res.data.edges || []);
          } else {
            // Se tudo o que veio do banco era lixo, começa um mapa zerado
            setNodes([]);
            setEdges([]);
          }
        }
      } catch (error) { 
        console.error("Sem mapa ou erro ao carregar."); 
      } finally { 
        setCarregando(false); 
      }
    };
    carregarMapa();
  }, [setNodes, setEdges]);

  // 2. SALVAR MAPA
  const salvarTopologia = async () => {
    try {
      const loadingToast = toast.loading("Salvando topologia...");
      await api.post('/api/inventario/topologia', { nodes, edges });
      toast.update(loadingToast, { render: "Topologia salva para todos os usuários!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      toast.error("Erro ao salvar a topologia.");
    }
  };

  // 3. CONEXÃO
  const onConnect = useCallback((params) => {
    const caboEstilizado = { ...params, type: 'smoothstep', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } };
    setEdges((eds) => addEdge(caboEstilizado, eds));
  }, [setEdges]);

  // 4. DRAG & DROP
  const onDragStart = (event, type, payload = null) => {
    event.dataTransfer.setData('type', type);
    if (payload) event.dataTransfer.setData('payload', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

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
      const nomeSetor = window.prompt("Nome do Setor/Container:", "NOVO SETOR");
      if (!nomeSetor) return;
      newNode = {
        id: `container-${Date.now()}`, type: 'container', position,
        data: { label: nomeSetor.toUpperCase() }, style: { width: 400, height: 300 }, zIndex: -1,
      };
    } 
    else if (type === 'switch') {
      newNode = {
        id: `switch-${Date.now()}`, type: 'switch', position, parentNode: parentNodeId,
        data: { label: '🏢 SWITCH / FIREWALL' } // <--- APENAS DADOS PUROS (TEXTO)
      };
    } 
    else if (type === 'pc') {
      const ativoInfo = JSON.parse(event.dataTransfer.getData('payload'));
      const ip = extrairIP(ativoInfo);
      const isOnline = ativoInfo.status?.toUpperCase() === 'ATIVO'; 
      const corStatus = isOnline ? '#10b981' : '#ef4444';

      newNode = {
        id: `node-${ativoInfo.patrimonio}`, type: 'pc', position, parentNode: parentNodeId,
        data: { patrimonio: ativoInfo.patrimonio, ip, corStatus } // <--- APENAS DADOS PUROS (TEXTO)
      };
    }

    if (newNode) setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, nodes, setNodes]);

  const ativosDisponiveis = ativos.filter(a => !nodes.some(n => n.id === `node-${a.patrimonio}`));
  const ativosFiltrados = ativosDisponiveis.filter(a => {
    if (!termoBusca) return true;
    const termo = termoBusca.toLowerCase();
    return a.patrimonio?.toLowerCase().includes(termo) || extrairIP(a).toLowerCase().includes(termo);
  });

  if (carregando) return <div className="p-10 text-center font-bold">Carregando mapa central...</div>;

  return (
    <div className="flex h-[78vh] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#020617] animate-fade-in relative">
      
      {/* BOTÃO SALVAR */}
      <button 
        onClick={salvarTopologia}
        className="absolute top-4 right-4 z-50 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-black tracking-widest uppercase shadow-lg shadow-emerald-900/50 transition-all active:scale-95 border border-emerald-400"
      >
        💾 Salvar Mapa
      </button>

      {/* BARRA LATERAL */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800 bg-slate-950">
           <h3 className="text-white font-black uppercase tracking-widest text-sm">🛠️ Construtor Core</h3>
           <p className="text-[10px] text-gray-400 mt-1">Arraste para a tela. (Aperte DELETE para apagar itens da tela)</p>
        </div>

        <div className="p-5 border-b border-slate-800 grid grid-cols-2 gap-3">
           <div onDragStart={(e) => onDragStart(e, 'switch')} draggable className="bg-slate-800 border-2 border-dashed border-blue-500 text-blue-400 p-3 rounded-lg text-center text-[10px] font-black cursor-grab hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-1">
             <span className="text-lg">🏢</span> SWITCH
           </div>
           <div onDragStart={(e) => onDragStart(e, 'container')} draggable className="bg-slate-800 border-2 border-dashed border-purple-500 text-purple-400 p-3 rounded-lg text-center text-[10px] font-black cursor-grab hover:bg-slate-700 transition-all flex flex-col items-center justify-center gap-1">
             <span className="text-lg">🔲</span> SETOR
           </div>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900">
            <input type="text" placeholder="Buscar IP ou Patrimônio..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white p-2 rounded-lg text-xs font-bold outline-none focus:border-blue-500 transition-colors" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
           <p className="text-[10px] font-bold uppercase text-slate-500 mb-3">Máquinas Não Mapeadas ({ativosFiltrados.length})</p>
           <div className="space-y-2">
             {ativosFiltrados.length === 0 ? <p className="text-xs text-gray-500 italic">Nenhuma máquina encontrada.</p> : ativosFiltrados.map(ativo => (
               <div key={ativo.patrimonio} onDragStart={(e) => onDragStart(e, 'pc', ativo)} draggable className="bg-slate-800 p-2 rounded border border-slate-700 cursor-grab hover:border-blue-500 transition-all flex items-center gap-3">
                 <span className="text-lg">💻</span>
                 <div>
                   <p className="text-xs font-bold text-white">{ativo.patrimonio}</p>
                   <p className="text-[9px] font-mono text-gray-400">{extrairIP(ativo)}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* ÁREA DO MAPA (CANVAS) */}
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          deleteKeyCode={['Backspace', 'Delete']} // 🚀 Teclas para deletar ativadas explicitamente!
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#334155" gap={20} size={2} />
          <Controls style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155', fill: '#fff' }} />
          <MiniMap maskColor="rgba(2, 6, 23, 0.8)" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
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