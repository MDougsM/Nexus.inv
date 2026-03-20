import sqlite3

def criar_tabela_relatorios():
    conn = sqlite3.connect('nexus.db')
    cursor = conn.cursor()
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS relatorios_gerados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_relatorio VARCHAR(255),
            data_emissao DATETIME,
            caminho_arquivo VARCHAR(500),
            tamanho_kb REAL
        )
        """)
        print("✅ Tabela 'relatorios_gerados' criada com sucesso no banco de dados!")
    except Exception as e:
        print(f"⚠️ Erro: {e}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    criar_tabela_relatorios()