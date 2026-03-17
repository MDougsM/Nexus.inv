from app.db.database import engine
from app.models import Base, ComandoAgente

print("🔄 Conectando ao banco de dados...")

# O create_all é inteligente: ele só cria as tabelas que não existem ainda
Base.metadata.create_all(bind=engine)

print("✅ Tabela 'comandos_agente' validada/criada com sucesso!")
print("🚀 O banco de dados está pronto para a fila de comandos Web.")