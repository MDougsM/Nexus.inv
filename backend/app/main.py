from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, inventario, unidades, auditoria, transferencia, usuarios, manutencao, importacao
from app.db.database import engine, SessionLocal # Importado SessionLocal
from app.models import Base, Categoria, Usuario
from fastapi.responses import FileResponse

import os

# Cria as tabelas no banco de dados se não existirem
Base.metadata.create_all(bind=engine)

# 2. FUNÇÃO DE SEED (Alimentação Automática)
def create_initial_data():
    db = SessionLocal()
    try:       
        # Garante o usuário admin com a senha padrão
        user = db.query(Usuario).filter(Usuario.username == "admin").first()
        if not user:
            print("👤 Criando usuário mestre: admin / admin123")
            # Adicionamos o campo 'nome' para evitar erros de colunas obrigatórias
            novo_admin = Usuario(
                username="admin", 
                password="admin123", 
                is_admin=True,
                nome="Administrador do Sistema" # Previne erro se o model exigir nome
            )
            db.add(novo_admin)
            db.commit()
            print("✅ Usuário Admin criado e salvo com sucesso!")
            
        elif user.password != "admin123":
            user.password = "admin123"
            db.commit()
            print("✅ Senha do Admin resetada para o padrão.")
            
    except Exception as e:
        print(f"❌ Erro crítico ao popular banco: {e}")
        db.rollback() # Muito importante: desfaz a operação falha para não travar o banco
    finally:
        db.close()

# Executa o seed
create_initial_data()

app = FastAPI(title="NEXUS API")

# Configuração de CORS para rede interna e externa
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rota de verificação rápida
@app.get("/api/usuarios/me")
def get_me():
    return {"username": "Operador Nexus", "is_admin": True}

@app.get("/api/backup/download")
def download_backup():
    db_path = "nexus.db"
    if os.path.exists(db_path):
        return FileResponse(path=db_path, filename="nexus_backup.db", media_type="application/octet-stream")
    return {"error": "Arquivo de banco de dados não encontrado."}

@app.get("/api/download/agente")
def baixar_agente():
    # Caminho onde o arquivo está guardado dentro do Docker
    caminho_arquivo = "/app/app/static/Nexus_Agente.exe"
    
    if os.path.exists(caminho_arquivo):
        return FileResponse(
            path=caminho_arquivo, 
            filename="Nexus_Instalador.exe", 
            media_type='application/octet-stream'
        )
    return {"erro": "Arquivo do agente não encontrado no servidor."}

    
# Registrando as rotas (O prefixo /api é adicionado aqui)
app.include_router(auth.router, prefix="/api")
app.include_router(inventario.router, prefix="/api")
app.include_router(unidades.router, prefix="/api")
app.include_router(auditoria.router, prefix="/api")
app.include_router(transferencia.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(manutencao.router, prefix="/api")
app.include_router(importacao.router, prefix="/api")