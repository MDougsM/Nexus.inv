import sqlite3
import pandas as pd
from sqlalchemy import create_engine, text
import urllib.parse
import os

# CONFIGURAÇÃO
senha_db = urllib.parse.quote_plus("Nexus@Deus2026")
PG_PORT = "5433" 
nome_db = "empresa_newpc"

def migrar_ativos_na_marreta():
    print(f"🚀 INICIANDO RECUPERAÇÃO DE ATIVOS PARA: {nome_db}")
    
    sqlite_path = f"./backend/data/tenants/{nome_db}.db"
    sqlite_conn = sqlite3.connect(sqlite_path)
    pg_engine = create_engine(f"postgresql://nexus:{senha_db}@localhost:{PG_PORT}/{nome_db}")

    # 1. Pegar Ativos do SQLite
    df_ativos = pd.read_sql("SELECT * FROM ativos", sqlite_conn)
    
    # 2. Tratamento de Dados (Fix de tipos e valores nulos)
    df_ativos['deletado'] = df_ativos['deletado'].astype(bool)
    df_ativos['dominio_proprio'] = df_ativos['dominio_proprio'].astype(bool)
    df_ativos = df_ativos.replace('', None)
    
    # 3. Pegar IDs válidos de Unidades que já estão no Postgres
    with pg_engine.connect() as conn:
        result = conn.execute(text("SELECT id FROM unidades_administrativas"))
        ids_validos = [row[0] for row in result]
        
    print(f"📊 Total de ativos no SQLite: {len(df_ativos)}")
    
    # 4. Limpar o que estiver lá (garantir count 0 antes de começar)
    with pg_engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE ativos CASCADE;"))

    # 5. Inserção linha por linha para garantir que erros de ID não parem o script
    sucesso = 0
    erros = 0
    
    print("📥 Injetando máquinas no PostgreSQL...")
    for _, row in df_ativos.iterrows():
        # Se o unidade_id não existe na tabela de unidades, setamos como None
        if row['unidade_id'] not in ids_validos:
            row['unidade_id'] = None
            
        try:
            # Converte a linha de volta para um DataFrame de uma linha e envia
            pd.DataFrame([row]).to_sql('ativos', pg_engine, if_exists='append', index=False)
            sucesso += 1
        except Exception:
            erros += 1

    print(f"\n✅ MIGRADO COM SUCESSO: {sucesso}")
    print(f"⚠️ FALHAS (IDs INVÁLIDOS): {erros}")

if __name__ == "__main__":
    migrar_ativos_na_marreta()