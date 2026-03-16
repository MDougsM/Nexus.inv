import sqlite3

# ATENÇÃO: Verifique se o caminho do seu banco de dados está correto aqui.
# Se o arquivo nexus.db estiver dentro da pasta backend, mude para "backend/nexus.db"
conn = sqlite3.connect("backend/nexus.db") 
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE usuarios ADD COLUMN nome_exibicao TEXT;")
    cursor.execute("ALTER TABLE usuarios ADD COLUMN avatar TEXT DEFAULT 'letras';")
    print("✅ Banco atualizado com sucesso! As colunas foram criadas.")
except Exception as e:
    print("⚠️ Atenção:", e)

conn.commit()
conn.close()