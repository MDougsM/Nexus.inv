import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import { FaTimes, FaUserPlus, FaTrash, FaShieldAlt, FaKey } from 'react-icons/fa';

export default function ModalUsuariosCliente({ empresa, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para novo usuário
  const [novoUser, setNovoUser] = useState({ username: '', password: '', is_admin: false });

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/matriz/usuarios-cliente/${empresa.codigo_acesso}`);
      setUsuarios(res.data);
    } catch (e) {
      toast.error("Erro ao carregar usuários do cliente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarUsuarios(); }, [empresa]);

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/matriz/usuarios-cliente/criar', {
        ...novoUser,
        empresa_cod: empresa.codigo_acesso
      });
      toast.success("Usuário injetado com sucesso!");
      setNovoUser({ username: '', password: '', is_admin: false });
      carregarUsuarios();
    } catch (e) {
      toast.error("Erro ao criar usuário.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* HEADER */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
               <FaShieldAlt className="text-red-500" /> Gestão de Acessos: {empresa.codigo_acesso}
            </h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Controle de utilizadores do inquilino</p>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/10 text-gray-400 transition-all">
            <FaTimes size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">
          
          {/* COLUNA ESQUERDA: LISTA */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] mb-4">Utilizadores Ativos</h4>
            {loading ? (
              <div className="p-10 text-center animate-pulse text-gray-500 font-bold">Sincronizando com o banco do cliente...</div>
            ) : (
              <div className="space-y-3">
                {usuarios.map(u => (
                  <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:border-red-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${u.is_admin ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                        {u.username.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white text-sm">{u.username}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">{u.is_admin ? 'Administrador' : 'Operador'}</p>
                      </div>
                    </div>
                    
                    {u.username !== 'admin' && (
                      <button className="p-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all">
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: FORMULÁRIO DE INJEÇÃO */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 sticky top-0">
              <h4 className="text-xs font-black text-white uppercase mb-6 flex items-center gap-2">
                <FaUserPlus className="text-red-500" /> Injetar Novo Usuário
              </h4>
              
              <form onSubmit={handleCriarUsuario} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Username</label>
                  <input 
                    required className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold outline-none focus:border-red-500 transition-all"
                    value={novoUser.username} onChange={e => setNovoUser({...novoUser, username: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Senha Provisória</label>
                  <div className="relative">
                    <input 
                      required type="password"
                      className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold outline-none focus:border-red-500 transition-all"
                      value={novoUser.password} onChange={e => setNovoUser({...novoUser, password: e.target.value})}
                    />
                    <FaKey className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/20 border border-white/5 cursor-pointer" onClick={() => setNovoUser({...novoUser, is_admin: !novoUser.is_admin})}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${novoUser.is_admin ? 'bg-red-600 border-red-600' : 'border-white/20'}`}>
                    {novoUser.is_admin && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <span className="text-xs font-bold text-gray-300">Privilégios de Administrador</span>
                </div>

                <button type="submit" className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95">
                  Criar no Cliente
                </button>
              </form>
            </div>
          </div>

        </div>

        <div className="p-4 bg-red-600/10 text-center">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Ambiente de Gerenciamento Mestre - Nexus SaaS</p>
        </div>
      </div>
    </div>
  , document.body);
}