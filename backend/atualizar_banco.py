import sqlite3
import os

# 🚀 CAMINHO ABSOLUTO E EXATO DO SEU BANCO DE DADOS
caminho_base = r"C:\NexusInv\backend\data\nexus.db"

print(f"🔄 Conectando ao banco de dados: {caminho_base}")

if not os.path.exists(caminho_base):
    print("❌ ERRO: O arquivo do banco de dados não foi encontrado nesse caminho!")
    print("Verifique se o nexus.db está mesmo dentro da pasta backend.")
    exit()

try:
    conn = sqlite3.connect(caminho_base)
    cursor = conn.cursor()

    colunas_novas = [
        ("permissoes", "TEXT DEFAULT '[]'"),
        ("termos_aceitos", "BOOLEAN DEFAULT 0"),
        ("data_aceite", "DATETIME DEFAULT NULL"),
        ("ip_aceite", "VARCHAR(50) DEFAULT NULL")
    ]

    print("🛠️ Verificando e atualizando tabela 'usuarios'...")

    for coluna, tipo in colunas_novas:
        try:
            cursor.execute(f"ALTER TABLE usuarios ADD COLUMN {coluna} {tipo};")
            print(f"  ✅ Coluna '{coluna}' injetada com sucesso!")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"  ⚠️ A coluna '{coluna}' já existe. Pulando...")
            else:
                print(f"  ❌ Erro ao adicionar '{coluna}': {e}")

    conn.commit()
    conn.close()
    print("🚀 Banco atualizado com sucesso! Vá testar a criação de usuários.")

except Exception as e:
    print(f"❌ Erro crítico ao conectar no banco: {e}")