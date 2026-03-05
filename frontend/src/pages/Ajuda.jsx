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
      subtitle: 'Visão geral de como o sistema funciona.',
      keywords: ['iniciar', 'começar', 'introdução', 'basico', 'menu', 'notificações'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p className="text-base font-bold text-blue-500 mb-4">Olá! Bem-vindo(a) ao seu novo gestor de inventário tecnológico.</p>
          <p>O Nexus.inv foi desenhado para ser simples. Aqui está o que você precisa saber para começar:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Menu Lateral (Esquerda):</strong> É onde você navega. Clique nos botões para ir para o Dashboard, Gestão de Ativos, etc.</li>
            <li><strong>Barra Superior (Topo):</strong> Aqui você encontra o botão de <strong>Tema (☀️/🌙)</strong> para clarear ou escurecer a tela, o <strong>Sininho de Notificações (🔔)</strong> que avisa quando há máquinas quebradas, e o seu Perfil para sair do sistema.</li>
            <li><strong>Tabelas Mágicas:</strong> Em quase todas as telas, você verá listas de itens. Passe o mouse sobre elas para ver as opções!</li>
          </ul>
        </div>
      )
    },
    {
      id: 'dashboard',
      icon: '📊',
      title: 'Entendendo o Dashboard',
      subtitle: 'Como ler os gráficos e o feed ao vivo.',
      keywords: ['dashboard', 'graficos', 'feed', 'inicio', 'resumo', 'kpi'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>O <strong>Dashboard</strong> é a tela inicial do sistema. Ele serve para você bater o olho e saber a saúde da empresa.</p>
          <div className="p-4 rounded-xl border shadow-sm mt-2 transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <h4 className="font-black mb-2 text-blue-500">Os 4 Quadros Principais:</h4>
            <ul className="space-y-2">
              <li>💻 <strong>Total:</strong> Quantidade absoluta de máquinas no banco de dados.</li>
              <li>✅ <strong>Em Operação:</strong> Máquinas que estão funcionando perfeitamente nas mesas dos usuários.</li>
              <li>⚠️ <strong>Manutenção:</strong> Aparelhos que estão na oficina/TI aguardando conserto. Clicar aqui te leva para a lista deles!</li>
              <li>🗑️ <strong>Descartados:</strong> Sucata. Equipamentos que não têm mais conserto.</li>
            </ul>
          </div>
          <p className="mt-4"><strong>Feed do Sistema (Direita):</strong> Mostra em tempo real tudo o que sua equipe está fazendo (quem logou, quem editou o quê).</p>
        </div>
      )
    },
    {
      id: 'cadastro',
      icon: '💻',
      title: 'Como adicionar e editar Máquinas',
      subtitle: 'O coração do sistema: Gestão de Ativos.',
      keywords: ['cadastrar', 'adicionar', 'nova maquina', 'editar', 'excluir', 'inventario'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Para adicionar um computador, impressora ou qualquer ativo, vá no menu lateral em <strong>Gestão de Ativos</strong> e clique na aba superior <strong>➕ Novo Cadastro</strong>.</p>
          
          <h4 className="font-black mt-4 text-blue-500">O que significa cada campo?</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Patrimônio:</strong> A etiqueta da empresa. Se a máquina não tiver, deixe em branco e o sistema cria um código <code className="px-1 rounded font-bold border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}>SP.123456</code> automaticamente para você!</li>
            <li><strong>Categoria e Local:</strong> Diz o que a máquina é e onde ela vai ficar.</li>
            <li><strong>Campos Dinâmicos:</strong> Ao escolher "Notebook", o sistema pedirá Memória e Processador. Ao escolher "Impressora", pedirá Toner. O sistema é inteligente!</li>
          </ul>

          <h4 className="font-black mt-4 text-blue-500">Como Editar ou Excluir?</h4>
          <p>Na aba <strong>🔍 Busca e Gestão</strong>, ache a máquina na lista. No final da linha dela (à direita), clique no botão <strong>Opções ▾</strong>. Lá você encontra Editar e Excluir.</p>
        </div>
      )
    },
    {
      id: 'lote',
      icon: '🖨️',
      title: 'Ações em Lote e Etiquetas QR',
      subtitle: 'Como transferir 10 computadores de uma vez.',
      keywords: ['lote', 'qr code', 'etiqueta', 'imprimir', 'transferir', 'varios', 'selecionar'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Ganhe tempo usando as <strong>Caixinhas de Seleção (Checkboxes)</strong> na lateral esquerda da lista de máquinas.</p>
          
          <div className="p-4 rounded-xl border shadow-sm mt-2 transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
            <strong className="text-blue-500">Passo a Passo:</strong>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Na Gestão de Ativos, marque a caixinha ao lado de várias máquinas.</li>
              <li>Note que uma nova <strong>Barra de Ações</strong> aparecerá no topo da lista.</li>
              <li>Escolha o que quer fazer com todas elas de uma só vez!</li>
            </ol>
          </div>

          <ul className="list-disc pl-5 mt-4 space-y-2">
            <li><strong>🖨️ Imprimir QRs:</strong> Gera uma folha pronta para a impressora com as etiquetas de todas as máquinas selecionadas.</li>
            <li><strong>🚚 Transferir:</strong> Muda todos os itens selecionados para um novo setor de uma só vez (ex: Mudar 10 PCs para a Sala 2).</li>
            <li><strong>✏️ Editar Lote:</strong> Muda uma característica igual para todas (ex: Dizer que todas ganharam 8GB de RAM).</li>
          </ul>
        </div>
      )
    },
    {
      id: 'manutencao',
      icon: '🛠️',
      title: 'Manutenção, Sucata e Restauração',
      subtitle: 'Quando uma máquina quebra, o que fazer?',
      keywords: ['quebrou', 'manutenção', 'sucata', 'lixo', 'restaurar', 'conserto'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Se um equipamento estragar, <strong>não o exclua do sistema!</strong> Você precisa do histórico dele.</p>
          
          <h4 className="font-black mt-4 text-amber-500">1. Enviando para a Manutenção</h4>
          <p>Na lista de máquinas, clique em <strong>Opções ▾</strong> e depois em <strong>🛠️ Alterar Status</strong>. Mude para Manutenção e escreva o motivo (ex: "Fonte queimada"). O sininho de notificação no topo da tela vai acender para te lembrar que há máquinas na oficina!</p>

          <h4 className="font-black mt-4 text-red-500">2. Deu Perda Total? (Sucata)</h4>
          <p>Faça o mesmo processo acima, mas mude o status para <strong>SUCATA</strong>. O item sumirá das contagens de uso e irá para o cemitério do sistema.</p>

          <h4 className="font-black mt-4 text-emerald-500">3. A máquina foi consertada? (Restauração)</h4>
          <p>Vá na aba <strong>📜 Histórico & Descartes</strong>. Encontre a máquina na lista. Se ela estiver como Sucata, haverá um botão mágico <strong>♻️ Restaurar</strong>. Clique nele, justifique o conserto, e ela voltará a ficar "ATIVA" na hora!</p>
        </div>
      )
    },
    {
      id: 'importacao',
      icon: '🚀',
      title: 'Importação (Excel/CSV) e Cadastros Base',
      subtitle: 'Como trazer seus dados antigos para cá.',
      keywords: ['importar', 'csv', 'excel', 'cadastros', 'migração', 'planilha', 'locais', 'categorias'],
      content: (
        <div className="space-y-4 text-sm opacity-90" style={{ color: 'var(--text-main)' }}>
          <p>Antes de importar máquinas, o sistema precisa aprender "Onde" elas ficam e "O Quê" elas são. Isso é feito na tela de <strong>Configurações ⚙️ &gt; Migração & Backup</strong>.</p>
          
          <div className="space-y-4 mt-4">
            <div className="p-4 border rounded-xl shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <strong className="text-blue-500">Passo 1: Locais & Setores</strong><br/>
              Ensina ao sistema as Secretarias e Setores (ex: Secretaria de Saúde, Sala 01).
            </div>
            <div className="p-4 border rounded-xl shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <strong className="text-yellow-500">Passo 2: Tipos de Equipamento</strong><br/>
              Ensina as categorias e o que perguntar (ex: Tipo: Monitor, Campos: Polegadas, Conexão).
            </div>
            <div className="p-4 border rounded-xl shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
              <strong className="text-red-500">Passo 3: Inventário Geral</strong><br/>
              A sua planilha gigante de máquinas. Como o sistema já aprendeu os locais e tipos nos passos 1 e 2, ele vai engolir essa planilha perfeitamente!
            </div>
          </div>
          <p className="mt-4 text-xs font-black text-red-500 uppercase tracking-widest">Atenção: Os arquivos devem ser salvos no Excel como "CSV (separado por vírgulas)".</p>
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
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      
      <div className="p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>📚</div>
          <div>
            <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Central de Ajuda</h2>
            <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>Aprenda a dominar o sistema</p>
          </div>
        </div>

        <div className="w-full md:w-96 flex items-center gap-3 p-2 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-blue-500/20" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-light)' }}>
          <span className="pl-3 text-lg opacity-50">🔍</span>
          <input 
            type="text" 
            placeholder="Como imprimir QR Code?..." 
            value={busca} 
            onChange={(e) => { setBusca(e.target.value); if(topicosFiltrados.length > 0) setTopicoAtivo(topicosFiltrados[0].id); }}
            className="w-full p-2 bg-transparent font-bold outline-none" style={{ color: 'var(--text-main)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        <div className="md:col-span-4 space-y-2">
          {topicosFiltrados.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-dashed opacity-50 font-bold" style={{ borderColor: 'var(--border-light)', color: 'var(--text-main)' }}>
              Nenhum artigo encontrado para "{busca}".
            </div>
          ) : (
            topicosFiltrados.map(t => (
              <button 
                key={t.id}
                onClick={() => setTopicoAtivo(t.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${topicoAtivo === t.id ? 'shadow-lg ring-2 ring-blue-500/50' : 'shadow-sm opacity-80 hover:opacity-100 hover:bg-gray-500/5 hover:shadow-md'}`}
                style={{ 
                  backgroundColor: topicoAtivo === t.id ? 'var(--bg-input)' : 'var(--bg-card)', 
                  borderColor: topicoAtivo === t.id ? 'transparent' : 'var(--border-light)' 
                }}
              >
                <span className="text-xl pt-1">{t.icon}</span>
                <div>
                  <h4 className="font-black text-sm" style={{ color: 'var(--text-main)' }}>{t.title}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-8">
          {topicoSelecionado && (
            <div className="p-8 rounded-3xl border shadow-xl min-h-[500px] animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', ...borderStrong }}>
              <div className="flex items-center gap-4 mb-8 border-b pb-6" style={{ borderColor: 'var(--border-light)' }}>
                <span className="text-4xl">{topicoSelecionado.icon}</span>
                <div>
                  <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{topicoSelecionado.title}</h2>
                  <p className="text-xs font-bold uppercase tracking-widest mt-1 text-blue-500">{topicoSelecionado.subtitle}</p>
                </div>
              </div>

              <div className="leading-relaxed">
                {topicoSelecionado.content}
              </div>
              
              <div className="mt-12 pt-6 border-t flex items-center justify-between opacity-50" style={{ borderColor: 'var(--border-light)' }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Fim do Artigo</span>
                <span className="text-lg font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>Nexus.inv</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}