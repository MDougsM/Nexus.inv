from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app import schemas
from pydantic import BaseModel
from app.db.database import SessionLocal
from app.models import Usuario, LogAuditoria # Puxando do BD
from sqlalchemy import func

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Dependência do Banco
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class UserCreate(BaseModel):
    usuario: str
    senha: str

@router.post("/login")
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Usa func.lower para comparar ignorando maiúsculas/minúsculas
    user = db.query(Usuario).filter(func.lower(Usuario.username) == dados.usuario.lower()).first()
    
    if not user or user.password != dados.senha:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Restante do código de auditoria continua igual...
    log = LogAuditoria(
        usuario=user.username, acao="LOGIN", entidade="Sistema", identificador="Autenticação", detalhes="Login realizado"
    )
    db.add(log); db.commit()

    return {"access_token": "token_nexus_ativo", "token_type": "bearer", "usuario": user.username, "is_admin": user.is_admin}

@router.post("/register")
def registrar_usuario(req: UserCreate):
    return {"message": f"Operador {req.usuario} autorizado no sistema NEXUS."}