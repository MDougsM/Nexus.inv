import psycopg2

DB_CONFIG = {
    "dbname": "empresa_newpc",
    "user": "nexus",
    "password": "Nexus@Deus2026",
    "host": "db",
    "port": "5432"
}

def corrigir_unidades():
    print("🚀 Ajustando estrutura hierárquica (Prefeitura -> Secretaria -> Setor)...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Garante que a coluna pai_id exista
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS unidades_administrativas (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(50),
                pai_id INTEGER REFERENCES unidades_administrativas(id) ON DELETE CASCADE,
                planta_imagem TEXT,
                coordenadas_json JSONB
            );
        """)

        # 🛠️ A VACINA: Sincroniza o contador de IDs para evitar o erro de duplicidade!
        cursor.execute("SELECT MAX(id) FROM unidades_administrativas;")
        resultado = cursor.fetchone()
        max_id = resultado[0] if resultado[0] else 0
        if max_id > 0:
            cursor.execute(f"SELECT setval(pg_get_serial_sequence('unidades_administrativas', 'id'), {max_id});")
            conn.commit()
            print(f"🔧 Contador de IDs consertado e ajustado para {max_id}!")

        # Verifica se já existe uma PREFEITURA
        cursor.execute("SELECT id FROM unidades_administrativas WHERE tipo = 'PREFEITURA' LIMIT 1;")
        prefeitura = cursor.fetchone()
        
        if not prefeitura:
            cursor.execute("""
                INSERT INTO unidades_administrativas (nome, tipo, pai_id) 
                VALUES ('PREFEITURA MUNICIPAL', 'PREFEITURA', NULL);
            """)
            print("✅ Unidade Mestra (Prefeitura) criada com sucesso!")
        else:
            print("ℹ️ A unidade Prefeitura já existe no banco de dados.")

        conn.commit()
        cursor.close()
        conn.close()
        print("✨ Banco de dados preparado! Agora as ramificações vão funcionar.")

    except Exception as e:
        print(f"❌ Erro ao ajustar BD: {e}")

if __name__ == "__main__":
    corrigir_unidades()