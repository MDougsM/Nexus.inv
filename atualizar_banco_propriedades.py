import sqlite3
import os

def atualizar_banco():
    bancos_encontrados = []
    for root, dirs, files in os.walk(os.path.abspath(os.path.dirname(__file__))):
        if 'node_modules' in root or '.git' in root or '__pycache__' in root: continue
        for file in files:
            if file.endswith(".db"): bancos_encontrados.append(os.path.join(root, file))
                
    for db_path in bancos_encontrados:
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 1. Cria a tabela dicionario (como já estava)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS dicionario_propriedades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL UNIQUE,
                    descricao TEXT
                )
            ''')
            
            # 2. Tenta adicionar a coluna de última atualização na tabela de ativos
            try:
                cursor.execute("ALTER TABLE ativos ADD COLUMN ultima_atualizacao DATETIME;")
                # Se acabou de criar a coluna, preenche as máquinas antigas com a data de hoje para não dar erro
                cursor.execute("UPDATE ativos SET ultima_atualizacao = CURRENT_TIMESTAMP WHERE ultima_atualizacao IS NULL;")
            except sqlite3.OperationalError:
                pass # A coluna já existe, ignora e segue
                
            conn.commit()
            conn.close()
            print(f"✅ Banco atualizado com sucesso em {db_path}")
        except Exception as e: 
            print(f"❌ Erro ao atualizar {db_path}: {e}")

if __name__ == '__main__':
    atualizar_banco()