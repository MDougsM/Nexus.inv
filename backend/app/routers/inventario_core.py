import json
import re
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, text

from app.db.database import SessionLocal
from app.models import Ativo, LogAuditoria, RegistroManutencao, HistoricoLeitura
from pydantic import BaseModel

router = APIRouter(prefix="/inventario", tags=["Inventário - Core"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def obter_proximo_patrimonio(db: Session) -> str:
    ativos = db.query(Ativo.patrimonio).filter(Ativo.patrimonio.like('NXS-%')).all()
    max_num = 0
    for a in ativos:
        numeros = re.findall(r'\d+', a[0])
        if numeros:
            num = int(numeros[-1])
            if num > max_num: max_num = num
    return f"NXS-{max_num + 1:04d}"

class AtivoRequest(BaseModel):
    patrimonio: Optional[str] = ""
    categoria_id: int
    marca: Optional[str] = None
    modelo: Optional[str] = None
    secretaria: Optional[str] = None
    local: Optional[str] = None
    setor: Optional[str] = None
    dados_dinamicos: Dict[str, Any]
    usuario_acao: str

class LoteDeleteRequest(BaseModel):
    patrimonios: List[str]

@router.get("/")
def listar_ativos(db: Session = Depends(get_db)):
    ativos = db.query(Ativo).all()
    return [{**a.__dict__, "categoria_nome": a.categoria.nome if a.categoria else "Sem Categoria"} for a in ativos]

@router.post("/")
def criar_ativo(req: AtivoRequest, db: Session = Depends(get_db)):
    from datetime import datetime
    pat_final = req.patrimonio.strip() if req.patrimonio else obter_proximo_patrimonio(db)
    if db.query(Ativo).filter(Ativo.patrimonio == pat_final).first():
        raise HTTPException(status_code=400, detail="Patrimônio já cadastrado.")
    
    novo_ativo = Ativo(
        patrimonio=pat_final, categoria_id=req.categoria_id, marca=req.marca, modelo=req.modelo,
        secretaria=req.secretaria, local=req.local, setor=req.setor, tecnico=req.usuario_acao,
        dados_dinamicos=req.dados_dinamicos, ultima_comunicacao=datetime.utcnow() 
    )
    db.add(novo_ativo)
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="CRIACAO", entidade="Ativo", identificador=pat_final, detalhes="Novo ativo registrado manualmente."))
    db.commit()
    return {"message": "Ativo criado com sucesso", "patrimonio_gerado": pat_final}

@router.get("/id/{ativo_id}")
def obter_ativo_por_id(ativo_id: int, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.id == ativo_id).first()
    if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado")
    dados_din = ativo.dados_dinamicos or {}
    if isinstance(dados_din, str):
        try: dados_din = json.loads(dados_din.replace("'", '"'))
        except: dados_din = {}
    ativo_formatado = {
        "id": ativo.id, "patrimonio": ativo.patrimonio, "marca": ativo.marca, "modelo": ativo.modelo,
        "categoria_id": int(ativo.categoria_id) if ativo.categoria_id else None,
        "secretaria": ativo.secretaria, "setor": ativo.setor, "status": ativo.status,
        "ultima_comunicacao": ativo.ultima_comunicacao.isoformat() if ativo.ultima_comunicacao else None,
        "dados_dinamicos": dados_din
    }
    historico = db.query(LogAuditoria).filter(LogAuditoria.identificador == ativo.patrimonio).order_by(LogAuditoria.data_hora.desc()).limit(20).all()
    return {"ativo": ativo_formatado, "historico": historico}

@router.get("/ficha/detalhes/{patrimonio:path}")
def obter_detalhes_ativo(patrimonio: str, db: Session = Depends(get_db)):
    try:
        ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first()
        if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado")
        historico = db.query(LogAuditoria).filter(LogAuditoria.identificador == patrimonio).order_by(LogAuditoria.data_hora.desc()).all()
        manutencoes = db.query(RegistroManutencao).filter(RegistroManutencao.patrimonio == patrimonio).all()
        return {"ativo": ativo, "historico": historico, "manutencoes": manutencoes}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.put("/ficha/editar/id/{ativo_id}")
def editar_ativo_por_id(ativo_id: int, dados: dict, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.id == ativo_id).first()
    if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado")
    ativo.marca = dados.get("marca", ativo.marca)
    ativo.modelo = dados.get("modelo", ativo.modelo)
    ativo.patrimonio = dados.get("patrimonio", ativo.patrimonio)
    ativo.nome_personalizado = dados.get("nome_personalizado", ativo.nome_personalizado)
    if "dados_dinamicos" in dados: ativo.dados_dinamicos = dados["dados_dinamicos"]
    db.commit()
    return {"status": "success"}

@router.put("/ficha/editar/{identificador:path}")
def editar_ficha_ativo(identificador: str, dados: dict, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(or_(Ativo.id == (int(identificador) if identificador.isdigit() else -1), Ativo.patrimonio == identificador)).first()
    if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado")

    usuario_acao = dados.get("usuario_acao", "Sistema")
    motivo = dados.get("motivo", "Edição de dados via painel")

    if "patrimonio" in dados and dados["patrimonio"].strip(): ativo.patrimonio = dados["patrimonio"].strip()
    ativo.categoria_id = dados.get("categoria_id", ativo.categoria_id)
    ativo.marca = dados.get("marca", ativo.marca)
    ativo.modelo = dados.get("modelo", ativo.modelo)
    if "secretaria" in dados: ativo.secretaria = dados["secretaria"]
    if "local" in dados: ativo.local = dados["local"]
    if "setor" in dados: ativo.setor = dados["setor"]
    if "nome_personalizado" in dados: ativo.nome_personalizado = dados["nome_personalizado"]

    novos_dinamicos = dados.get("dados_dinamicos", {})
    if isinstance(novos_dinamicos, str):
        try: novos_dinamicos = json.loads(novos_dinamicos)
        except: novos_dinamicos = {}
            
    # 🚀 A CORREÇÃO DE HOJE ESTÁ AQUI
    dict_atual = dict(ativo.dados_dinamicos or {})
    dict_atual.update(novos_dinamicos)
    ativo.dados_dinamicos = dict_atual

    db.add(LogAuditoria(usuario=usuario_acao, acao="EDICAO_FICHA", entidade="Ativo", identificador=ativo.patrimonio, detalhes=f"Motivo: {motivo}"))
    db.commit()
    return {"message": "Ficha atualizada com sucesso"}

@router.delete("/lote")
def deletar_ativos_lote(req: LoteDeleteRequest, db: Session = Depends(get_db)):
    try:
        ativos = db.query(Ativo).filter(Ativo.patrimonio.in_(req.patrimonios)).all()
        patrimonios_lista = [a.patrimonio for a in ativos]
        if patrimonios_lista:
            db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio.in_(patrimonios_lista)).delete(synchronize_session=False)
            db.query(LogAuditoria).filter(LogAuditoria.identificador.in_(patrimonios_lista)).delete(synchronize_session=False)
            db.query(RegistroManutencao).filter(RegistroManutencao.patrimonio.in_(patrimonios_lista)).delete(synchronize_session=False)
            db.query(Ativo).filter(Ativo.patrimonio.in_(patrimonios_lista)).delete(synchronize_session=False)
        db.commit()
        return {"message": f"{len(ativos)} ativos removidos com sucesso."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{patrimonio_ou_id:path}")
def deletar_ativo(patrimonio_ou_id: str, usuario_acao: str = "Admin", motivo: str = "Sem motivo", db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(or_(Ativo.patrimonio == patrimonio_ou_id, Ativo.id == (int(patrimonio_ou_id) if patrimonio_ou_id.isdigit() else -1))).first()
    if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado")
    
    try:
        # Importa o ComandoAgente para limpar o histórico do C2 também!
        from app.models import ComandoAgente
        
        pat = ativo.patrimonio
        
        # Modo ORM Blindado: Ele descobre o nome certo das tabelas sozinho
        db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == pat).delete(synchronize_session=False)
        db.query(LogAuditoria).filter(LogAuditoria.identificador == pat).delete(synchronize_session=False)
        db.query(RegistroManutencao).filter(RegistroManutencao.patrimonio == pat).delete(synchronize_session=False)
        db.query(ComandoAgente).filter(ComandoAgente.patrimonio == pat).delete(synchronize_session=False)
        
        db.delete(ativo)
        
        db.add(LogAuditoria(usuario=usuario_acao, acao="EXCLUSAO", entidade="Ativo", identificador=pat, detalhes=f"ALERTA: Registro apagado. Motivo: {motivo}"))
        db.commit()
        
        return {"message": "Equipamento excluído da base com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))