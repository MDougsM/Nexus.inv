from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import LogAuditoria

router = APIRouter(prefix="/auditoria", tags=["Auditoria e Logs"])

@router.get("/")
def listar_logs(db: Session = Depends(get_db)):
    # Retorna todos os logs ordenados do mais recente para o mais antigo
    return db.query(LogAuditoria).order_by(LogAuditoria.data_hora.desc()).all()