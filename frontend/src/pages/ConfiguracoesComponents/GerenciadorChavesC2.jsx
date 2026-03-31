import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function GerenciadorChavesC2({ usuarioAtual }) {
  const [usuariosC2, setUsuariosC2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [senhaArquivo, setSenhaArquivo] = useState("Nexus@2026");

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  const carregarStatusChaves = async () => {
    try {
      // 1. Rastreador para vermos no console (F12) se a variável existe
      console.log("🛠️ O usuário atual é:", usuarioAtual);

      // 2. Trava de segurança: se o usuário estiver vazio, coloca 'admin' por precaução
      const usuarioLogado = usuarioAtual || 'admin';

      // 3. Forçando a URL na marra com a variável chumbada no texto
      const urlCompleta = `${API_URL}/api/usuarios/chaves/listar?usuario_acao=${usuarioLogado}`;
      console.log("🌐 URL que será disparada:", urlCompleta);

      const res = await axios.get(urlCompleta);
      setUsuariosC2(res.data);
    } catch (error) {
      console.error(error); // Mostra o erro real no console
      toast.error("Erro ao carregar status das chaves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarStatusChaves();
  }, []);

  const gerarChave = async (usuarioAlvo) => {
    if(!senhaArquivo.trim()) return toast.warning("Digite uma senha para blindar o arquivo!");
    
    const confirmacao = window.confirm(`Atenção: O arquivo .pem será gerado APENAS UMA VEZ. Guarde e envie para o técnico ${usuarioAlvo}.\nDeseja gerar agora?`);
    if(!confirmacao) return;

    try {
      const toastId = toast.loading("Calculando Criptografia RSA de 4096 bits...");
      
      const res = await axios.post(`${API_URL}/api/usuarios/chaves/gerar`, {
        usuario_alvo: usuarioAlvo,
        usuario_acao: usuarioAtual,
        senha_arquivo: senhaArquivo
      });

      // Mágica para forçar o Download do arquivo .pem no navegador
      const blob = new Blob([res.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_chave_privada_${usuarioAlvo}.pem`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.update(toastId, { render: `Chave de ${usuarioAlvo} gerada com sucesso!`, type: "success", isLoading: false, autoClose: 5000 });
      carregarStatusChaves(); // Atualiza a tela

    } catch (error) {
      toast.error("Falha ao gerar as chaves de segurança.");
    }
  };

  const revogarChave = async (usuarioAlvo) => {
    if(!window.confirm(`Tem certeza? O técnico ${usuarioAlvo} perderá IMEDIATAMENTE o acesso de comandos remotos.`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/usuarios/chaves/revogar/${usuarioAlvo}?usuario_acao=${usuarioAtual}`);
      toast.success("Acesso revogado! A chave .pem dele agora é inútil.");
      carregarStatusChaves();
    } catch (error) {
      toast.error("Erro ao revogar chave.");
    }
  };

  if(loading) return <div className="p-10 text-center animate-pulse text-gray-400">Carregando painel de segurança...</div>;

  return (
    <div className="pt-4 animate-fade-in space-y-6">
      <div className="p-8 rounded-3xl border shadow-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-red-100 dark:bg-red-900/30 text-red-600 border border-red-200 dark:border-red-800">🔐</div>
          <div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white">Central de Chaves Criptográficas (C2)</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">Gerencie quem pode assinar e enviar comandos remotos</p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row gap-4 items-center">
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Senha Padrão para os Arquivos .PEM gerados:</span>
            <input 
              type="text" 
              value={senhaArquivo}
              onChange={(e) => setSenhaArquivo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="pb-3 text-xs font-black text-gray-500 uppercase tracking-wider">Operador C2</th>
                <th className="pb-3 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Status da Chave</th>
                <th className="pb-3 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Ação de Segurança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {usuariosC2.map(u => (
                <tr key={u.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-4 font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    @{u.username}
                  </td>
                  
                  <td className="py-4 text-center">
                    {u.tem_chave ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200">🟢 BLINDADO</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">🔴 SEM CHAVE</span>
                    )}
                  </td>
                  
                  <td className="py-4 text-right">
                    {u.tem_chave ? (
                      <button onClick={() => revogarChave(u.username)} className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all active:scale-95">
                        ❌ REVOGAR ACESSO
                      </button>
                    ) : (
                      <button onClick={() => gerarChave(u.username)} className="px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all active:scale-95">
                        💾 GERAR ARQUIVO .PEM
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {usuariosC2.length === 0 && (
                <tr><td colSpan="3" className="py-8 text-center text-sm text-gray-500 font-bold">Nenhum usuário com permissão de Terminal Remoto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}