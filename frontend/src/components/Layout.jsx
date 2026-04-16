import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function Layout({ children, onLogout, usuarioAtual }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  const [counts, setCounts] = useState({ manutencao: 0, sucata: 0 });
  const [hasNewNotif, setHasNewNotif] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const [nomeUsuario, setNomeUsuario] = useState(usuarioAtual ? usuarioAtual.nome : '');
  const [avatarUsuario, setAvatarUsuario] = useState('letras');

  const borderStrong = theme === 'light' ? '1.5px solid #b8c5d6' : '1.5px solid #475569';

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const permissoesObj = JSON.parse(localStorage.getItem('permissoes') || '[]');
  
  // 🚀 LENDO A EMPRESA DO USUÁRIO LOGADO
  const empresaLogada = usuarioAtual?.empresa || localStorage.getItem('empresa');
  const isModoDeus = empresaLogada === 'NEXUS_MASTER';

  const versaoCompleta = import.meta.env.VITE_VERSAO_SISTEMA || "0.0.0.0";
  const versaoCurta = import.meta.env.VITE_VERSAO_SISTEMA ? import.meta.env.VITE_VERSAO_SISTEMA.split('.')[0] + ".0" : "0.0";

  const carregarPerfil = async () => {
    if (!usuarioAtual || !usuarioAtual.nome) return;
    if (isModoDeus) return; // Super Admin Mestre não tem perfil no banco do cliente

    try {
      const res = await api.get('/api/usuarios/');
      const meuUser = res.data.find(u => u.username === usuarioAtual.nome);
      
      if (meuUser) {
        setNomeUsuario(meuUser.nome_exibicao || usuarioAtual.nome);
        setAvatarUsuario(meuUser.avatar || 'letras');
        localStorage.setItem('isAdmin', meuUser.is_admin);
        localStorage.setItem('permissoes', JSON.stringify(meuUser.permissoes || []));

        const aceitou = meuUser.termos_aceitos === true || meuUser.termos_aceitos === 1;
        if (!aceitou) {
            localStorage.setItem('nexus_bloqueado', 'true');
            setBloqueado(true);
        } else {
            localStorage.removeItem('nexus_bloqueado'); 
            setBloqueado(false); 
            window.dispatchEvent(new Event('statusTermosAlterado'));
        }
      }
    } catch (e) {
      console.error("Erro ao buscar perfil", e);
    }
  };

  useEffect(() => {
    carregarPerfil();
    const atualizarDadosPerfil = () => carregarPerfil(); 
    window.addEventListener('perfilAtualizado', atualizarDadosPerfil);
    return () => window.removeEventListener('perfilAtualizado', atualizarDadosPerfil);
  }, [usuarioAtual]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const atualizarNotificacoes = async () => {
    if (isModoDeus) return; // Modo mestre não vê máquinas quebradas no sininho
    try {
      const res = await api.get('/api/inventario/');
      const ativos = res.data;
      const mCount = ativos.filter(a => a.status?.toUpperCase() === 'MANUTENÇÃO').length;
      const sCount = ativos.filter(a => a.status?.toUpperCase() === 'SUCATA').length;
      setCounts({ manutencao: mCount, sucata: sCount });

      const lastSeenTotal = parseInt(localStorage.getItem('lastSeenTotal') || '0');
      setHasNewNotif((mCount + sCount) > lastSeenTotal);
    } catch (e) {}
  };

  useEffect(() => {
    atualizarNotificacoes();
    const interval = setInterval(atualizarNotificacoes, 10000); 
    return () => clearInterval(interval);
  }, []);

  const handleOpenNotif = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
      setHasNewNotif(false);
      localStorage.setItem('lastSeenTotal', (counts.manutencao + counts.sucata).toString());
    }
  };

  const irParaNotificacao = (statusFiltro) => {
    setNotifOpen(false);
    navigate(`/cadastro?filtroStatus=${statusFiltro}`);
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const menuItemsGerais = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: '📊' },
    { id: 'gestao_ativos', path: '/cadastro', label: 'Gestão de Ativos', icon: '💻' },
    { id: 'nexus_print', path: '/nexus-print', label: 'Nexus Print', icon: '🖨️' }, 
    { id: 'cadastros', path: '/cadastros-base', label: 'Cadastros Base', icon: '📁' },
    { id: 'auditoria', path: '/auditoria', label: 'Auditoria Logs', icon: '🛡️' },
    { id: 'configuracoes', path: '/config', label: 'Configurações', icon: '⚙️' },
    { id: 'ajuda', path: '/ajuda', label: 'Central de Ajuda', icon: '📚' },
  ];

  const [bloqueado, setBloqueado] = useState(localStorage.getItem('nexus_bloqueado') === 'true');

  useEffect(() => {
    const verificarTrava = () => setBloqueado(localStorage.getItem('nexus_bloqueado') === 'true');
    window.addEventListener('statusTermosAlterado', verificarTrava);
    return () => window.removeEventListener('statusTermosAlterado', verificarTrava);
  }, []);

  const menuFiltrado = menuItemsGerais.filter(item => {
      // 🚀 Se for Modo Deus, esconde o menu normal do cliente
      if (isModoDeus) return false; 
      
      const temPermissaoNormal = isAdmin || item.id === 'ajuda' || permissoesObj.includes(item.id);
      if (bloqueado && item.id !== 'ajuda') return false; 
      return temPermissaoNormal;
  });

  return (
    <div className="flex h-screen overflow-hidden text-sm transition-colors duration-300" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
      
      <aside 
        className={`flex flex-col transition-all duration-300 relative z-30 shadow-2xl ${isSidebarOpen ? 'w-56' : 'w-20'}`} 
        style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-sidebar)', borderRight: '2px solid rgba(0,0,0,0.3)' }}
      > 
        
        <div className="h-[70px] flex items-center justify-between px-5" style={{ borderBottom: '1.5px solid rgba(255,255,255,0.05)' }}>
          <h1 className="text-lg font-black tracking-tighter flex items-center gap-2 text-white">
            {/* 🚀 TROCA O ÍCONE SE FOR A MATRIZ */}
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-lg text-[10px] border ${isModoDeus ? 'bg-red-600 border-red-400' : 'bg-blue-600 border-blue-400'}`}>
              {isModoDeus ? 'M' : 'N'}
            </div>
            {isSidebarOpen && (
              <span>NEXUS<span className={isModoDeus ? 'text-red-500' : 'text-blue-500'}>{isModoDeus ? '.SAAS' : '.CONTROL'}</span></span>
            )}
          </h1>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {isModoDeus ? (
             <Link 
              to="/matriz"
              className="flex items-center gap-3 py-2.5 rounded-xl transition-all font-bold shadow-md px-4"
              style={{ backgroundColor: 'var(--color-red)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.2)' }}
             >
               <span className="text-lg">👁️</span>
               {isSidebarOpen && <span className="text-[13px] tracking-wide">Gestão da Matriz</span>}
             </Link>
          ) : (
            menuFiltrado.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 py-2.5 rounded-xl transition-all font-bold ${isSidebarOpen ? 'px-4' : 'justify-center'} ${location.pathname === item.path ? 'shadow-md' : 'hover:bg-white/5'}`}
                style={{
                  backgroundColor: location.pathname === item.path ? 'var(--color-blue)' : 'transparent',
                  color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: location.pathname === item.path ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid transparent'
                }}
              >
                <span className="text-lg">{item.icon}</span>
                {isSidebarOpen && <span className="text-[13px]">{item.label}</span>}
              </Link>
            ))
          )}
        </nav>

        <div className="mt-auto border-t p-4 flex flex-col items-center justify-center transition-all" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {isSidebarOpen ? (
            <>
              <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">{isModoDeus ? 'NEXUS MASTER' : 'Nexus System'}</span>
              <span className="text-[9px] font-mono font-bold mt-1" style={{ color: isModoDeus ? 'var(--color-red)' : 'var(--color-blue)' }}>v{versaoCompleta}</span>
            </>
          ) : (
            <span className="text-[9px] font-mono font-bold text-blue-500">v{versaoCurta}</span>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header 
          className="h-[70px] sticky top-0 z-40 w-full px-6 flex items-center justify-between border-b backdrop-blur-md" 
          style={{ backgroundColor: theme === 'light' ? 'rgba(248, 250, 252, 0.8)' : 'rgba(15, 23, 42, 0.8)', borderBottom: borderStrong, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
        >
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2.5 rounded-xl shadow-sm active:scale-95 transition-all" 
              style={{ backgroundColor: 'var(--bg-card)', border: borderStrong, color: 'var(--text-main)' }}
            >
              {isSidebarOpen ? '◀' : '▶'}
            </button>
            <div className="font-black text-lg hidden md:block uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
              {isModoDeus ? 'Painel de Controle Mestre' : 'Inventário Nexus'}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-gray-500/10 shadow-sm text-lg" 
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderStyle: 'solid', borderWidth: '1px' }}
            >
              <span style={{ textShadow: theme === 'light' ? '0px 0px 2px rgba(0,0,0,0.4), 0px 2px 5px rgba(0,0,0,0.2)' : 'none' }}>
                {theme === 'light' ? '🌙' : '☀️'}
              </span>
            </button>

            {!isModoDeus && (
              <div className="relative">
                <button 
                  onClick={handleOpenNotif} 
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-gray-500/10 relative group shadow-sm" 
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderStyle: 'solid', borderWidth: '1px' }}
                >
                  <span className="text-xl group-hover:rotate-12 transition-transform" style={{ textShadow: theme === 'light' ? '0px 0px 2px rgba(0,0,0,0.4), 0px 2px 5px rgba(0,0,0,0.2)' : 'none' }}>🔔</span>
                  {hasNewNotif && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 shadow-sm animate-bounce" style={{ borderColor: 'var(--bg-card)' }}></span>}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-4 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
                    <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-input)', borderBottom: borderStrong }}>
                      <h4 className="font-black text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Notificações</h4>
                      <button onClick={() => setNotifOpen(false)} className="opacity-50 hover:opacity-100">&times;</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {counts.manutencao === 0 && counts.sucata === 0 ? (
                        <div className="p-10 text-center italic opacity-50">Tudo em dia por aqui!</div>
                      ) : (
                        <>
                          {counts.manutencao > 0 && (
                            <div onClick={() => irParaNotificacao('MANUTENÇÃO')} className="p-4 flex gap-4 items-start transition-colors cursor-pointer border-b hover:opacity-80" style={{ borderBottom: borderStrong }}>
                              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-xl">🛠️</div>
                              <div>
                                <p className="font-black text-xs" style={{ color: 'var(--text-main)' }}>Manutenção Ativa</p>
                                <p className="text-[11px] opacity-70" style={{ color: 'var(--text-main)' }}>Há <strong>{counts.manutencao}</strong> máquina(s) no setor técnico.</p>
                              </div>
                            </div>
                          )}
                          {counts.sucata > 0 && (
                            <div onClick={() => irParaNotificacao('SUCATA')} className="p-4 flex gap-4 items-start transition-colors cursor-pointer hover:opacity-80">
                              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">🗑️</div>
                              <div>
                                <p className="font-black text-xs" style={{ color: 'var(--text-main)' }}>Itens para Descarte</p>
                                <p className="text-[11px] opacity-70" style={{ color: 'var(--text-main)' }}>Há <strong>{counts.sucata}</strong> item(ns) na lista de sucata.</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="h-6 border-l mx-1" style={{ borderLeft: borderStrong }}></div>

            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl shadow-sm transition-all hover:border-blue-400" 
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderStyle: 'solid', borderWidth: '1px' }}
              >
                <div 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shadow-md ${isModoDeus ? 'bg-red-600 text-white text-lg' : avatarUsuario === 'letras' ? 'bg-gray-900 text-white text-[10px] uppercase' : 'bg-transparent text-lg'}`} 
                  style={{ textShadow: avatarUsuario !== 'letras' && theme === 'light' ? '0px 0px 2px rgba(0,0,0,0.4), 0px 2px 5px rgba(0,0,0,0.2)' : 'none' }}
                >
                  {isModoDeus ? '👁️' : avatarUsuario === 'letras' ? (nomeUsuario || localStorage.getItem('usuario') || 'US').substring(0, 2).toUpperCase() : avatarUsuario}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-[12px] font-black tracking-tight capitalize" style={{ color: 'var(--text-main)' }}>
                    {isModoDeus ? 'Super Admin' : nomeUsuario}
                  </div>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-14 w-52 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-scale-up" style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
                  {/* 🚀 REMOVEMOS O !isModoDeus DAQUI PARA O MESTRE PODER ENTRAR */}
                  <Link to="/perfil" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold opacity-80 hover:opacity-100 transition-all hover:bg-gray-500/5" style={{ color: 'var(--text-main)' }}>
                      👤 Meu Perfil
                  </Link>
                  {!isModoDeus && isAdmin && (
                    <Link to="/config" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold opacity-80 hover:opacity-100 transition-all hover:bg-gray-500/5" style={{ color: 'var(--text-main)' }}>
                      ⚙️ Configurações
                    </Link>
                  )}
                  <button 
                    onClick={() => { setDropdownOpen(false); onLogout(); }} 
                    className="flex items-center gap-3 w-full text-left px-4 py-3.5 text-sm font-black text-red-500 hover:bg-red-500/10 transition-colors border-t" 
                    style={{ borderTop: borderStrong }}
                  >
                    🚪 Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}