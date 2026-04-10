from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import UnidadeAdministrativa, LogAuditoria
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/unidades", tags=["Hierarquia Governamental"])

class UnidadeCreate(BaseModel):
    nome: str
    tipo: str
    pai_id: Optional[int] = None # Se for None, é uma Raiz (Ex: Secretaria)
    usuario_acao: str

class UnidadeEdit(BaseModel):
    nome: str
    tipo: str
    usuario_acao: str
    motivo: str

class JustificativaRequest(BaseModel):
    usuario: str
    motivo: str

@router.get("/arvore")
def obter_arvore_completa(db: Session = Depends(get_db)):
    """Retorna toda a estrutura hierárquica a partir da raiz (pai_id == None)"""
    unidades = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.pai_id == None).all()
    return unidades

@router.get("/")
def listar_todas_unidades(db: Session = Depends(get_db)):
    """Lista simples (plana) de todas as unidades"""
    return db.query(UnidadeAdministrativa).all()

@router.post("/")
def criar_unidade(req: UnidadeCreate, db: Session = Depends(get_db)):
    nova = UnidadeAdministrativa(
        nome=req.nome.upper().strip(),
        tipo=req.tipo.upper().strip(),
        pai_id=req.pai_id
    )
    db.add(nova)
    db.flush()
    db.add(LogAuditoria(
        usuario=req.usuario_acao, 
        acao="CRIACAO_UNIDADE", 
        entidade="Localidade", 
        identificador=nova.nome, 
        detalhes=f"Tipo: {nova.tipo}"
    ))
    db.commit()
    db.refresh(nova)
    return nova

@router.put("/{unidade_id}")
def editar_unidade(unidade_id: int, req: UnidadeEdit, db: Session = Depends(get_db)):
    unidade = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.id == unidade_id).first()
    if not unidade:
        raise HTTPException(404, "Unidade não encontrada")
    
    nome_antigo = unidade.nome
    unidade.nome = req.nome.upper().strip()
    unidade.tipo = req.tipo.upper().strip()

    db.add(LogAuditoria(
        usuario=req.usuario_acao, 
        acao="EDICAO_UNIDADE", 
        entidade="Localidade", 
        identificador=unidade.nome, 
        detalhes=f"Alterou de '{nome_antigo}' para '{unidade.nome}'. Motivo: {req.motivo}"
    ))
    db.commit()
    return unidade

@router.delete("/{unidade_id}")
def deletar_unidade(unidade_id: int, req: JustificativaRequest, db: Session = Depends(get_db)):
    unidade = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.id == unidade_id).first()
    if not unidade:
        raise HTTPException(404, "Unidade não encontrada")
    
    nome_unidade = unidade.nome
    db.delete(unidade)
    db.add(LogAuditoria(
        usuario=req.usuario, 
        acao="EXCLUSAO_UNIDADE", 
        entidade="Localidade", 
        identificador=nome_unidade, 
        detalhes=f"Motivo: {req.motivo}"
    ))
    db.commit()
    return {"message": "Unidade e todas as suas sub-ramificações foram excluídas com sucesso."}