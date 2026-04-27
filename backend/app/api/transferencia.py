from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Ativo, Transferencia, LogAuditoria, UnidadeAdministrativa
from pydantic import BaseModel

router = APIRouter(prefix="/transferencias", tags=["Transferências de Ativos"])

class TransferenciaCreate(BaseModel):
    patrimonio: str
    nova_secretaria: str
    novo_setor: str
    motivo: str
    usuario_acao: str

@router.post("/")
def realizar_transferencia(req: TransferenciaCreate, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == req.patrimonio).first()
    if not ativo:
        raise HTTPException(404, "Ativo não encontrado com este patrimônio.")
    
    # Prepara os nomes antigos para o histórico de auditoria
    sec_antiga = ativo.secretaria or "Não informada"
    setor_antigo = ativo.setor or "Não informado"
    
    # 🚀 O MISTÉRIO RESOLVIDO:
    # O frontend manda o degrau final escolhido na variável "novo_setor".
    # Se o usuário transferir pra sala 5, o "novo_setor" será "Sala 5".
    nome_alvo = req.novo_setor if req.novo_setor else req.nova_secretaria
    
    # Busca a unidade EXATA onde o cara colocou a máquina
    nova_unidade = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.nome == nome_alvo).first()
    
    if nova_unidade:
        ativo.unidade_id = nova_unidade.id
        ativo.secretaria = req.nova_secretaria # Mantém a Secretaria Raiz
        ativo.setor = nova_unidade.nome # 🔥 Salva o nome EXATO do setor/sala
    else:
        # Fallback de compatibilidade caso algo dê errado
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
    
    # 📜 LOG DE AUDITORIA PERFEITO
    detalhes_log = f"Movido de {sec_antiga} ({setor_antigo}) para {ativo.secretaria} ({ativo.setor}). Motivo: {req.motivo}"
    
    db.add(LogAuditoria(
        usuario=req.usuario_acao,
        acao="TRANSFERENCIA", 
        entidade="Ativo",
        identificador=req.patrimonio,
        detalhes=detalhes_log
    ))
    
    db.commit()
    return {"message": f"Ativo {req.patrimonio} transferido com sucesso!"}

@router.get("/")
def listar_historico(db: Session = Depends(get_db)):
    return db.query(Transferencia).order_by(Transferencia.data_transferencia.desc()).all()