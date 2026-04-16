import sqlite3
import os

def instalar_dicionario():
    bancos_encontrados = []
    for root, dirs, files in os.walk(os.path.abspath(os.path.dirname(__file__))):
        if 'node_modules' in root or '.git' in root or '__pycache__' in root: continue
        for file in files:
            if file.endswith(".db"): bancos_encontrados.append(os.path.join(root, file))
                
    for db_path in bancos_encontrados:
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS dicionario_propriedades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL UNIQUE,
                    descricao TEXT
                )
            ''')
            conn.commit()
            conn.close()
            print(f"✅ Tabela dicionario_propriedades adicionada em {db_path}")
        except: pass

if __name__ == '__main__':
    instalar_dicionario()