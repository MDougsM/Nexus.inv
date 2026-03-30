import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


import ConsultaPublica from './pages/ConsultaPublica';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Configuracoes from './pages/Configuracoes';
import Cadastro from './pages/Cadastro';
import Auditoria from './pages/Auditoria';
import CadastrosBase from './pages/CadastrosBase';
import Ajuda from './pages/Ajuda';
import MeuPerfil from './pages/MeuPerfil';
import NexusPrint from './pages/NexusPrint';

// ==========================================
// GUARDA DE SEGURANÇA (ROTA PROTEGIDA + TRAVA DE TERMOS)
// ==========================================
const RotaProtegida = ({ children }) => {
  const logado = !!localStorage.getItem('usuario');
  // Usamos um state para que a rota mude assim que o localStorage mudar
  const [isBloqueado, setIsBloqueado] = React.useState(localStorage.getItem('nexus_bloqueado') === 'true');

  React.useEffect(() => {
    const checkLock = () => {
      setIsBloqueado(localStorage.getItem('nexus_bloqueado') === 'true');
    };
    // Escuta o evento que criamos para saber quando desbloquear
    window.addEventListener('statusTermosAlterado', checkLock);
    return () => window.removeEventListener('statusTermosAlterado', checkLock);
  }, []);

  if (!logado) return <Navigate to="/login" replace />;

  const rotaAtual = window.location.pathname;
  if (isBloqueado && rotaAtual !== '/perfil' && rotaAtual !== '/ajuda') {
    return <Navigate to="/perfil" replace />;
  }

  return children;
};

export default function App() {
  
  // Função central de Logout (Passada para o Layout)
  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      localStorage.clear(); // Limpa a sessão
      window.location.href = '/login'; // O href força um reload total, limpando a memória RAM do app
    }
  };

  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="colored"
        newestOnTop
        toastStyle={{ zIndex: 2147483647 }}
      />
      
      <Routes>
        {/* ROTA PÚBLICA (Fora do Layout, ou seja, sem Menu Lateral) */}
        <Route path="/login" element={<Login />} />
        <Route path="/consulta/*" element={<ConsultaPublica />} />

        {/* TODAS AS ROTAS PRIVADAS FICAM AQUI DENTRO */}
        <Route path="/*" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={localStorage.getItem('usuario')}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/cadastros-base" element={<CadastrosBase />} />
                <Route path="/config" element={<Configuracoes />} />
                <Route path="/ajuda" element={<Ajuda />} />
                <Route path="/perfil" element={<MeuPerfil usuarioAtual={localStorage.getItem('usuario')} />} />
                <Route path="/nexus-print" element={<NexusPrint />} />
                
                {/* Rota de fallback: Digitou algo errado? Volta pro Dashboard */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </RotaProtegida>
        } />
      </Routes>
    </Router>
  );
}