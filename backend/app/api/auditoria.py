from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import LogAuditoria

router = APIRouter(prefix="/auditoria", tags=["Auditoria e Logs"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.get("/")
def listar_logs(db: Session = Depends(get_db)):
    # Retorna todos os logs ordenados do mais recente para o mais antigo
    return db.query(LogAuditoria).order_by(LogAuditoria.data_hora.desc()).all()