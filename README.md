# Nexus Control - Sistema de Inventário de Ativos

Nexus Control é uma solução completa para inventário de ativos de TI com:
- backend em **FastAPI + SQLAlchemy**
- frontend em **React 18 + Vite + Tailwind**
- agente remoto com **C2 / PowerShell / CMD**
- app Sentinel SNMP para auditoria e monitoramento
- mecanismo de **auto-atualização de agente** via versão centralizada.

## Visão geral

O projeto reúne:
- API centralizada para inventário, autenticação, upload de CSV e geração de relatórios.
- Frontend com busca avançada, filtros, edição em massa, relatórios e terminal remoto.
- Agente Python capaz de receber comandos, coletar dados e atualizar automaticamente.
- Aplicativo Sentinel para redes e coleta SNMP.

## Novidades da versão atual (v6.0.0)

- Auto-atualização do agente em background via API `/api/inventario/agente/versao`.
- Instalação silenciosa com flags `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART`.
- Gerenciamento de versão via variável `AGENTE_VERSION` em `.env`.
- Heartbeat do agente a cada hora e heartbeat do frontend a cada 60 segundos.
- Bloqueio de acesso para usuários que não aceitaram termos.
- Recuperação de senha por e-mail com fluxo seguro.
- Comandos remotos C2 via polling de 30s.
- Download dinâmico do instalador do agente.

## Estrutura do repositório

- `backend/` - API FastAPI + banco de dados + integração de agentes
- `frontend/` - interface React/Vite/Tailwind
- `Nexus_Print_Sentinel/` - app desktop SNMP
- `agente/` - código do agente C2 e instalador
- `ARQUITETURA_SISTEMA.md` - visão arquitetural
- `CHANGELOG.md` - histórico de versões

## Componentes principais

### Backend

- Rotas de inventário: `/api/inventario/*`
- Autenticação e usuários: `/api/login`, `/api/usuarios`, `/api/usuarios/recuperar-senha`
- Heartbeat do frontend: `POST /api/usuarios/ping`
- Comandos remotos C2:
  - `POST /api/comandos/enviar`
  - `GET /api/comandos/maquina/{patrimonio:path}`
  - `GET /api/agente/comandos/pendentes/{uuid_persistente}`
  - `POST /api/agente/comandos/resultado`
- Auto-atualização do agente:
  - `GET /api/inventario/agente/versao`
  - `GET /api/inventario/download/agente`

### Frontend

- Página principal de gestão de ativos com filtros, busca e edição
- Exportação de inventário em **CSV/XLSX** e **PDF**
- Relatórios e geração de etiquetas
- Terminal remoto para enviar scripts e visualizar resultados

### Relatórios de Gestão de Ativos

O código de exportação está em:
- `frontend/src/pages/Cadastro.jsx`  gera exportação em CSV/XLSX e PDF
- `frontend/src/components/Cadastro/BarraPesquisa.jsx`  botões de exportar aparecem na interface

### Agente

- `agente/agente_nexus.pyw` - aplicativo Python do agente
- Auto-atualização em thread de background
- Polling de comandos C2 a cada 30 segundos
- Coleta de hardware, software, licenças e informações do Windows
- Persistência de ID em `C:\ProgramData\NexusInv\nexus_dna.txt`

### Sentinel

- `Nexus_Print_Sentinel/sentinel_app.py` - coletor SNMP e painel de auditoria

## Instalação

### Pré-requisitos

- Python 3.8+
- Node.js 16+ ou 20+
- Docker + Docker Compose (opcional)
- Inno Setup para empacotar o instalador do agente

### Backend

```powershell
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

### Agente

```powershell
cd agente
python -m PyInstaller --noconfirm --onefile agente_nexus.pyw
# ou usar o spec
python -m PyInstaller agente_nexus.spec
```

### Sentinel

```bash
cd Nexus_Print_Sentinel
pip install -r requirements.txt
python sentinel_app.py
```

### Docker

```bash
docker-compose up --build
```

## Publicação de nova versão no GitHub

Use este fluxo sempre que tiver uma nova versão:

1. Adiciona os arquivos modificados (por exemplo `Cadastro.jsx`) na fila de envio
   ```bash
git add .
```
2. Cria o pacote do commit com uma mensagem clara sobre o que foi feito
   ```bash
git commit -m "Sua versão atual: Descrição breve"
```
3. Cria a nova tag da versão apontando para essas melhorias
   ```bash
git tag v{nova versão}
```
4. Envia o código atualizado para o repositório principal
   ```bash
git push origin main
```
5. Envia a nova tag de versão para o repositório remoto
   ```bash
git push origin v{nova versão}
```

> Dica: substitua `{nova versão}` por algo como `6.0.1` ou `6.1.0`.

## Deploy do Agente

1. Compilar: `python -m PyInstaller --noconfirm --onefile agente_nexus.pyw`
2. Empacotar com Inno Setup usando `Nexus_Agente.iss`
3. Copiar o instalador para `backend/app/static/`
4. Atualizar `AGENTE_VERSION` no `.env` do backend
5. Os agentes instalados atualizam automaticamente quando consultam a nova versão

## Segurança

- Token de agente e validações de segurança são usados para proteger a comunicação
- Logs de auditoria registram ações dos usuários e comandos remotos

## APIs principais

### Agente
- `POST /api/inventario/agente/coleta`  envio de dados do agente
- `GET /api/inventario/agente/versao`  verifica versão e URL do instalador
- `GET /api/inventario/download/agente`  retorna instalador do agente

### C2
- `POST /api/comandos/enviar`  enviar comando para agente
- `GET /api/agente/comandos/pendentes/{uuid}`  buscar comandos pendentes
- `POST /api/agente/comandos/resultado`  enviar resultado do comando

## Troubleshooting

### Agente não conecta
- Verifique `BASE_URL` no código
- Cheque o token `X-Nexus-Token`
- Valide conectividade de rede

### Auto-atualização falha
- Confirme `AGENTE_VERSION` no `.env`
- Verifique se o instalador está em `backend/app/static/`
- Confira permissões de escrita na pasta temporária

### C2 não executa
- Execute o agente como administrador
- Verifique se a thread C2 está ativa nos logs
- Confirme que há comandos na fila do backend

---

**Desenvolvido por Nexus Team** | **Versão 6.0.0** | **Data: 08/04/2026**
