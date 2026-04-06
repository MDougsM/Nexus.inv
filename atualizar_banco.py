import sqlite3
import os

# Pega a pasta raiz onde o script está rodando (C:\NexusInv)
DIRETORIO_RAIZ = os.path.dirname(os.path.abspath(__file__))

# Define o caminho exato: C:\NexusInv\backend\data\nexus.db
CAMINHO_DB = os.path.join(DIRETORIO_RAIZ, "backend", "data", "nexus.db")

def atualizar_banco():
    print(f"🔍 Procurando banco de dados em: {CAMINHO_DB}")
    try:
        if not os.path.exists(CAMINHO_DB):
            print(f"❌ Erro: O arquivo 'nexus.db' não foi encontrado no caminho especificado.")
            print(f"Verifique se o ficheiro está realmente em: {CAMINHO_DB}")
            return

        conn = sqlite3.connect(CAMINHO_DB)
        cursor = conn.cursor()
        
        # Tenta adicionar a coluna domínio_proprio
        # No SQLite, usamos o tipo INTEGER (0 ou 1) para Booleanos
        print("🛠️ A tentar adicionar a coluna 'dominio_proprio'...")
        cursor.execute("ALTER TABLE ativos ADD COLUMN dominio_proprio BOOLEAN DEFAULT 0;")
        conn.commit()
        
        print("✅ Sucesso! A coluna 'dominio_proprio' foi criada com sucesso.")
        
    except sqlite3.OperationalError as e:
        # Se a coluna já existir, o SQLite lançará este erro
        if "duplicate column name" in str(e).lower():
            print("⚠️ Nota: A coluna 'dominio_proprio' já existe no banco de dados. Nada a fazer.")
        else:
            print(f"❌ Erro de Operação: {e}")
    except Exception as e:
        print(f"❌ Ocorreu um erro inesperado: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    atualizar_banco()