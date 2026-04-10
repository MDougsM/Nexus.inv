import os
import sqlite3

# Forçando o caminho absoluto manualmente para não ter erro
TENANTS_DB_DIR = r"C:\NexusInv\backend\data\tenants"

def migrar_bancos():
    print(f"🚀 Alvo: {TENANTS_DB_DIR}")
    
    if not os.path.exists(TENANTS_DB_DIR):
        print("❌ A pasta ainda não foi encontrada pelo Python.")
        print(f"Pasta atual de execução: {os.getcwd()}")
        # Lista o que tem na pasta atual para ajudar no diagnóstico
        print(f"Conteúdo da pasta atual: {os.listdir('.')}")
        return

    arquivos = [f for f in os.listdir(TENANTS_DB_DIR) if f.endswith('.db')]
    
    if not arquivos:
        print(f"⚠️ Pasta encontrada, mas está vazia ou sem arquivos .db")
        return

    for arquivo in arquivos:
        caminho_db = os.path.join(TENANTS_DB_DIR, arquivo)
        print(f"🔨 Processando: {arquivo}...")
        
        try:
            conn = sqlite3.connect(caminho_db)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(ativos)")
            colunas = [col[1] for col in cursor.fetchall()]
            
            if 'deletado' not in colunas:
                cursor.execute("ALTER TABLE ativos ADD COLUMN deletado BOOLEAN DEFAULT 0")
                conn.commit()
                print(f"✅ Coluna 'deletado' adicionada com sucesso!")
            else:
                print(f"ℹ️ A coluna já existe.")
            conn.close()
        except Exception as e:
            print(f"❌ Erro em {arquivo}: {e}")

    print("\n✨ Missão cumprida!")

if __name__ == "__main__":
    migrar_bancos()