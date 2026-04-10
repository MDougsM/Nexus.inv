import os
import sqlite3

# Caminho absoluto para a pasta dos bancos dos clientes (mesmo do script anterior)
TENANTS_DB_DIR = r"C:\NexusInv\backend\data\tenants"

def migrar_hierarquia():
    print(f"🚀 Iniciando migração para Arquitetura Governamental em: {TENANTS_DB_DIR}")

    if not os.path.exists(TENANTS_DB_DIR):
        print(f"❌ Pasta {TENANTS_DB_DIR} não encontrada.")
        return

    arquivos = [f for f in os.listdir(TENANTS_DB_DIR) if f.endswith('.db')]

    if not arquivos:
        print("⚠️ Nenhum arquivo .db encontrado.")
        return

    for arquivo in arquivos:
        caminho_db = os.path.join(TENANTS_DB_DIR, arquivo)
        print(f"\n🔨 Processando: {arquivo}...")

        try:
            conn = sqlite3.connect(caminho_db)
            cursor = conn.cursor()

            # 1. CRIAR A NOVA TABELA HIERÁRQUICA (Se não existir)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS unidades_administrativas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR,
                tipo VARCHAR,
                pai_id INTEGER,
                planta_imagem VARCHAR,
                coordenadas_json JSON,
                FOREIGN KEY(pai_id) REFERENCES unidades_administrativas(id)
            )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_unid_nome ON unidades_administrativas(nome)")
            print("   [+] Tabela de Unidades garantida.")

            # 2. INJETAR NOVAS COLUNAS NA TABELA ATIVOS
            cursor.execute("PRAGMA table_info(ativos)")
            colunas_existentes = [col[1] for col in cursor.fetchall()]

            novas_colunas = {
                "unidade_id": "INTEGER",
                "numero_licitacao": "VARCHAR",
                "data_vencimento_garantia": "DATETIME",
                "responsavel_atual": "VARCHAR",
                "termo_responsabilidade_url": "VARCHAR"
            }

            for col, tipo in novas_colunas.items():
                if col not in colunas_existentes:
                    cursor.execute(f"ALTER TABLE ativos ADD COLUMN {col} {tipo}")
                    print(f"   [+] Coluna Governamental '{col}' adicionada.")

            conn.commit()

            # 3. MIGRAÇÃO DE DADOS (Transformar Texto em Árvore)
            cursor.execute("SELECT id, secretaria, setor FROM ativos")
            ativos = cursor.fetchall()

            unidades_map = {} # Cache em memória para não duplicar dados

            for ativo_id, sec_nome, set_nome in ativos:
                if not sec_nome or sec_nome.strip() == "N/A":
                    continue # Se não tem secretaria, não tem hierarquia para montar

                sec_nome = sec_nome.strip().upper()
                sec_key = f"SEC|{sec_nome}"

                # a) Cria/Busca a Secretaria (Raiz)
                if sec_key not in unidades_map:
                    cursor.execute("SELECT id FROM unidades_administrativas WHERE nome = ? AND pai_id IS NULL", (sec_nome,))
                    row = cursor.fetchone()
                    if row:
                        unidades_map[sec_key] = row[0]
                    else:
                        cursor.execute("INSERT INTO unidades_administrativas (nome, tipo, pai_id) VALUES (?, ?, ?)", (sec_nome, "SECRETARIA", None))
                        unidades_map[sec_key] = cursor.lastrowid

                sec_id = unidades_map[sec_key]
                unidade_alvo_id = sec_id

                # b) Cria/Busca o Setor (Filho) apontando para a Secretaria
                if set_nome and set_nome.strip() != "N/A":
                    set_nome = set_nome.strip().upper()
                    set_key = f"SET|{sec_id}|{set_nome}"
                    
                    if set_key not in unidades_map:
                        cursor.execute("SELECT id FROM unidades_administrativas WHERE nome = ? AND pai_id = ?", (set_nome, sec_id))
                        row = cursor.fetchone()
                        if row:
                            unidades_map[set_key] = row[0]
                        else:
                            cursor.execute("INSERT INTO unidades_administrativas (nome, tipo, pai_id) VALUES (?, ?, ?)", (set_nome, "SETOR", sec_id))
                            unidades_map[set_key] = cursor.lastrowid
                    
                    unidade_alvo_id = unidades_map[set_key]

                # c) Conecta o Computador à folha final da árvore
                cursor.execute("UPDATE ativos SET unidade_id = ? WHERE id = ?", (unidade_alvo_id, ativo_id))

            conn.commit()
            print(f"✅ Migração concluída com sucesso em {arquivo}!")
            conn.close()

        except Exception as e:
            print(f"❌ Erro ao atualizar {arquivo}: {e}")

    print("\n✨ Missão cumprida! Todos os bancos estão preparados para a Prefeitura.")

if __name__ == "__main__":
    migrar_hierarquia()