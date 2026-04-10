#!/usr/bin/env python
import sqlite3
conn = sqlite3.connect('backend/data/tenants/empresa_newpc.db')
cursor = conn.cursor()
cursor.execute("SELECT id, patrimonio, deletado FROM ativos WHERE patrimonio IN ('00131', '14240') ORDER BY patrimonio")
rows = cursor.fetchall()
print("Status atual das máquinas:")
for row in rows:
    status = "✅ ATIVA" if row[2] == 0 else "🗑️ DELETADA"
    print(f"  {status} | Patrimônio: {row[1]} | ID: {row[0]}")
conn.close()
