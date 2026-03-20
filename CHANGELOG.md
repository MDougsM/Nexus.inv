# Changelog - Nexus.inv

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

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

## [5.6.0.0] - 2026-03-19
### 🚀 Adicionado (Features)
* **Controle de Acesso Granular (RBAC):** Novo sistema de permissões onde o administrador mestre pode definir exatamente quais abas cada técnico/usuário pode acessar.
* **Automação de Relatórios (Robôs):** Implementação do `APScheduler` no backend para geração autônoma de relatórios de faturamento em dias e horários programados.
* **Cofre de Relatórios:** Nova interface e tabela no banco de dados (`relatorios_gerados`) para armazenar fisicamente os CSVs gerados pelos robôs, permitindo download e exclusão.
* **Filtros Múltiplos:** Geração de relatórios (manuais e automáticos) agora suporta a seleção de múltiplas Secretarias e Setores simultaneamente via checkboxes.
* **Inteligência do Sentinel:** O backend agora detecta automaticamente mudanças de IP e trocas de suprimento (saltos maiores que 20% no toner) e gera logs de auditoria silenciosos.

### 🔄 Modificado (Changes)
* **Menu Lateral Dinâmico:** O `Layout.jsx` agora lê as permissões no `localStorage` e esconde módulos não autorizados em tempo real.
* **Gestão de Equipe:** Tela de usuários totalmente reformulada com modais interativos para gestão de acessos e concessão de poderes de Admin.
* Estrutura da `AbaAgendamentos` criada e integrada ao Nexus Print.