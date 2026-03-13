import sqlite3
import os

# Caminho para o banco de dados (na mesma pasta do script)
db_path = os.path.join(os.path.dirname(__file__), "nexus.db")

if not os.path.exists(db_path):
    print(f"❌ ERRO: Banco de dados não encontrado em {db_path}!")
    exit()

print(f"🔧 Iniciando manutenção no banco: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def adicionar_coluna(tabela, coluna, tipo):
    try:
        cursor.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {tipo};")
        print(f"✅ Coluna '{coluna}' adicionada na tabela '{tabela}'.")
    except sqlite3.OperationalError:
        print(f"⚠️  Aviso: A coluna '{coluna}' já existe na tabela '{tabela}'.")
    except Exception as e:
        print(f"❌ Erro ao adicionar '{coluna}': {e}")

# --- LISTA DE ATUALIZAÇÕES ---

# 1. Novas colunas para Usuários (do seu script antigo)
adicionar_coluna("usuarios", "nome_exibicao", "TEXT")
adicionar_coluna("usuarios", "avatar", "TEXT DEFAULT 'letras'")

# 2. A "VACINA" DO AGENTE (UUID Persistente)
# Adiciona a coluna na tabela 'ativos' para o reconhecimento por DNA
adicionar_coluna("ativos", "uuid_persistente", "TEXT")

# -----------------------------

conn.commit()
conn.close()
print("\n🎉 BANCO DE DADOS ATUALIZADO! Pode subir o Docker agora.")