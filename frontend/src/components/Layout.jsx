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

  const borderStrong = theme === 'light' ? '1.5px solid #b8c5d6' : '1.5px solid #475569';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const atualizarNotificacoes = async () => {
    try {
      const res = await api.get('/api/inventario/');
      const ativos = res.data;
      
      const mCount = ativos.filter(a => a.status?.toUpperCase() === 'MANUTENÇÃO').length;
      const sCount = ativos.filter(a => a.status?.toUpperCase() === 'SUCATA').length;

      setCounts({ manutencao: mCount, sucata: sCount });

      const lastSeenTotal = parseInt(localStorage.getItem('lastSeenTotal') || '0');
      if ((mCount + sCount) > lastSeenTotal) {
        setHasNewNotif(true);
      } else {
        setHasNewNotif(false);
      }
    } catch (e) { console.error("Erro ao atualizar notificações"); }
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

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/cadastro', label: 'Gestão de Ativos', icon: '💻' }, 
    { path: '/cadastros-base', label: 'Cadastros Base', icon: '📁' },
    { path: '/auditoria', label: 'Auditoria', icon: '🛡️' },
    { path: '/config', label: 'Configurações', icon: '⚙️' },
    { path: '/ajuda', label: 'Central de Ajuda', icon: '📚' },
  ];

  return (
    <div className="flex h-screen overflow-hidden text-sm transition-colors duration-300" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
      
      {/* SIDEBAR */}
      <aside className={`flex flex-col transition-all duration-300 relative z-30 shadow-2xl ${isSidebarOpen ? 'w-56' : 'w-20'}`} 
             style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--text-sidebar)', borderRight: '2px solid rgba(0,0,0,0.3)' }}> 
        
        <div className="h-[70px] flex items-center justify-between px-5" style={{ borderBottom: '1.5px solid rgba(255,255,255,0.05)' }}>
          <h1 className="text-lg font-black tracking-tighter flex items-center gap-2 text-white">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg text-[10px] border border-blue-400">N</div>
            {isSidebarOpen && <span>NEXUS<span className="text-blue-500">.INV</span></span>}
          </h1>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}
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
          ))}
        </nav>

        <div className="mt-auto border-t p-4 flex flex-col items-center justify-center transition-all" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {isSidebarOpen ? (
            <>
              <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">Nexus System</span>
              <span className="text-[9px] font-mono font-bold text-blue-500 mt-1">v1.5.0.0</span>
            </>
          ) : (
            <span className="text-[9px] font-mono font-bold text-blue-500">v1.0</span>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <header className="h-[70px] sticky top-0 z-40 w-full px-6 flex items-center justify-between border-b backdrop-blur-md" 
                style={{ 
                  backgroundColor: theme === 'light' ? 'rgba(248, 250, 252, 0.8)' : 'rgba(15, 23, 42, 0.8)',
                  borderBottom: borderStrong,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' 
                }}>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="p-2.5 rounded-xl shadow-sm active:scale-95 transition-all" 
                    style={{ backgroundColor: 'var(--bg-card)', border: borderStrong, color: 'var(--text-main)' }}>
              {isSidebarOpen ? '◀' : '▶'}
            </button>
            <div className="font-black text-lg hidden md:block" style={{ color: 'var(--text-main)' }}>Inventário Nexus</div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* BOTÃO DE TEMA CORRIGIDO */}
            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl flex items-center justify-center hover:border-blue-400 transition-all shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* NOTIFICAÇÃO CORRIGIDA */}
            <div className="relative">
              <button onClick={handleOpenNotif} 
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:border-blue-400 transition-all relative group shadow-sm" 
                      style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
                <span className="text-xl group-hover:rotate-12 transition-transform">🔔</span>
                {hasNewNotif && (
                  <span className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white animate-bounce"></span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-4 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-scale-up" 
                     style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
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
            
            <div className="h-6 border-l mx-1" style={{ borderLeft: borderStrong }}></div>

            {/* PERFIL CORRIGIDO */}
            <button onClick={() => setDropdownOpen(!dropdownOpen)} 
                    className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl border shadow-sm transition-all hover:border-blue-400 relative" 
                    style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
              <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center text-[10px] font-black text-white uppercase shadow-md">
                {usuarioAtual ? usuarioAtual.substring(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-[12px] font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>{usuarioAtual}</div>
                <div className="text-[9px] font-bold text-blue-600 uppercase">Administrador</div>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-52 rounded-2xl border shadow-2xl z-50 overflow-hidden" 
                     style={{ backgroundColor: 'var(--bg-card)', border: borderStrong }}>
                  <Link to="/config" className="flex items-center gap-3 px-4 py-3 text-sm font-bold opacity-80 hover:opacity-100 transition-colors" style={{ color: 'var(--text-main)' }}>⚙️ Configurações</Link>
                  <button onClick={onLogout} className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-black text-red-500 hover:bg-red-500/10 transition-colors border-t" style={{ borderTop: borderStrong }}>🚪 Sair do Sistema</button>
                </div>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}