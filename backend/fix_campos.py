import sqlite3
import glob
import json

print("Iniciando atualização das Categorias (Serial e MAC)...")

bancos = glob.glob("*.db")
if not bancos:
    print("❌ Arquivo .db não encontrado.")
    exit()

conn = sqlite3.connect(bancos[0])
cursor = conn.cursor()

# Puxa apenas as categorias que precisam dessa informação
cursor.execute("SELECT id, nome, campos_config FROM categorias WHERE nome IN ('Desktop', 'Notebook')")
categorias = cursor.fetchall()

for cat in categorias:
    cat_id, nome, campos_str = cat
    try:
        campos = json.loads(campos_str)
    except:
        campos = []
        
    # Injeta os campos novos na lista se eles ainda não estiverem lá
    if "Número de Série" not in campos:
        campos.append("Número de Série")
    if "Endereço MAC" not in campos:
        campos.append("Endereço MAC")
        
    # Empacota de volta e salva no banco
    novo_campos_str = json.dumps(campos, ensure_ascii=False)
    cursor.execute("UPDATE categorias SET campos_config = ? WHERE id = ?", (novo_campos_str, cat_id))
    print(f"✅ Categoria '{nome}' atualizada com sucesso!")

conn.commit()
conn.close()
print("🚀 Pronto! Pode dar um F5 no seu navegador e abrir a ficha da máquina.")