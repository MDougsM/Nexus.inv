from sqlalchemy import text
from app.db.database import engine

def atualizar_tabela_usuarios():
    print("⏳ Iniciando atualização do banco de dados...")
    
    with engine.connect() as conn:
        try:
            # Tenta adicionar a coluna. Funciona perfeitamente em SQLite e PostgreSQL.
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN email VARCHAR;"))
            
            # Como acabamos de criar a coluna, vamos criar um índice para buscas rápidas
            try:
                conn.execute(text("CREATE UNIQUE INDEX ix_usuarios_email ON usuarios (email);"))
            except:
                pass # Ignora se o índice falhar (alguns bancos geram automático)
                
            conn.commit()
            print("✅ SUCESSO: Coluna 'email' adicionada com sucesso na tabela 'usuarios'!")
        except Exception as e:
            erro = str(e).lower()
            if "duplicate column name" in erro or "already exists" in erro or "duplicada" in erro:
                print("⚠️ AVISO: A coluna 'email' já existe. Nenhuma alteração foi feita.")
            else:
                print(f"❌ ERRO CRÍTICO ao atualizar: {e}")

if __name__ == "__main__":
    atualizar_tabela_usuarios()