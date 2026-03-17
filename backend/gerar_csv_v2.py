import sqlite3
import csv
import json
import os

# Nome EXATO do arquivo que você enviou
DB_PATH = 'NEXUS_Backup_2026-03-16.db' 

def exportar_dados_blindado():
    if not os.path.exists(DB_PATH):
        print(f"❌ ERRO TÁTICO: Arquivo {DB_PATH} não encontrado na pasta.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🚀 Iniciando extração blindada (Versão 2.0)...")

    # ==========================================
    # 1. EXPORTANDO LOCAIS & SETORES
    # ==========================================
    print("⏳ Gerando 1_Locais_Setores.csv...")
    try:
        # Tenta com a coluna 'local'
        cursor.execute("SELECT DISTINCT secretaria, local, setor FROM ativos WHERE secretaria IS NOT NULL")
    except sqlite3.OperationalError:
        # Se a coluna local não existir nesse backup antigo, usa vazio
        cursor.execute("SELECT DISTINCT secretaria, '' as local, setor FROM ativos WHERE secretaria IS NOT NULL")
        
    locais = cursor.fetchall()
    
    with open('1_Locais_Setores.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(['Secretaria', 'Local', 'Setor'])
        writer.writerows(locais)

    # ==========================================
    # 2. EXPORTANDO CATEGORIAS (COM INJEÇÃO DE TELEMETRIA)
    # ==========================================
    print("⏳ Gerando 2_Categorias.csv (Forçando campos do Sentinel)...")
    cursor.execute("SELECT nome, campos_config FROM categorias")
    categorias_antigas = cursor.fetchall()
    
    categorias_prontas = []
    tem_multifuncional = False
    
    # O DNA exato que o Sentinel precisa para funcionar
    campos_telemetria = json.dumps(["ip", "toner", "cilindro", "paginas_totais", "alerta_critico", "serial"], ensure_ascii=False)

    for nome, campos in categorias_antigas:
        nome_str = str(nome).strip()
        if nome_str.lower() in ['multifuncional', 'impressora']:
            # Se achar a impressora, injeta os campos novos por cima dos velhos!
            categorias_prontas.append([nome_str, campos_telemetria])
            if nome_str.lower() == 'multifuncional':
                tem_multifuncional = True
        else:
            # Outras categorias passam direto
            categorias_prontas.append([nome_str, campos or "[]"])
            
    # Se por acaso não existir "Multifuncional", ele cria do zero.
    if not tem_multifuncional:
        categorias_prontas.append(['Multifuncional', campos_telemetria])

    with open('2_Categorias.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writerow(['Nome', 'Campos'])
        writer.writerows(categorias_prontas)

    # ==========================================
    # 3. EXPORTANDO INVENTÁRIO (MÁQUINAS)
    # ==========================================
    print("⏳ Gerando 3_Inventario_Geral.csv...")
    try:
        cursor.execute("""
            SELECT a.patrimonio, c.nome, a.marca, a.modelo, a.secretaria, a.local, a.setor, a.status, a.dados_dinamicos, a.uuid_persistente, a.nome_personalizado
            FROM ativos a
            LEFT JOIN categorias c ON a.categoria_id = c.id
        """)
    except sqlite3.OperationalError:
         cursor.execute("""
            SELECT a.patrimonio, c.nome, a.marca, a.modelo, a.secretaria, '' as local, a.setor, a.status, a.dados_dinamicos, a.uuid_persistente, '' as nome_personalizado
            FROM ativos a
            LEFT JOIN categorias c ON a.categoria_id = c.id
        """)       
        
    ativos = cursor.fetchall()
    
    with open('3_Inventario_Geral.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f, delimiter=';')
        writer.writerow(['Patrimonio', 'Categoria', 'Marca', 'Modelo', 'Secretaria', 'Local', 'Setor', 'Status', 'IP', 'Serial', 'Nome_Personalizado'])
        
        for ativo in ativos:
            patrimonio, categoria, marca, modelo, secretaria, local, setor, status, dados_dinamicos, uuid_persistente, nome_personalizado = ativo
            
            ip = ""
            serial = uuid_persistente or "" 
            
            if dados_dinamicos:
                try:
                    dados = json.loads(dados_dinamicos)
                    if 'ip' in dados: ip = dados['ip']
                    if 'serial' in dados: serial = dados['serial']
                except:
                    pass
                    
            writer.writerow([patrimonio, categoria, marca, modelo, secretaria, local, setor, status, ip, serial, nome_personalizado])

    conn.close()
    print("\n✅ SUCESSO ABSOLUTO! Os 3 arquivos CSV foram forjados com a estrutura v5.0.")

if __name__ == '__main__':
    exportar_dados_blindado()