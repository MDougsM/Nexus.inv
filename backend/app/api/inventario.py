from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Ativo, Categoria, LogAuditoria, RegistroManutencao
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

import csv
import io
import json

router = APIRouter(prefix="/inventario", tags=["Inventário"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SCHEMAS ---
class CategoriaRequest(BaseModel):
    nome: str
    campos_config: List[Dict[str, str]]

class AtivoRequest(BaseModel):
    patrimonio: str
    categoria_id: int
    marca: Optional[str] = None
    modelo: Optional[str] = None
    secretaria: Optional[str] = None
    setor: Optional[str] = None
    dados_dinamicos: Dict[str, Any]
    usuario_acao: str

# --- ROTAS DE CATEGORIAS (TIPOS DE EQUIPAMENTO) ---
@router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).all()

@router.post("/categorias")
def criar_categoria(req: CategoriaRequest, db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.nome == req.nome).first()
    if cat:
        raise HTTPException(status_code=400, detail="Categoria já existe")
    
    nova_cat = Categoria(nome=req.nome, campos_config=req.campos_config)
    db.add(nova_cat)
    db.commit()
    return {"message": "Categoria criada com sucesso"}

# --- ROTAS DE ATIVOS ---
@router.get("/")
def listar_ativos(db: Session = Depends(get_db)):
    ativos = db.query(Ativo).all()
    # Retorna o ativo e o nome da categoria junto
    return [{**a.__dict__, "categoria_nome": a.categoria.nome if a.categoria else "Sem Categoria"} for a in ativos]

@router.post("/")
def criar_ativo(req: AtivoRequest, db: Session = Depends(get_db)):
    db_ativo = db.query(Ativo).filter(Ativo.patrimonio == req.patrimonio).first()
    if db_ativo:
        raise HTTPException(status_code=400, detail="Patrimônio já cadastrado.")
    
    novo_ativo = Ativo(
        patrimonio=req.patrimonio,
        categoria_id=req.categoria_id,
        marca=req.marca,
        modelo=req.modelo,
        secretaria=req.secretaria,
        setor=req.setor,
        tecnico=req.usuario_acao,
        dados_dinamicos=req.dados_dinamicos
    )
    db.add(novo_ativo)
    
    novo_log = LogAuditoria(
        usuario=req.usuario_acao, acao="CRIACAO", entidade="Ativo",
        identificador=req.patrimonio, detalhes="Novo ativo registrado."
    )
    db.add(novo_log)
    db.commit()
    return {"message": "Ativo criado com sucesso"}

# ==========================================
# IMPORTAÇÃO EM LOTE (MIGRAÇÃO CSV)
# ==========================================
@router.post("/upload-csv")
async def importar_csv(
    file: UploadFile = File(...), 
    usuario_acao: str = Form(...), 
    db: Session = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Formato inválido. Use um arquivo .csv")

    conteudo = await file.read()
    try:
        # Decodifica o CSV (tenta utf-8, se falhar, tenta latin-1 do Excel padrão)
        texto = conteudo.decode('utf-8')
    except UnicodeDecodeError:
        texto = conteudo.decode('latin-1')

    # Lê o CSV considerando a primeira linha como cabeçalho
    leitor = csv.DictReader(io.StringIO(texto), delimiter=';') # Pode mudar para ',' se seu Excel usar vírgula
    
    sucesso = 0
    erros = 0

    for linha in leitor:
        try:
            # O get() busca pelo nome da coluna no CSV. 
            patrimonio = linha.get("Patrimonio", "").strip()
            if not patrimonio:
                continue

            # Pula se o patrimônio já existir
            if db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first():
                erros += 1
                continue

            # Busca ou cria a Categoria automaticamente
            nome_cat = linha.get("Categoria", "Diversos").strip() or "Diversos"
            cat = db.query(Categoria).filter(Categoria.nome == nome_cat).first()
            if not cat:
                cat = Categoria(nome=nome_cat, campos_config=[])
                db.add(cat)
                db.commit()
                db.refresh(cat)

            # Insere o equipamento
            novo_ativo = Ativo(
                patrimonio=patrimonio,
                categoria_id=cat.id,
                marca=linha.get("Marca", "").strip(),
                modelo=linha.get("Modelo", "").strip(),
                secretaria=linha.get("Secretaria", "").strip(),
                setor=linha.get("Setor", "").strip(),
                status=linha.get("Status", "Ativo").strip()
            )
            db.add(novo_ativo)
            sucesso += 1

        except Exception as e:
            erros += 1

    # Carimba a Caixa-Preta
    db.add(LogAuditoria(
        usuario=usuario_acao, acao="IMPORTACAO", entidade="Sistema", identificador="Planilha CSV", 
        detalhes=f"Migração em lote: {sucesso} importados. {erros} ignorados/duplicados."
    ))
    db.commit()

    return {"message": f"Migração concluída! Sucesso: {sucesso} | Ignorados: {erros}"}

# ==========================================
# BUSCAR FICHA COMPLETA (OLHO) - ROTA CORRIGIDA
# ==========================================
@router.get("/ficha/detalhes/{patrimonio}")
def obter_detalhes_ativo(patrimonio: str, db: Session = Depends(get_db)):
    try:
        ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first()
        if not ativo:
            raise HTTPException(status_code=404, detail="Ativo não encontrado")
        
        historico = db.query(LogAuditoria).filter(LogAuditoria.identificador == patrimonio).order_by(LogAuditoria.data_hora.desc()).all()
        manutencoes = db.query(RegistroManutencao).filter(RegistroManutencao.patrimonio == patrimonio).all()
        
        return {"ativo": ativo, "historico": historico, "manutencoes": manutencoes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

# ==========================================
# EDITAR CADASTRO COMPLETO (LÁPIS) - 100% AUDITADO
# ==========================================
@router.put("/ficha/editar/{patrimonio_atual}")
def editar_ativo(patrimonio_atual: str, dados: dict, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio_atual).first()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    
    novo_patrimonio = dados.get("patrimonio", ativo.patrimonio)
    
    # Rastreia mudança de patrimônio para atualizar os logs
    if novo_patrimonio != ativo.patrimonio:
        existe = db.query(Ativo).filter(Ativo.patrimonio == novo_patrimonio).first()
        if existe: raise HTTPException(status_code=400, detail="Este patrimônio já existe!")
        db.query(LogAuditoria).filter(LogAuditoria.identificador == ativo.patrimonio).update({"identificador": novo_patrimonio})
        db.query(RegistroManutencao).filter(RegistroManutencao.patrimonio == ativo.patrimonio).update({"patrimonio": novo_patrimonio})
    
    ativo.patrimonio = novo_patrimonio
    ativo.marca = dados.get("marca", ativo.marca)
    ativo.modelo = dados.get("modelo", ativo.modelo)
    ativo.secretaria = dados.get("secretaria", ativo.secretaria)
    ativo.setor = dados.get("setor", ativo.setor)
    
    # ATUALIZA O TIPO DE EQUIPAMENTO
    if "categoria_id" in dados and str(dados["categoria_id"]).strip():
        ativo.categoria_id = int(dados["categoria_id"])
    
    if "dados_dinamicos" in dados:
        ativo.dados_dinamicos = dados["dados_dinamicos"]
    
    usuario = dados.get("usuario_acao", "Sistema")
    db.add(LogAuditoria(
        usuario=usuario, acao="EDICAO", entidade="Ativo", identificador=novo_patrimonio,
        detalhes="Correção Cadastral: Alterou dados principais, tipo de equipamento ou especificações técnicas."
    ))
    db.commit()
    return {"message": "Equipamento atualizado com sucesso!"}

# ==========================================
# EXCLUIR EQUIPAMENTO (LIXEIRA TOTAL - OBRIGA MOTIVO)
# ==========================================
@router.delete("/{patrimonio}")
def deletar_ativo(patrimonio: str, usuario_acao: str = "Admin", motivo: str = "Sem motivo", db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first()
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    
    db.delete(ativo)
    
    # AUDITORIA DA EXCLUSÃO FÍSICA COM O MOTIVO
    detalhes_log = f"ALERTA: Registro apagado permanentemente. Motivo: {motivo}"
    
    db.add(LogAuditoria(
        usuario=usuario_acao, acao="EXCLUSAO", entidade="Ativo", identificador=patrimonio,
        detalhes=detalhes_log
    ))
    db.commit()
    return {"message": "Equipamento excluído da base com sucesso!"}

# ==========================================
# GESTÃO DE CATEGORIAS (TIPOS DE EQUIPAMENTO)
# ==========================================
@router.put("/categorias/{categoria_id}")
def editar_categoria(categoria_id: int, dados: dict, db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    
    nome_antigo = cat.nome
    cat.nome = dados.get("nome", cat.nome)
    
    if "campos_config" in dados:
        cat.campos_config = dados["campos_config"]
        
    usuario = dados.get("usuario_acao", "Admin")
    db.add(LogAuditoria(usuario=usuario, acao="EDICAO", entidade="Categoria", identificador=cat.nome, detalhes=f"Editou o tipo de equipamento '{nome_antigo}'."))
    db.commit()
    return {"message": "Categoria atualizada!"}

@router.delete("/categorias/{categoria_id}")
def deletar_categoria(categoria_id: int, usuario_acao: str = "Admin", db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    
    # Verifica se existem equipamentos usando este tipo
    em_uso = db.query(Ativo).filter(Ativo.categoria_id == categoria_id).first()
    if em_uso:
        raise HTTPException(status_code=400, detail="Não é possível excluir! Existem equipamentos cadastrados com este Tipo.")
        
    nome_apagado = cat.nome
    db.delete(cat)
    
    db.add(LogAuditoria(usuario=usuario_acao, acao="EXCLUSAO", entidade="Categoria", identificador=nome_apagado, detalhes=f"Excluiu o tipo de equipamento '{nome_apagado}'."))
    db.commit()
    return {"message": "Categoria excluída com sucesso!"}