# Nexus.inv - Sistema de Inventário e Agente CMD/C2 (v5)

Nexus.inv é um sistema de inventário de ativos de TI com backend FastAPI, frontend React/Vite, app Sentinel SNMP e um agente remoto (C2) com receptor de comandos CMD/PowerShell.

## 🔥 Novidades da versão atual

- Agente com **receptor de comandos via C2** (polling 30s): `api/agente/comandos/pendentes/{uuid_persistente}`
- Suporte a execuções remotas de **PowerShell + CMD** diretamente pela interface de cadastro
- Endpoint de download do instalador atualizado para `Nexus_Instalador_v5.exe`
- Fluxo completo de enfileiramento / leitura / retorno de resultados de comandos
- Histórico de execução com status e logs no frontend (`TerminalRemoto`)

## 🐛 Últimas Correções (v5.8.2.0 - 26/03/2026)

### ✅ Correções Críticas Backend
- **main.py**: Corrigidos imports inválidos, decoradores órfãos e código Flask misturado com FastAPI
- Rota `/usuarios/perfil/atualizar` agora retorna confirmação de dados salvos
- Validação robusta de `termos_aceitos` no banco de dados

### ✅ Correções Frontend
- **MeuPerfil.jsx**: Resolvido loop infinito ao aceitar termos
- Adicionada seção "Gerenciamento de Termos" com botões:
  - 📖 **Reler Termos**: Reabre modal para leitura
  - 🚪 **Revogar Acesso**: Permite revogar aceite (com confirmação dupla)
- Interface mostra status visual: ✅ Aceito / ❌ Não aceito

### 📦 Versionamento
- Instalador atualizado para **`Nexus_Instalador_v5.exe`** em todos os endpoints

## 📁 Estrutura do repositório

- `backend/` - FastAPI + SQLAlchemy + DB
- `frontend/` - React 18 + Vite + Tailwind
- `Nexus_Print_Sentinel/` - App desktop SNMP
- `ARQUITETURA_SISTEMA.md` - documentação arquitetural
- `CHANGELOG.md` - histórico de versões

## 🧩 Componentes principais

### Backend (FastAPI)
- Rotas inventário: `/api/inventario/*`
- Auth: `/api/login`, `/api/usuarios`, `/api/auditoria`
- Agente C2 e terminal remoto:
  - `POST /api/comandos/enviar`
  - `GET /api/comandos/maquina/{patrimonio:path}`
  - `GET /api/agente/comandos/pendentes/{uuid_persistente}`
  - `POST /api/agente/comandos/resultado`
- Rota de instalador: `/api/inventario/download/agente` retorna `Nexus_Instalador_v5.exe`
- Rotas de comando global de coleta (legacy): `/api/inventario/agente/comando*`

### Frontend (React)
- Página de configurações com botão de download de instalador
- `components/Cadastro/TerminalRemoto.jsx` com formulário de script e log
- Histórico de comandos no `ativo.patrimonio`

### Sentinel (Desktop)
- `Nexus_Print_Sentinel/sentinel_app.py` realiza coleta SNMP, status e auditoria
- Agente local (`agente_nexus.pyw`) com thread `escutar_comandos_c2(...)`

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

## 🛠️ Configuração do agente instalador

- Instalação do pacote: `backend/app/static/Nexus_Instalador_v5.exe`
- Rota de download no frontend e API aponta para `Nexus_Instalador_v5.exe`
- Caso ainda use `Nexus_Instalador.exe`, atualize para a nova nomenclatura:
  - `backend/app/api/inventario.py`
  - `backend/app/main.py`
  - `frontend/src/pages/ConfiguracoesComponents/PainelFerramentas.jsx`

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
4. Verificar rota de download do instalador em `/api/inventario/download/agente`.

## 📌 Dicas de deploy

- Mantenha o `.env` em produção com URLs corretas:
  - `VITE_API_URL` = backend
  - `FRONTEND_URL` = frontend
- Evite sobrescrever `backend/data` e `.env` em updates.
- Use `docker-compose down && docker-compose up -d --build`.

## 📝 Changelog resumido
- ✅ **[v5.8.2.0]** Correções críticas no backend (main.py) e resolução do loop infinito de termos
- ✅ Gerenciamento de Termos com releitura e revogação de acesso
- Terminal remoto C2 adicionado
- Agente com pooling de comandos e execução remota
- Instalador atualizado para `Nexus_Instalador_v5.exe`
- Endpoint de comando global mantido para fallback

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

#### Enviar Resultado (POST /api/agente/comandos/resultado)
```json
{
  "comando_id": 123,
  "status": "CONCLUIDO",
  "output_log": "Nome    CPU\n----    ---\nsystem  0.1\nchrome  5.2\n..."
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

### Instalador não baixa
- Arquivo `Nexus_Instalador_v5.exe` deve estar em `backend/app/static/`
- Verifique permissões de leitura na pasta

### Sentinel não coleta SNMP
- IPs das impressoras devem estar corretos
- Porta SNMP 161 aberta no firewall

## 📞 Suporte
- Link interno /poa/contato ou equipe de DevOps

