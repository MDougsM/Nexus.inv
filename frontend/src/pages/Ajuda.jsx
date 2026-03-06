import React, { useState } from 'react';

export default function Ajuda() {
  const [busca, setBusca] = useState('');
  const [topicoAtivo, setTopicoAtivo] = useState('intro');

  const borderStrong = { border: '1.5px solid var(--border-light)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };

  const topicos = [
    {
      id: 'intro',
      icon: '👋',
      title: 'Bem-vindo ao Nexus.inv',
      subtitle: 'Conceitos básicos e atalhos do sistema.',
      keywords: ['iniciar', 'começar', 'introdução', 'basico', 'menu', 'notificações', 'senha'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p className="text-base font-bold text-blue-500 mb-4">Olá! Bem-vindo(a) ao Nexus.inv.</p>
          <p>Esqueça planilhas confusas. O Nexus é um sistema inteligente. Tudo o que você faz fica registrado para garantir a segurança da equipe.</p>
          <ul className="list-disc pl-5 space-y-3 mt-4">
            <li><strong>Menu Lateral (Esquerda):</strong> Sua navegação principal. Permite trocar entre as telas do sistema.</li>
            <li><strong>Barra Superior (Topo):</strong> Contém o botão de Tema (☀️/🌙) para clarear ou escurecer a tela, o Sininho de Alertas (🔔), e o menu do seu Perfil (onde você pode trocar sua própria senha).</li>
            <li><strong>Botões Flutuantes:</strong> Em todas as tabelas, passe o mouse sobre uma máquina para ver opções extras ou marque a caixinha (checkbox) à esquerda para abrir a barra de Ações em Lote.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Centro de Inteligência (Dashboard)',
      subtitle: 'Como ler os gráficos e a telemetria.',
      keywords: ['dashboard', 'graficos', 'feed', 'inicio', 'resumo', 'kpi', 'diretoria'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>O <strong>Dashboard</strong> é dividido em duas abas no topo da tela:</p>
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h4 className="font-black mb-2 text-blue-500">🌍 Visão Geral</h4>
              <p className="mb-2">Mostra os totais da empresa (Total, Em Operação, Em Manutenção, Descartados).</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Feed do Sistema:</strong> Uma lista lateral que mostra ao vivo quem logou, quem editou uma máquina, etc.</li>
                <li><strong>Atalhos:</strong> Clicar no quadro amarelo de "Manutenção" leva você direto para a lista de máquinas quebradas.</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <h4 className="font-black mb-2 text-blue-500">📊 Painel da Diretoria</h4>
              <p>Uma visão analítica avançada. No topo deste painel, existem botões de filtro (Ex: "Desktop", "Notebook"). Se você clicar neles, todos os gráficos da tela se recalculam instantaneamente para mostrar os dados específicos daquele tipo de equipamento!</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cadastro',
      icon: '✨',
      title: 'Novo Cadastro e Clonagem',
      subtitle: 'Como inserir máquinas corretamente.',
      keywords: ['cadastrar', 'adicionar', 'nova maquina', 'clonar', 'copiar', 'duplicar'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Para adicionar equipamentos, acesse <strong>Gestão de Ativos</strong> e clique na aba superior <strong>➕ Novo Cadastro</strong>.</p>
          
          <h4 className="font-black mt-4 text-emerald-500">Método 1: Cadastro Manual</h4>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li><strong>Patrimônio:</strong> Se a máquina não tiver etiqueta, deixe o campo em branco. O sistema gerará um código único automaticamente.</li>
            <li><strong>Tipo de Equipamento:</strong> Atenção aqui! Quando você escolhe a categoria (Ex: "Lousa Digital"), o sistema abre campos específicos para ela (Ex: "S/N Lousa", "S/N OPS").</li>
            <li><strong>Localização:</strong> Selecione a Secretaria/Prédio e depois a Sala exata.</li>
          </ul>

          <h4 className="font-black mt-4 text-blue-500">Método 2: A Mágica da Clonagem (Muito mais rápido!)</h4>
          <p>Se você recebeu 10 computadores idênticos:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Cadastre o 1º normalmente.</li>
            <li>Volte na tela de Busca, ache o computador recém-criado, clique em <strong>Opções ▾</strong> e selecione <strong>📋 Clonar Máquina</strong>.</li>
            <li>O sistema abrirá a tela de Novo Cadastro com TODOS os dados pré-preenchidos. Você só precisa digitar o novo Patrimônio e clicar em Salvar!</li>
          </ol>
        </div>
      )
    },
    {
      id: 'busca_edicao',
      icon: '🔍',
      title: 'Busca, Filtros e Edição Individual',
      subtitle: 'Como encontrar e modificar dados.',
      keywords: ['buscar', 'pesquisar', 'editar', 'alterar', 'opções', 'detalhes', 'rg'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>A aba <strong>Busca e Gestão</strong> é onde você passará a maior parte do tempo.</p>
          
          <ul className="list-disc pl-5 space-y-3 mt-4">
            <li><strong>Busca Ultra-Rápida:</strong> Digite qualquer coisa na barra (marca, modelo, patrimônio, setor). A tabela filtra em tempo real.</li>
            <li><strong>Filtro de Status:</strong> Use a caixa ao lado da busca para ver "Apenas Máquinas em Manutenção".</li>
            <li><strong>O Botão de Olho (👁️):</strong> Fica na tabela. Ele abre o "RG" completo da máquina, mostrando todos os detalhes técnicos.</li>
            <li><strong>O Botão Imprimir (🖨️):</strong> Gera o QR Code individual daquela máquina específica.</li>
            <li><strong>Botão Opções ▾:</strong> Aqui você edita a máquina. Ao clicar em "Editar", lembre-se de usar as ⚡ <strong>Respostas Rápidas</strong> para preencher o motivo da edição rapidamente (Ex: "Atualização Cadastral").</li>
          </ul>
        </div>
      )
    },
    {
      id: 'lote',
      icon: '🗂️',
      title: 'Ações em Lote (Transferências e QR Codes)',
      subtitle: 'Trabalhando com múltiplos itens de uma vez.',
      keywords: ['lote', 'qr code', 'etiqueta', 'imprimir', 'transferir', 'varios', 'selecionar', 'massa'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Nunca faça trabalho repetitivo. Use as <strong>Caixinhas de Seleção</strong> ao lado esquerdo das máquinas na tabela.</p>
          
          <div className="p-4 rounded-xl border shadow-sm mt-4 transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <h4 className="font-black mb-3 text-blue-500">A Barra Azul Flutuante</h4>
            <p className="mb-3">Ao marcar uma ou mais máquinas, uma barra aparecerá no topo. As opções são:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>🖨️ QRs:</strong> Gera uma folha pronta com os QR Codes de todas as máquinas marcadas. Dica: Imprima em papel adesivo (Etiqueta Pimaco).</li>
              <li><strong>🚚 Transferir:</strong> Abre um painel para escolher um novo Setor. Todas as máquinas selecionadas serão movidas para lá com 1 clique.</li>
              <li><strong>✏️ Editar Lote:</strong> Altera a Marca ou Modelo de dezenas de equipamentos ao mesmo tempo.</li>
              <li><strong>🛠️ Status:</strong> Manda todas as máquinas selecionadas para a Manutenção (ou para o lixo) de uma vez só.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'manutencao',
      icon: '🛠️',
      title: 'Manutenção, Sucata e Restauração',
      subtitle: 'O ciclo de vida do equipamento quebrado.',
      keywords: ['quebrou', 'manutenção', 'sucata', 'lixo', 'restaurar', 'conserto', 'descarte'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <h4 className="font-black mt-2 text-amber-500">Fluxo Correto para Consertos:</h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li>A máquina quebrou. Encontre-a na lista, clique em <strong>Opções ▾ &gt; 🛠️ Alterar Status</strong> e mude para <strong>Manutenção</strong>.</li>
            <li>Preencha o motivo ("Teclado ruim") e, se houver, o número do chamado (O.S.).</li>
            <li>Quando a máquina for consertada, repita o processo e volte-a para <strong>Ativo</strong>.</li>
          </ol>

          <h4 className="font-black mt-6 text-red-500">Deu Perda Total? (Envio para Sucata)</h4>
          <p>Nunca exclua a máquina! Mude o status dela para <strong>SUCATA</strong>. Ela sumirá da lista principal, mantendo os relatórios da empresa organizados.</p>

          <h4 className="font-black mt-6 text-emerald-500">Jogou na Sucata por engano?</h4>
          <p>Acesse a aba <strong>📜 Histórico & Descartes</strong> (na tela de Gestão de Ativos). Lá fica o cemitério das máquinas. Encontre o patrimônio e clique no botão <strong>♻️ Restaurar</strong> para trazê-la de volta à vida.</p>
        </div>
      )
    },
    {
      id: 'importacao',
      icon: '🚀',
      title: 'Importação (Excel) e Cadastros Base',
      subtitle: 'Configurando o sistema pela primeira vez.',
      keywords: ['importar', 'csv', 'excel', 'cadastros', 'migração', 'planilha', 'locais', 'categorias', 'configurações'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Se você for Administrador, use a tela de <strong>Configurações ⚙️</strong> para alimentar o sistema.</p>
          
          <div className="space-y-3 mt-4">
            <div className="p-3 border rounded-xl shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <strong className="text-blue-500">1. Cadastros de Base (Locais e Categorias)</strong><br/>
              Antes de colocar uma máquina, o sistema precisa saber quais Secretarias/Salas existem, e quais Tipos de equipamento vocês usam. Crie isso primeiro nas abas "Locais" e "Categorias".
            </div>
            <div className="p-3 border rounded-xl shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <strong className="text-emerald-500">2. Migração via Excel (CSV)</strong><br/>
              Na aba "Migração e Backup", você pode subir arquivos CSV. Cuidado: O sistema só aceita o formato <strong>CSV (separado por vírgulas)</strong>. Suba primeiro a planilha de Secretarias, depois a de Categorias, e só no final a de Inventário.
            </div>
            <div className="p-3 border rounded-xl shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <strong className="text-amber-500">3. Auditoria</strong><br/>
              Acessível pelo menu lateral, a Auditoria é o "Olho Que Tudo Vê". Administradores podem usá-la para investigar exatamente quem excluiu ou modificou uma máquina.
            </div>
          </div>
        </div>
      )
    }
  ];

  const topicosFiltrados = topicos.filter(t => {
    const termo = busca.toLowerCase();
    return (
      t.title.toLowerCase().includes(termo) ||
      t.subtitle.toLowerCase().includes(termo) ||
      t.keywords.some(k => k.includes(termo))
    );
  });

  const topicoSelecionado = topicos.find(t => t.id === topicoAtivo) || topicosFiltrados[0];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in pb-10">
      
      {/* CABEÇALHO */}
      <div className="p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>📚</div>
          <div>
            <h2 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Central de Ajuda</h2>
            <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>O manual definitivo do Nexus.inv</p>
          </div>
        </div>

        <div className="w-full md:w-[400px] flex items-center gap-3 p-2 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
          <span className="pl-3 text-lg opacity-50">🔍</span>
          <input 
            type="text" 
            placeholder="O que você quer aprender hoje?..." 
            value={busca} 
            onChange={(e) => { setBusca(e.target.value); if(topicosFiltrados.length > 0) setTopicoAtivo(topicosFiltrados[0].id); }}
            className="w-full p-3 bg-transparent font-bold outline-none" style={{ color: 'var(--text-main)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* MENU LATERAL DA AJUDA */}
        <div className="lg:col-span-4 flex flex-col gap-3 sticky top-6">
          {topicosFiltrados.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-dashed opacity-50 font-bold" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
              Nenhum artigo encontrado para "{busca}".
            </div>
          ) : (
            topicosFiltrados.map(t => (
              <button 
                key={t.id}
                onClick={() => setTopicoAtivo(t.id)}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 ${topicoAtivo === t.id ? 'shadow-lg border-blue-500 scale-[1.02]' : 'shadow-sm opacity-80 hover:opacity-100 hover:bg-gray-500/5'}`}
                style={{ 
                  backgroundColor: topicoAtivo === t.id ? 'var(--bg-input)' : 'var(--bg-card)', 
                  borderColor: topicoAtivo === t.id ? 'var(--color-blue)' : 'var(--border-light)' 
                }}
              >
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <h4 className="font-black text-[13px]" style={{ color: 'var(--text-main)' }}>{t.title}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* CONTEÚDO DO ARTIGO */}
        <div className="lg:col-span-8">
          {topicoSelecionado && (
            <div className="p-8 md:p-12 rounded-3xl border shadow-xl min-h-[600px] animate-fade-in relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
              
              <div className="flex items-center gap-5 mb-10 border-b pb-8" style={{ borderColor: 'var(--border-light)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
                  {topicoSelecionado.icon}
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{topicoSelecionado.title}</h2>
                  <p className="text-xs font-bold uppercase tracking-widest mt-2 text-blue-500">{topicoSelecionado.subtitle}</p>
                </div>
              </div>

              <div className="leading-relaxed text-[15px]">
                {topicoSelecionado.content}
              </div>
              
              <div className="mt-16 pt-8 border-t flex items-center justify-between opacity-30" style={{ borderColor: 'var(--border-light)' }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Fim do Guia</span>
                <span className="text-xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>Nexus.inv</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}