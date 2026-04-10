import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './api/api';
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
import PainelMatriz from './pages/Matriz/PainelMatriz';
import ConsultaQR from './pages/ConsultaQR';

// ==========================================
// GUARDA DE SEGURANÇA (ROTA PROTEGIDA)
// ==========================================
const RotaProtegida = ({ children, requerMatriz }) => {
  const logado = !!localStorage.getItem('usuario');
  const isBloqueado = localStorage.getItem('nexus_bloqueado') === 'true';
  const empresaLogada = localStorage.getItem('empresa');
  const isModoDeus = empresaLogada === 'NEXUS_MASTER';
  const location = useLocation();

  React.useEffect(() => {
    const enviarPing = async () => {
      const nomeUsuario = localStorage.getItem('usuario');
      if (nomeUsuario) {
        try { await api.post('/api/usuarios/ping', { username: nomeUsuario }); } catch (e) { }
      }
    };
    setTimeout(enviarPing, 3000);
    const intervalo = setInterval(enviarPing, 60000);
    return () => clearInterval(intervalo);
  }, []);

  if (!logado) return <Navigate to="/login" replace />;

  // 🚀 AS DUAS REGRAS DE TITÂNIO DO MODO DEUS:
  // 1. Se a tela requer a Matriz, mas o cara NÃO É a matriz, chuta ele pro Dashboard
  if (requerMatriz && !isModoDeus) {
    return <Navigate to="/" replace />;
  }

  // 2. Se o cara É a Matriz, mas está tentando acessar qualquer outra tela (como o /cadastro), chuta ele pra Matriz
  // 🚀 EXCEÇÃO: Permite que ele acesse a tela do próprio Perfil!
  if (isModoDeus && !requerMatriz && location.pathname !== '/perfil') {
    return <Navigate to="/matriz" replace />;
  }

  // Regra de LGPD normal para clientes
  if (!isModoDeus && isBloqueado && location.pathname !== '/perfil' && location.pathname !== '/ajuda') {
    return <Navigate to="/perfil" replace />;
  }

  return children;
};

export default function App() {
  const handleLogout = () => {
    if (window.confirm("Deseja realmente sair do sistema?")) {
      localStorage.clear(); 
      window.location.href = '/login'; 
    }
  };

  const getUsuarioLogado = () => {
    const nome = localStorage.getItem('usuario');
    const empresa = localStorage.getItem('empresa'); 
    if (!nome) return null;
    
    return {
      nome: nome,
      empresa: empresa, 
      is_admin: localStorage.getItem('isAdmin') === 'true',
      permissoes: JSON.parse(localStorage.getItem('permissoes') || '[]')
    };
  };

  const usuarioAtualObj = getUsuarioLogado();

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" newestOnTop toastStyle={{ zIndex: 2147483647 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/consulta/*" element={<ConsultaPublica />} />
        
        {/* 🚀 ROTA DA MATRIZ: Definida com `requerMatriz={true}` */}
        <Route path="/matriz" element={
          <RotaProtegida requerMatriz={true}>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <PainelMatriz />
            </Layout>
          </RotaProtegida>
        } />

        {/* Rotas Comuns: NÃO usam `requerMatriz={true}` */}
        <Route path="/" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><Dashboard /></Layout></RotaProtegida>} />
        <Route path="/cadastro" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><Cadastro /></Layout></RotaProtegida>} />
        <Route path="/auditoria" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><Auditoria /></Layout></RotaProtegida>} />
        <Route path="/cadastros-base" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><CadastrosBase /></Layout></RotaProtegida>} />
        <Route path="/config" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><Configuracoes /></Layout></RotaProtegida>} />
        <Route path="/ajuda" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><Ajuda /></Layout></RotaProtegida>} />
        <Route path="/perfil" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><MeuPerfil usuarioAtual={usuarioAtualObj} /></Layout></RotaProtegida>} />
        <Route path="/nexus-print" element={<RotaProtegida><Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}><NexusPrint /></Layout></RotaProtegida>} />
        <Route path="/consulta/:tenant/:patrimonio" element={<ConsultaQR />} />

        {/* Redirecionamento de rotas inexistentes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}