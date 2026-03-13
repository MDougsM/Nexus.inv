# 🚀 Manual de Deploy: Auto-Update (OTA) do Agente Nexus

Sempre que você alterar o código do Agente (`agente_nexus.pyw`) para adicionar novas funções ou corrigir bugs, siga EXATAMENTE este ritual de 4 passos para que todas as máquinas da rede se atualizem sozinhas.

## Passo 1: Preparar e Compilar o Agente (Python)
1. Abra o arquivo `agente_nexus.pyw`.
2. Altere a variável `VERSAO_DESTE_AGENTE` adicionando +0.1 (Ex: de `"4.2"` para `"4.3"`).
3. Verifique se `IP_PRODUCAO` aponta para a URL ou IP correto do servidor ativo.
4. Abra o terminal na mesma pasta do arquivo e rode o comando:
   \`\`\`bash
   pyinstaller --noconsole --onefile agente_nexus.pyw
   \`\`\`
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
   \`\`\`python
   return {
       "versao_atual": "4.3", # <--- MESMA VERSÃO DO AGENTE E DO INNO SETUP
       "url_download": "/api/inventario/download/agente"
   }
   \`\`\`

## Passo 4: Subir para Produção (Docker)
1. Abra o terminal na raiz do projeto (onde está o `docker-compose.yml`).
2. Derrube o container atual e suba reconstruindo as imagens para garantir que o `.exe` novo seja engolido pelo servidor:
   \`\`\`bash
   docker-compose down
   docker-compose up -d --build
   \`\`\`

**🎉 FIM!** A partir desse momento, qualquer Agente instalado na rede que "bater" no servidor nos próximos 60 minutos perceberá a mudança de versão, fará o download silencioso da pasta `static` e se auto-atualizará sem nenhuma intervenção humana.