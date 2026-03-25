import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()
# Tenta pegar o banco de prod, se não achar pega o de dev
caminho_db = os.getenv("DATABASE_URL", "sqlite:///./nexus.db").replace("sqlite:///", "")

print(f"Limpando tabela no banco: {caminho_db}")
try:
    conn = sqlite3.connect(caminho_db)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS comandos_agente;")
    conn.commit()
    conn.close()
    print("✅ Tabela de comandos apagada com sucesso! O sistema vai recriar a nova agora.")
except Exception as e:
    print(f"❌ Erro: {e}")