import os, uuid, json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.models import Ativo, Categoria, HistoricoLeitura
from .inventario_core import get_db, obter_proximo_patrimonio

router = APIRouter(prefix="/inventario", tags=["Inventário - Agente Sentinel"])

COMANDO_GLOBAL = {"id": None, "status": "OCIOSO", "timestamp": None, "agentes_concluidos": 0}

@router.get("/download/agente")
def baixar_agente():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    caminho_arquivo = os.path.join(BASE_DIR, "app", "static", "Nexus_Instalador_v5.exe") # Ajuste se a pasta static for diferente
    if os.path.exists(caminho_arquivo):
        return FileResponse(path=caminho_arquivo, filename="Nexus_Instalador_v5.exe", media_type='application/octet-stream')
    raise HTTPException(status_code=404, detail="Arquivo não achado no servidor.")

@router.get("/agente/versao")
def versao_agente():
    return {"versao_atual": "5.0", "url_download": "/api/inventario/download/agente"}

@router.post("/agente/coleta")
def receber_coleta_agente(dados: dict = Body(...), db: Session = Depends(get_db)):
    mac_recebido = dados.get("mac", "Desconhecido")
    serial_recebido = dados.get("serial", "Desconhecido")
    patrimonio_manual = str(dados.get("patrimonio_manual", "")).strip()
    override = dados.get("override_patrimonio", False)
    uuid_persistente = dados.get("uuid_persistente")

    ativo_existente = db.query(Ativo).filter(Ativo.uuid_persistente == uuid_persistente).first() if uuid_persistente else None

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
        
        if dados.get("secretaria") and dados.get("secretaria") != "Ping Automático": ativo_existente.secretaria = dados.get("secretaria")
        if dados.get("setor") and dados.get("setor") != "Background": ativo_existente.setor = dados.get("setor")
        
        if paginas:
            try: db.add(HistoricoLeitura(patrimonio=ativo_existente.patrimonio, data_leitura=datetime.utcnow(), paginas_totais=int(str(paginas).replace(".", "").strip())))
            except: pass
            
        db.commit()
        return {"status": "success", "patrimonio": ativo_existente.patrimonio}
        
    else:
        novo_patrimonio = patrimonio_manual if patrimonio_manual else obter_proximo_patrimonio(db)
        cat_nome = "Multifuncional" if paginas else "Desktop"
        cat = db.query(Categoria).filter(Categoria.nome == cat_nome).first()
        if not cat:
            cat = Categoria(nome=cat_nome, campos_config=[]); db.add(cat); db.commit(); db.refresh(cat)

        novo_ativo = Ativo(
            patrimonio=novo_patrimonio, categoria_id=cat.id, uuid_persistente=uuid_persistente, 
            marca=dados.get("marca", ""), modelo=dados.get("modelo", ""), secretaria=dados.get("secretaria", "A Definir"), 
            setor=dados.get("setor", "A Definir"), tecnico="Nexus Agente", status="ATIVO", dados_dinamicos=hardwares, ultima_comunicacao=datetime.utcnow()
        )
        db.add(novo_ativo); db.flush() 
        
        if paginas:
            try: db.add(HistoricoLeitura(patrimonio=novo_patrimonio, data_leitura=datetime.utcnow(), paginas_totais=int(str(paginas).replace(".", "").strip())))
            except: pass

        db.commit()
        return {"status": "success", "patrimonio": novo_patrimonio}

@router.post("/solicitar_coleta")
def solicitar_coleta():
    COMANDO_GLOBAL["id"] = str(uuid.uuid4()); COMANDO_GLOBAL["status"] = "BROADCASTING"; COMANDO_GLOBAL["timestamp"] = datetime.utcnow(); COMANDO_GLOBAL["agentes_concluidos"] = 0
    return {"message": "Sinal enviado", "id_comando": COMANDO_GLOBAL["id"]}

@router.post("/agente/comando/enviar")
def enviar_comando_global():
    COMANDO_GLOBAL["id"] = str(uuid.uuid4()); COMANDO_GLOBAL["status"] = "BROADCASTING"; COMANDO_GLOBAL["timestamp"] = datetime.utcnow(); COMANDO_GLOBAL["agentes_concluidos"] = 0
    return {"id_comando": COMANDO_GLOBAL["id"], "status": "BROADCASTING"}

@router.get("/agente/comando")
def ler_comando_agente(cliente: str = None):
    if COMANDO_GLOBAL["status"] == "BROADCASTING" and COMANDO_GLOBAL["timestamp"]:
        if (datetime.utcnow() - COMANDO_GLOBAL["timestamp"]).total_seconds() < 60: return {"comando": "FORCAR_COLETA", "id_comando": COMANDO_GLOBAL["id"]}
        else: COMANDO_GLOBAL["status"] = "CONCLUIDO"
    return {"comando": "NENHUM"}

@router.post("/agente/comando/concluir")
def concluir_comando_agente(req: dict):
    if req.get("id_comando") == COMANDO_GLOBAL["id"]: COMANDO_GLOBAL["agentes_concluidos"] += 1
    return {"message": "OK"}

@router.get("/agente/comando/status")
def status_comando_global():
    if COMANDO_GLOBAL["timestamp"]:
        segundos = (datetime.utcnow() - COMANDO_GLOBAL["timestamp"]).total_seconds()
        if COMANDO_GLOBAL["status"] == "BROADCASTING" and segundos >= 60: COMANDO_GLOBAL["status"] = "CONCLUIDO"
        elif segundos > 120: COMANDO_GLOBAL["status"] = "OCIOSO"
    return {"status": COMANDO_GLOBAL["status"], "agentes_concluidos": COMANDO_GLOBAL.get("agentes_concluidos", 0)}