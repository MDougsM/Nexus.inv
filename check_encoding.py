#!/usr/bin/env python
import sqlite3

# Verificar o banco para possíveis problemas de caracteres especiais
print("Procurando problemas de codificação ou caracteres especiais:\n")
try:
    conn = sqlite3.connect('backend/data/tenants/empresa_newpc.db')
    cursor = conn.cursor()
    
    # Máquinas que começam com 00
    print("🔍 Máquinas começando com '00':")
    cursor.execute("SELECT id, patrimonio, modelo, marca FROM ativos WHERE patrimonio LIKE '00%' ORDER BY patrimonio LIMIT 10")
    rows = cursor.fetchall()
    for row in rows:
        # Verificar se há caracteres especiais
        patrimonio = row[1]
        print(f"  ID:{row[0]:4d} | Patrimonio: [{patrimonio}] (len={len(patrimonio)}, bytes={patrimonio.encode('utf-8')})")
    
    print("\n🔍 Máquinas com '131':")
    cursor.execute("SELECT id, patrimonio FROM ativos WHERE patrimonio LIKE '%131%'")
    rows = cursor.fetchall()
    for row in rows:
        patrimonio = row[1]
        print(f"  ID:{row[0]:4d} | [{patrimonio}] (len={len(patrimonio)})")
    
    # Verificar se 00131 tem alguma coisa especial
    print("\n🔍 Verificação detalhada de 00131:")
    cursor.execute("SELECT * FROM ativos WHERE patrimonio = ?", ('00131',))
    row = cursor.fetchone()
    if row:
        print(f"  Encontrado! ID={row[0]}")
        print(f"  Patrimônio: '{row[1]}'")
        print(f"  Deletado: {row[2]}")
        print(f"  Status: {row[3]}")
    else:
        print("  Não encontrado com match exato")
    
    # Procurar com left() para ver se tem espaços
    print("\n🔍 Procurando por trim:")
    cursor.execute("SELECT id, patrimonio, length(patrimonio) FROM ativos WHERE patrimonio = '  00131  ' OR patrimonio = ' 00131' OR patrimonio = '00131 '")
    rows = cursor.fetchall()
    for row in rows:
        print(f"  Encontrado: [{row[1]}] length={row[2]}")
    
    if not rows:
        print("  Nenhum match com espaços")
    
    conn.close()
except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()
