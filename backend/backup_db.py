import os
import shutil
import glob
from datetime import datetime

# 1. Configuração de Caminhos
# Pega a pasta atual (backend) onde o script e o banco original estão
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nexus.db")

# 👇 O CAMINHO ABSOLUTO E BLINDADO 👇
BACKUP_DIR = r"C:\Users\NewPC\Documents\BKP"

# Limite máximo de backups guardados
LIMITE_BACKUPS = 10

print(f"🛡️ Iniciando rotina de Backup do Nexus para: {BACKUP_DIR}")

# 2. Verifica se o banco existe e cria a pasta BKP nos Documentos se não existir
if not os.path.exists(DB_PATH):
    print(f"❌ ERRO: Banco de dados original não encontrado em {DB_PATH}")
    exit()

os.makedirs(BACKUP_DIR, exist_ok=True)

# 3. Cria a cópia com a data e hora atual
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
backup_name = f"nexus_backup_{timestamp}.db"
backup_path = os.path.join(BACKUP_DIR, backup_name)

try:
    shutil.copy2(DB_PATH, backup_path)
    print(f"✅ Backup realizado com sucesso: {backup_name}")
except Exception as e:
    print(f"❌ Erro ao copiar o banco: {e}")
    exit()

# 4. Rotatividade (Mantém apenas os últimos 10)
# Lista todos os arquivos de backup e ordena do mais antigo para o mais novo
backups = glob.glob(os.path.join(BACKUP_DIR, "nexus_backup_*.db"))
backups.sort(key=os.path.getmtime)

# Se tiver mais de 10, vai deletando o [0] (mais antigo) até sobrar 10
while len(backups) > LIMITE_BACKUPS:
    backup_antigo = backups.pop(0)
    try:
        os.remove(backup_antigo)
        print(f"🗑️ Limpeza: Backup antigo removido -> {os.path.basename(backup_antigo)}")
    except Exception as e:
        print(f"⚠️ Erro ao remover backup antigo {backup_antigo}: {e}")

print("🎉 Processo finalizado e base protegida!")