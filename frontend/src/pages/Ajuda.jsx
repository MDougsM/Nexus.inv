import React, { useState } from 'react';
import { FaLaptopCode, FaPrint, FaQrcode, FaShieldAlt, FaCogs, FaUserShield, FaChevronRight } from 'react-icons/fa';

export default function Ajuda() {
  const [moduloAtivo, setModuloAtivo] = useState('gestao_ativos');
  const [abaExpandida, setAbaExpandida] = useState(null);

  const toggleAba = (abaNome) => {
    setAbaExpandida(abaExpandida === abaNome ? null : abaNome);
  };

  // 🗺️ O MAPA COMPLETO DO SISTEMA (Baseado 100% no seu código)
  const mapaDoSistema = [
    {
      id: 'gestao_ativos',
      titulo: 'Gestão de Equipamentos',
      icone: <FaQrcode />,
      descricao: 'Módulo central onde ocorre o cadastro, movimentação em lote, edição e exclusão das máquinas.',
      abas: [
        {
          nome: 'Aba: Busca e Gestão',
          descricao: 'Tela principal que exibe a lista de todas as máquinas cadastradas e permite ações rápidas.',
          elementos: [
            { tipo: 'Filtro', nome: 'Pesquisa Livre', desc: 'Busca instantaneamente qualquer máquina digitando Patrimônio, Marca, IP, Serial ou Apelido.' },
            { tipo: 'Filtro', nome: 'Filtrar Status', desc: 'Exibe apenas máquinas "Em Operação", "Manutenção" ou "Sucata".' },
            { tipo: 'Botão', nome: 'Exportar Relatório', desc: 'Gera e baixa uma planilha Excel (.csv) contendo exatamente as máquinas que estão aparecendo na tela naquele momento.' },
            { tipo: 'Ação', nome: 'Caixa de Seleção (Checkbox)', desc: 'Localizada na primeira coluna da tabela. Ao marcar uma ou mais máquinas, revela a "Barra de Ações em Lote" no topo da tela.' },
            { tipo: 'Menu', nome: 'Barra de Ações em Lote', desc: 'Aparece ao selecionar máquinas. Contém os botões: 🖨️ QRs (Gera etiquetas de todas juntas), 🚚 Transferir (Move todas para um setor), ✏️ Editar Lote (Altera especificações em massa, desde que sejam do mesmo tipo), 🛠️ Status e 🗑️ Excluir.' },
            { tipo: 'Ícone', nome: 'Bolinha Verde/Cinza', desc: 'Ao lado do patrimônio. Pisca em verde se o Agente Sentinel enviou dados da máquina nas últimas 72 horas (Online).' },
            { tipo: 'Botão', nome: '👁️ (Ver Ficha)', desc: 'Abre o Registro Geral do Ativo (RG). Mostra o QR Code gigante, Localização Atual e a Linha do Tempo (Auditoria) detalhando quem transferiu ou editou a máquina desde a sua criação.' },
            { tipo: 'Botão', nome: '🖨️ (Etiqueta QR)', desc: 'Abre um pop-up rápido apenas com o QR Code. Possui o botão "Imprimir Etiqueta" para envio direto à impressora.' },
            { tipo: 'Botão', nome: 'Opções ▾', desc: 'Abre um menu suspenso para a máquina com: Clonar Máquina, Editar Cadastro, Transferir Local, Alterar Status ou Excluir Definitivo.' }
          ]
        },
        {
          nome: 'Aba: Novo Cadastro',
          descricao: 'Interface para inserir novos equipamentos manualmente no inventário.',
          elementos: [
            { tipo: 'Campo', nome: 'Patrimônio', desc: 'Se deixado em branco, o sistema gerará um código "S/P_" sequencial automaticamente. Se preenchido, fará checagem anti-duplicidade.' },
            { tipo: 'Campo', nome: 'Tipo de Equipamento', desc: 'Define a categoria. Ao ser selecionado, faz aparecer magicamente os "Campos Exclusivos" cadastrados para aquele tipo (ex: Voltagem, Memória).' },
            { tipo: 'Campo', nome: 'Apelido (Nome Personalizado)', desc: 'Nome amigável da máquina. O Agente Sentinel é bloqueado e NUNCA apaga ou altera este campo.' },
            { tipo: 'Botão', nome: 'Cadastrar Equipamento', desc: 'Salva o registro. Se você estiver usando a função "Clonar", este botão se chamará "Salvar Clone".' }
          ]
        },
        {
          nome: 'Aba: Histórico & Descartes',
          descricao: 'Registra o histórico de máquinas enviadas para manutenção ou baixadas como sucata.',
          elementos: [
            { tipo: 'Tabela', nome: 'Histórico de O.S', desc: 'Mostra a Data, Patrimônio, de qual status veio para qual foi, e o Número da O.S informada no Milvus.' },
            { tipo: 'Botão', nome: '♻️ Restaurar', desc: 'Aparece apenas nas linhas de "Sucata". Ao clicar, permite devolver o equipamento ao status "Ativo" (Em operação), exigindo uma justificativa para a auditoria.' }
          ]
        }
      ]
    },
    {
      id: 'nexus_print',
      titulo: 'Nexus Print (Telemetria)',
      icone: <FaPrint />,
      descricao: 'Central de faturamento, monitoramento de toners e robôs de fechamento mensal.',
      abas: [
        {
          nome: 'Aba: Painel de Controle',
          descricao: 'Monitoramento em tempo real das impressoras da rede.',
          elementos: [
            { tipo: 'Filtros', nome: 'Secretaria / Suprimento', desc: 'Permite filtrar a lista por Local ou por Nível de Toner/Cilindro (Normal, Atenção <30%, Crítico <15%).' },
            { tipo: 'Botão', nome: '📡 Forçar Leitura', desc: 'Dispara um comando de broadcast na rede. Obriga todos os agentes Sentinel a lerem as impressoras imediatamente e enviarem os níveis atualizados ao painel.' },
            { tipo: 'Botão', nome: 'Exportar Tudo', desc: 'Baixa a lista de impressoras e seus níveis atuais de toner em uma planilha Excel.' },
            { tipo: 'Ação', nome: 'Expandir Linha da Impressora', desc: 'Clique em qualquer lugar da linha de uma impressora para expandi-la. Revela o "Hostname", o Status dos Suprimentos em texto e o Gráfico de Evolução de Páginas impressas.' },
            { tipo: 'Gráfico', nome: 'Gráfico de Faturamento', desc: 'Dentro da linha expandida, permite filtrar o crescimento do contador por Hora, Dia ou Mês.' }
          ]
        },
        {
          nome: 'Aba: Relatórios & Faturamento',
          descricao: 'Geração manual de faturamento de páginas de um período específico.',
          elementos: [
            { tipo: 'Campos', nome: 'Início / Fim / Locais', desc: 'Defina a janela de tempo e marque nos checkboxes quais Secretarias farão parte do faturamento.' },
            { tipo: 'Botão', nome: '🔍 Gerar', desc: 'O sistema procura a leitura do primeiro dia e a leitura do último dia, e faz a subtração (Contador Final - Inicial = Consumo) para cada máquina.' },
            { tipo: 'Botão', nome: 'Baixar Excel (Ícone Verde)', desc: 'Aparece após gerar o relatório. Faz o download dos dados crus em CSV.' },
            { tipo: 'Botão', nome: 'Baixar PDF (Ícone Vermelho)', desc: 'Aparece após gerar o relatório. Gera um PDF formatado oficial, contendo o logotipo/CNPJ da empresa (se configurados) para assinatura do contrato.' }
          ]
        },
        {
          nome: 'Aba: Automações (Robôs)',
          descricao: 'Programação de fechamentos automáticos mensais.',
          elementos: [
            { tipo: 'Formulário', nome: 'Programar Novo Fechamento', desc: 'Insira o Nome da Rotina, Dia do Mês, Hora e marque os locais. Clique em "Adicionar Robô" para deixar o servidor agendado para rodar o fechamento sozinho todo mês.' },
            { tipo: 'Botão', nome: '▶️ Play (Forçar Geração Agora)', desc: 'Fica na lista de "Robôs Ativos". Se não quiser esperar o dia agendado chegar, clique neste botão para obrigar o robô a fazer o fechamento imediatamente.' },
            { tipo: 'Menu', nome: 'Cofre de Relatórios Prontos', desc: 'Painel direito. Onde os robôs depositam os PDFs e CSVs gerados. Clique no botão azul de download para baixar os fechamentos dos meses anteriores.' }
          ]
        }
      ]
    },
    {
      id: 'cadastros_base',
      titulo: 'Cadastros Base',
      icone: <FaLaptopCode />,
      descricao: 'Configuração estrutural de Tipos de Equipamentos e Locais.',
      abas: [
        {
          nome: 'Aba: Tipos de Equipamentos',
          descricao: 'Criação das categorias e especificações técnicas exigidas.',
          elementos: [
            { tipo: 'Aviso', nome: 'Prevenção de Duplicidade', desc: 'Patrimônio, Marca, Modelo e Setor são campos nativos. NUNCA crie eles aqui.' },
            { tipo: 'Campos', nome: 'Nome / Especificações', desc: 'Crie o tipo (Ex: Switch) e digite os campos que ele precisa separados por vírgula (Ex: Quantidade de Portas, Gerenciável).' },
            { tipo: 'Botão', nome: 'Adicionar', desc: 'Salva a categoria. Ao cadastrar uma máquina desse tipo depois, o sistema montará o formulário exigindo preencher as Portas e se é Gerenciável.' }
          ]
        },
        {
          nome: 'Aba: Secretarias e Setores',
          descricao: 'Montagem da árvore organizacional de locais.',
          elementos: [
            { tipo: 'Botão', nome: 'Criar Secretaria', desc: 'Cria o "Prédio" ou unidade raiz superior.' },
            { tipo: 'Ação', nome: 'Abrir Secretaria (Acordeão)', desc: 'Clique em cima do nome da secretaria criada. O painel se expandirá para baixo.' },
            { tipo: 'Botão', nome: 'Adicionar Setor', desc: 'Dentro do painel expandido da secretaria, digite o nome das salas (Ex: Recepção, RH) e clique aqui para vinculá-las àquela secretaria.' }
          ]
        }
      ]
    },
    {
      id: 'configuracoes',
      titulo: 'Configurações e Usuários',
      icone: <FaCogs />,
      descricao: 'Gerenciamento da empresa, instaladores, migração e acessos.',
      abas: [
        {
          nome: 'Painel Superior: Instaladores',
          descricao: 'Onde baixar os programas que rodam nas máquinas dos clientes.',
          elementos: [
            { tipo: 'Botão', nome: 'Baixar Sentinel', desc: 'Baixa o arquivo .exe responsável por varrer a rede atrás de impressoras e enviar telemetria.' },
            { tipo: 'Botão', nome: 'Baixar Agente', desc: 'Baixa o instalador do agente para computadores normais.' }
          ]
        },
        {
          nome: 'Aba: Equipe & Usuários',
          descricao: 'Criação e bloqueio de operadores do sistema.',
          elementos: [
            { tipo: 'Checkbox', nome: 'Acesso Total (Admin)', desc: 'Ao criar um usuário, se isto estiver marcado, ele não tem restrições. Se desmarcado, você deve selecionar módulo por módulo o que ele pode acessar.' },
            { tipo: 'Botão', nome: 'Redefinir Senha', desc: 'Administradores podem forçar a troca de senha de outros usuários em caso de perda.' },
            { tipo: 'Botão', nome: 'Revogar Acesso', desc: 'Exclui o operador do sistema (requer justificativa para a auditoria).' }
          ]
        },
        {
          nome: 'Aba: Dados da Organização',
          descricao: 'Identidade da sua empresa.',
          elementos: [
            { tipo: 'Campos', nome: 'Nome / CNPJ', desc: 'Preencha aqui os dados da sua empresa. Eles serão injetados automaticamente no topo de todos os relatórios PDF de faturamento do Nexus Print.' }
          ]
        },
        {
          nome: 'Aba: Importação de Dados',
          descricao: 'Para subir dados antigos de planilhas CSV.',
          elementos: [
            { tipo: 'Aviso', nome: 'Ordem de Importação', desc: 'Siga estritamente a ordem dos botões 1, 2 e 3. Se importar os Ativos antes dos Locais, o banco de dados rejeitará a planilha.' }
          ]
        }
      ]
    },
    {
      id: 'auditoria',
      titulo: 'Auditoria (Rastreabilidade)',
      icone: <FaShieldAlt />,
      descricao: 'A "caixa-preta" do sistema. Registra todas as ações executadas por segurança e LGPD.',
      abas: [
        {
          nome: 'Tela Única: Linha do Tempo',
          descricao: 'Onde tudo que acontece no sistema fica gravado de forma imutável.',
          elementos: [
            { tipo: 'Filtro', nome: 'Pesquisa', desc: 'Permite buscar por nome do operador ou tipo de ação (Ex: EXCLUSÃO, TRANSFERENCIA).' },
            { tipo: 'Botão', nome: 'Exportar p/ Excel', desc: 'Baixa todo o histórico do sistema para fins legais e de compliance.' },
            { tipo: 'Botão', nome: '🔑 Ver Motivo', desc: 'Aparece em amarelo dentro do log se a ação exigiu uma justificativa (Ex: Exclusão de máquina, mudança de status). Clique para ler o que o usuário escreveu.' }
          ]
        }
      ]
    },
    {
      id: 'perfil',
      titulo: 'Meu Perfil',
      icone: <FaUserShield />,
      descricao: 'Área pessoal do operador para alterar credenciais.',
      abas: [
        {
          nome: 'Menu Header: Acesso',
          descricao: 'Como acessar e o que fazer.',
          elementos: [
            { tipo: 'Ação', nome: 'Abrir Perfil', desc: 'Clique no seu nome/avatar no canto superior direito da tela e selecione "Meu Perfil".' },
            { tipo: 'Botão', nome: 'Avatar e Nome', desc: 'Permite escolher um Emoji para substituir suas iniciais e alterar como você é chamado pelo sistema.' },
            { tipo: 'Botão', nome: 'Atualizar Senha Secreta', desc: 'Exige a senha antiga, a nova, e atualizará suas credenciais de login imediatamente.' }
          ]
        }
      ]
    }
  ];

  const moduloSelecionado = mapaDoSistema.find(m => m.id === moduloAtivo);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12 flex flex-col md:flex-row gap-8 items-start">
      
      {/* 🗂️ COLUNA ESQUERDA: NAVEGAÇÃO DOS MÓDULOS */}
      <div className="w-full md:w-80 flex-shrink-0 space-y-3 sticky top-24">
        <div className="mb-6 px-2">
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Mapa do Sistema</h2>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mt-1" style={{ color: 'var(--text-muted)' }}>Documentação Detalhada</p>
        </div>

        {mapaDoSistema.map((mod) => (
          <button
            key={mod.id}
            onClick={() => { setModuloAtivo(mod.id); setAbaExpandida(null); }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all shadow-sm ${
              moduloAtivo === mod.id 
                ? 'bg-blue-600 text-white scale-105 shadow-blue-500/30' 
                : 'bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-input)] border border-[var(--border-light)]'
            }`}
          >
            <span className="text-xl">{mod.icone}</span>
            <div className="text-left">
              <span className="block">{mod.titulo}</span>
            </div>
            {moduloAtivo === mod.id && <FaChevronRight className="ml-auto opacity-50" />}
          </button>
        ))}
      </div>

      {/* 🗺️ COLUNA DIREITA: DETALHAMENTO DA TELA (MAPA) */}
      <div className="flex-1 w-full bg-[var(--bg-card)] rounded-3xl border shadow-xl p-8 sm:p-10" style={{ borderColor: 'var(--border-light)' }}>
        
        {/* Cabeçalho do Módulo */}
        <div className="flex items-center gap-4 border-b pb-8 mb-8" style={{ borderColor: 'var(--border-light)' }}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-3xl border border-blue-500/20 shadow-inner">
            {moduloSelecionado.icone}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{moduloSelecionado.titulo}</h1>
            <p className="text-sm font-medium mt-2 opacity-80" style={{ color: 'var(--text-muted)' }}>{moduloSelecionado.descricao}</p>
          </div>
        </div>

        {/* Acordeão de Telas e Botões */}
        <div className="space-y-6">
          {moduloSelecionado.abas.map((aba, index) => {
            const isAbaAberta = abaExpandida === aba.nome || (abaExpandida === null && index === 0);

            return (
              <div key={aba.nome} className="rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm" style={{ borderColor: isAbaAberta ? 'var(--color-blue)' : 'var(--border-light)' }}>
                
                {/* Título da Aba (Clicável) */}
                <button 
                  onClick={() => toggleAba(aba.nome)}
                  className="w-full px-6 py-5 flex items-center justify-between bg-[var(--bg-input)] hover:brightness-110 transition-all text-left"
                >
                  <div>
                    <h3 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{aba.nome}</h3>
                    {/* 🚀 CORRIGIDO: Usando text-main com opacidade em vez de text-muted */}
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-main)', opacity: 0.6 }}>{aba.descricao}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isAbaAberta ? 'rotate-90 bg-blue-500 text-white' : 'bg-gray-500/20'}`} style={{ color: isAbaAberta ? '#fff' : 'var(--text-main)' }}>
                    <FaChevronRight className="text-sm" />
                  </div>
                </button>

                {/* Conteúdo da Aba (Os Botões) */}
                {isAbaAberta && (
                  <div className="p-6 bg-[var(--bg-card)] border-t" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="space-y-4">
                      {aba.elementos.map((el, i) => (
                        <div key={i} className="p-5 rounded-xl border flex flex-col sm:flex-row sm:items-start gap-5 hover:shadow-md transition-all hover:border-blue-400" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                          
                          {/* Badge do Tipo (Botão, Filtro, Menu) */}
                          <div className="shrink-0 w-24 pt-0.5">
                            {/* 🚀 CORRIGIDO: Cores mais vibrantes para os selos no modo escuro */}
                            <span className="block text-center px-2 py-1.5 rounded-lg bg-blue-500/20 text-blue-500 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/30 shadow-sm">
                              {el.tipo}
                            </span>
                          </div>

                          {/* Detalhe da Função */}
                          <div className="flex-1">
                            <h4 className="font-black text-base mb-1.5" style={{ color: 'var(--text-main)' }}>{el.nome}</h4>
                            {/* 🚀 CORRIGIDO: Fonte mais clara e legível no modo escuro */}
                            <p className="text-[13px] font-medium leading-relaxed" style={{ color: 'var(--text-main)', opacity: 0.85 }}>{el.desc}</p>
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}