# Changelog - Nexus.inv

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.
Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [v5.8.3.0] - 2026-03-27
### 🚀 Adicionado (Added)
- **Recuperação de Senha Automática:** Implementado um fluxo completo de "Esqueci a Senha" na tela de Login.
  - O backend agora gera uma senha temporária forte e segura.
  - Integração nativa com servidor SMTP (Gmail/Google Workspace) para envio automático de credenciais.
  - Funcionalidade "Modo Simulação" adicionada para ambientes de desenvolvimento sem e-mail configurado.
- **Gestão de E-mail de Usuários:** Adicionado campo `email` na tabela do banco de dados e na interface do painel `MeuPerfil.jsx`, permitindo que os próprios usuários atualizem seus endereços de contato para recuperação de conta.

### 🐛 Corrigido (Fixed)
- **Overlay Quebrado nos Modais (Z-Index / Stacking Context):** Resolvido o problema crítico visual onde uma "faixa transparente" (Menu Lateral e Cabeçalho) ficava por cima do fundo escuro dos pop-ups. Todos os modais foram migrados para a arquitetura `createPortal` do React, teletransportando a renderização para a raiz do DOM (`document.body`) e garantindo cobertura total de 100% da tela.
- **Colisão de Rotas no FastAPI:** Corrigido um "Bug Fantasma" na atualização de perfil. A rota de `/usuarios/perfil/atualizar` no arquivo `main.py` estava interceptando chamadas e descartando o novo campo de e-mail antes de alcançar o controlador `usuarios.py`. A lógica foi unificada para garantir a gravação correta no banco.
- **Sincronização do Docker Cache:** Resolvidas as falhas de hot-reload causadas por compilações fantasma do Python (`__pycache__`) no volume do WSL/Docker durante as atualizações do banco.

---

## [v5.8.2.0] - 2026-03-26
### 🛠️ Correções (Hotfixes & Stability)
- **Backend (main.py):** Corrigidos erros críticos no arquivo principal:
  - Import inválido `from fastapi import requests` → corrigido para `Request`
  - Decorador órfão `@router.put("/perfil/atualizar")` removido (router não estava registrado)
  - Código Flask misturado com FastAPI (`@app.route`) convertido para decoradores FastAPI
  - Função `atualizar_perfil()` duplicada (FastAPI e Flask) consolidada em uma única implementação
  - Rota ajustada para `/usuarios/perfil/atualizar` com retorno de confirmação (`termos_aceitos`, `nome_exibicao`, `avatar`)

- **Frontend (MeuPerfil.jsx):** Resolvido loop infinito na tela de Termos:
  - Estado inicial `termosAceitos` estava `true` (deveria ser `false`)
  - Adicionada validação de resposta do servidor antes de liberar acesso
  - Substituído `navigate()` por `window.location.href = '/'` para reload real
  - Botão agora mostra feedback `⏳ PROCESSANDO...` enquanto salva nos termos

### 🚀 Adicionado (Added)
- **Frontend (MeuPerfil.jsx):** Nova seção "Gerenciamento de Termos de Responsabilidade" no container de Segurança e Acesso:
  - Botão **"📖 Reler Termos"**: Reabre o modal para visualizar os termos novamente
  - Botão **"🚪 Revogar Acesso"**: Permite ao usuário revogar os termos aceitos
    - Pede confirmação dupla antes de revogar
    - Define `termos_aceitos = false` no banco de dados
    - Ativa `nexus_bloqueado = true` no localStorage
  - Status visual dinâmico (✅ Aceito / ❌ Não aceito)
  - Botão de revogação aparece apenas se os termos já foram aceitos

### 📦 Versionamento & Nomenclatura
- **Agente Instalador:** Atualizado de `Nexus_Instalador.exe` para `Nexus_Instalador_v5.exe` nos seguintes arquivos:
  - `backend/app/api/inventario.py`
  - `backend/app/main.py`
  - `frontend/src/pages/ConfiguracoesComponents/PainelFerramentas.jsx`

## [v5.8.1.6] - 2026-03-25
### 💄 UI/UX & Frontend
- **Versão Dinâmica:** Remoção do versionamento "chumbado" (hardcoded `v5.7.2.0`) no layout do menu lateral. O sistema React agora lê a versão dinamicamente direto do arquivo `.env` através da variável `VITE_VERSAO_SISTEMA`, evitando dessincronização visual nas próximas atualizações.

## [v5.8.1.0] - 2026-03-25
### 🛠️ Correções (Hotfixes & Stability)
- **Agente v5.0.1 (WMI/COM Memory Fix):** Resolvido o erro crítico `Win32 exception occurred releasing IUnknown` removendo o encerramento prematuro do `pythoncom.CoUninitialize()`, permitindo que o Garbage Collector do Python gerencie a memória do WMI nativamente sem crashar a thread do C2.
- **Agente v5.0.1 (Encoding UTF-8):** Injetada a flag `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` diretamente no subprocesso do PowerShell. Acentuações (ç, ã, í) agora são renderizadas perfeitamente no terminal do React.
- **Backend (Rota C2):** Corrigido o endpoint `GET /api/comandos/maquina/{patrimonio}` com o modificador `:path` para evitar erros 404/500 em patrimônios que contêm barras (ex: `S/P_001`).
- **Frontend (Terminal Remoto):** Adicionado *timestamp* (Data e Hora) em cada log de comando disparado para melhor rastreabilidade de execução.


# Changelog - Nexus System v5.8.0.0 🚀
## [Novo] Terminal Remoto & C2 Engine
- **Frontend**: Adicionado componente `TerminalRemoto.jsx` com suporte a scripts PowerShell/CMD.
- **Backend**: Implementada fila de comandos (C2) para execução assíncrona nos agentes.
- **Agente (v5.0)**: Nova thread de escuta ativa (polling de 30s) para execução de comandos em background com privilégios `SYSTEM`.

## [Ajustes de Infraestrutura]
- **Persistência**: Migração do Watchdog de intervalo fixo (15 min) para `ONLOGON` para evitar múltiplas instâncias.
- **Segurança**: Adicionada exceção automática no Windows Defender via instalador para a pasta `C:\Nexus.inv`.
- **Performance**: Otimização do timeout de descoberta de IP de 5s para 1.5s para carregamento instantâneo da GUI.

## [Correções]
- Erro de `NameError: ComandoCreate` no endpoint de comandos resolvido.
- Ajuste de flags no Inno Setup para execução imediata pós-instalação.

## [v5.7.3.0] - 2026-03-25
### 🚀 Adicionado (Added)
- **Roteamento Dinâmico (Cérebro Externo):** O Agente Nexus (agora na v4.5) foi reescrito para eliminar o Ponto Único de Falha (Single Point of Failure) de URLs "chumbadas". Ele agora consome um arquivo de texto em nuvem (GitHub Gist) em tempo de execução para descobrir a URL atual do Backend (Cloudflare/Domínio), permitindo atualizações de rota sem necessidade de recompilar ou reinstalar o executável nos clientes.
- **Cache de Resiliência de Rede:** Implementado um sistema de memória no Agente (`nexus_link_cache.txt`). Caso o GitHub esteja bloqueado no firewall do cliente ou a rede falhe, o Agente busca no disco o último link válido conhecido e tenta a conexão, garantindo alta disponibilidade.
- **Dashboard Nativo do Agente:** A interface do Agente Windows foi completamente redesenhada. A antiga caixa de texto simples foi substituída por um Grid de Cards interativo (estilo Dashboard), exibindo os componentes detectados (CPU, RAM, Disco, Rede, Serial) com ícones e formatação premium em Modo Escuro.
- **UX de Sincronização:** Adicionada uma barra de progresso oculta que surge apenas durante o envio dos dados, acompanhada de mensagens de status em tempo real ("Empacotando Hardware", "Autenticando na Nuvem", "Transmitindo Dados"), melhorando o feedback visual para o usuário.

### 🐛 Corrigido (Fixed)
- **Crashes de Compilação do Tkinter:** Corrigidos os erros fatais de renderização do `CustomTkinter` que impediam a abertura do `.exe` compilado, substituindo propriedades visuais incompatíveis (como `weight="black"` para `"bold"` e `italic=True` para `slant="italic"`).

## [v5.7.2.0] - 2026-03-25

### 🚀 Adicionado (Added)
- **Gráficos Dinâmicos no Dashboard:** Ao clicar nos cards de status (Ativos, Manutenção ou Sucata), o sistema agora renderiza um gráfico de barras (BarChart) detalhando a exata proporção de tipos de equipamentos dentro daquele status (Ex: 15 Desktops, 5 Impressoras), substituindo a antiga lista em texto puro.

### 🛡️ Modificado (Changed)
- **Blindagem do Banco de Dados:** O arquivo `nexus.db` foi migrado fisicamente e logicamente para o cofre isolado `/data`. 
- **Leitura Dinâmica do BD:** O arquivo `database.py` foi refatorado para consumir obrigatoriamente a variável `DATABASE_URL` do arquivo `.env`. Adicionada uma trava de segurança (`os.makedirs`) que cria a pasta de dados automaticamente caso ela não exista, evitando crashes no SQLite.
- **Docker Compose (Volumes):** A rota de espelhamento de dados no `docker-compose.yml` foi ajustada para mapear exclusivamente a pasta `./backend/data:/app/data`, impedindo que o banco de produção seja esmagado ou zerado durante reconstruções de contêineres ou comandos do Git.
- **Rota de Backup de Segurança:** Atualizado o endpoint de download do backup no `main.py` para buscar o arquivo de banco de dados no novo diretório seguro.

### 🐛 Corrigido (Fixed)
- **Tela Branca (White Screen of Death) no Dashboard:** Corrigido um erro fatal de renderização no React causado pela ausência da importação do componente `<CartesianGrid>` no arquivo `DashboardGeral.jsx`.
- **Prevenção de Falsos Positivos no DB:** Corrigida a anomalia onde o backend ignorava o banco de dados populado e gerava um novo arquivo `.db` vazio na raiz da pasta backend ao reiniciar.


## [v5.7.1.0] - 2026-03-24

### 🚀 Adicionado (Added)
- **Login Enterprise (UI/UX):** Tela de autenticação completamente refeita do zero, utilizando layout split-screen (padrão AAA), elementos flutuantes (floating labels), fundo com auras de luz e data-net, garantindo um visual premium.
- **Base de Conhecimento Omni-Search:** A antiga aba de Ajuda foi substituída por um motor de busca inteligente em tempo real. O usuário pode buscar por qualquer termo ou botão do sistema e receber instruções granulares com links diretos para as telas.
- **Identidade Estendida:** Adicionado o campo "Nome Personalizado (Apelido)" ao cadastro de ativos, permitindo nomeclaturas amigáveis (ex: "Impressora da Recepção") protegidas contra sobrescritas.
- **Variáveis de Ambiente (.env):** O sistema agora utiliza arquivos `.env` para gerenciar portas e URLs de Frontend e Backend dinamicamente, eliminando hardcodes e dependência de ferramentas externas (como Ngrok).
- **Indicador de Última Leitura:** O Dashboard do Nexus Print agora exibe globalmente o horário exato em que o último agente se comunicou com o servidor.

### 💅 Modificado (Changed)
- **Arquitetura do Dashboard:** O arquivo monolítico `Dashboard.jsx` foi fatiado em componentes menores e independentes (`DashboardGeral`, `DashboardPrint`, `DashboardDiretoria`), melhorando a performance e a manutenção.
- **Filtros Dinâmicos no Dashboard:** Os cards de KPI (Agentes Online, Sucata, etc.) agora são clicáveis e redirecionam para a lista já filtrada.
- **Gráficos Interativos:** O gráfico de "Distribuição de Status" agora possui botões na legenda que abrem um modal sobreposto com a lista exata das máquinas pertencentes àquele pedaço do gráfico.
- **Ordenação Inteligente:** Todos os dropdowns de seleção (Categorias, Secretarias, Setores) na tela de Novo Cadastro agora são renderizados em ordem alfabética automaticamente, independente da ordem do banco.
- **Blindagem do Banco de Dados:** Adicionado o `.gitignore` na raiz do projeto, forçando o Git a ignorar arquivos `.db` e `__pycache__`, evitando conflitos letais durante o `git pull` em produção.

### 🐛 Corrigido (Fixed)
- **Trava de Proteção do Sentinel:** Corrigida a lógica no backend (`main.py`) que permitia que o Agente sobrescrevesse edições manuais (como Marca e Modelo) com valores nulos caso a impressora não respondesse via SNMP.
- **Bug 422 na Automação:** Corrigido o vazamento de estado no React que apagava as variáveis `dia_inicio_ciclo` e `dia_fim_ciclo` ao limpar o formulário, impedindo a criação de múltiplos robôs na mesma sessão. E adicionado fallback para evitar envios de valor `NaN`.
- **Dropdown Guilhotinado (Z-Index):** Removido o `overflow-hidden` do contêiner da tabela em `AbaCentralPrint`, impedindo que o menu de "Opções" das impressoras fosse cortado ao ser aberto.
- **Esmagamento de Gráficos (Recharts):** Corrigido o bug onde o Gráfico de Pizza sumia da tela devido à falta de altura fixa (`h-64`) no contêiner pai após inserção de novos elementos no grid.

---

## [v5.6.0.0] - 2026-03-19

### 🚀 Adicionado (Features)
- **Controle de Acesso Granular (RBAC):** Novo sistema de permissões onde o administrador mestre pode definir exatamente quais abas cada técnico/usuário pode acessar.
- **Automação de Relatórios (Robôs):** Implementação do `APScheduler` no backend para geração autônoma de relatórios de faturamento em dias e horários programados.
- **Cofre de Relatórios:** Nova interface e tabela no banco de dados (`relatorios_gerados`) para armazenar fisicamente os CSVs gerados pelos robôs, permitindo download e exclusão.
- **Filtros Múltiplos:** Geração de relatórios (manuais e automáticos) agora suporta a seleção de múltiplas Secretarias e Setores simultaneamente via checkboxes.
- **Inteligência do Sentinel:** O backend agora detecta automaticamente mudanças de IP e trocas de suprimento (saltos maiores que 20% no toner) e gera logs de auditoria silenciosos.

### 🔄 Modificado (Changes)
- **Menu Lateral Dinâmico:** O `Layout.jsx` agora lê as permissões no `localStorage` e esconde módulos não autorizados em tempo real.
- **Gestão de Equipe:** Tela de usuários totalmente reformulada com modais interativos para gestão de acessos e concessão de poderes de Admin.
- Estrutura da `AbaAgendamentos` criada e integrada ao Nexus Print.

---

## [v2.1.0.0] - 2026-03-09

### 🚀 Adicionado (Added)
- **Agente Nexus Auto Discovery v2 (WPF):** Interface gráfica moderna com design arredondado, dispensando o uso do terminal preto antigo.
- **Detetive de Hardware:** Nova lógica profunda para captura de Identificadores Únicos (Lê BIOS, Placa-Mãe, Registro de Produto, UUID físico do silício e CPU-ID).
- **Leitura Avançada de Discos:** O Agente agora identifica automaticamente se o disco é HD, SSD ou NVMe e calcula o tamanho real.
- **Botão de Download Nativo:** Adicionado card na tela de Configurações para baixar o executável do Agente diretamente pelo sistema.
- **Campos de Perfil:** Novo suporte a Avatar e Nome de Exibição de usuários injetados via migração de Banco de Dados.

### 💅 Modificado (Changed)
- **Design Premium UI:** Tela de `CadastrosBase` (Tipos de Equipamento e Secretarias) totalmente refeita em Modo Escuro (Dark Mode) com abas interativas.
- **Motor de Rede do Agente:** Substituído o método de envio para `System.Net.WebClient` forçando a codificação UTF-8 nativa, acabando com os bugs de acentuação (Mojibake).
- **Roteamento Inteligente (QR Code):** A tela de Consulta Pública foi atualizada para aceitar o formato "Coringa" (`/consulta/*`), permitindo ler QR Codes legados que possuam barras e nomenclaturas longas sem travar na tela de login.

### 🐛 Corrigido (Fixed)
- Corrigido o `Erro 400 (Bad Request)` causado por caracteres especiais e acentos mal formatados no envio do PowerShell antigo.
- Corrigido o `Erro 422` ao buscar setores em secretarias que possuíam nomes parcialmente duplicados.
- Corrigido o erro de compilação da tela vermelha do Vite (`AbaNovoCadastro.jsx` import paths).
- Corrigido erro de "no such column" ao tentar efetuar login com a base de dados desatualizada.