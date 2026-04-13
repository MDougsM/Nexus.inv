import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, ReactFlowProvider, 
  Handle, Position, MarkerType, NodeResizer, useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-toastify';
import api from '../api/api';
import { getNomeTipoEquipamento } from '../utils/helpers';

// ==========================================
// 🚀 1. ENGINE DE DADOS NOC
// ==========================================
const parseJSONSeguro = (dado) => {
  if (!dado) return {};
  if (typeof dado === 'object') return dado;
  try { return JSON.parse(dado.replace(/'/g, '"').replace(/None/g, 'null')); } catch (e) { return {}; }
};

const getIconePorCategoria = (tipoNome) => {
  const t = tipoNome.toLowerCase();
  if (t.includes('switch') || t.includes('roteador')) return '🖧';
  if (t.includes('servidor')) return '🗄️';
  if (t.includes('impressora')) return '🖨️';
  if (t.includes('notebook')) return '💻';
  if (t.includes('câmera')) return '📹';
  return '🖥️'; 
};

// ==========================================
// 🚀 2. NÓS VISUAIS (ESTILO VISIO)
// ==========================================

// 🔲 NÓ CONTAINER (Para agrupar máquinas visualmente)
const ContainerNode = ({ data, selected }) => (
  <>
    <NodeResizer color="#6366f1" isVisible={selected} minWidth={250} minHeight={150} />
    <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.3)', border: `2px ${selected ? 'solid #6366f1' : 'dashed #475569'}`, borderRadius: '16px', backdropFilter: 'blur(2px)' }}>
      <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-700/50 rounded-t-xl text-indigo-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
        🔲 {data.label}
      </div>
    </div>
  </>
);

// 💻 NÓ DA MÁQUINA
const AtivoNode = ({ data, selected }) => (
  <div className={`relative transition-transform duration-100 ${selected ? 'scale-105' : ''}`} style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', color: '#fff', border: `2px solid ${data.corStatus}`, borderRadius: '12px', padding: '12px', width: 150, textAlign: 'center', boxShadow: selected ? `0 0 20px ${data.corStatus}80` : '0 6px 12px rgba(0,0,0,0.5)' }}>
    <Handle type="target" position={Position.Top} style={{ background: data.corStatus, width: '10px', height: '10px', border: '2px solid #0f172a' }} />
    <div className="text-2xl mb-1 drop-shadow-md">{data.icon}</div>
    <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.5px' }}>{data.patrimonio}</div>
    <div style={{ fontSize: '8px', opacity: 0.6, textTransform: 'uppercase', marginTop: '2px' }}>{data.tipo}</div>
    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#38bdf8', marginTop: '6px', background: 'rgba(0,0,0,0.4)', padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>{data.ip}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: data.corStatus, width: '10px', height: '10px', border: '2px solid #0f172a' }} />
  </div>
);

const nodeTypes = { ativo: AtivoNode, container: ContainerNode };

// ==========================================
// 🚀 3. CORE DO MAPA (SISTEMA MULTI-PÁGINAS)
// ==========================================
function ConstrutorMapa({ ativos }) {
  const containerRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  
  // ESTADOS DO REACT FLOW
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // GERENCIADOR DE MAPAS
  const masterData = useRef({ 'default': { nome: 'TOPOLOGIA PRINCIPAL', nodes: [], edges: [] } });
  const [listaMapas, setListaMapas] = useState([{ id: 'default', nome: 'TOPOLOGIA PRINCIPAL' }]);
  const [mapaAtivo, setMapaAtivo] = useState('default');

  const [termoBusca, setTermoBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [expandidos, setExpandidos] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ⚡ MODAIS INTERNOS (ADEUS WINDOW.PROMPT!)
  const [modalCabo, setModalCabo] = useState({ aberto: false, edge: null, nome: '' });
  const [modalContainer, setModalContainer] = useState({ aberto: false, pos: null, nome: '' });
  const [modalMapa, setModalMapa] = useState({ aberto: false, id: null, nome: '', modo: 'criar' });

  // PRÉ-PROCESSAMENTO
  const ativosOtimizados = useMemo(() => {
    return ativos.map(a => {
      const din = parseJSONSeguro(a.dados_dinamicos);
      const ip = din?.ip || din?.IP || a.ip || 'S/N';
      const tipoNome = getNomeTipoEquipamento(a, categorias) || 'Dispositivo';
      return { 
        ...a, _ip: ip, _tipoNome: tipoNome, _icon: getIconePorCategoria(tipoNome), 
        _isOnline: a.status?.toUpperCase() === 'ATIVO', 
        _sec: a.unidade?.nome || a.secretaria || 'S/ UNIDADE', 
        _set: a.unidade?.tipo || a.setor || 'S/ SETOR', 
        _textoBuscavel: `${a.patrimonio} ${a.marca} ${a.nome_personalizado} ${ip}`.toLowerCase() 
      };
    });
  }, [ativos, categorias]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(err => toast.error(`Erro: ${err.message}`));
    else document.exitFullscreen();
  };

  // 📥 CARREGAR DADOS GLOBAIS
  useEffect(() => {
    const carregarMapa = async () => {
      try {
        const [resMapa, resCat] = await Promise.all([
          api.get('/api/inventario/topologia').catch(() => ({ data: null })),
          api.get('/api/inventario/categorias').catch(() => ({ data: [] }))
        ]);
        setCategorias(resCat.data || []);
        
        if (resMapa.data?.nodes) {
          const loadedNodes = resMapa.data.nodes;
          const loadedEdges = resMapa.data.edges || [];
          
          const sysNode = loadedNodes.find(n => n.id === 'SYS_MAPAS');
          if (sysNode && sysNode.data?.mapas) {
            const novosMapas = {};
            sysNode.data.mapas.forEach(m => {
               novosMapas[m.id] = {
                 nome: m.nome,
                 nodes: loadedNodes.filter(n => n.data?.mapaId === m.id && n.type !== 'system'),
                 edges: loadedEdges.filter(e => e.data?.mapaId === m.id)
               };
            });
            masterData.current = novosMapas;
            setListaMapas(sysNode.data.mapas);
            
            const primeiroId = sysNode.data.mapas[0].id;
            setMapaAtivo(primeiroId);
            setNodes(novosMapas[primeiroId].nodes);
            setEdges(novosMapas[primeiroId].edges);
          } else {
            const cleanNodes = loadedNodes.filter(n => n.type !== 'system');
            masterData.current = { 'default': { nome: 'TOPOLOGIA PRINCIPAL', nodes: cleanNodes, edges: loadedEdges } };
            setNodes(cleanNodes);
            setEdges(loadedEdges);
          }
        }
      } catch (error) { console.error(error); } finally { setCarregando(false); }
    };
    carregarMapa();
  }, [setNodes, setEdges]);

  // 🔄 GERENCIADOR DE ABAS (MAPAS)
  const sincronizarMapaAtual = () => {
    if (masterData.current[mapaAtivo]) {
      masterData.current[mapaAtivo].nodes = nodes;
      masterData.current[mapaAtivo].edges = edges;
    }
  };

  const abrirMapa = (id) => {
    if (id === mapaAtivo) return;
    sincronizarMapaAtual();
    setMapaAtivo(id);
    setNodes(masterData.current[id].nodes || []);
    setEdges(masterData.current[id].edges || []);
  };

  const abrirModalCriarMapa = () => setModalMapa({ aberto: true, id: null, nome: '', modo: 'criar' });
  
  const abrirModalEditarMapa = (id, nomeAtual, e) => {
    e.stopPropagation();
    setModalMapa({ aberto: true, id, nome: nomeAtual, modo: 'editar' });
  };

  const salvarModalMapa = () => {
    if (!modalMapa.nome.trim()) return;
    const nomeFinal = modalMapa.nome.toUpperCase();

    if (modalMapa.modo === 'criar') {
      const novoId = `mapa-${Date.now()}`;
      sincronizarMapaAtual();
      masterData.current[novoId] = { nome: nomeFinal, nodes: [], edges: [] };
      setListaMapas(prev => [...prev, { id: novoId, nome: nomeFinal }]);
      setMapaAtivo(novoId);
      setNodes([]);
      setEdges([]);
    } else {
      masterData.current[modalMapa.id].nome = nomeFinal;
      setListaMapas(prev => prev.map(m => m.id === modalMapa.id ? { ...m, nome: nomeFinal } : m));
    }
    setModalMapa({ aberto: false, id: null, nome: '', modo: 'criar' });
  };

  const deletarMapa = (id, e) => {
    e.stopPropagation();
    if (listaMapas.length === 1) return toast.warning("Você precisa ter pelo menos um mapa.");
    if (!window.confirm("Apagar esta topologia inteira?")) return;
    
    delete masterData.current[id];
    const novaLista = listaMapas.filter(m => m.id !== id);
    setListaMapas(novaLista);
    if (mapaAtivo === id) abrirMapa(novaLista[0].id);
  };

  // 💾 SALVAR TUDO
  const salvarTopologiaGlobal = async () => {
    sincronizarMapaAtual();
    const exportNodes = [];
    const exportEdges = [];
    const configMapas = [];

    Object.entries(masterData.current).forEach(([mId, data]) => {
      configMapas.push({ id: mId, nome: data.nome });
      data.nodes.forEach(n => exportNodes.push({ ...n, data: { ...n.data, mapaId: mId } }));
      data.edges.forEach(e => exportEdges.push({ ...e, data: { ...(e.data||{}), mapaId: mId } }));
    });

    exportNodes.push({ id: 'SYS_MAPAS', type: 'system', data: { mapas: configMapas }, position: {x:0, y:0}, hidden: true });

    try {
      const loadingToast = toast.loading("Salvando todas as topologias...");
      await api.post('/api/inventario/topologia', { nodes: exportNodes, edges: exportEdges });
      toast.update(loadingToast, { render: "Sucesso!", type: "success", isLoading: false, autoClose: 2000 });
    } catch (error) { toast.error("Erro ao salvar mapa."); }
  };

  // 🔌 CABOS
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#38bdf8', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' } }, eds));
  }, [setEdges]);

  const onEdgeDoubleClick = (event, edge) => setModalCabo({ aberto: true, edge, nome: edge.label || "" });
  const salvarRotuloCabo = () => {
    setEdges(eds => eds.map(e => e.id === modalCabo.edge.id ? { 
      ...e, label: modalCabo.nome.toUpperCase(), 
      labelStyle: { fill: '#fff', fontWeight: 900, fontSize: 11 }, 
      labelBgStyle: { fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 1 },
      labelBgPadding: [6, 4], labelBgBorderRadius: 6
    } : e));
    setModalCabo({ aberto: false, edge: null, nome: '' });
  };

  // 🖱️ DRAG & DROP (Com suporte a Parent Node Visual)
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('type');
    if (!type) return;

    let position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

    if (type === 'container') {
      setModalContainer({ aberto: true, pos: position, nome: '' });
    } 
    else if (type === 'ativo') {
      const maq = JSON.parse(event.dataTransfer.getData('payload'));
      
      // Verifica se a máquina foi solta em cima de um Container para se aninhar visualmente
      const containerAlvo = nodes.find(n => 
          n.type === 'container' &&
          position.x >= n.position.x && position.x <= n.position.x + (n.style?.width || 300) &&
          position.y >= n.position.y && position.y <= n.position.y + (n.style?.height || 200)
      );

      let parentNodeId = undefined;
      if (containerAlvo) {
          parentNodeId = containerAlvo.id;
          position = { x: position.x - containerAlvo.position.x, y: position.y - containerAlvo.position.y };
      }

      setNodes(nds => nds.concat({
        id: `node-${maq.patrimonio}`, type: 'ativo', position, parentNode: parentNodeId, extent: 'parent',
        data: { patrimonio: maq.patrimonio, ip: maq._ip, corStatus: maq._isOnline ? '#10b981' : '#ef4444', icon: maq._icon, tipo: maq._tipoNome }
      }));
    }
  }, [screenToFlowPosition, nodes, setNodes]);

  const criarContainer = () => {
    if(!modalContainer.nome.trim()) return;
    setNodes((nds) => nds.concat({
      id: `container-${Date.now()}`, type: 'container', position: modalContainer.pos,
      data: { label: modalContainer.nome.toUpperCase() }, 
      style: { width: 300, height: 250 }, zIndex: -1 // zIndex -1 garante que ele fique atrás das máquinas
    }));
    setModalContainer({ aberto: false, pos: null, nome: '' });
  };

  // 🌳 ÁRVORE LATERAL
  const ativosFiltrados = useMemo(() => {
    const mapeadosGlobais = new Set();
    Object.values(masterData.current).forEach(m => m.nodes.forEach(n => { if (n.type === 'ativo') mapeadosGlobais.add(n.data.patrimonio); }));
    nodes.forEach(n => { if (n.type === 'ativo') mapeadosGlobais.add(n.data.patrimonio); });

    const disponiveis = ativosOtimizados.filter(a => a.status !== 'SUCATA' && !mapeadosGlobais.has(a.patrimonio));
    if (!termoBusca) return disponiveis;
    const termos = termoBusca.toLowerCase().split(' ').filter(Boolean);
    return disponiveis.filter(a => termos.every(t => a._textoBuscavel.includes(t)));
  }, [ativosOtimizados, nodes, masterData, termoBusca]);

  const arvoreAtivos = useMemo(() => {
    const arvore = {};
    ativosFiltrados.forEach(ativo => {
      if (!arvore[ativo._sec]) arvore[ativo._sec] = { total: 0, setores: {} };
      if (!arvore[ativo._sec].setores[ativo._set]) arvore[ativo._sec].setores[ativo._set] = [];
      arvore[ativo._sec].setores[ativo._set].push(ativo);
      arvore[ativo._sec].total += 1;
    });
    return arvore;
  }, [ativosFiltrados]);

  if (carregando) return <div className="p-10 text-white text-center">Carregando Engine Visio NOC...</div>;

  return (
    <div ref={containerRef} className={`flex w-full bg-[#020617] font-sans relative transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-[78vh] rounded-3xl border border-slate-800 mt-4 overflow-hidden'}`}>
      
      {/* ======================================================== */}
      {/* MODAIS INTERNOS (SEM WINDOW.PROMPT) */}
      {/* ======================================================== */}
      
      {/* MODAL MAPA (ABAS) */}
      {modalMapa.aberto && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 animate-scale-up">
              <h3 className="text-white font-black uppercase text-sm mb-4 tracking-widest flex items-center gap-2"><span className="text-indigo-400">🗺️</span> {modalMapa.modo === 'criar' ? 'Nova Topologia' : 'Renomear Topologia'}</h3>
              <input autoFocus value={modalMapa.nome} onChange={e => setModalMapa({...modalMapa, nome: e.target.value})} onKeyDown={e => e.key === 'Enter' && salvarModalMapa()} placeholder="Ex: PRÉDIO ANEXO..." className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 uppercase transition-colors mb-4" />
              <div className="flex gap-2">
                 <button onClick={() => setModalMapa({ aberto: false, id: null, nome: '', modo: 'criar' })} className="flex-1 py-3 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-800 uppercase tracking-widest">Cancelar</button>
                 <button onClick={salvarModalMapa} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CONTAINER */}
      {modalContainer.aberto && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 animate-scale-up">
              <h3 className="text-white font-black uppercase text-sm mb-4 tracking-widest flex items-center gap-2"><span className="text-indigo-400">🔲</span> Nome do Agrupador</h3>
              <input autoFocus value={modalContainer.nome} onChange={e => setModalContainer({...modalContainer, nome: e.target.value})} onKeyDown={e => e.key === 'Enter' && criarContainer()} placeholder="Ex: SALA DE SERVIDORES..." className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 uppercase transition-colors mb-4" />
              <div className="flex gap-2">
                 <button onClick={() => setModalContainer({ aberto: false, pos: null, nome: '' })} className="flex-1 py-3 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-800 uppercase tracking-widest">Cancelar</button>
                 <button onClick={criarContainer} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30">Criar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CABO */}
      {modalCabo.aberto && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 animate-scale-up">
              <h3 className="text-white font-black uppercase text-sm mb-4 tracking-widest flex items-center gap-2"><span className="text-blue-400">🔌</span> Rótulo de Conexão</h3>
              <input autoFocus value={modalCabo.nome} onChange={e => setModalCabo({...modalCabo, nome: e.target.value})} onKeyDown={e => e.key === 'Enter' && salvarRotuloCabo()} placeholder="Ex: PORTA 24..." className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-xs font-bold outline-none focus:border-blue-500 uppercase transition-colors mb-4" />
              <div className="flex gap-2">
                 <button onClick={() => setModalCabo({ aberto: false, edge: null, nome: '' })} className="flex-1 py-3 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-800 uppercase tracking-widest">Cancelar</button>
                 <button onClick={salvarRotuloCabo} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30">Aplicar</button>
              </div>
           </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SIDEBAR ESQUERDA */}
      {/* ------------------------------------------------------------------- */}
      <div className={`${isFullscreen ? 'w-[320px]' : 'w-72 md:w-[340px]'} bg-slate-900 border-r border-slate-800 flex flex-col z-40 shrink-0 transition-all duration-300`}>
        
        <div className="p-4 bg-slate-950 flex justify-between items-center border-b border-slate-800">
           <h3 className="text-white font-black uppercase tracking-widest text-[11px] flex items-center gap-2"><span>🕸️</span> Visio NOC Core</h3>
           <button onClick={toggleFullscreen} className="text-slate-400 p-2 bg-slate-800 rounded-lg hover:text-white transition-all shadow-md active:scale-95" title="Tela Cheia">⛶</button>
        </div>

        {/* GERENCIADOR DE MAPAS (ABAS) */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/50">
           <div className="flex justify-between items-center mb-2 px-1">
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Suas Topologias</span>
             <button onClick={abrirModalCriarMapa} className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-black hover:bg-blue-500 hover:text-white transition-colors">+ Novo</button>
           </div>
           <div className="space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
             {listaMapas.map(mapa => (
                <div key={mapa.id} onClick={() => abrirMapa(mapa.id)} className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer text-[10px] font-black uppercase tracking-widest transition-colors group ${mapaAtivo === mapa.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  <span className="truncate flex-1">{mapa.nome}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => abrirModalEditarMapa(mapa.id, mapa.nome, e)} className="text-slate-300 hover:text-white" title="Renomear">✏️</button>
                    <button onClick={(e) => deletarMapa(mapa.id, e)} className="text-red-400 hover:text-red-300" title="Apagar">✖</button>
                  </div>
                </div>
             ))}
           </div>
        </div>

        {/* FERRAMENTA CONTAINER */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/30">
           <div onDragStart={(e) => { e.dataTransfer.setData('type', 'container'); e.dataTransfer.effectAllowed = 'move'; }} draggable className="w-full bg-slate-800 border border-slate-700 text-slate-300 py-2.5 rounded-lg text-center text-[10px] font-black cursor-grab hover:border-slate-500 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
             <span className="text-base">🔲</span> Arrastar Agrupador
           </div>
        </div>

        <div className="p-3 border-b border-slate-800 bg-slate-900 relative">
            <span className="absolute left-6 top-6 text-slate-500 text-xs">🔍</span>
            <input placeholder="IP, MAC, Patrimônio..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-white pl-8 pr-3 py-2.5 rounded-lg text-[11px] font-bold outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          <div className="flex justify-between items-center mb-3 px-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ativos Desconectados</p>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-black">{ativosFiltrados.length}</span>
          </div>

          {Object.keys(arvoreAtivos).length === 0 ? (
             <div className="text-center py-10 opacity-50">
               <span className="text-4xl mb-2 block">🍃</span><p className="text-[10px] text-white uppercase font-black tracking-widest">Todos no mapa</p>
             </div>
          ) : (
            Object.entries(arvoreAtivos).map(([secNome, secData]) => (
              <div key={secNome}>
                <div onClick={() => setExpandidos(p => ({...p, [secNome]: !p[secNome]}))} className="flex justify-between p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg cursor-pointer mb-1 transition-colors">
                  <span className="text-[10px] font-black text-slate-300 uppercase truncate tracking-wider">{expandidos[secNome] ? '📂' : '📁'} {secNome}</span>
                  <span className="text-[9px] text-slate-400 font-bold px-2 py-0.5 bg-slate-900 rounded-md border border-slate-700">{secData.total}</span>
                </div>
                {expandidos[secNome] && (
                  <div className="pl-3 ml-3 border-l-2 border-slate-800/50 space-y-1 mb-2">
                    {Object.entries(secData.setores).map(([setNome, maquinas]) => (
                      <div key={setNome}>
                        <div onClick={() => setExpandidos(p => ({...p, [secNome+setNome]: !p[secNome+setNome]}))} className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase p-2 cursor-pointer hover:text-white transition-colors">
                          <span className="truncate">↳ {setNome}</span><span className="text-slate-600">{maquinas.length}</span>
                        </div>
                        {expandidos[secNome+setNome] && maquinas.map(maq => (
                          <div key={maq.patrimonio} onDragStart={(e) => { e.dataTransfer.setData('type', 'ativo'); e.dataTransfer.setData('payload', JSON.stringify(maq)); }} draggable className="flex items-center justify-between p-2.5 mb-1.5 bg-slate-950/80 border border-slate-800 rounded-xl cursor-grab hover:border-blue-500 transition-all shadow-sm ml-4 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-lg drop-shadow-md group-hover:scale-110 transition-transform">{maq._icon}</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white group-hover:text-blue-400 transition-colors truncate">{maq.patrimonio}</span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase truncate">{maq.nome_personalizado || maq.modelo}</span>
                              </div>
                            </div>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${maq._isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`}></div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* CANVAS REACT FLOW */}
      <div className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
        <button onClick={salvarTopologiaGlobal} className="absolute top-4 right-4 z-40 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400 transition-all hover:bg-blue-500 active:scale-95">
          💾 Salvar Todos os Mapas
        </button>

        <div className="absolute bottom-10 right-10 text-[60px] font-black text-white/5 uppercase tracking-widest pointer-events-none select-none z-0">
           {masterData.current[mapaAtivo]?.nome}
        </div>

        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver} onEdgeDoubleClick={onEdgeDoubleClick} deleteKeyCode={['Backspace', 'Delete']} fitView attributionPosition="bottom-left">
          <Background color="#475569" gap={25} size={2} />
          <Controls style={{ background: '#1e293b', border: '1px solid #334155', fill: '#38bdf8' }} />
          <MiniMap maskColor="rgba(2, 6, 23, 0.85)" nodeColor="#3b82f6" style={{ background: '#0f172a' }} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MapaRedeWrapper({ ativos }) {
  return <ReactFlowProvider><ConstrutorMapa ativos={ativos} /></ReactFlowProvider>;
}