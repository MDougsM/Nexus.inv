#!/usr/bin/env python
import sqlite3

db_path = 'backend/data/tenants/empresa_newpc.db'
print("Restaurando máquina 00131...\n")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Verificar antes
    print("✋ ANTES:")
    cursor.execute("SELECT id, patrimonio, deletado FROM ativos WHERE patrimonio = '00131'")
    result = cursor.fetchone()
    if result:
        print(f"  ID: {result[0]}, Patrimônio: {result[1]}, Deletado: {result[2]}")
    
    # Desdeleta
    print("\n⚙️ Atualizando...")
    cursor.execute("UPDATE ativos SET deletado = 0 WHERE patrimonio = '00131'")
    rows_updated = cursor.rowcount
    conn.commit()
    
    print(f"  ✅ {rows_updated} linha(s) atualizada(s)")
    
    # Verificar depois
    print("\n✅ DEPOIS:")
    cursor.execute("SELECT id, patrimonio, deletado FROM ativos WHERE patrimonio = '00131'")
    result = cursor.fetchone()
    if result:
        print(f"  ID: {result[0]}, Patrimônio: {result[1]}, Deletado: {result[2]}")
    
    conn.close()
    print("\n✅ Máquina 00131 restaurada com sucesso!")
    
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
