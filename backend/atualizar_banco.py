import sqlite3

def atualizar_banco():
    print("Iniciando atualização do banco de dados (SQLite)...")
    
    # Conecta ao arquivo do banco
    conn = sqlite3.connect('nexus.db')
    cursor = conn.cursor()

    try:
        # Tenta adicionar a coluna dia_inicio_ciclo
        print("Adicionando coluna 'dia_inicio_ciclo'...")
        cursor.execute("ALTER TABLE agendamentos_relatorio ADD COLUMN dia_inicio_ciclo INTEGER DEFAULT 1;")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("A coluna 'dia_inicio_ciclo' já existe, pulando...")
        else:
            print(f"Erro inesperado: {e}")

    try:
        # Tenta adicionar a coluna dia_fim_ciclo
        print("Adicionando coluna 'dia_fim_ciclo'...")
        cursor.execute("ALTER TABLE agendamentos_relatorio ADD COLUMN dia_fim_ciclo INTEGER DEFAULT 30;")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("A coluna 'dia_fim_ciclo' já existe, pulando...")
        else:
            print(f"Erro inesperado: {e}")

    # Salva e fecha
    conn.commit()
    conn.close()
    print("Atualização concluída com sucesso! Pode iniciar o servidor.")

if __name__ == "__main__":
    atualizar_banco()