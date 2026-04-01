import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// ==========================================
// GUARDA DE SEGURANÇA (ROTA PROTEGIDA + TRAVA DE TERMOS)
// ==========================================
const RotaProtegida = ({ children }) => {
  const logado = !!localStorage.getItem('usuario');
  // Usamos um state para que a rota mude assim que o localStorage mudar
  const [isBloqueado, setIsBloqueado] = React.useState(localStorage.getItem('nexus_bloqueado') === 'true');

  // 🚀 SISTEMA DE HEARTBEAT (ONLINE/OFFLINE)
  React.useEffect(() => {
    const enviarPing = async () => {
      const nomeUsuario = localStorage.getItem('usuario');
      if (nomeUsuario) {
        try {
          // Usando o seu axios já configurado em vez de fetch nativo
          await api.post('/api/usuarios/ping', { username: nomeUsuario });
        } catch (e) { 
          // Se falhar, não queremos que mostre erro na tela do usuário
          console.error("Falha ao enviar ping de presença:", e); 
        }
      }
    };

    setTimeout(enviarPing, 3000);
    const intervalo = setInterval(enviarPing, 60000);
    return () => clearInterval(intervalo);
  }, []);

  if (!logado) return <Navigate to="/login" replace />;

  const rotaAtual = window.location.pathname;
  if (isBloqueado && rotaAtual !== '/perfil' && rotaAtual !== '/ajuda') {
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

  // 🚀 NOVA LÓGICA: Reconstrói o objeto do utilizador com todos os dados!
  const getUsuarioLogado = () => {
    const nome = localStorage.getItem('usuario');
    if (!nome) return null;
    
    return {
      nome: nome,
      // Como o localStorage guarda tudo como texto, fazemos a conversão para boolean
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

        <Route path="/" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <Dashboard />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/cadastro" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <Cadastro />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/auditoria" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <Auditoria />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/cadastros-base" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <CadastrosBase />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/config" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <Configuracoes />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/ajuda" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <Ajuda />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/perfil" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <MeuPerfil usuarioAtual={usuarioAtualObj} />
            </Layout>
          </RotaProtegida>
        } />
        <Route path="/nexus-print" element={
          <RotaProtegida>
            <Layout onLogout={handleLogout} usuarioAtual={usuarioAtualObj}>
              <NexusPrint />
            </Layout>
          </RotaProtegida>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}