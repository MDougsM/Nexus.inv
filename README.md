# Nexus.inv - Sistema de Inventário e Agente CMD/C2 (v5.10.1.0)

Nexus.inv é um sistema de inventário de ativos de TI com backend FastAPI, frontend React/Vite, app Sentinel SNMP e um agente remoto (C2) com receptor de comandos CMD/PowerShell e auto-atualização automática.

## 🔥 Novidades da versão atual (v5.10.1.0)

- **Auto-atualização do Agente**: Agentes instalados detectam e instalam automaticamente novas versões via API `/api/inventario/agente/versao`.
- **Configuração Centralizada de Versão**: Campo `AGENTE_VERSION` no `.env` controla a versão do agente em todo o sistema.
- **Heartbeat Automático**: Agente envia sinais de presença (pings) a cada 1 hora para manter conectividade. Frontend também envia heartbeat a cada 60 segundos via `/api/usuarios/ping`.
- **Modo Background/Silent**: Agente roda invisivelmente como serviço do Windows (SYSTEM) para operações furtivas.
- **Sistema de Bloqueio por Termos**: Usuários que não aceitaram os termos são bloqueados e redirecionados para `/perfil`.
- **Recuperação de Senha Segura**: Motor SMTP integrado para envio de credenciais temporárias via e-mail.
- **Identidade Protegida**: Novo campo de E-mail de Recuperação integrado ao painel de Perfil do Usuário.
- Agente com **receptor de comandos via C2** (polling 30s): `api/agente/comandos/pendentes/{uuid_persistente}`
- Suporte a execuções remotas de **PowerShell + CMD** diretamente pela interface de cadastro
- Endpoint de download do instalador atualizado dinamicamente: `/api/inventario/download/agente` retorna `Nexus_Instalador_v{versao}.exe`
- Fluxo completo de enfileiramento / leitura / retorno de resultados de comandos
- Histórico de execução com status e logs no frontend (`TerminalRemoto`)

## 🐛 Últimas Correções (v5.10.1.0 - 01/04/2026)

### ✅ Correções Frontend (UI/UX)
- **Modais e Pop-ups (React Portals)**: O bug da "faixa transparente" acima dos pop-ups foi erradicado. Todos os modais do sistema agora utilizam `createPortal` para sobrepor o Menu Lateral e o Cabeçalho com 100% de cobertura.
- **MeuPerfil.jsx**: Adicionado formulário inteligente para captura de e-mail e integração visual com os Termos de LGPD. Resolvido loop infinito ao aceitar termos.
- Adicionada seção "Gerenciamento de Termos" com botões de Reler e Revogar Acesso.

### ✅ Correções Críticas Backend
- **Colisão de Rotas (FastAPI)**: Resolvido o bug onde o `main.py` interceptava a atualização de perfil (`email`), ignorando o controlador `usuarios.py`.
- Injeção segura da coluna `email` no banco de dados (SQLite) sem perda de dados existentes.
- Validação robusta de `termos_aceitos` no banco de dados.
- **Configuração de Versão Dinâmica**: Backend agora lê `AGENTE_VERSION` do `.env` para APIs de versão e download.

## 📁 Estrutura do repositório

- `backend/` - FastAPI + SQLAlchemy + DB
- `frontend/` - React 18 + Vite + Tailwind
- `Nexus_Print_Sentinel/` - App desktop SNMP
- `ARQUITETURA_SISTEMA.md` - documentação arquitetural
- `CHANGELOG.md` - histórico de versões

## 🧩 Componentes principais

### Backend (FastAPI)
- Rotas inventário: `/api/inventario/*`
- Auth: `/api/login`, `/api/usuarios`, `/api/usuarios/recuperar-senha`
- **Heartbeat do Frontend**: `POST /api/usuarios/ping` atualiza último acesso do usuário
- Agente C2 e terminal remoto:
  - `POST /api/comandos/enviar`
  - `GET /api/comandos/maquina/{patrimonio:path}`
  - `GET /api/agente/comandos/pendentes/{uuid_persistente}`
  - `POST /api/agente/comandos/resultado`
- **Auto-atualização do Agente**: `/api/inventario/agente/versao` retorna versão atual e URL de download
- Rota de instalador dinâmico: `/api/inventario/download/agente` retorna `Nexus_Instalador_v{AGENTE_VERSION}.exe`
- Rotas de comando global de coleta (legacy): `/api/inventario/agente/comando*`

### Frontend (React)
- Modal Global "Esqueci a Senha" na tela de autenticação.
- Página de configurações com botão de download de instalador.
- `components/Cadastro/TerminalRemoto.jsx` com formulário de script e log.
- Histórico de comandos no `ativo.patrimonio`.

### Sentinel (Desktop)
- `Nexus_Print_Sentinel/sentinel_app.py` realiza coleta SNMP, status e auditoria.
- Agente local (`agente_nexus.pyw`) com thread `escutar_comandos_c2(...)`.

## 📦 Instalação

### Pré-requisitos
- Python 3.8+
- Node.js 16+ (ou 20+)
- Docker + Docker Compose (opcional)
- Inno Setup para empacotar agente instalador

### Backend

```ps1
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Sentinel

```bash
cd Nexus_Print_Sentinel
pip install -r requirements.txt
python sentinel_app.py
```

### Docker (recomendado)

```bash
docker-compose up -d --build
```

## 🚀 Fluxo do Agente C2 (CMD/PowerShell)

1. O frontend chama `POST /api/comandos/enviar` com:
   - `patrimonio`, `uuid_persistente`, `script_content`, `usuario_emissor`
2. O backend grava em `comandos_agente` com `status='PENDENTE'`
3. O agente periodicamente busca em `/api/agente/comandos/pendentes/{uuid}`:
   - retorna `{tem_comando: true, comando_id, script_content}`
   - marca `status='EXECUTANDO'`
4. Agente executa script (cmd/powershell) e envia log para `/api/agente/comandos/resultado`
5. Frontend atualiza histórico via `/api/comandos/maquina/{patrimonio}`

## 🔄 Auto-atualização do Agente

1. Agente verifica versão atual em `/api/inventario/agente/versao` a cada 1 hora (modo background) ou sob demanda.
2. Se versão da API > versão local, baixa instalador de `/api/inventario/download/agente`.
3. Executa instalador silenciosamente (`/VERYSILENT`) e encerra processo para permitir atualização.
4. Novo agente inicia automaticamente após instalação.
5. Suporte a modo furtivo (sem UAC) quando rodando como SYSTEM via tarefa agendada.

- Instalação do pacote: `backend/app/static/Nexus_Instalador_v{AGENTE_VERSION}.exe`
- Rota de download no frontend e API aponta dinamicamente para o arquivo baseado em `AGENTE_VERSION` no `.env`
- **Configuração Centralizada**: Altere `AGENTE_VERSION=5.6` no `.env` para atualizar versão em todo o sistema
- Caso ainda use `Nexus_Instalador.exe`, atualize para a nova nomenclatura nos controllers e frontend.

## 📡 Integração SNMP (Sentinel)

- Coleta automática de contador, toner, e status via SNMP
- Grava alertas de queda, tempo de funcionamento e IP
- Histórico de leituras em `historico_leituras`

## ⚙️ Banco de dados

Tabelas-chave:
- `ativos`, `categorias`, `usuarios`, `logs_auditoria`
- `comandos_agente` (C2)
- `historico_leituras`

## 🧪 Testes manuais

1. Registrar máquina e conferir inventário.
2. Abrir terminal remoto e enviar script `ipconfig /all` ou `Get-Process`.
3. Confirmar retorno de log e status `CONCLUIDO` no histórico.
4. Testar fluxo de recuperação de senha com um e-mail válido.
5. Verificar rota de download do instalador em `/api/inventario/download/agente`.
6. Testar bloqueio por termos: criar usuário sem aceitar termos e verificar redirecionamento.

## 🔒 Sistema de Bloqueio por Termos de Uso

- Usuários que não aceitaram os termos são automaticamente bloqueados no login.
- Redirecionamento forçado para `/perfil` até aceitar os termos.
- Verificação em tempo real no `Layout.jsx` via API `/api/usuarios/`.
- Campo `termos_aceitos` no banco de dados controla o acesso.
- Admin nasce com termos aceitos por padrão.

## 📌 Dicas de deploy

- Mantenha o `.env` em produção com URLs e credenciais SMTP corretas:
  - `VITE_API_URL` = URL do Backend
  - `FRONTEND_URL` = URL do Frontend
  - `AGENTE_VERSION` = Versão atual do agente (ex.: 5.6) - controla auto-atualização
  - `SMTP_EMAIL` = logistica.newpc@gmail.com
  - `SMTP_PASSWORD` = [SuaSenhaDeApp]
- Evite sobrescrever `backend/data` e `.env` em updates.
- Use `docker-compose down -v && docker-compose up -d --build` para limpar caches problemáticos.

## 📝 Changelog resumido
- ✅ **[v5.10.1.0]** Auto-atualização automática do agente, configuração centralizada de versão via `.env`, heartbeat a cada 1 hora no agente e 60s no frontend, modo background/silent, sistema de bloqueio por termos de uso.
- ✅ **[v5.8.3.0]** Motor SMTP de e-mails, Correção de Z-Index/Modais (React Portals) e Colisão de Rotas no FastAPI.
- ✅ **[v5.8.2.0]** Correções críticas no backend (main.py) e resolução do loop infinito de termos.
- ✅ Gerenciamento de Termos com releitura e revogação de acesso.
- Terminal remoto C2 adicionado.

Veja `CHANGELOG.md` para histórico completo e detalhado.

### Exemplos de Payloads C2

#### Enviar Comando (POST /api/comandos/enviar)
```json
{
  "patrimonio": "PC001",
  "uuid_persistente": "550e8400-e29b-41d4-a716-446655440000",
  "script_content": "ipconfig /all",
  "usuario_emissor": "admin"
}
```

#### Verificar Comandos Pendentes (GET /api/agente/comandos/pendentes/{uuid})
Resposta se há comando:
```json
{
  "tem_comando": true,
  "comando_id": 123,
  "script_content": "Get-Process | Select Name, CPU"
}
```

#### Verificar Versão do Agente (GET /api/inventario/agente/versao)
Resposta:
```json
{
  "versao_atual": "5.6",
  "url_download": "/api/inventario/download/agente"
}
```

#### Heartbeat do Frontend (POST /api/usuarios/ping)
Atualiza o campo `ultimo_acesso` do usuário no banco.
```json
{
  "username": "admin"
}
```

### Schema da Tabela `comandos_agente`
- `id` (PK)
- `patrimonio` (string)
- `uuid_persistente` (string)
- `script_content` (text)
- `status` (PENDENTE/EXECUTANDO/CONCLUIDO/ERRO)
- `output_log` (text, nullable)
- `usuario_emissor` (string)
- `data_criacao`, `data_conclusao` (datetime)

## 🔧 Troubleshooting

### C2 não executa comandos
- Verifique se o agente está rodando com privilégios SYSTEM
- Confirme UUID persistente no banco vs. agente
- Logs do agente em `C:\Nexus\logs\`

### Recuperação de senha falha
- Verifique se a Senha de App do Google foi inserida no `.env` sem espaços.
- Confirme se a porta 465 (SMTP SSL) não está bloqueada no firewall.

### Instalador não baixa
- Arquivo `Nexus_Instalador_v5.exe` deve estar em `backend/app/static/`
- Verifique permissões de leitura na pasta

### Sentinel não coleta SNMP
- IPs das impressoras devem estar corretos
- Porta SNMP 161 aberta no firewall

## 📞 Suporte
- Link interno /poa/contato ou equipe de DevOps