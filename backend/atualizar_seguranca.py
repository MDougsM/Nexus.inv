from sqlalchemy import text
from app.db.database import engine

def injetar_coluna_seguranca():
    print("⏳ Injetando a coluna de segurança C2 (chave_publica_c2) na tabela usuarios...")
    try:
        # Usamos o engine direto para executar comandos estruturais (DDL)
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN chave_publica_c2 TEXT;"))
            conn.commit()
            
        print("✅ SUCESSO: Coluna 'chave_publica_c2' adicionada perfeitamente!")
        
    except Exception as e:
        # Se der erro dizendo que a coluna já existe, a gente ignora e avisa que tá tudo bem
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("👍 Tudo certo! A coluna 'chave_publica_c2' já existe no banco.")
        else:
            print(f"❌ ERRO: {e}")

if __name__ == "__main__":
    injetar_coluna_seguranca()