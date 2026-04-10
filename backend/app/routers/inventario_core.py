import json
import re
import os
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db, MasterSessionLocal, Empresa
from app.models import Ativo, LogAuditoria, RegistroManutencao, HistoricoLeitura, ComandoAgente
from pydantic import BaseModel

router = APIRouter(prefix="/inventario", tags=["Inventário - Core"])

# --- SCHEMAS ---
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
    usuario_acao: str = "Admin"
    motivo: str = "Exclusão em lote"

# --- AUXILIARES ---
def obter_proximo_patrimonio(db: Session) -> str:
    ativos = db.query(Ativo.patrimonio).filter(Ativo.patrimonio.like('NXS-%')).all()
    max_num = 0
    for a in ativos:
        numeros = re.findall(r'\d+', a[0])
        if numeros:
            num = int(numeros[-1])
            if num > max_num: max_num = num
    return f"NXS-{max_num + 1:04d}"

# --- ROTAS ---
@router.get("/qr-access/{patrimonio}")
def acesso_inteligente_qr(patrimonio: str, request: Request, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio, Ativo.deletado == False).first()
    if not ativo:
        raise HTTPException(404, "Patrimônio não encontrado")

    # Verifica se o usuário já está logado (pelo header ou cookie)
    # Se estiver logado, ele ganha a ficha de edição
    token = request.headers.get("Authorization")
    is_authenticated = False
    if token:
        # Lógica de validação de token aqui
        is_authenticated = True 

    return {
        "status": "success",
        "access_level": "EDITOR" if is_authenticated else "VISITANTE",
        "dados_basicos": {
            "patrimonio": ativo.patrimonio,
            "equipamento": ativo.modelo,
            "unidade": ativo.unidade.nome if ativo.unidade else ativo.secretaria,
            "status": ativo.status
        },
        "url_edicao": f"/inventario/editar/{ativo.patrimonio}" if is_authenticated else None
    }


@router.get("/")
def listar_ativos(db: Session = Depends(get_db)):
    """Lista apenas ativos que NÃO estão na lixeira"""
    ativos = db.query(Ativo).filter(Ativo.deletado == False).all()
    return [{**a.__dict__, "categoria_nome": a.categoria.nome if a.categoria else "Sem Categoria"} for a in ativos]

@router.get("/ficha/detalhes/{patrimonio}")
def obter_detalhes_ficha(patrimonio: str, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio, Ativo.deletado == False).first()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")

    dados_dinamicos = ativo.dados_dinamicos or {}
    if isinstance(dados_dinamicos, str):
        try:
            dados_dinamicos = json.loads(dados_dinamicos.replace("'", '"'))
        except Exception:
            dados_dinamicos = {}

    ativo_formatado = {
        "id": ativo.id,
        "patrimonio": ativo.patrimonio,
        "marca": ativo.marca,
        "modelo": ativo.modelo,
        "nome_personalizado": ativo.nome_personalizado,
        "tecnico": ativo.tecnico,
        "categoria_id": int(ativo.categoria_id) if ativo.categoria_id else None,
        "categoria_nome": ativo.categoria.nome if ativo.categoria else None,
        "secretaria": ativo.secretaria,
        "local": ativo.local,
        "setor": ativo.setor,
        "status": ativo.status,
        "ultima_comunicacao": ativo.ultima_comunicacao.isoformat() if ativo.ultima_comunicacao else None,
        "numero_licitacao": ativo.numero_licitacao,
        "data_vencimento_garantia": ativo.data_vencimento_garantia.isoformat() if ativo.data_vencimento_garantia else None,
        "responsavel_atual": ativo.responsavel_atual,
        "uuid_persistente": ativo.uuid_persistente,
        "dominio_proprio": ativo.dominio_proprio,
        "dados_dinamicos": dados_dinamicos,
        "unidade": {"id": ativo.unidade.id, "nome": ativo.unidade.nome, "tipo": ativo.unidade.tipo} if ativo.unidade else None
    }

    historico = db.query(LogAuditoria).filter(LogAuditoria.identificador == ativo.patrimonio).order_by(LogAuditoria.data_hora.desc()).limit(20).all()
    return {"ativo": ativo_formatado, "historico": historico}

@router.post("/")
def criar_ativo(req: AtivoRequest, request: Request, db: Session = Depends(get_db)):
    from datetime import datetime
    
    # 🚀 TRAVA DE COTA (MATRIZ)
    empresa_header = request.headers.get("x-empresa")
    if empresa_header and empresa_header != "NEXUS_MASTER":
        master_db = MasterSessionLocal()
        try:
            empresa = master_db.query(Empresa).filter(Empresa.codigo_acesso == empresa_header).first()
            if empresa and getattr(empresa, 'limite_maquinas', 0) > 0:
                # Conta apenas ativos reais (não deletados) para a cota
                total_atual = db.query(Ativo).filter(Ativo.deletado == False).count()
                if total_atual >= empresa.limite_maquinas:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"🚫 Limite de Plano: {empresa.limite_maquinas} ativos atingidos."
                    )
        finally:
            master_db.close()

    pat_final = req.patrimonio.strip() if req.patrimonio else obter_proximo_patrimonio(db)
    
    # Verifica se já existe (mesmo na lixeira) para evitar duplicidade de PK
    existe = db.query(Ativo).filter(Ativo.patrimonio == pat_final).first()
    if existe:
        if existe.deletado:
            raise HTTPException(status_code=400, detail="Este patrimônio está na lixeira. Restaure-o pela Matriz.")
        raise HTTPException(status_code=400, detail="Patrimônio já cadastrado.")
    
    novo_ativo = Ativo(
        patrimonio=pat_final, categoria_id=req.categoria_id, marca=req.marca, modelo=req.modelo,
        secretaria=req.secretaria, local=req.local, setor=req.setor, tecnico=req.usuario_acao,
        dados_dinamicos=req.dados_dinamicos, ultima_comunicacao=datetime.utcnow(),
        deletado=False
    )
    db.add(novo_ativo)
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="CRIACAO", entidade="Ativo", identificador=pat_final, detalhes="Registro manual."))
    db.commit()
    return {"message": "Ativo criado com sucesso", "patrimonio_gerado": pat_final}

@router.get("/id/{ativo_id}")
def obter_ativo_por_id(ativo_id: int, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.id == ativo_id, Ativo.deletado == False).first()
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
        "dados_dinamicos": dados_din,
        "dominio_proprio": ativo.dominio_proprio
    }
    historico = db.query(LogAuditoria).filter(LogAuditoria.identificador == ativo.patrimonio).order_by(LogAuditoria.data_hora.desc()).limit(20).all()
    return {"ativo": ativo_formatado, "historico": historico}

@router.delete("/lote")
def deletar_ativos_lote(req: LoteDeleteRequest, db: Session = Depends(get_db)):
    """Move múltiplos ativos para a lixeira"""
    try:
        ativos = db.query(Ativo).filter(Ativo.patrimonio.in_(req.patrimonios), Ativo.deletado == False).all()
        for ativo in ativos:
            ativo.deletado = True
            db.add(LogAuditoria(
                usuario=req.usuario_acao, 
                acao="EXCLUSAO_LOTE", 
                entidade="Ativo", 
                identificador=ativo.patrimonio, 
                detalhes=f"Lixeira: {req.motivo}"
            ))
        db.commit()
        return {"message": f"{len(ativos)} ativos movidos para a lixeira."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{patrimonio_ou_id:path}")
def deletar_ativo(patrimonio_ou_id: str, usuario_acao: str = "Admin", motivo: str = "Sem motivo", db: Session = Depends(get_db)):
    """Move um ativo para a lixeira (Soft Delete)"""
    ativo = db.query(Ativo).filter(
        or_(Ativo.patrimonio == patrimonio_ou_id, Ativo.id == (int(patrimonio_ou_id) if patrimonio_ou_id.isdigit() else -1)),
        Ativo.deletado == False
    ).first()
    
    if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado ou já excluído")
    
    try:
        pat = ativo.patrimonio
        ativo.deletado = True # 🚀 MÁGICA: Apenas marcamos como deletado
        
        db.add(LogAuditoria(
            usuario=usuario_acao, 
            acao="EXCLUSAO", 
            entidade="Ativo", 
            identificador=pat, 
            detalhes=f"Movido para lixeira. Motivo: {motivo}"
        ))
        db.commit()
        return {"message": "Equipamento movido para a lixeira com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auditoria")
def listar_logs(db: Session = Depends(get_db)):
    """Filtro de visibilidade para logs do Administrador Mestre (Ghost Mode)"""
    query = db.query(LogAuditoria).filter(LogAuditoria.usuario != "Nexus (Mestre)")
    return query.order_by(LogAuditoria.data_hora.desc()).all()

@router.put("/ficha/editar/{identificador:path}")
def editar_ficha_ativo(identificador: str, dados: dict, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == identificador, Ativo.deletado == False).first()
    if not ativo: raise HTTPException(status_code=404, detail="Ativo não encontrado")

    usuario_acao = dados.get("usuario_acao", "Sistema")
    motivo = dados.get("motivo", "Edição via painel")

    if "patrimonio" in dados and dados["patrimonio"].strip(): 
        novo_pat = dados["patrimonio"].strip()
        if novo_pat != ativo.patrimonio:
            # Se mudou o patrimônio, precisa atualizar as tabelas relacionadas para não perder histórico
            old_pat = ativo.patrimonio
            db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == old_pat).update({"patrimonio": novo_pat})
            db.query(LogAuditoria).filter(LogAuditoria.identificador == old_pat).update({"identificador": novo_pat})
            db.query(RegistroManutencao).filter(RegistroManutencao.patrimonio == old_pat).update({"patrimonio": novo_pat})
            db.query(ComandoAgente).filter(ComandoAgente.patrimonio == old_pat).update({"patrimonio": novo_pat})
            ativo.patrimonio = novo_pat

    ativo.categoria_id = dados.get("categoria_id", ativo.categoria_id)
    ativo.marca = dados.get("marca", ativo.marca)
    ativo.modelo = dados.get("modelo", ativo.modelo)
    if "secretaria" in dados: ativo.secretaria = dados["secretaria"]
    if "local" in dados: ativo.local = dados["local"]
    if "setor" in dados: ativo.setor = dados["setor"]
    if "nome_personalizado" in dados: ativo.nome_personalizado = dados["nome_personalizado"]
    if "dominio_proprio" in dados: ativo.dominio_proprio = dados["dominio_proprio"]

    novos_dinamicos = dados.get("dados_dinamicos", {})
    dict_atual = dict(ativo.dados_dinamicos or {})
    dict_atual.update(novos_dinamicos)
    ativo.dados_dinamicos = dict_atual

    db.add(LogAuditoria(usuario=usuario_acao, acao="EDICAO_FICHA", entidade="Ativo", identificador=ativo.patrimonio, detalhes=f"Motivo: {motivo}"))
    db.commit()
    return {"message": "Ficha atualizada com sucesso"}

@router.put("/ficha/{patrimonio}/dominio")
def alternar_dominio_proprio(patrimonio: str, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio, Ativo.deletado == False).first()
    if not ativo: raise HTTPException(status_code=404, detail="Máquina não encontrada")
    ativo.dominio_proprio = not ativo.dominio_proprio
    db.commit()
    return {"status": "success", "dominio_proprio": ativo.dominio_proprio}

@router.get("/topologia")
def carregar_topologia_global(request: Request):
    """Carrega o mapa do ReactFlow"""
    empresa_header = request.headers.get("x-empresa", "NEWPC")
    caminho_arquivo = f"./data/tenants/topologia_{empresa_header}.json"
    
    if os.path.exists(caminho_arquivo):
        with open(caminho_arquivo, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except:
                return {"nodes": [], "edges": []}
    return {"nodes": [], "edges": []}

@router.post("/topologia")
async def salvar_topologia_global(request: Request):
    """Salva o mapa do ReactFlow"""
    empresa_header = request.headers.get("x-empresa", "NEWPC")
    caminho_arquivo = f"./data/tenants/topologia_{empresa_header}.json"
    
    dados = await request.json()
    
    with open(caminho_arquivo, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False)
        
    return {"message": "Topologia salva com sucesso"}