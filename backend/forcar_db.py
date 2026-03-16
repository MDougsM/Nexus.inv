import sqlite3
import os

# Acha o caminho do banco de dados na mesma pasta do script
db_path = os.path.join(os.path.dirname(__file__), "nexus.db")

if not os.path.exists(db_path):
    print(f"❌ ERRO: Banco de dados não encontrado em {db_path}!")
    # Tenta achar no diretório atual caso esteja rodando pelo docker raiz
    db_path = "nexus.db"

print(f"🔧 Iniciando vacina no banco: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def adicionar_coluna(tabela, coluna, tipo):
    try:
        cursor.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo};")
        print(f"✅ Coluna '{coluna}' adicionada na tabela '{tabela}'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "já existe" in str(e).lower():
            print(f"⚠️  Aviso: A coluna '{coluna}' já existe na tabela '{tabela}'. (Tudo certo!)")
        else:
            print(f"❌ Erro SQL ao adicionar '{coluna}': {e}")
    except Exception as e:
        print(f"❌ Erro genérico ao adicionar '{coluna}': {e}")

# --- LISTA DE VACINAS ---
# Adiciona as colunas novas que o sistema está pedindo
adicionar_coluna("ativos", "uuid_persistente", "TEXT")
adicionar_coluna("ativos", "ultima_comunicacao", "TEXT")
adicionar_coluna("usuarios", "nome_exibicao", "TEXT")
adicionar_coluna("usuarios", "avatar", "TEXT DEFAULT 'letras'")

conn.commit()
conn.close()
print("🎉 BANCO DE DADOS ATUALIZADO! Nenhuma máquina foi perdida.")