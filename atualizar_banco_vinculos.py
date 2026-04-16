import sqlite3
import os

def instalar_modulo_vinculos():
    diretorio_raiz = os.path.abspath(os.path.dirname(__file__))
    bancos_encontrados = []
    
    print("🔍 Vasculhando o projeto em busca de bancos de dados...")
    
    # Faz uma varredura profunda em todas as pastas (ignorando pastas inúteis para ser rápido)
    for root, dirs, files in os.walk(diretorio_raiz):
        if 'node_modules' in root or '.git' in root or '__pycache__' in root:
            continue
        for file in files:
            if file.endswith(".db"):
                bancos_encontrados.append(os.path.join(root, file))
                
    if not bancos_encontrados:
        print("❌ Nenhum arquivo '.db' (banco de dados) foi encontrado no seu projeto!")
        return
        
    print(f"🎯 Encontrado(s) {len(bancos_encontrados)} banco(s) de dados. Iniciando atualização...\n")
    
    for db_path in bancos_encontrados:
        print(f"🔧 Atualizando: {db_path}")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Cria a tabela de Vínculos N:N (Muitos para Muitos)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ativo_vinculos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patrimonio_pai TEXT NOT NULL,
                    patrimonio_filho TEXT NOT NULL,
                    tipo_relacao TEXT DEFAULT 'VINCULADO',
                    data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
            conn.close()
            print("   ✅ Tabela 'ativo_vinculos' pronta!")
        except Exception as e:
            print(f"   ❌ Erro ao atualizar este banco: {e}")

    print("\n🚀 Operação concluída! O motor de Topologia/CMDB já está rodando no banco.")

if __name__ == '__main__':
    instalar_modulo_vinculos()