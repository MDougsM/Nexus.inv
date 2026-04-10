from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import Ativo, Categoria, UnidadeAdministrativa, LogAuditoria
import pandas as pd
from io import BytesIO
import json

router = APIRouter(prefix="/importacao", tags=["Importacao"])

def ler_csv(contents):
    try:
        df = pd.read_csv(BytesIO(contents), encoding='utf-8', sep=None, engine='python')
    except:
        df = pd.read_csv(BytesIO(contents), encoding='latin1', sep=None, engine='python')
    df.columns = [str(c).strip() for c in df.columns]
    return df

@router.post("/locais")
async def importar_locais(file: UploadFile = File(...), db: Session = Depends(get_db)):
    df = ler_csv(await file.read())
    sucesso = 0
    for _, row in df.iterrows():
        sec_nome = str(row.get("Secretaria", "")).strip().upper()
        setor_nome = str(row.get("Setor", "")).strip().upper()
        
        if not sec_nome or sec_nome == "NAN": continue
        
        # 1. Cria ou acha Unidade Pai (Secretaria)
        sec_db = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.nome == sec_nome, UnidadeAdministrativa.pai_id == None).first()
        if not sec_db:
            sec_db = UnidadeAdministrativa(nome=sec_nome, tipo="SECRETARIA")
            db.add(sec_db)
            db.commit()
            db.refresh(sec_db)
            
        # 2. Cria ou acha Unidade Filha (Setor) vinculada ao Pai
        if setor_nome and setor_nome != "NAN":
            setor_db = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.nome == setor_nome, UnidadeAdministrativa.pai_id == sec_db.id).first()
            if not setor_db:
                setor_db = UnidadeAdministrativa(nome=setor_nome, tipo="SETOR", pai_id=sec_db.id)
                db.add(setor_db)
                db.commit()
        sucesso += 1
    return {"message": f"Locais mapeados! {sucesso} linhas verificadas."}

@router.post("/categorias")
async def importar_categorias(file: UploadFile = File(...), db: Session = Depends(get_db)):
    df = ler_csv(await file.read())
    sucesso = 0
    for _, row in df.iterrows():
        nome = str(row.get("Nome", "")).strip()
        campos_str = str(row.get("Campos", "")).strip()
        
        if not nome or nome.lower() == "nan": continue
        
        cat_db = db.query(Categoria).filter(Categoria.nome == nome).first()
        if not cat_db:
            lista_campos = []
            if campos_str and campos_str.lower() != "nan":
                nomes_campos = [c.strip() for c in campos_str.split(",") if c.strip()]
                lista_campos = [{"nome": c, "tipo": "text"} for c in nomes_campos]
            
            cat_db = Categoria(nome=nome, campos_config=lista_campos)
            db.add(cat_db)
            db.commit()
            sucesso += 1
    return {"message": f"Tipos criados: {sucesso} registros."}

@router.post("/ativos")
async def importar_ativos(file: UploadFile = File(...), usuario: str = Form("admin"), db: Session = Depends(get_db)):
    df = ler_csv(await file.read())
    
    col_patrimonio = next((c for c in df.columns if "patrim" in c.lower()), None)
    if not col_patrimonio:
        raise HTTPException(status_code=400, detail="Coluna 'Patrimonio' não encontrada no CSV.")
        
    sucesso, ignorados = 0, 0
    categorias_bd = {c.nome: c for c in db.query(Categoria).all()}
    
    for _, row in df.iterrows():
        patrimonio = str(row.get(col_patrimonio, "")).strip()
        if not patrimonio or patrimonio.lower() == "nan": continue
        
        if db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first():
            ignorados += 1
            continue
            
        sec_nome = str(row.get("Secretaria", "")).strip().upper()
        setor_nome = str(row.get("Setor", "")).strip().upper()
        cat_nome = str(row.get("Categoria", "OUTROS")).strip()
        marca = str(row.get("Marca", "")).strip()
        modelo = str(row.get("Modelo", "")).strip()
        status = str(row.get("Status", "ATIVO")).strip().upper()
        
        if marca.lower() == "nan": marca = ""
        if modelo.lower() == "nan": modelo = ""
        if status.lower() == "nan": status = "ATIVO"
        
        cat_db = categorias_bd.get(cat_nome)
        cat_id = cat_db.id if cat_db else None
        
        # Lógica de conexão com UnidadeAdministrativa
        unidade_alvo_id = None
        if sec_nome and sec_nome != "NAN":
            sec_db = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.nome == sec_nome, UnidadeAdministrativa.pai_id == None).first()
            if sec_db:
                unidade_alvo_id = sec_db.id
                if setor_nome and setor_nome != "NAN":
                    setor_db = db.query(UnidadeAdministrativa).filter(UnidadeAdministrativa.nome == setor_nome, UnidadeAdministrativa.pai_id == sec_db.id).first()
                    if setor_db:
                        unidade_alvo_id = setor_db.id

        dados_dinamicos = {}
        if cat_db and cat_db.campos_config:
            campos_config = cat_db.campos_config if isinstance(cat_db.campos_config, list) else json.loads(cat_db.campos_config)
            for cfg in campos_config:
                campo_nome = cfg["nome"]
                if campo_nome in df.columns:
                    val = str(row.get(campo_nome, "")).strip()
                    if val and val.lower() != "nan":
                        dados_dinamicos[campo_nome] = val
                        
        ativo = Ativo(
            patrimonio=patrimonio, status=status, marca=marca, modelo=modelo,
            secretaria=sec_nome, setor=setor_nome, categoria_id=cat_id,
            unidade_id=unidade_alvo_id, # 🚀 NOVA CHAVE GOVERNAMENTAL
            dados_dinamicos=dados_dinamicos
        )
        db.add(ativo)
        db.add(LogAuditoria(usuario=usuario, acao="IMPORTACAO", entidade="Ativo", identificador=patrimonio, detalhes="Carga inicial em lote (CSV)."))
        db.commit()
        sucesso += 1
        
    return {"message": f"MIGRAÇÃO DE SUCESSO! {sucesso} ativos importados. ({ignorados} já existiam)."}