#!/usr/bin/env python
import sqlite3

# Verificar o master database
print("Verificando código de acesso correto:\n")
try:
    conn = sqlite3.connect('backend/data/nexus_master.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, codigo_acesso, db_nome FROM empresas")
    rows = cursor.fetchall()
    
    print("Empresas cadastradas:")
    for row in rows:
        print(f"  - Código: {row[1]}, DB: {row[2]}")
    
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
