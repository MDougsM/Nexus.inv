from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Ativo, Transferencia, LogAuditoria, UnidadeAdministrativa
from pydantic import BaseModel

router = APIRouter(prefix="/transferencias", tags=["Transferências de Ativos"])

class TransferenciaCreate(BaseModel):
    patrimonio: str
    nova_secretaria: str # O frontend manda o nome da Unidade Alvo
    novo_setor: str
    motivo: str
    usuario_acao: str

@router.post("/")
def realizar_transferencia(req: TransferenciaCreate, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == req.patrimonio).first()
    if not ativo:
        raise HTTPException(404, "Ativo não encontrado com este patrimônio.")
    
    sec_antiga = ativo.unidade.nome if ativo.unidade else (ativo.secretaria or "Não informada")
    setor_antigo = ativo.unidade.tipo if ativo.unidade else (ativo.setor or "Não informado")
    
    # 🚀 VINCULAÇÃO COM A NOVA HIERARQUIA
    nova_unidade = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.nome == req.nova_secretaria).first()
    if nova_unidade:
        ativo.unidade_id = nova_unidade.id
        ativo.secretaria = nova_unidade.nome
        ativo.setor = nova_unidade.tipo
    else:
        # Fallback de compatibilidade
        ativo.secretaria = req.nova_secretaria
        ativo.setor = req.novo_setor
        ativo.unidade_id = None
    
    nova_transf = Transferencia(
        patrimonio=req.patrimonio,
        origem_secretaria=sec_antiga,
        origem_setor=setor_antigo,
        destino_secretaria=ativo.secretaria,
        destino_setor=ativo.setor,
        motivo=req.motivo,
        tecnico_responsavel=req.usuario_acao
    )
    db.add(nova_transf)
    
    db.add(LogAuditoria(
        usuario=req.usuario_acao,
        acao="TRANSFERENCIA", 
        entidade="Ativo",
        identificador=req.patrimonio,
        detalhes=f"Movido de {sec_antiga} para {req.nova_secretaria}. Motivo: {req.motivo}"
    ))
    
    db.commit()
    return {"message": f"Ativo {req.patrimonio} transferido com sucesso!"}

@router.get("/")
def listar_historico(db: Session = Depends(get_db)):
    return db.query(Transferencia).order_by(Transferencia.data_transferencia.desc()).all()