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