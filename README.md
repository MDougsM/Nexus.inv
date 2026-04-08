# Nexus.inv - Sistema de Inventário e Agente CMD/C2 (v6.0.0)

Nexus.inv é um sistema de inventário de ativos de TI com backend FastAPI, frontend React/Vite, app Sentinel SNMP e um agente remoto (C2) com receptor de comandos CMD/PowerShell e **auto-atualização automática**.

## ?? Novidades da versão atual (v6.0.0)

- **Auto-atualização Automática do Agente**: Agentes instalados detectam e instalam automaticamente novas versões via API /api/inventario/agente/versao a cada 1 hora.
  - Download silencioso em background sem interromper o usuário.
  - Instalação furtiva com flags /VERYSILENT /SUPPRESSMSGBOXES /NORESTART.
  - Reinício automático após instalação.
- **Configuração Centralizada de Versão**: Campo AGENTE_VERSION no .env controla a versão do agente em todo o sistema.
- **Heartbeat Automático**: Agente envia sinais de presença (pings) a cada 1 hora para manter conectividade. Frontend também envia heartbeat a cada 60 segundos via /api/usuarios/ping.
- **Modo Background/Silent**: Agente roda invisivelmente como serviço do Windows (SYSTEM) para operações furtivas.
- **Sistema de Bloqueio por Termos**: Usuários que não aceitaram os termos são bloqueados e redirecionados para /perfil.
- **Recuperação de Senha Segura**: Motor SMTP integrado para envio de credenciais temporárias via e-mail.
- **Identidade Protegida**: Novo campo de E-mail de Recuperação integrado ao painel de Perfil do Usuário.
- Agente com **receptor de comandos via C2** (polling 30s): pi/agente/comandos/pendentes/{uuid_persistente}
- Suporte a execuções remotas de **PowerShell + CMD** diretamente pela interface de cadastro
- Endpoint de download do instalador atualizado dinamicamente: /api/inventario/download/agente retorna Nexus_Instalador_v{versao}.exe
- Fluxo completo de enfileiramento / leitura / retorno de resultados de comandos
- Histórico de execução com status e logs no frontend (TerminalRemoto)

## ?? Últimas Correções (v6.0.0 - 08/04/2026)

### ? Correções Críticas Backend
- **Colisão de Rotas (FastAPI)**: Resolvido o bug onde o main.py interceptava a atualização de perfil (email), ignorando o controlador usuarios.py.
- Injeção segura da coluna email no banco de dados (SQLite) sem perda de dados existentes.
- Validação robusta de 	ermos_aceitos no banco de dados.
- **Configuração de Versão Dinâmica**: Backend agora lê AGENTE_VERSION do .env para APIs de versão e download.

## ?? Estrutura do repositório

- ackend/ - FastAPI + SQLAlchemy + DB
- rontend/ - React 18 + Vite + Tailwind
- Nexus_Print_Sentinel/ - App desktop SNMP
- gente/ - Agente C2 com auto-atualização
- ARQUITETURA_SISTEMA.md - documentação arquitetural
- CHANGELOG.md - histórico de versões

## ?? Componentes principais

### Backend (FastAPI)
- Rotas inventário: /api/inventario/*
- Auth: /api/login, /api/usuarios, /api/usuarios/recuperar-senha
- **Heartbeat do Frontend**: POST /api/usuarios/ping atualiza último acesso do usuário
- Agente C2 e terminal remoto:
  - POST /api/comandos/enviar
  - GET /api/comandos/maquina/{patrimonio:path}
  - GET /api/agente/comandos/pendentes/{uuid_persistente}
  - POST /api/agente/comandos/resultado
- **Auto-atualização do Agente**: /api/inventario/agente/versao retorna versão atual e URL de download
- Rota de instalador dinâmico: /api/inventario/download/agente retorna Nexus_Instalador_v{AGENTE_VERSION}.exe
- Rotas de comando global de coleta (legacy): /api/inventario/agente/comando*

### Frontend (React)
- Modal Global 'Esqueci a Senha' na tela de autenticação.
- Página de configurações com botão de download de instalador.
- components/Cadastro/TerminalRemoto.jsx com formulário de script e log.
- Histórico de comandos no tivo.patrimonio.

### Agente (Python + PyInstaller)
- gente_nexus.pyw - Interface gráfica com CustomTkinter
- **Auto-atualização**: Thread em background verifica versão a cada 1 hora e instala automaticamente
- C2 Engine: Escuta comandos remotos via polling 30s
- Coleta profunda: Hardware, software, licenças Windows, antivírus, etc.
- Persistência: ID único persistente em C:\ProgramData\NexusInv\nexus_dna.txt

### Sentinel (Desktop)
- Nexus_Print_Sentinel/sentinel_app.py realiza coleta SNMP, status e auditoria.
- Agente local (gente_nexus.pyw) com thread escutar_comandos_c2(...).

##  Instalação

### Pré-requisitos
- Python 3.8+
- Node.js 16+ (ou 20+)
- Docker + Docker Compose (opcional)
- Inno Setup para empacotar agente instalador

### Backend

`ps1
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
`

### Frontend

`ash
cd frontend
npm install
npm run dev
`

### Agente
`ps1
cd agente
python -m PyInstaller --noconfirm --onefile agente_nexus.pyw
# Ou usar o spec: python -m PyInstaller agente_nexus.spec
`

### Sentinel

`ash
cd Nexus_Print_Sentinel
pip install -r requirements.txt
python sentinel_app.py
`

### Docker (recomendado)

`ash
docker-compose up --build
`

##  Deploy do Agente

1. **Compilar**: python -m PyInstaller --noconfirm --onefile agente_nexus.pyw
2. **Empacotar**: Usar Nexus_Agente.iss com Inno Setup
3. **Distribuir**: Upload do instalador para ackend/app/static/
4. **Configurar**: Definir AGENTE_VERSION no .env do backend
5. **Auto-Update**: Agentes instalados se atualizam automaticamente

##  Segurança

- **Token de Agente**: NEXUS_AGENTE_V5_9b7e1f2a4c6d8e0f3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d
- **Proteção C2 VIP**: Máquinas críticas rejeitam comandos de técnicos comuns
- **Chave Privada**: Autenticação local para operações sensíveis
- **Logs de Auditoria**: Todas as ações são registradas no banco

##  APIs Principais

### Agente
- POST /api/inventario/agente/coleta - Envio de dados de inventário
- GET /api/inventario/agente/versao - Verificação de versão
- GET /api/inventario/download/agente - Download do instalador

### C2
- POST /api/comandos/enviar - Enviar comando para agente
- GET /api/agente/comandos/pendentes/{uuid} - Buscar comandos pendentes
- POST /api/agente/comandos/resultado - Retornar resultado do comando

##  Troubleshooting

### Agente não conecta
- Verificar BASE_URL no código
- Checar token X-Nexus-Token
- Validar conectividade de rede

### Auto-atualização falha
- Verificar se AGENTE_VERSION está definido no .env
- Confirmar que o instalador está em ackend/app/static/
- Checar permissões de escrita na pasta temp

### C2 não executa
- Agente deve estar rodando como administrador
- Verificar se a thread C2 está ativa (logs)
- Backend deve ter comandos na fila

---

**Desenvolvido por Nexus Team** | **Versão 6.0.0** | **Data: 08/04/2026**
