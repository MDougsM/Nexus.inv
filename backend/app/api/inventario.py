import csv
import io
import os
import uuid
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Header
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, func
from pydantic import BaseModel

from app.db.database import SessionLocal
from app.models import Ativo, Categoria, LogAuditoria, RegistroManutencao, HistoricoLeitura

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from reportlab.graphics.shapes import Drawing, Line
from reportlab.lib.enums import TA_CENTER

from reportlab.graphics.barcode import code128, qr
from reportlab.lib.units import mm

def obter_proximo_patrimonio(db: Session) -> str:
    """Busca o maior número do novo padrão NXS-XXXX e retorna o próximo da fila"""
    # 🚀 Agora ele só procura os que começam com a nova identidade
    ativos = db.query(Ativo.patrimonio).filter(Ativo.patrimonio.like('NXS-%')).all()
    
    max_num = 0
    for a in ativos:
        numeros = re.findall(r'\d+', a[0])
        if numeros:
            num = int(numeros[-1])
            if num > max_num:
                max_num = num
                
    proximo_num = max_num + 1
    
    # 🚀 Formata com 4 zeros à esquerda (ex: NXS-0001, NXS-0042)
    return f"NXS-{proximo_num:04d}"

# ==========================================
# CONFIGURAÇÕES DO ROUTER
# ==========================================
router = APIRouter(prefix="/inventario", tags=["Inventário"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# SCHEMAS (PYDANTIC)
# ==========================================
class CategoriaRequest(BaseModel):
    nome: str
    campos_config: List[Dict[str, str]]

class AtivoRequest(BaseModel):
    # 🚀 Alterado para Optional para aceitar cadastro manual sem patrimônio
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

class FiltroRelatorio(BaseModel):
    dataInicio: str
    dataFim: str
    secretarias: List[str]
    setores: List[str]
    patrimonio: Optional[str] = ""

# ==========================================
# ROTAS DE UTILITÁRIOS E DOWNLOADS
# ==========================================
@router.get("/download/agente")
def baixar_agente():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    caminho_arquivo = os.path.join(BASE_DIR, "static", "Nexus_Instalador_v5.exe")
    if os.path.exists(caminho_arquivo):
        return FileResponse(
            path=caminho_arquivo, 
            filename="Nexus_Instalador_v5.exe", 
            media_type='application/octet-stream'
        )
    raise HTTPException(status_code=404, detail=f"Arquivo não achado no servidor.")

@router.get("/agente/versao")
def versao_agente():
    return {
        "versao_atual": "5.0", 
        "url_download": "/api/inventario/download/agente"
    }

# ==========================================
# ROTAS DE CATEGORIA
# ==========================================
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

@router.put("/categorias/{categoria_id}")
def editar_categoria(categoria_id: int, dados: dict, db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    nome_antigo = cat.nome
    cat.nome = dados.get("nome", cat.nome)
    if "campos_config" in dados: cat.campos_config = dados["campos_config"]
    usuario = dados.get("usuario_acao", "Admin")
    db.add(LogAuditoria(usuario=usuario, acao="EDICAO", entidade="Categoria", identificador=cat.nome, detalhes=f"Editou o tipo '{nome_antigo}'."))
    db.commit()
    return {"message": "Categoria atualizada!"}

@router.delete("/categorias/{categoria_id}")
def deletar_categoria(categoria_id: int, usuario_acao: str = "Admin", db: Session = Depends(get_db)):
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat: raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    if db.query(Ativo).filter(Ativo.categoria_id == categoria_id).first():
        raise HTTPException(status_code=400, detail="Não é possível excluir! Existem equipamentos com este Tipo.")
    nome_apagado = cat.nome
    db.delete(cat)
    db.add(LogAuditoria(usuario=usuario_acao, acao="EXCLUSAO", entidade="Categoria", identificador=nome_apagado, detalhes=f"Excluiu '{nome_apagado}'."))
    db.commit()
    return {"message": "Categoria excluída com sucesso!"}

# ==========================================
# ROTAS DE GESTÃO DE ATIVOS
# ==========================================
@router.get("/")
def listar_ativos(db: Session = Depends(get_db)):
    ativos = db.query(Ativo).all()
    return [{**a.__dict__, "categoria_nome": a.categoria.nome if a.categoria else "Sem Categoria"} for a in ativos]

@router.post("/")
def criar_ativo(req: AtivoRequest, db: Session = Depends(get_db)):
    # 🚀 A MÁGICA: Se o usuário deixar em branco no painel, o Python gera o próximo NXS-
    pat_final = req.patrimonio.strip() if req.patrimonio else obter_proximo_patrimonio(db)
    
    if db.query(Ativo).filter(Ativo.patrimonio == pat_final).first():
        raise HTTPException(status_code=400, detail="Patrimônio já cadastrado.")
    
    novo_ativo = Ativo(
        patrimonio=pat_final,
        categoria_id=req.categoria_id,
        marca=req.marca,
        modelo=req.modelo,
        secretaria=req.secretaria,
        local=req.local,
        setor=req.setor,
        tecnico=req.usuario_acao,
        dados_dinamicos=req.dados_dinamicos,
        ultima_comunicacao=datetime.utcnow() 
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

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
            
    dict_atual = ativo.dados_dinamicos or {}
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
        # 🛡️ CORREÇÃO DE SEGURANÇA: Evitando SQL Injection usando parâmetros vinculados (:pat)
        params = {"pat": ativo.patrimonio}
        db.execute(text("DELETE FROM historicoleitura WHERE patrimonio = :pat"), params)
        db.execute(text("DELETE FROM logauditoria WHERE identificador = :pat"), params)
        db.execute(text("DELETE FROM registromanutencao WHERE patrimonio = :pat"), params)
        db.delete(ativo)
        
        db.add(LogAuditoria(usuario=usuario_acao, acao="EXCLUSAO", entidade="Ativo", identificador=ativo.patrimonio, detalhes=f"ALERTA: Registro apagado. Motivo: {motivo}"))
        db.commit()
        return {"message": "Equipamento excluído da base com sucesso!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# IMPORTAÇÃO DE DADOS (CSV)
# ==========================================
@router.post("/upload-csv")
async def importar_csv(file: UploadFile = File(...), usuario_acao: str = Form(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Formato inválido. Use um arquivo .csv")

    conteudo = await file.read()
    try: texto = conteudo.decode('utf-8')
    except: texto = conteudo.decode('latin-1')

    leitor = csv.DictReader(io.StringIO(texto), delimiter=';') 
    sucesso, erros = 0, 0

    for linha in leitor:
        try:
            patrimonio = linha.get("Patrimonio", "").strip()
            if not patrimonio or db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first():
                erros += 1; continue

            nome_cat = linha.get("Categoria", "Diversos").strip() or "Diversos"
            cat = db.query(Categoria).filter(Categoria.nome == nome_cat).first()
            if not cat:
                cat = Categoria(nome=nome_cat, campos_config=[])
                db.add(cat); db.commit(); db.refresh(cat)

            novo_ativo = Ativo(
                patrimonio=patrimonio, categoria_id=cat.id, marca=linha.get("Marca", "").strip(),
                modelo=linha.get("Modelo", "").strip(), secretaria=linha.get("Secretaria", "").strip(),
                local=linha.get("Local", "").strip(), setor=linha.get("Setor", "").strip(), status=linha.get("Status", "Ativo").strip()
            )
            db.add(novo_ativo)
            sucesso += 1
        except Exception as e: 
            print(f"Erro ao importar linha: {e}")
            erros += 1

    db.add(LogAuditoria(usuario=usuario_acao, acao="IMPORTACAO", entidade="Sistema", identificador="Planilha CSV", detalhes=f"Migração em lote: {sucesso} importados. {erros} ignorados/duplicados."))
    db.commit()
    return {"message": f"Migração concluída! Sucesso: {sucesso} | Ignorados: {erros}"}

# ==========================================
# COMUNICAÇÃO COM OS AGENTES (COLETA E C2)
# ==========================================
@router.post("/agente/coleta")
def receber_coleta_agente(dados: dict = Body(...), db: Session = Depends(get_db)):
    mac_recebido = dados.get("mac", "Desconhecido")
    serial_recebido = dados.get("serial", "Desconhecido")
    patrimonio_manual = str(dados.get("patrimonio_manual", "")).strip()
    override = dados.get("override_patrimonio", False)
    uuid_persistente = dados.get("uuid_persistente")

    ativo_existente = None
    if uuid_persistente: 
        ativo_existente = db.query(Ativo).filter(Ativo.uuid_persistente == uuid_persistente).first()

    if not ativo_existente:
        for a in db.query(Ativo).all():
            d_din = a.dados_dinamicos or {}
            if isinstance(d_din, str):
                try: d_din = json.loads(d_din.replace("'", '"'))
                except: d_din = {}
                
            mac_no_banco = d_din.get("Endereço MAC")
            serial_no_banco = d_din.get("Número de Série", d_din.get("Serial", ""))
            
            if (mac_recebido != "Desconhecido" and mac_no_banco == mac_recebido) or \
               (serial_recebido != "Desconhecido" and serial_recebido and serial_recebido in serial_no_banco):
                ativo_existente = a
                if uuid_persistente: ativo_existente.uuid_persistente = uuid_persistente
                break

    hardwares = dados.get("dados_dinamicos") or dados.get("snmp") or dados.get("especificacoes")
    if not hardwares:
        hardwares = {
            "Processador": dados.get("cpu"), "Memória": dados.get("ram"), "S.O": dados.get("os"), "Nome": dados.get("nome_pc"),
            "Usuário": dados.get("usuario_pc"), "Número de Série": serial_recebido, "Endereço MAC": mac_recebido, 
            "Endereço IP": dados.get("ip", "Desconhecido"), f"Disco Rígido [{dados.get('tipo_disco', 'HD')}]": dados.get("disco")
        }

    paginas = hardwares.get("Páginas Impressas") or hardwares.get("paginas_totais") or hardwares.get("Paginas")

    if ativo_existente:
        if patrimonio_manual and patrimonio_manual != ativo_existente.patrimonio and dados.get("secretaria") != "Ping Automático":
            if not override: return {"status": "conflict", "message": "Patrimônio em uso"}
            else: ativo_existente.patrimonio = patrimonio_manual

        ativo_existente.ultima_comunicacao = datetime.utcnow()
        ativo_existente.dados_dinamicos = hardwares
        ativo_existente.marca = dados.get("marca") or ativo_existente.marca
        ativo_existente.modelo = dados.get("modelo") or ativo_existente.modelo
        
        if dados.get("secretaria") and dados.get("secretaria") != "Ping Automático": 
            ativo_existente.secretaria = dados.get("secretaria")
        if dados.get("setor") and dados.get("setor") != "Background": 
            ativo_existente.setor = dados.get("setor")
        
        if paginas:
            try:
                pag_int = int(str(paginas).replace(".", "").strip())
                db.add(HistoricoLeitura(patrimonio=ativo_existente.patrimonio, data_leitura=datetime.utcnow(), paginas_totais=pag_int))
            except: pass
            
        db.commit()
        return {"status": "success", "patrimonio": ativo_existente.patrimonio}
        
    else:
        # 🚀 A MÁGICA SEQUENCIAL ACONTECE AQUI
        if patrimonio_manual:
            novo_patrimonio = patrimonio_manual
        else:
            novo_patrimonio = obter_proximo_patrimonio(db)
            
        cat_nome = "Multifuncional" if paginas else "Desktop"
        cat = db.query(Categoria).filter(Categoria.nome == cat_nome).first()
        if not cat:
            cat = Categoria(nome=cat_nome, campos_config=[]); db.add(cat); db.commit(); db.refresh(cat)

        novo_ativo = Ativo(
            patrimonio=novo_patrimonio, categoria_id=cat.id, uuid_persistente=uuid_persistente, 
            marca=dados.get("marca", ""), modelo=dados.get("modelo", ""), 
            secretaria=dados.get("secretaria", "A Definir"), setor=dados.get("setor", "A Definir"), 
            tecnico="Nexus Agente", status="ATIVO", dados_dinamicos=hardwares, ultima_comunicacao=datetime.utcnow()
        )
        db.add(novo_ativo)
        db.flush() 
        
        if paginas:
            try:
                pag_int = int(str(paginas).replace(".", "").strip())
                db.add(HistoricoLeitura(patrimonio=novo_patrimonio, data_leitura=datetime.utcnow(), paginas_totais=pag_int))
            except: pass

        db.commit()
        return {"status": "success", "patrimonio": novo_patrimonio}

# --- COMANDO E CONTROLE (C2) ---
# Nota do Tech Lead: Em produção (múltiplos workers), evite variáveis globais de memória como esta.
# O ideal no futuro é salvar os status de broadcast no Banco de Dados ou Redis!
COMANDO_GLOBAL = {"id": None, "status": "OCIOSO", "timestamp": None, "agentes_concluidos": 0}

@router.post("/solicitar_coleta")
def solicitar_coleta():
    COMANDO_GLOBAL["id"] = str(uuid.uuid4())
    COMANDO_GLOBAL["status"] = "BROADCASTING"
    COMANDO_GLOBAL["timestamp"] = datetime.utcnow()
    COMANDO_GLOBAL["agentes_concluidos"] = 0
    return {"message": "Sinal enviado", "id_comando": COMANDO_GLOBAL["id"]}

@router.post("/agente/comando/enviar")
def enviar_comando_global():
    COMANDO_GLOBAL["id"] = str(uuid.uuid4())
    COMANDO_GLOBAL["status"] = "BROADCASTING"
    COMANDO_GLOBAL["timestamp"] = datetime.utcnow()
    COMANDO_GLOBAL["agentes_concluidos"] = 0
    return {"id_comando": COMANDO_GLOBAL["id"], "status": "BROADCASTING"}

@router.get("/agente/comando")
def ler_comando_agente(cliente: str = None):
    if COMANDO_GLOBAL["status"] == "BROADCASTING" and COMANDO_GLOBAL["timestamp"]:
        if (datetime.utcnow() - COMANDO_GLOBAL["timestamp"]).total_seconds() < 60:
            return {"comando": "FORCAR_COLETA", "id_comando": COMANDO_GLOBAL["id"]}
        else:
            COMANDO_GLOBAL["status"] = "CONCLUIDO"
    return {"comando": "NENHUM"}

@router.post("/agente/comando/concluir")
def concluir_comando_agente(req: dict):
    if req.get("id_comando") == COMANDO_GLOBAL["id"]:
        COMANDO_GLOBAL["agentes_concluidos"] += 1
    return {"message": "OK"}

@router.get("/agente/comando/status")
def status_comando_global():
    if COMANDO_GLOBAL["timestamp"]:
        segundos = (datetime.utcnow() - COMANDO_GLOBAL["timestamp"]).total_seconds()
        if COMANDO_GLOBAL["status"] == "BROADCASTING" and segundos >= 60:
            COMANDO_GLOBAL["status"] = "CONCLUIDO"
        elif segundos > 120:
            COMANDO_GLOBAL["status"] = "OCIOSO"
            
    return {
        "status": COMANDO_GLOBAL["status"], 
        "agentes_concluidos": COMANDO_GLOBAL.get("agentes_concluidos", 0)
    }


# ==========================================
# RELATÓRIOS E HISTÓRICOS
# ==========================================
@router.get("/leituras/{patrimonio_ou_id:path}")
def obter_historico_leituras(patrimonio_ou_id: str, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(or_(Ativo.patrimonio == patrimonio_ou_id, Ativo.id == (int(patrimonio_ou_id) if patrimonio_ou_id.isdigit() else -1))).first()
    if not ativo: return []

    leituras = db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == ativo.patrimonio).order_by(HistoricoLeitura.data_leitura.desc()).limit(1000).all()
    leituras.reverse() 

    return [
        {
            "id": l.id,
            "data_raw": (l.data_leitura - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S"), 
            "paginas": l.paginas_totais
        } for l in leituras
    ]

@router.get("/relatorio/mps/exportar")
def exportar_relatorio_mps(secretaria: str = "", local: str = "", db: Session = Depends(get_db)):
    cats = db.query(Categoria).filter(Categoria.nome.in_(["Multifuncional", "Impressora"])).all()
    cat_ids = [c.id for c in cats]
    query = db.query(Ativo).filter(Ativo.categoria_id.in_(cat_ids))
    if secretaria: query = query.filter(Ativo.secretaria == secretaria)
    if local: query = query.filter(Ativo.local == local)
    ativos = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Patrimonio', 'Modelo', 'IP', 'Serial', 'Secretaria', 'Local', 'Setor', 'Toner (%)', 'Cilindro (%)', 'Odometro Total', 'Status'])
    
    for a in ativos:
        specs = a.dados_dinamicos or {}
        writer.writerow([a.patrimonio, a.modelo, specs.get('ip', ''), specs.get('serial', ''), a.secretaria, a.local, a.setor, specs.get('toner', ''), specs.get('cilindro', ''), specs.get('paginas_totais', ''), a.status])
    
    encoded_output = output.getvalue().encode('utf-8-sig')
    return StreamingResponse(io.BytesIO(encoded_output), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=Faturamento_MPS_{secretaria or 'Geral'}.csv"})

@router.post("/relatorios/faturamento")
def relatorio_faturamento_avancado(filtro: FiltroRelatorio, db: Session = Depends(get_db)):
    query_ativos = db.query(Ativo)
    if filtro.secretarias: query_ativos = query_ativos.filter(Ativo.secretaria.in_(filtro.secretarias))
    if filtro.setores: query_ativos = query_ativos.filter(Ativo.setor.in_(filtro.setores))
    if filtro.patrimonio: query_ativos = query_ativos.filter(Ativo.patrimonio.ilike(f"%{filtro.patrimonio}%"))
    
    lista_ativos = query_ativos.all()
    relatorio = []

    for ativo in lista_ativos:
        inicial = db.query(HistoricoLeitura).filter(
            HistoricoLeitura.patrimonio == ativo.patrimonio, HistoricoLeitura.data_leitura >= filtro.dataInicio
        ).order_by(HistoricoLeitura.data_leitura.asc()).first()

        final = db.query(HistoricoLeitura).filter(
            HistoricoLeitura.patrimonio == ativo.patrimonio, HistoricoLeitura.data_leitura <= filtro.dataFim + " 23:59:59"
        ).order_by(HistoricoLeitura.data_leitura.desc()).first()

        if inicial and final:
            relatorio.append({
                "patrimonio": ativo.patrimonio, "modelo": ativo.modelo, "secretaria": ativo.secretaria,
                "setor": ativo.setor, "inicial": inicial.paginas_totais, "final": final.paginas_totais,
                "consumo": final.paginas_totais - inicial.paginas_totais
            })
    return relatorio

@router.post("/relatorios/faturamento/pdf")
def relatorio_faturamento_pdf(filtros: FiltroRelatorio, db: Session = Depends(get_db)):
    query_ativos = db.query(Ativo)
    if filtros.patrimonio: query_ativos = query_ativos.filter(Ativo.patrimonio.ilike(f"%{filtros.patrimonio}%"))
    if filtros.secretarias: query_ativos = query_ativos.filter(Ativo.secretaria.in_(filtros.secretarias))
    if filtros.setores: query_ativos = query_ativos.filter(Ativo.setor.in_(filtros.setores))
        
    lista_ativos = query_ativos.all()
    dados_tabela = [["Patrimônio", "Modelo", "Secretaria", "Setor", "Inicial", "Final", "Consumo"]]
    total_consumo = 0

    for a in lista_ativos:
        leitura_inicial = db.query(HistoricoLeitura).filter(
            HistoricoLeitura.patrimonio == a.patrimonio, HistoricoLeitura.data_leitura >= f"{filtros.dataInicio} 00:00:00"
        ).order_by(HistoricoLeitura.data_leitura.asc()).first()

        leitura_final = db.query(HistoricoLeitura).filter(
            HistoricoLeitura.patrimonio == a.patrimonio, HistoricoLeitura.data_leitura <= f"{filtros.dataFim} 23:59:59"
        ).order_by(HistoricoLeitura.data_leitura.desc()).first()

        if leitura_inicial and leitura_final and leitura_final.paginas_totais >= leitura_inicial.paginas_totais:
            consumo = leitura_final.paginas_totais - leitura_inicial.paginas_totais
            dados_tabela.append([
                a.patrimonio, a.modelo[:20] if a.modelo else 'Desconhecido', 
                a.secretaria[:15] if a.secretaria else 'S/N', a.setor[:15] if a.setor else 'S/N', 
                str(leitura_inicial.paginas_totais), str(leitura_final.paginas_totais), str(consumo)
            ])
            total_consumo += consumo

    dados_tabela.append(["", "", "", "", "", "TOTAL GERAL:", f"{total_consumo} pág."])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    elementos = []
    estilos = getSampleStyleSheet()
    
    elementos.append(Paragraph(f"Relatório de Faturamento Manual", estilos['Title']))
    elementos.append(Paragraph(f"<b>Período:</b> {filtros.dataInicio} até {filtros.dataFim}", estilos['Normal']))
    elementos.append(Spacer(1, 20))
    
    tabela = Table(dados_tabela)
    tabela.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (-1, -1), (-1, -1), colors.HexColor("#dc2626"))
    ]))
    elementos.append(tabela)
    
    doc.build(elementos)
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=Faturamento_{filtros.dataInicio}.pdf"
    })

@router.get("/patrimonios/status")
def status_patrimonios(db: Session = Depends(get_db)):
    """Retorna os patrimônios já em uso e a sugestão do próximo livre"""
    ativos = db.query(Ativo.patrimonio, Ativo.modelo).all()
    
    usados = [{"patrimonio": a[0], "modelo": a[1] or "Desconhecido"} for a in ativos]
    # Ordena alfabeticamente para o React mostrar bonitinho
    usados = sorted(usados, key=lambda x: x["patrimonio"])
    
    proximo_livre = obter_proximo_patrimonio(db)
    
    return {
        "proximo_livre": proximo_livre,
        "total_usados": len(usados),
        "lista_usados": usados
    }

class EtiquetasRequest(BaseModel):
    patrimonios: List[str]
    url_base: str = ""

@router.post("/patrimonios/etiquetas/pdf")
def gerar_etiquetas_pdf(req: EtiquetasRequest, db: Session = Depends(get_db)):
    """Gera um PDF formato Etiqueta Térmica Vertical (1 por página) com QR Code Funcional"""
    
    # Filtro: Só pega os que REALMENTE existem no banco de dados
    ativos_db = db.query(Ativo).filter(Ativo.patrimonio.in_(req.patrimonios)).order_by(Ativo.patrimonio).all()

    if not ativos_db:
        raise HTTPException(status_code=400, detail="Nenhum patrimônio cadastrado encontrado neste intervalo.")

    buffer = io.BytesIO()
    
    # 🚀 Formato Térmico Padrão: 50mm x 80mm
    largura_etiqueta = 50 * mm
    altura_etiqueta = 80 * mm
    
    doc = SimpleDocTemplate(buffer, pagesize=(largura_etiqueta, altura_etiqueta), 
                            leftMargin=3*mm, rightMargin=3*mm, topMargin=5*mm, bottomMargin=3*mm)
    
    elementos = []
    estilos = getSampleStyleSheet()
    
    estilo_topo = ParagraphStyle('Topo', parent=estilos['Normal'], fontName='Helvetica-Bold', fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor("#1e293b"))
    estilo_pat = ParagraphStyle('Pat', parent=estilos['Normal'], fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=colors.HexColor("#1e293b"))
    estilo_cat = ParagraphStyle('Cat', parent=estilos['Normal'], fontName='Helvetica-Bold', fontSize=7, alignment=TA_CENTER, textColor=colors.HexColor("#64748b"))

    for ativo in ativos_db:
        # 1. Título
        elementos.append(Paragraph("NEXUS.INV", estilo_topo))
        elementos.append(Spacer(1, 2*mm))

        # 2. Linha Divisória
        linha = Drawing(40*mm, 1*mm)
        linha.add(Line(0, 0, 40*mm, 0, strokeColor=colors.HexColor("#cbd5e1"), strokeWidth=0.8))
        linha.hAlign = 'CENTER'
        elementos.append(linha)
        elementos.append(Spacer(1, 4*mm))

        # 3. QR Code Funcional (Link da ficha técnica)
        url_qr = f"{req.url_base}/consulta/{ativo.patrimonio}" if req.url_base else f"https://nexus.inv/consulta/{ativo.patrimonio}"
        qr_code = qr.QrCodeWidget(url_qr)
        tam_qr = 32 * mm 
        bounds = qr_code.getBounds()
        w, h = bounds[2] - bounds[0], bounds[3] - bounds[1]
        desenho_qr = Drawing(tam_qr, tam_qr, transform=[tam_qr/w, 0, 0, tam_qr/h, 0, 0])
        desenho_qr.hAlign = 'CENTER'
        elementos.append(desenho_qr)
        elementos.append(Spacer(1, 6*mm))

        # 4. Patrimônio Gigante
        elementos.append(Paragraph(ativo.patrimonio, estilo_pat))
        elementos.append(Spacer(1, 2*mm))

        # 5. Categoria/Modelo no rodapé
        cat_nome = ativo.categoria.nome.upper() if ativo.categoria else "EQUIPAMENTO"
        elementos.append(Paragraph(cat_nome, estilo_cat))
        
        # 🚀 O SEGREDO: Força a quebra de página. A próxima etiqueta vai para a próxima folha térmica.
        elementos.append(PageBreak()) 
        
    doc.build(elementos)
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=Nexus_Etiquetas_Termicas.pdf"
    })