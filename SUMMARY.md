# SUMMARY - Nexus Control v5

## 🎯 Visão Geral
Sistema de inventário TI com agente C2 para comandos remotos CMD/PowerShell.

## 🔑 Principais Mudanças
- **Agente C2**: Polling 30s para execução remota de scripts
- **Terminal Remoto**: Interface web para enviar comandos e ver logs
- **Instalador**: Atualizado para `Nexus_Instalador_v5.exe`

## 🚀 Endpoints C2
- `POST /api/comandos/enviar` - Enfileira comando
- `GET /api/comandos/maquina/{patrimonio}` - Histórico
- `GET /api/agente/comandos/pendentes/{uuid}` - Agente busca comandos
- `POST /api/agente/comandos/resultado` - Agente envia resultado

## 📦 Deploy
- Docker: `docker-compose up -d --build`
- Backend: `uvicorn app.main:app --port 8001`
- Frontend: `npm run dev`
- Sentinel: `python sentinel_app.py`

## 🧪 Testes
1. Enviar comando `ipconfig /all` via Terminal Remoto
2. Verificar log de retorno em 30-60s
3. Status deve mudar para `CONCLUIDO`

## ⚠️ Pontos de Atenção
- Agente precisa privilégios SYSTEM
- UUID persistente deve bater com banco
- Arquivo instalador em `backend/app/static/`

## 📞 Contato
Equipe DevOps para suporte.