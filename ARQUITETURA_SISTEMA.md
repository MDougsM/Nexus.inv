# 🗺️ Mapa de Arquitetura - Nexus.inv

Este documento é o guia oficial para localização de funções, rotas e regras de negócio do sistema. 

---

## 1. 🏗️ Estrutura de Dados (Database)
*Localização: `backend/app/models.py`*

| Classe (Model) | Tabela | Descrição |
| :--- | :--- | :--- |
| **Ativo** | `ativos` | Tabela principal. O campo `dados_dinamicos` (JSON) guarda a telemetria do Agente. |
| **Categoria** | `categorias` | Define os tipos. O `campos_config` dita o que aparece na Ficha Técnica. |
| **LogAuditoria** | `logs_auditoria` | Histórico de ações. Usa o campo `identificador` para o patrimônio. |
| **HistoricoLeitura**| `historico_leituras` | Dados temporais de contadores de página e níveis de suprimento. |

---

## 2. 🛣️ Mapa de Rotas (API / Backend)
*Localização: `backend/app/api/inventario.py`*

* **Listagem Geral:** `GET /api/inventario/`
* **Ficha Técnica (RG):** `GET /api/inventario/id/{id}` 
    * *Nota:* Usa o ID numérico para evitar erro 405 com as barras (`/`) do patrimônio.
* **Edição Cadastral:** `PUT /api/inventario/ficha/editar/id/{id}`
* **Comandos SNMP:** `POST /api/inventario/agente/comando/enviar`

---

## 3. 🧩 Componentes do Frontend
*Localização: `frontend/src/components/Cadastro/`*

* **`ModaisOperacao.jsx`**: O "Coração" das ações. Gerencia o Modal de Ficha (RG), Status, Transferência e Exclusão.
* **`ModaisEdicao.jsx`**: O formulário de edição (Individual e Massa).
* **`CardNexus.jsx`**: A linha da impressora na Central. Controla os gráficos de faturamento (Recharts).

---

## 4. 🔄 Fluxo da Telemetria (Sentinel)

Caminho que o dado percorre até a tela:
1.  **Coleta:** Agente Sentinel envia via SNMP (ex: chave `ip`).
2.  **Gravação:** Backend salva no JSON `dados_dinamicos`.
3.  **Tratamento:** O Frontend roda a função `normalizarDinamicosParaModais` (em `helpers.js` ou no `index.jsx`).
    * *Ação:* Converte `ip` (minúsculo) para `IP` (maiúsculo) para o Modal conseguir exibir.

---

## 🛠️ Guia de Manutenção Rápida

### 🔴 O "Hardware" sumiu da Ficha Técnica?
1.  **Verifique a Tipagem:** O `categoria_id` deve ser passado como `Number()`. Se for String, o componente não cruza os dados.
2.  **Verifique a Configuração:** Vá em Configurações > Categorias e veja se os campos (IP, Toner, etc) estão marcados para exibição.

### 🔴 Erro 405 ou 404 ao abrir/salvar?
* **Causa:** Você provavelmente tentou passar o patrimônio com barra na URL.
* **Solução:** Sempre use a rota que termina em `/id/{id_numerico}`.

### 🔍 Como debugar pelo navegador (F12)?
No Console, procure pelo log dos dados recebidos. O objeto **precisa** ter a chave `dados_dinamicos`. Se o nome estiver como `specs`, o modal de Ficha ficará em branco.