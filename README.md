# Nexus.inv - Sistema de Inventário de Ativos de TI

Nexus.inv é um sistema completo de gerenciamento de inventário de ativos de TI, com foco especial em impressoras e equipamentos de rede. O sistema integra um backend robusto em FastAPI, um frontend moderno em React com Vite, e um aplicativo sentinel para monitoramento contínuo via SNMP.

## 🚀 Funcionalidades Principais

### 📊 Gerenciamento de Inventário
- Cadastro completo de ativos de TI (impressoras, computadores, periféricos)
- Categorias configuráveis com campos dinâmicos
- Ficha técnica detalhada com telemetria em tempo real
- Transferências entre unidades e setores
- Controle de manutenção preventiva e corretiva

### 🔍 Monitoramento e Telemetria (Sentinel)
- Aplicativo desktop para monitoramento contínuo de impressoras via SNMP
- Coleta automática de dados como níveis de toner, contadores de página e status
- Detecção de mudanças de IP e alertas de suprimento
- Interface gráfica moderna com modo escuro

### 🤖 Agente de Auto-Discovery
- Agente executável para descoberta automática de hardware
- Identificação de componentes (BIOS, placa-mãe, discos, CPU)
- Atualização automática (OTA) via servidor
- Instalador personalizado com Inno Setup

### 📈 Relatórios e Auditoria
- Geração automática de relatórios de faturamento e uso
- Histórico completo de auditoria de ações
- Exportação para CSV e PDF
- Agendamento de relatórios com APScheduler

### 👥 Controle de Acesso
- Sistema de permissões granulares (RBAC)
- Gestão de usuários e perfis
- Autenticação JWT
- Menu lateral dinâmico baseado em permissões

### 🌐 Interface Web Moderna
- Dashboard responsivo com gráficos interativos (Recharts)
- Consulta pública via QR Code
- Interface em modo escuro
- Suporte a múltiplas unidades e setores

## 🏗️ Arquitetura do Sistema

O sistema é composto por três componentes principais:

### Backend (FastAPI)
- **Localização:** `backend/`
- **Tecnologias:** FastAPI, SQLAlchemy, PostgreSQL/MySQL
- **Porta padrão:** 8001
- **APIs:** Inventário, autenticação, auditoria, transferências, usuários, manutenção

### Frontend (React)
- **Localização:** `frontend/`
- **Tecnologias:** React 18, Vite, Tailwind CSS, Axios
- **Porta padrão:** 5173
- **Funcionalidades:** Dashboard, cadastro, relatórios, configurações

### Sentinel (Desktop App)
- **Localização:** `Nexus_Print_Sentinel/`
- **Tecnologias:** CustomTkinter, PySNMP, SQLite local
- **Funcionalidades:** Monitoramento SNMP, telemetria, logs

## 📋 Pré-requisitos

- **Python 3.8+** (para backend e sentinel)
- **Node.js 20+** (para frontend)
- **Docker e Docker Compose** (para deploy)
- **Banco de dados:** PostgreSQL ou MySQL
- **Inno Setup** (para empacotamento do agente)

## 🚀 Instalação e Execução

### 1. Clonagem do Repositório
```bash
git clone <url-do-repositorio>
cd NexusInv
```

### 2. Configuração do Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nexus_db
BACKEND_PORT=8001
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:8001
VERSAO_ATUAL=2.1.0.0
```

### 3. Deploy com Docker (Recomendado)
```bash
# Construir e iniciar os serviços
docker-compose up -d --build

# Verificar logs
docker-compose logs -f
```

### 4. Execução Manual (Desenvolvimento)

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Sentinel
```bash
cd Nexus_Print_Sentinel
pip install -r requirements.txt
python sentinel_app.py
```

## 📖 Uso

### Acesso ao Sistema
1. Acesse `http://localhost:5173` (frontend)
2. Faça login com usuário padrão: `admin` / `admin123`
3. Configure unidades, categorias e usuários conforme necessário

### Configuração Inicial
1. **Unidades:** Cadastre secretarias e setores
2. **Categorias:** Defina tipos de equipamento e campos dinâmicos
3. **Usuários:** Crie perfis com permissões específicas
4. **Sentinel:** Configure IPs de impressoras para monitoramento

### Agente de Auto-Discovery
1. Compile o agente: `pyinstaller --noconsole --onefile agente_nexus.pyw`
2. Empacote com Inno Setup usando `Nexus_Agente.iss`
3. Faça upload do instalador para `backend/app/static/`
4. Atualize a versão na API `/api/inventario/agente/versao`

## 🔧 Estrutura de Dados

### Tabelas Principais
- **ativos:** Inventário principal com dados dinâmicos (JSON)
- **categorias:** Tipos de equipamento com configuração de campos
- **logs_auditoria:** Histórico de ações do sistema
- **historico_leituras:** Dados temporais de telemetria
- **usuarios:** Controle de acesso e permissões

### APIs Principais
- `GET /api/inventario/` - Listagem de ativos
- `GET /api/inventario/id/{id}` - Ficha técnica
- `PUT /api/inventario/ficha/editar/id/{id}` - Edição
- `POST /api/inventario/agente/comando/enviar` - Comandos SNMP

## 📊 Relatórios

O sistema gera relatórios automáticos de:
- Faturamento por impressora
- Uso de suprimentos
- Alertas de manutenção
- Auditoria de transferências

Relatórios são armazenados em `relatorios_gerados_csv/` e podem ser baixados via interface.

## 🔐 Segurança

- Autenticação JWT com expiração
- Controle de acesso baseado em roles
- Logs de auditoria completos
- Validação de entrada em todas as APIs
- Sanitização de dados para prevenir injeção

## 🐛 Troubleshooting

### Erro 405/404 em URLs
- Use sempre IDs numéricos em rotas, evite barras (/) em patrimônios

### Campos não aparecem na ficha técnica
- Verifique configuração da categoria
- Certifique-se que `categoria_id` é numérico

### Sentinel não coleta dados
- Verifique conectividade SNMP nas impressoras
- Confirme IPs configurados no banco local

### Agente não atualiza
- Verifique versão no servidor vs. cliente
- Confirme URL de download no `IP_PRODUCAO`

## 📝 Desenvolvimento

### Contribuição
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### Convenções de Código
- Backend: PEP 8
- Frontend: ESLint padrão
- Commits: Conventional Commits

## 📄 Licença

Este projeto é proprietário da organização Nexus.

## 📞 Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento.

---

**Versão atual:** 2.1.0.0
**Última atualização:** 23 de março de 2026

.env

## 🚀 Como Atualizar o Nexus Print em Produção (Deploy Limpo)

Para evitar erros de cache, links quebrados ou banco de dados travado durante uma atualização, siga estritamente o procedimento abaixo na máquina de produção.

### 1. Atualizar o código
Baixe os arquivos mais recentes do projeto (via Git ou copiando a pasta). **Atenção:** Não sobrescreva a pasta `/data` nem o arquivo `.env` da produção.

### 2. Configurar o `.env` (Se for a primeira vez)
Crie um arquivo `.env` na raiz do projeto contendo as URLs corretas do Cloudflare:
\`\`\`env
VITE_API_URL=https://<url-do-backend-8001>
FRONTEND_URL=https://<url-do-frontend-5174>
\`\`\`

### 3. O Ritual de Atualização (Comandos Docker)
Abra o terminal na pasta do projeto e execute os comandos abaixo, um por vez:

1. **Derrubar os serviços antigos com segurança:**
   \`docker-compose down\`

2. **Reconstruir as imagens limpando o cache (Injeta as novas URLs do .env):**
   \`docker-compose build --no-cache\`

3. **Subir o sistema atualizado:**
   \`docker-compose up -d\`

O sistema estará no ar em cerca de 30 segundos, já lendo os links de produção atualizados!