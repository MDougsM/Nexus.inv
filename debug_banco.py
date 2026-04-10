#!/usr/bin/env python
import sqlite3

db_path = 'backend/data/tenants/empresa_newpc.db'
print(f'Analisando: {db_path}\n')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Listar todas as tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f'📋 Tabelas existentes: {[t[0] for t in tables]}\n')
    
    # Procurar por 14240 (que funciona)
    print('🔍 Buscando máquina 14240 (que funciona):')
    cursor.execute("SELECT id, patrimonio, deletado, nome_personalizado, status FROM ativos WHERE patrimonio = ?", ('14240',))
    result = cursor.fetchone()
    if result:
        print(f'  ✅ Encontrada!')
        print(f'     ID: {result[0]}')
        print(f'     Patrimônio: {result[1]}')
        print(f'     Deletado: {result[2]}')
        print(f'     Nome: {result[3]}')
        print(f'     Status: {result[4]}')
    else:
        print(f'  ❌ Não encontrada')
    
    # Procurar por 00131 (que não funciona)
    print('\n🔍 Buscando máquina 00131 (que NÃO funciona):')
    cursor.execute("SELECT id, patrimonio, deletado, nome_personalizado, status FROM ativos WHERE patrimonio = ?", ('00131',))
    result = cursor.fetchone()
    if result:
        print(f'  ✅ Encontrada!')
        print(f'     ID: {result[0]}')
        print(f'     Patrimônio: {result[1]}')
        print(f'     Deletado: {result[2]}')
        print(f'     Nome: {result[3]}')
        print(f'     Status: {result[4]}')
    else:
        print(f'  ❌ Não encontrada')
        print(f'  Procurando variações...')
        
        # Procurar com like
        cursor.execute("SELECT id, patrimonio, deletado FROM ativos WHERE patrimonio LIKE ?", ('%131%',))
        results = cursor.fetchall()
        if results:
            print(f'  Encontrados {len(results)} registros com "131":')
            for r in results[:10]:
                print(f'    - [{r[1]}] Deletado: {r[2]}')
        else:
            print(f'  Nenhuma máquina encontrada contendo "131"')
    
    # Contar total de máquinas
    print('\n📊 Estatísticas:')
    cursor.execute("SELECT COUNT(*) FROM ativos")
    total = cursor.fetchone()[0]
    print(f'  Total de ativos: {total}')
    
    cursor.execute("SELECT COUNT(*) FROM ativos WHERE deletado = 0")
    ativos = cursor.fetchone()[0]
    print(f'  Ativos (não deletados): {ativos}')
    
    cursor.execute("SELECT COUNT(*) FROM ativos WHERE deletado = 1")
    deletados = cursor.fetchone()[0]
    print(f'  Deletados: {deletados}')
    
    # Listar primeiras máquinas com 00 ou 14
    print('\n📌 Máquinas começando com dígitos similares:')
    cursor.execute("SELECT id, patrimonio, deletado FROM ativos WHERE patrimonio LIKE '00%' OR patrimonio LIKE '14%' ORDER BY patrimonio LIMIT 20")
    results = cursor.fetchall()
    for r in results:
        status = '🗑️ DELETADA' if r[2] else '✅ ATIVA'
        print(f'  {status} - [{r[1]}]')
    
    conn.close()
    
except Exception as e:
    print(f'❌ Erro: {e}')
    import traceback
    traceback.print_exc()
