import os
import sqlite3

# Caminho absoluto para a pasta dos bancos dos clientes
TENANTS_DB_DIR = r"C:\NexusInv\backend\data\tenants"

def migrar_banco_para_unidades():
    print(f"🚀 Iniciando migração para Unidades Administrativas em: {TENANTS_DB_DIR}")

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

            # 1. Garante que a tabela unidades_administrativas exista
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

            # 2. Garante que as colunas novas existam em ativos
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
                    print(f"   [+] Coluna '{col}' adicionada em ativos.")

            conn.commit()

            # 3. Mapear Secretarias Antigas para Unidades
            print("   [~] Migrando Secretarias...")
            cursor.execute("SELECT id, nome FROM secretarias")
            secretarias_antigas = cursor.fetchall()
            
            mapa_secretarias = {} # {id_antigo: id_novo}
            
            for sec_id, sec_nome in secretarias_antigas:
                # Verifica se já existe uma unidade raiz com este nome
                cursor.execute("SELECT id FROM unidades_administrativas WHERE nome = ? AND pai_id IS NULL", (sec_nome,))
                unidade_existente = cursor.fetchone()
                
                if unidade_existente:
                    novo_id = unidade_existente[0]
                else:
                    cursor.execute("INSERT INTO unidades_administrativas (nome, tipo) VALUES (?, 'SECRETARIA')", (sec_nome,))
                    novo_id = cursor.lastrowid
                
                mapa_secretarias[sec_id] = novo_id

            # 4. Mapear Setores Antigos para Unidades
            print("   [~] Migrando Setores...")
            try:
                cursor.execute("SELECT id, nome, secretaria_id FROM setores")
                setores_antigos = cursor.fetchall()
                
                mapa_setores = {} # {id_antigo: id_novo}
                
                for set_id, set_nome, sec_id_fk in setores_antigos:
                    # Encontra o novo ID do pai (Secretaria)
                    novo_pai_id = mapa_secretarias.get(sec_id_fk)
                    
                    if novo_pai_id:
                        # Verifica se já existe um setor filho com este nome
                        cursor.execute("SELECT id FROM unidades_administrativas WHERE nome = ? AND pai_id = ?", (set_nome, novo_pai_id))
                        unidade_existente = cursor.fetchone()
                        
                        if unidade_existente:
                            novo_id = unidade_existente[0]
                        else:
                            cursor.execute("INSERT INTO unidades_administrativas (nome, tipo, pai_id) VALUES (?, 'SETOR', ?)", (set_nome, novo_pai_id))
                            novo_id = cursor.lastrowid
                        
                        mapa_setores[set_id] = novo_id
            except sqlite3.OperationalError:
                print("   [!] Tabela 'setores' não encontrada neste banco. Pulando migração de setores.")

            # 5. Atualizar os Ativos com o novo unidade_id
            print("   [~] Atualizando vínculos nos Ativos...")
            cursor.execute("SELECT id, secretaria, setor FROM ativos")
            ativos = cursor.fetchall()
            
            ativos_atualizados = 0
            for ativo_id, sec_nome_str, setor_nome_str in ativos:
                novo_unidade_id = None
                
                # Tenta achar o ID pelo nome do setor e da secretaria correspondente
                if setor_nome_str and setor_nome_str != 'N/A' and sec_nome_str and sec_nome_str != 'N/A':
                     cursor.execute("""
                        SELECT f.id 
                        FROM unidades_administrativas f
                        JOIN unidades_administrativas p ON f.pai_id = p.id
                        WHERE f.nome = ? AND f.tipo = 'SETOR' AND p.nome = ? AND p.tipo = 'SECRETARIA'
                     """, (setor_nome_str, sec_nome_str))
                     res = cursor.fetchone()
                     if res: novo_unidade_id = res[0]
                
                # Se não achou pelo setor, tenta achar só pela secretaria raiz
                if not novo_unidade_id and sec_nome_str and sec_nome_str != 'N/A':
                     cursor.execute("SELECT id FROM unidades_administrativas WHERE nome = ? AND pai_id IS NULL", (sec_nome_str,))
                     res = cursor.fetchone()
                     if res: novo_unidade_id = res[0]
                     
                if novo_unidade_id:
                     cursor.execute("UPDATE ativos SET unidade_id = ? WHERE id = ?", (novo_unidade_id, ativo_id))
                     ativos_atualizados += 1

            conn.commit()
            print(f"   [+] {ativos_atualizados} ativos atualizados com a nova hierarquia.")
            print(f"✅ Migração concluída com sucesso em {arquivo}!")

        except Exception as e:
            print(f"❌ Erro ao atualizar {arquivo}: {e}")
        finally:
            conn.close()

    print("\n✨ Missão cumprida! Todos os bancos estão preparados para a nova estrutura.")

if __name__ == "__main__":
    migrar_banco_para_unidades()