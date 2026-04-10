from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app import schemas
from pydantic import BaseModel

# 🚀 1. IMPORTA O get_db DO NOVO ROTEADOR SAAS (E não mais o SessionLocal)
from app.db.database import get_db
from app.models import Usuario, LogAuditoria 
from sqlalchemy import func

router = APIRouter(prefix="/auth", tags=["Autenticação"])

class UserCreate(BaseModel):
    usuario: str
    senha: str

@router.post("/login")
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    # 🚀 TRAVA SE FOR MODO MESTRE (DB VAZIO AQUI)
    if not db: raise HTTPException(status_code=400, detail="Rota legado não suporta login Mestre.")
    
    user = db.query(Usuario).filter(func.lower(Usuario.username) == dados.usuario.lower()).first()
    
    if not user or user.password != dados.senha:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    log = LogAuditoria(
        usuario=user.username, acao="LOGIN", entidade="Sistema", identificador="Autenticação", detalhes="Login realizado"
    )
    db.add(log); db.commit()

    return {"access_token": "token_nexus_ativo", "token_type": "bearer", "usuario": user.username, "is_admin": user.is_admin}

@router.post("/register")
def registrar_usuario(req: UserCreate):
    return {"message": f"Operador {req.usuario} autorizado no sistema NEXUS."}