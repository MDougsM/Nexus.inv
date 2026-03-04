from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Secretaria, Setor, LogAuditoria
from pydantic import BaseModel

router = APIRouter(prefix="/unidades", tags=["Unidades Administrativas"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# Schemas
class UnidadeCreate(BaseModel):
    nome: str
    usuario_acao: str
    secretaria_id: int = None

class UnidadeEdit(BaseModel):
    nome: str
    usuario_acao: str
    motivo: str

class JustificativaRequest(BaseModel):
    usuario: str
    motivo: str

# ==========================================
#               SECRETARIAS
# ==========================================
@router.get("/secretarias")
def listar_secretarias(db: Session = Depends(get_db)):
    return db.query(Secretaria).all()

@router.post("/secretarias")
def criar_secretaria(req: UnidadeCreate, db: Session = Depends(get_db)):
    nome_up = req.nome.upper().strip()
    if not nome_up: raise HTTPException(400, "Nome não pode ser vazio.")
    if db.query(Secretaria).filter(Secretaria.nome == nome_up).first():
        raise HTTPException(400, "Secretaria já cadastrada.")
    
    nova = Secretaria(nome=nome_up)
    db.add(nova)
    db.flush()

    db.add(LogAuditoria(usuario=req.usuario_acao, acao="CRIACAO", entidade="Secretaria", identificador=nome_up, detalhes="Criou secretaria"))
    db.commit()
    db.refresh(nova)
    return nova

@router.put("/secretarias/{sec_id}")
def editar_secretaria(sec_id: int, req: UnidadeEdit, db: Session = Depends(get_db)):
    sec = db.query(Secretaria).filter(Secretaria.id == sec_id).first()
    if not sec: raise HTTPException(404, "Secretaria não encontrada")
    
    nome_antigo = sec.nome
    nome_novo = req.nome.upper().strip()

    if db.query(Secretaria).filter(Secretaria.nome == nome_novo, Secretaria.id != sec_id).first():
        raise HTTPException(400, "Já existe outra secretaria com este nome.")

    sec.nome = nome_novo
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="EDICAO", entidade="Secretaria", identificador=nome_novo, detalhes=f"Alterou de '{nome_antigo}' para '{nome_novo}'. Motivo: {req.motivo}"))
    db.commit()
    return sec

@router.delete("/secretarias/{sec_id}")
def deletar_secretaria(sec_id: int, req: JustificativaRequest, db: Session = Depends(get_db)):
    sec = db.query(Secretaria).filter(Secretaria.id == sec_id).first()
    if not sec: raise HTTPException(404, "Secretaria não encontrada")
    
    nome_sec = sec.nome
    db.delete(sec)
    db.add(LogAuditoria(usuario=req.usuario, acao="EXCLUSAO", entidade="Secretaria", identificador=nome_sec, detalhes=f"Motivo: {req.motivo}"))
    db.commit()
    return {"message": "Excluído com sucesso"}

# ==========================================
#                 SETORES
# ==========================================
@router.get("/setores")
def listar_todos_setores(db: Session = Depends(get_db)):
    return db.query(Setor).all()

@router.get("/secretarias/{sec_id}/setores")
def listar_setores_da_secretaria(sec_id: int, db: Session = Depends(get_db)):
    return db.query(Setor).filter(Setor.secretaria_id == sec_id).all()

@router.post("/setores")
def criar_setor(req: UnidadeCreate, db: Session = Depends(get_db)):
    nome_up = req.nome.upper().strip()
    sec = db.query(Secretaria).filter(Secretaria.id == req.secretaria_id).first()
    if not sec: raise HTTPException(404, "Secretaria pai não encontrada.")

    if db.query(Setor).filter(Setor.nome == nome_up, Setor.secretaria_id == req.secretaria_id).first():
        raise HTTPException(400, "Setor já existe nesta secretaria.")

    novo = Setor(nome=nome_up, secretaria_id=req.secretaria_id)
    db.add(novo)
    db.flush()

    db.add(LogAuditoria(usuario=req.usuario_acao, acao="CRIACAO", entidade="Setor", identificador=f"{sec.nome} > {nome_up}", detalhes="Criou setor"))
    db.commit()
    db.refresh(novo)
    return novo

@router.put("/setores/{set_id}")
def editar_setor(set_id: int, req: UnidadeEdit, db: Session = Depends(get_db)):
    setor = db.query(Setor).filter(Setor.id == set_id).first()
    if not setor: raise HTTPException(404, "Setor não encontrado")
    
    nome_antigo = setor.nome
    nome_novo = req.nome.upper().strip()

    if db.query(Setor).filter(Setor.nome == nome_novo, Setor.secretaria_id == setor.secretaria_id, Setor.id != set_id).first():
        raise HTTPException(400, "Já existe um setor com este nome nesta secretaria.")

    setor.nome = nome_novo
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="EDICAO", entidade="Setor", identificador=nome_novo, detalhes=f"Alterou de '{nome_antigo}' para '{nome_novo}'. Motivo: {req.motivo}"))
    db.commit()
    return setor

@router.delete("/setores/{setor_id}")
def deletar_setor(setor_id: int, req: JustificativaRequest, db: Session = Depends(get_db)):
    setor = db.query(Setor).filter(Setor.id == setor_id).first()
    if not setor: raise HTTPException(404, "Setor não encontrado")
    
    nome_setor = setor.nome
    db.delete(setor)
    db.add(LogAuditoria(usuario=req.usuario, acao="EXCLUSAO", entidade="Setor", identificador=nome_setor, detalhes=f"Motivo: {req.motivo}"))
    db.commit()
    return {"message": "Excluído com sucesso"}