# 🚀 Manual de Deploy: Auto-Update (OTA) do Agente Nexus

Sempre que você alterar o código do Agente (`agente_nexus.pyw`) para adicionar novas funções ou corrigir bugs, siga EXATAMENTE este ritual de 4 passos para que todas as máquinas da rede se atualizem sozinhas.

## Passo 1: Preparar e Compilar o Agente (Python)
1. Abra o arquivo `agente_nexus.pyw`.
2. Altere a variável `VERSAO_DESTE_AGENTE` adicionando +0.1 (Ex: de `"4.2"` para `"4.3"`).
3. Verifique se `IP_PRODUCAO` aponta para a URL ou IP correto do servidor ativo.
4. Abra o terminal na mesma pasta do arquivo e rode o comando:
   ```bash
   pyinstaller --noconsole --onefile agente_nexus.pyw
   ```
   *(Isso vai gerar um novo `Nexus_Agente.exe` dentro da pasta `dist`)*.

## Passo 2: Empacotar o Instalador (Inno Setup)
1. Abra o arquivo de script `Nexus_Agente.iss` no Inno Setup.
2. Altere a diretiva `AppVersion` para a nova versão (Ex: `AppVersion=4.3`).
3. Aperte **F9** no teclado (ou clique em *Build > Compile*).
   *(Isso vai gerar o arquivo `Nexus_Instalador.exe` na pasta `Output`)*.

## Passo 3: Atualizar o Servidor (Backend)
1. Copie o `Nexus_Instalador.exe` recém-criado da pasta `Output`.
2. Cole ele dentro da pasta do servidor: `backend/app/static/` (substitua o antigo).
3. Abra o arquivo `backend/app/api/inventario.py`.
4. Procure a rota `@router.get("/agente/versao")` e altere o retorno para a nova versão:
   ```python
   return {
       "versao_atual": "4.3", # <--- MESMA VERSÃO DO AGENTE E DO INNO SETUP
       "url_download": "/api/inventario/download/agente"
   }
   ```

## Passo 4: Subir para Produção (Docker)
1. Abra o terminal na raiz do projeto (onde está o `docker-compose.yml`).
2. Derrube o container atual e suba reconstruindo as imagens para garantir que o `.exe` novo seja engolido pelo servidor:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

**🎉 FIM!** A partir desse momento, qualquer Agente instalado na rede que "bater" no servidor nos próximos 60 minutos perceberá a mudança de versão, fará o download silencioso da pasta `static` e se auto-atualizará sem nenhuma intervenção humana.

---

## 💉 Passo 5: Atualização Estrutural (Banco de Dados)
Sempre que o servidor apresentar erro `500` após um update ou avisar que faltam colunas no banco (`no such column`), aplique a vacina:

1. Com o Docker rodando, abra o terminal na raiz do projeto.
2. Execute o comando de injeção direta:
   ```bash
   docker-compose exec backend python forcar_db.py
   ```
3. Se o banco estiver travado, rode fora do container:
   ```bash
   cd backend && python forcar_db.py && cd ..
   ```
   *(Isso adiciona as novas funcionalidades sem apagar nenhum dado existente).*

## 💾 Passo 6: Rotina de Backup e Recuperação
O sistema protege os dados automaticamente através do script de backup rotativo.

1. **Local dos Backups:** Os últimos 10 backups são mantidos em `C:\Users\NewPC\Documents\BKP`.
2. **Teste de Segurança:** Para rodar o backup agora e garantir que a base está salva:
   ```bash
   cd backend && python backup_db.py && cd ..
   ```
3. **Recuperação de Desastre:** Caso o banco corrompa:
   - Pare o sistema: `docker-compose down`.
   - Pegue o arquivo mais recente em `Documents\BKP` e renomeie para `nexus.db`.
   - Substitua o arquivo em `backend/nexus.db` e suba o docker novamente.

## 🏷️ Passo 7: Sincronização entre Máquinas (Git & Tags)
Para garantir que a máquina de Produção (PROD) seja um espelho fiel da sua máquina de Desenvolvimento (DEV):

1. **Na Máquina DEV (Subir):**
   ```bash
   git add .
   git commit -m "Descricao das melhorias"
   git tag v4.4.0.0  # <--- Defina a nova versão aqui
   git push origin main --tags
   ```
2. **Na Máquina PROD (Puxar):**
   ```bash
   git fetch origin --tags
   git reset --hard v4.4.0.0
   docker-compose up -d --build
   ```

---

### 🛡️ Notas de Segurança Final
* **IP do Agente:** Para deploy via GPO em rede interna, prefira sempre o `IP_LOCAL` do servidor no código do agente para evitar dependência do link temporário da Cloudflare.
* **Agendador de Tarefas:** Verifique semanalmente se a tarefa `Nexus_Backup_Diario` no Windows Server está com o status "Resultado da última execução: (0x0)".