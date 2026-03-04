from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Ativo, RegistroManutencao, LogAuditoria
from pydantic import BaseModel

router = APIRouter(prefix="/manutencao", tags=["Manutenção e Descartes"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class StatusUpdate(BaseModel):
    patrimonio: str
    novo_status: str
    os_referencia: str = None
    motivo: str
    destino: str = None
    usuario_acao: str

@router.post("/alterar-status")
def alterar_status(req: StatusUpdate, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == req.patrimonio).first()
    if not ativo: raise HTTPException(404, "Ativo não encontrado.")
    
    status_antigo = ativo.status or "ATIVO"
    
    # Se for sucata/descarte, ele move fisicamente para o "Descarte"
    if req.novo_status.upper() == "SUCATA":
        ativo.secretaria = "DESCARTE"
        ativo.setor = req.destino or "N/A"
    
    ativo.status = req.novo_status.upper()
    
    # Salva o Histórico O.S.
    registro = RegistroManutencao(
        patrimonio=req.patrimonio, status_anterior=status_antigo, status_novo=ativo.status,
        os_referencia=req.os_referencia, motivo=req.motivo, destino=req.destino, usuario=req.usuario_acao
    )
    db.add(registro)
    
    # Carimba a Auditoria
    txt_os = f" (OS: {req.os_referencia})" if req.os_referencia else ""
    db.add(LogAuditoria(
        usuario=req.usuario_acao, acao="EDICAO", entidade="Ativo", identificador=req.patrimonio,
        detalhes=f"Status alterado de {status_antigo} para {ativo.status}{txt_os}. Motivo: {req.motivo}"
    ))
    
    db.commit()
    return {"message": "Status e histórico atualizados!"}

@router.get("/historico")
def listar_historico(db: Session = Depends(get_db)):
    return db.query(RegistroManutencao).order_by(RegistroManutencao.data_registro.desc()).all()