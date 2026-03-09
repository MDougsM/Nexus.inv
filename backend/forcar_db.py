import sqlite3
import os

# Caminho absoluto para garantir que ele ache o banco que está na pasta backend
db_path = os.path.join(os.path.dirname(__file__), "nexus.db")

if not os.path.exists(db_path):
    print(f"❌ ERRO: Banco de dados não encontrado em {db_path}!")
    exit()

print(f"🔧 Banco de dados encontrado: {db_path}")
conn = sqlite3.connect(db_path) 
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE usuarios ADD COLUMN nome_exibicao TEXT;")
    print("✅ Coluna 'nome_exibicao' criada com sucesso!")
except Exception as e:
    print("⚠️ Aviso (já existe): nome_exibicao")

try:
    cursor.execute("ALTER TABLE usuarios ADD COLUMN avatar TEXT DEFAULT 'letras';")
    print("✅ Coluna 'avatar' criada com sucesso!")
except Exception as e:
    print("⚠️ Aviso (já existe): avatar")

conn.commit()
conn.close()
print("🎉 FINALIZADO! Pode ligar o servidor.")