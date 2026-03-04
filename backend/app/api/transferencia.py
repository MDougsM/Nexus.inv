from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Ativo, Transferencia, LogAuditoria
from pydantic import BaseModel

router = APIRouter(prefix="/transferencias", tags=["Transferências de Ativos"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# Schema (O formulário que o React vai enviar)
class TransferenciaCreate(BaseModel):
    patrimonio: str
    nova_secretaria: str
    novo_setor: str
    motivo: str
    usuario_acao: str

@router.post("/")
def realizar_transferencia(req: TransferenciaCreate, db: Session = Depends(get_db)):
    # 1. Verifica se o ativo existe
    ativo = db.query(Ativo).filter(Ativo.patrimonio == req.patrimonio).first()
    if not ativo:
        raise HTTPException(404, "Ativo não encontrado com este patrimônio.")
    
    # 2. Guarda o local antigo para o histórico
    sec_antiga = ativo.secretaria or "Não informada"
    setor_antigo = ativo.setor or "Não informado"
    
    # 3. Move o ativo
    ativo.secretaria = req.nova_secretaria
    ativo.setor = req.novo_setor
    
    # 4. Registra a "Passagem" na tabela de Transferências
    nova_transf = Transferencia(
        patrimonio=req.patrimonio,
        origem_secretaria=sec_antiga,
        origem_setor=setor_antigo,
        destino_secretaria=req.nova_secretaria,
        destino_setor=req.novo_setor,
        motivo=req.motivo,
        tecnico_responsavel=req.usuario_acao
    )
    db.add(nova_transf)
    
    # 5. Carimba a Caixa-Preta (Auditoria) com uma tag especial
    log = LogAuditoria(
        usuario=req.usuario_acao,
        acao="TRANSFERENCIA", 
        entidade="Ativo",
        identificador=req.patrimonio,
        detalhes=f"Movido de {sec_antiga} > {setor_antigo} para {req.nova_secretaria} > {req.novo_setor}. Motivo: {req.motivo}"
    )
    db.add(log)
    
    # 6. Salva tudo de uma vez
    db.commit()
    return {"message": f"Ativo {req.patrimonio} transferido com sucesso!"}

@router.get("/")
def listar_historico(db: Session = Depends(get_db)):
    # Lista todo o histórico para uma futura tela de relatórios
    return db.query(Transferencia).order_by(Transferencia.data_transferencia.desc()).all()