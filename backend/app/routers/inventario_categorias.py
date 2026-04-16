from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import Categoria, Ativo, LogAuditoria, DicionarioPropriedade
from pydantic import BaseModel
from .inventario_core import get_db

router = APIRouter(prefix="/inventario", tags=["Inventário - Categorias"])

class CategoriaRequest(BaseModel):
    nome: str
    campos_config: List[Dict[str, str]]

@router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).all()

@router.post("/categorias")
def criar_categoria(req: CategoriaRequest, db: Session = Depends(get_db)):
    if db.query(Categoria).filter(Categoria.nome == req.nome).first():
        raise HTTPException(status_code=400, detail="Categoria já existe")
    db.add(Categoria(nome=req.nome, campos_config=req.campos_config))
    db.commit()
    return {"message": "Categoria criada com sucesso"}

@router.put("/categorias/{categoria_id}")
def editar_categoria(categoria_id: int, dados: dict, db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    nome_antigo = cat.nome
    cat.nome = dados.get("nome", cat.nome)
    if "campos_config" in dados: cat.campos_config = dados["campos_config"]
    db.add(LogAuditoria(usuario=dados.get("usuario_acao", "Admin"), acao="EDICAO", entidade="Categoria", identificador=cat.nome, detalhes=f"Editou o tipo '{nome_antigo}'."))
    db.commit()
    return {"message": "Categoria atualizada!"}

@router.delete("/categorias/{categoria_id}")
def deletar_categoria(categoria_id: int, usuario_acao: str = "Admin", db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    if db.query(Ativo).filter(Ativo.categoria_id == categoria_id).first():
        raise HTTPException(status_code=400, detail="Não é possível excluir! Existem equipamentos com este Tipo.")
    nome_apagado = cat.nome
    db.delete(cat)
    db.add(LogAuditoria(usuario=usuario_acao, acao="EXCLUSAO", entidade="Categoria", identificador=nome_apagado, detalhes=f"Excluiu '{nome_apagado}'."))
    db.commit()
    return {"message": "Categoria excluída com sucesso!"}

class PropRequest(BaseModel):
    nome: str
    descricao: str = ""

@router.get("/propriedades")
def listar_propriedades(db: Session = Depends(get_db)):
    return db.query(DicionarioPropriedade).order_by(DicionarioPropriedade.nome).all()

@router.post("/propriedades")
def criar_propriedade(req: PropRequest, db: Session = Depends(get_db)):
    existe = db.query(DicionarioPropriedade).filter(DicionarioPropriedade.nome == req.nome.strip()).first()
    if existe: raise HTTPException(400, "Esta propriedade já existe.")
    db.add(DicionarioPropriedade(nome=req.nome.strip(), descricao=req.descricao))
    db.commit()
    return {"message": "Criado com sucesso!"}

@router.delete("/propriedades/{id_prop}")
def deletar_propriedade(id_prop: int, db: Session = Depends(get_db)):
    p = db.query(DicionarioPropriedade).filter(DicionarioPropriedade.id == id_prop).first()
    if p: db.delete(p); db.commit()
    return {"message": "Excluído"}