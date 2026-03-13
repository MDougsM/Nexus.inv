import sqlite3

# Nome do seu arquivo de banco de dados (se for diferente, ajuste aqui)
NOME_DO_BANCO = "nexus.db" 

try:
    print("Iniciando cirurgia no banco de dados...")
    conexao = sqlite3.connect(NOME_DO_BANCO)
    cursor = conexao.cursor()
    
    # Injeta a nova coluna sem tocar nos dados existentes
    cursor.execute("ALTER TABLE ativos ADD COLUMN ultima_comunicacao DATETIME;")
    conexao.commit()
    
    print("✅ SUCESSO! A coluna 'ultima_comunicacao' foi adicionada!")
    print("Nenhuma máquina foi apagada. Você pode ligar o servidor agora.")

except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("⚠️ A coluna já existe! O banco já está pronto.")
    else:
        print(f"❌ Erro: {e}")
except Exception as e:
    print(f"❌ Erro inesperado: {e}")
finally:
    conexao.close()