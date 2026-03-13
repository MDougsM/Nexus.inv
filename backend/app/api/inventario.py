from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Ativo, Categoria, LogAuditoria, RegistroManutencao
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi.responses import FileResponse
from datetime import datetime
from app.schemas import AgenteColeta # Adicione esta linha se não houver

import csv
import io
import os

# ==========================================
# CONFIGURAÇÕES DO AGENTE
# ==========================================
VERSAO_DESTE_AGENTE = "4.4" # A versão que está rodando na máquina
BASE_URL = "http://localhost:8001" # Seu IP
COLETA_URL = f"{BASE_URL}/api/inventario/agente/coleta"
VERSAO_URL = f"{BASE_URL}/api/inventario/agente/versao"

router = APIRouter(prefix="/inventario", tags=["Inventário"])

@router.get("/download/agente")
def baixar_agente():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Apontando para o Instalador Profissional gerado pelo Inno Setup
    caminho_arquivo = os.path.join(BASE_DIR, "static", "Nexus_Instalador.exe")
    
    if os.path.exists(caminho_arquivo):
        return FileResponse(
            path=caminho_arquivo, 
            filename="Nexus_Instalador.exe", 
            media_type='application/octet-stream' # Volta a ser formato Executável
        )
    
    raise HTTPException(status_code=404, detail=f"Arquivo não achado em: {caminho_arquivo}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 👇 NOVA ROTA DE CHECAGEM DE VERSÃO 👇
@router.get("/agente/versao")
def versao_agente():
    return {
        "versao_atual": "4.4", # <--- MUDE A VERÇÃO AQUI PARA ATUALIZAR O AGENTE (E NÃO ESQUEÇA DE MUDAR TAMBÉM NO CÓDIGO DO AGENTE EM PYTHON)
        "url_download": "/api/inventario/download/agente"
    }

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
        dados_dinamicos=req.dados_dinamicos,
        ultima_comunicacao=datetime.utcnow() # <--- ADICIONE ESTA LINHA
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
@router.get("/ficha/detalhes/{patrimonio:path}")
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
@router.put("/ficha/editar/{identificador:path}")
def editar_ficha_ativo(identificador: str, dados: dict, db: Session = Depends(get_db)):
    # Tenta achar pelo ID (se for um número) ou pelo Patrimônio
    if identificador.isdigit():
        ativo = db.query(Ativo).filter(Ativo.id == int(identificador)).first()
    else:
        ativo = db.query(Ativo).filter(Ativo.patrimonio == identificador).first()
        
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")

    usuario_acao = dados.get("usuario_acao", "Sistema")
    motivo = dados.get("motivo", "Edição de dados via painel")

    # Atualiza os dados básicos
    if "patrimonio" in dados and dados["patrimonio"].strip():
        ativo.patrimonio = dados["patrimonio"].strip()
    
    ativo.categoria_id = dados.get("categoria_id", ativo.categoria_id)
    ativo.marca = dados.get("marca", ativo.marca)
    ativo.modelo = dados.get("modelo", ativo.modelo)

    # Lida com os campos dinâmicos corretamente
    novos_dinamicos = dados.get("dados_dinamicos", {})
    if isinstance(novos_dinamicos, str):
        try:
            import json
            novos_dinamicos = json.loads(novos_dinamicos)
        except:
            novos_dinamicos = {}
            
    ativo.dados_dinamicos = novos_dinamicos

    db.add(LogAuditoria(
        usuario=usuario_acao, 
        acao="EDICAO_FICHA", 
        entidade="Ativo", 
        identificador=ativo.patrimonio, 
        detalhes=f"Motivo: {motivo}"
    ))
    
    db.commit()
    return {"message": "Ficha atualizada com sucesso"}

# ==========================================
# EXCLUIR EQUIPAMENTO (LIXEIRA TOTAL - OBRIGA MOTIVO)
# ==========================================
@router.delete("/{patrimonio:path}")
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

# ==========================================
# ROTA EXCLUSIVA PARA O AGENTE (COLETA AUTO V4.4)
# ==========================================
@router.post("/agente/coleta")
def receber_coleta_agente(dados: AgenteColeta, db: Session = Depends(get_db)):
    mac_recebido = dados.mac or "Desconhecido"
    serial_recebido = dados.serial or "Desconhecido"
    patrimonio_manual = (dados.patrimonio_manual or "").strip()
    override = dados.override_patrimonio or False 
    
    # ---------------------------------------------------------
    # 🧠 LÓGICA DE RECONHECIMENTO (A VACINA ANTI-DUPLICIDADE)
    # ---------------------------------------------------------
    ativo_existente = None

    # 1º Passo: Tenta achar pelo UUID (DNA da máquina)
    if dados.uuid_persistente:
        ativo_existente = db.query(Ativo).filter(Ativo.uuid_persistente == dados.uuid_persistente).first()

    # 2º Passo: Se não achou, tenta pelo Serial ou MAC (Segurança para máquinas antigas)
    if not ativo_existente:
        for a in db.query(Ativo).all():
            if a.dados_dinamicos:
                mac_no_banco = a.dados_dinamicos.get("Endereço MAC")
                serial_no_banco = a.dados_dinamicos.get("Número de Série", "")
                
                if (mac_recebido != "Desconhecido" and mac_no_banco == mac_recebido) or \
                   (serial_recebido != "Desconhecido" and serial_recebido in serial_no_banco):
                    ativo_existente = a
                    # Se achou pelo hardware, já "vacina" gravando o UUID nela
                    if dados.uuid_persistente:
                        ativo_existente.uuid_persistente = dados.uuid_persistente
                    break

    # Montagem do hardware para comparação
    hardwares = {
        "Processador": dados.cpu, "Memória": dados.ram,
        "S.O": dados.os, "Nome": dados.nome_pc,
        "Usuário": dados.usuario_pc, "Número de Série": serial_recebido,
        "Endereço MAC": mac_recebido, "Endereço IP": dados.ip or "Desconhecido",
        f"Disco Rígido [{dados.tipo_disco or 'HD'}]": dados.disco
    }

    if ativo_existente:
        # Lógica de conflito de patrimônio manual
        if patrimonio_manual and patrimonio_manual != ativo_existente.patrimonio and dados.secretaria != "Ping Automático":
            if not override:
                return {"status": "conflict", "message": f"Esta máquina já existe como '{ativo_existente.patrimonio}'.\nDeseja alterar o patrimônio dela para '{patrimonio_manual}'?"}
            else:
                conflito_terceiro = db.query(Ativo).filter(Ativo.patrimonio == patrimonio_manual).first()
                if conflito_terceiro and conflito_terceiro.id != ativo_existente.id:
                    return {"status": "error", "message": f"O patrimônio '{patrimonio_manual}' já está em uso!"}
                
                db.add(LogAuditoria(usuario="Nexus Agente", acao="ALTERACAO_PATRIMONIO", entidade="Ativo", identificador=patrimonio_manual, detalhes=f"Patrimônio alterado de {ativo_existente.patrimonio} para {patrimonio_manual}"))
                ativo_existente.patrimonio = patrimonio_manual

        # Inteligência de Logs (Evita Spam)
        dados_antigos = ativo_existente.dados_dinamicos or {}
        mudou_hardware = dados_antigos != hardwares
        mudou_local = False
        
        if dados.secretaria and dados.secretaria != "Ping Automático" and dados.secretaria != ativo_existente.secretaria:
            ativo_existente.secretaria = dados.secretaria
            mudou_local = True
        if dados.setor and dados.setor != "Background" and dados.setor != ativo_existente.setor:
            ativo_existente.setor = dados.setor
            mudou_local = True

        ativo_existente.ultima_comunicacao = datetime.utcnow()
        
        if mudou_hardware or mudou_local:
            ativo_existente.dados_dinamicos = hardwares
            ativo_existente.marca = dados.marca or ativo_existente.marca
            ativo_existente.modelo = dados.modelo or ativo_existente.modelo
            
            db.add(LogAuditoria(
                usuario="Nexus Agente (Auto)", acao="TELEMETRIA", entidade="Ativo", 
                identificador=ativo_existente.patrimonio, detalhes="Dados atualizados automaticamente."
            ))
        
        db.commit()
        return {"status": "success", "patrimonio": ativo_existente.patrimonio}
    
    else:
        # SE A MÁQUINA É NOVA DE VERDADE
        if patrimonio_manual:
            if db.query(Ativo).filter(Ativo.patrimonio == patrimonio_manual).first():
                return {"status": "error", "message": f"O patrimônio '{patrimonio_manual}' já existe no sistema!"}
            novo_patrimonio = patrimonio_manual
        else:
            ativos_sp = db.query(Ativo).filter(Ativo.patrimonio.like("S/P_%")).all()
            numeros = [int(a.patrimonio.split("_")[1]) for a in ativos_sp if "_" in a.patrimonio and a.patrimonio.split("_")[1].isdigit()]
            novo_patrimonio = f"S/P_{max(numeros) + 1 if numeros else 1}"
            
        cat_desktop = db.query(Categoria).filter(Categoria.nome == "Desktop").first()
        if not cat_desktop:
            cat_desktop = Categoria(nome="Desktop", campos_config=[]); db.add(cat_desktop); db.commit(); db.refresh(cat_desktop)

        novo_ativo = Ativo(
            patrimonio=novo_patrimonio, 
            categoria_id=cat_desktop.id,
            uuid_persistente=dados.uuid_persistente, # <--- GRAVA O DNA NA PRIMEIRA VEZ
            marca=dados.marca or "", 
            modelo=dados.modelo or "",
            secretaria=dados.secretaria or "A Definir", 
            setor=dados.setor or "A Definir",
            tecnico="Nexus Agente (Auto)", 
            status="ATIVO",
            dados_dinamicos=hardwares, 
            ultima_comunicacao=datetime.utcnow()
        )
        db.add(novo_ativo)
        db.commit()
        return {"status": "success", "patrimonio": novo_patrimonio}