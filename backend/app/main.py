import os
import json
import uuid
import pytz
from datetime import datetime, date
from typing import Optional
from sqlalchemy import text
from cryptography.hazmat.primitives import serialization

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker
from apscheduler.schedulers.background import BackgroundScheduler

from app.schemas import ComandoCreate, ComandoResultado
from app.api import auth, unidades, auditoria, transferencia, usuarios, manutencao, importacao, agendamentos
from app.routers import inventario_core, inventario_categorias, inventario_relatorios, inventario_agente, matriz

# 🚀 IMPORTAÇÕES DA NOVA ARQUITETURA MULTI-TENANT
from app.db.database import MasterSessionLocal, Empresa, SuperAdmin, get_tenant_engine, get_db, seed_master_db
from app.models import Base, Categoria, Usuario, Ativo, LogAuditoria, HistoricoLeitura, ComandoAgente


app = FastAPI(title="Nexus SaaS Mestre")
@app.on_event("startup")
def startup():
    seed_master_db()

router = APIRouter()

# VARIÁVEIS SEGURAS PELO .ENV
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8001))
AGENTE_SECRET_TOKEN = os.getenv("AGENTE_SECRET_TOKEN", "NEXUS_AGENTE_V5_9b7e1f2a4c6d8e0f3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d")
MODO_TRANSICAO_LEGADO = os.getenv("MODO_TRANSICAO_LEGADO", "True") == "True"
EMPRESA_PADRAO_NOME = os.getenv("EMPRESA_PADRAO_NOME", "NEWPC")
EMPRESA_PADRAO_DB = os.getenv("EMPRESA_PADRAO_DB", "empresa_newpc.db")


def verificar_vencimentos_global():
    """Vigia financeiro: Bloqueia empresas inadimplentes automaticamente."""
    db = MasterSessionLocal()
    try:
        hoje = date.today()
        # Busca empresas que venceram e ainda estão marcadas como pagas (inadimplente=False)
        empresas_vencidas = db.query(Empresa).filter(
            Empresa.proximo_vencimento < hoje,
            Empresa.inadimplente == False,
            Empresa.ativo == True
        ).all()
        
        for emp in empresas_vencidas:
            emp.inadimplente = True
            print(f"🚨 [FATURAMENTO] Empresa {emp.codigo_acesso} bloqueada por falta de pagamento.")
        
        db.commit()
    except Exception as e:
        print(f"❌ Erro no robô de cobrança: {e}")
    finally:
        db.close()

# Configuração do Agendador (Adicione antes do 'app = FastAPI()')
scheduler = BackgroundScheduler()
# Roda todo dia às 00:01
scheduler.add_job(verificar_vencimentos_global, 'cron', hour=0, minute=1)
scheduler.start()

# ==========================================
# 🛡️ DEPENDÊNCIAS DE SEGURANÇA E ROTEAMENTO
# ==========================================
def validar_token_agente(x_nexus_token: str = Header(None)):
    if x_nexus_token == AGENTE_SECRET_TOKEN: return True 
    if not x_nexus_token and MODO_TRANSICAO_LEGADO: return True
    raise HTTPException(status_code=403, detail="Acesso negado. Token de Agente inválido ou ausente.")

def get_db_agente(x_nexus_token: str = Header(None)):
    """ 
    Dependency especial pro Agente (Já que ele não manda o crachá da empresa no Header).
    Redireciona a telemetria das máquinas da rua para o banco da empresa Padrão.
    """
    master_db = MasterSessionLocal()
    empresa = master_db.query(Empresa).filter(Empresa.codigo_acesso == EMPRESA_PADRAO_NOME).first()
    master_db.close()
    
    if not empresa: raise HTTPException(status_code=404, detail="Empresa padrão não encontrada")
    
    engine = get_tenant_engine(empresa.db_nome)
    TenantSessionLocal = sessionmaker(bind=engine)
    db = TenantSessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# 👤 ROTA DE PERFIL 
# ==========================================
@router.put("/usuarios/perfil/atualizar")
async def atualizar_perfil(request: Request, db: Session = Depends(get_db)):
    dados = await request.json()
    username = dados.get('username')
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    
    if not usuario: raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if 'termos_aceitos' in dados:
        aceitou = dados.get('termos_aceitos')
        usuario.termos_aceitos = aceitou
        if aceitou:
            usuario.data_aceite = datetime.utcnow()
            usuario.ip_aceite = request.client.host 
        else:
            usuario.data_aceite = None
            usuario.ip_aceite = None

    if 'nome_exibicao' in dados: usuario.nome_exibicao = dados.get('nome_exibicao')
    if 'avatar' in dados: usuario.avatar = dados.get('avatar')
    if 'email' in dados: usuario.email = dados.get('email')

    db.commit()
    db.refresh(usuario)
    return {
        "status": "sucesso", 
        "msg": "Perfil atualizado!",
        "termos_aceitos": usuario.termos_aceitos,
        "nome_exibicao": usuario.nome_exibicao,
        "avatar": usuario.avatar
    }

# ==========================================
# ⏰ SCHEDULER MULTI-TENANT (Roda os relatórios de todas as empresas ativas)
# ==========================================
fuso_horario = pytz.timezone('America/Campo_Grande')
scheduler = BackgroundScheduler(timezone=fuso_horario)
scheduler.start()

@app.on_event("startup")
def carregar_cron_jobs():
    db_master = MasterSessionLocal()
    empresas = db_master.query(Empresa).filter(Empresa.ativo == True).all()
    db_master.close()
    
    from app.api.agendamentos import gerar_e_enviar_relatorio
    from app.models import AgendamentoRelatorio

    for emp in empresas:
        engine = get_tenant_engine(emp.db_nome)
        TenantSessionLocal = sessionmaker(bind=engine)
        db = TenantSessionLocal()
        try:
            ativos = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.status == True).all()
            for ag in ativos:
                if ag.horario:
                    hora, minuto = ag.horario.split(":")
                    job_id = f"relatorio_{emp.codigo_acesso}_{ag.id}"
                    scheduler.add_job(
                        gerar_e_enviar_relatorio, 'cron', 
                        day=ag.dia_do_mes, hour=int(hora), minute=int(minuto), 
                        args=[ag.id], id=job_id, replace_existing=True
                    )
        except Exception as e:
            print(f"Erro ao carregar cron da empresa {emp.codigo_acesso}: {e}")
        finally:
            db.close()
    print(f"⏰ APScheduler iniciado! Escaneando {len(empresas)} empresas.")

# ==========================================
# 🔒 CONFIGURAÇÃO DE SEGURANÇA (CORS)
# ==========================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "") 
origens_permitidas = ["http://localhost", "http://localhost:5174", "http://localhost:8001"]
if FRONTEND_URL: origens_permitidas.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 📥 ROTAS DE UTILITÁRIOS
# ==========================================
class PingRequest(BaseModel):
    username: str

@app.post("/api/usuarios/ping")
def ping_usuario(dados: PingRequest, request: Request):
    # 🚀 Se for a Matriz, retorna OK imediatamente. Não precisa de Banco de Dados.
    if request.headers.get("x-empresa") == "NEXUS_MASTER":
        return {"status": "ok"}
    
    # Se for um cliente comum, pega o banco e atualiza o acesso
    try:
        db = next(get_db(request))
        usuario = db.query(Usuario).filter(Usuario.username == dados.username).first()
        if usuario:
            usuario.ultimo_acesso = datetime.utcnow()
            db.commit()
    except Exception:
        pass # Ignora erros de ping silenciosamente
    finally:
        try: db.close() 
        except: pass
        
    return {"status": "ok"}

@app.get("/api/usuarios/me")
def get_me(): return {"username": "Operador Nexus", "is_admin": True}

@app.get("/api/backup/download")
def download_backup():
    # Agora puxa o DB da empresa padrão pelo .env
    db_path = os.path.join(os.getenv("TENANTS_DB_DIR", "./data/tenants"), EMPRESA_PADRAO_DB)
    if os.path.exists(db_path):
        return FileResponse(path=db_path, filename="nexus_backup.db", media_type="application/octet-stream")
    return {"error": "Arquivo de banco de dados não encontrado."}

@app.get("/api/inventario/download/agente")
def download_agente():
    versao_atual = os.getenv("AGENTE_VERSION", "5.0")
    nome_arquivo = f"Nexus_Instalador_v{versao_atual}.exe"
    caminho = os.path.join("app", "static", nome_arquivo)
    
    if os.path.exists(caminho):
        return FileResponse(path=caminho, filename=nome_arquivo, media_type='application/octet-stream')
    return {"erro": f"Arquivo {nome_arquivo} não encontrado no servidor."}

# ==========================================
# 🤖 ROTAS DO AGENTE SENTINEL (TELEMETRIA E C2)
# Usa o `get_db_agente` como fallback de empresa!
# ==========================================
class TelemetriaImpressora(BaseModel):
    alerta_critico: bool
    patrimonio_sugerido: str
    dados_da_maquina: dict 
    localizacao: dict      
    telemetria: dict      

@app.post("/api/inventario/telemetria", dependencies=[Depends(validar_token_agente)])
async def receber_telemetria_sentinel(dados: TelemetriaImpressora, db: Session = Depends(get_db_agente)):
    sn = dados.dados_da_maquina.get('serial', '').strip()
    ip = dados.dados_da_maquina.get('ip', '').strip()
    hostname = dados.dados_da_maquina.get('hostname', '').strip()
    
    ativo = None
    todas_maquinas = db.query(Ativo).all()

    for a in todas_maquinas:
        if sn and sn != "N/A" and a.uuid_persistente == sn:
            ativo = a
            break
            
        dd = a.dados_dinamicos
        if isinstance(dd, str):
            try: dd = json.loads(dd.replace("'", '"').replace("None", "null"))
            except: dd = {}
        if not isinstance(dd, dict): dd = {}

        sn_banco = str(dd.get('Serial') or dd.get('serial') or "").strip()
        host_banco = str(dd.get('Hostname') or dd.get('hostname') or "").strip()

        if sn and sn != "N/A" and sn == sn_banco:
            ativo = a
            break
        if hostname and hostname != "N/A" and hostname == host_banco:
            ativo = a
            break

    novos_dados_dinamicos = {
        "ip": ip,
        "hostname": hostname,
        "toner": dados.telemetria.get('nivel_toner_percentual'),
        "cilindro": dados.telemetria.get('nivel_cilindro_percentual'),
        "paginas_totais": dados.telemetria.get('paginas_impressas'),
        "serial": sn,
        "alerta_critico": dados.alerta_critico
    }

    if ativo:
        ativo.status = 'Online'
        ativo.ultima_comunicacao = datetime.utcnow()
        dict_atual = {}
        if isinstance(ativo.dados_dinamicos, str):
            try: dict_atual = json.loads(ativo.dados_dinamicos.replace("'", '"').replace("None", "null"))
            except: pass
        elif isinstance(ativo.dados_dinamicos, dict):
            dict_atual = dict(ativo.dados_dinamicos)
            
        for chave, valor in novos_dados_dinamicos.items():
            valor_str = str(valor).strip()
            if valor is not None and valor_str not in ["", "N/A", "None"]:
                dict_atual[chave] = valor
        
        ativo.dados_dinamicos = dict_atual
        if not ativo.uuid_persistente and sn and sn != "N/A":
            ativo.uuid_persistente = sn
        maquina_atual = ativo
    else:
        novo_patrimonio = f"S/P_{str(uuid.uuid4().hex)[:6].upper()}"
        cat = db.query(Categoria).filter(Categoria.nome == "Multifuncional").first()
        novo_ativo = Ativo(
            patrimonio=novo_patrimonio,
            categoria_id=cat.id if cat else None,
            marca="Multifuncional de Rede",
            modelo=dados.dados_da_maquina.get('modelo', 'Desconhecida'),
            secretaria=dados.localizacao.get('secretaria'),
            setor=dados.localizacao.get('setor'),
            status="Online",
            dados_dinamicos=novos_dados_dinamicos,
            uuid_persistente=sn,
            ultima_comunicacao=datetime.utcnow()
        )
        db.add(novo_ativo)
        db.flush() 
        maquina_atual = novo_ativo

    nova_leitura = HistoricoLeitura(
        patrimonio=maquina_atual.patrimonio,
        paginas_totais=int(dados.telemetria.get('paginas_impressas', 0) or 0),
        toner_nivel=str(dados.telemetria.get('nivel_toner_percentual', 'N/A')),
        cilindro_nivel=str(dados.telemetria.get('nivel_cilindro_percentual', 'N/A'))
    )
    db.add(nova_leitura)
    db.commit()
    return {"patrimonio": maquina_atual.patrimonio, "nome": maquina_atual.modelo}

@app.get("/api/agente/comandos/pendentes/{uuid_persistente}", dependencies=[Depends(validar_token_agente)])
def verificar_comandos(uuid_persistente: str, db: Session = Depends(get_db_agente)):
    comando = db.query(ComandoAgente).filter(
        (ComandoAgente.uuid_persistente == uuid_persistente) | 
        (ComandoAgente.patrimonio == uuid_persistente),
        ComandoAgente.status == "PENDENTE"
    ).order_by(ComandoAgente.data_criacao.asc()).first()
    
    if not comando:
        ativo = db.query(Ativo).filter((Ativo.uuid_persistente == uuid_persistente) | (Ativo.patrimonio == uuid_persistente)).first()
        if ativo:
            comando = db.query(ComandoAgente).filter(
                (ComandoAgente.patrimonio == ativo.patrimonio) | (ComandoAgente.uuid_persistente == ativo.uuid_persistente),
                ComandoAgente.status == "PENDENTE"
            ).order_by(ComandoAgente.data_criacao.asc()).first()

    if comando:
        comando.status = "EXECUTANDO"
        db.commit()
        return {"tem_comando": True, "comando_id": comando.id, "script_content": comando.script_content}
    return {"tem_comando": False}

@app.post("/api/agente/comandos/resultado", dependencies=[Depends(validar_token_agente)])
def receber_resultado_comando(dados: ComandoResultado, db: Session = Depends(get_db_agente)):
    comando = db.query(ComandoAgente).filter(ComandoAgente.id == dados.comando_id).first()
    if comando:
        comando.status = dados.status
        comando.output_log = dados.output_log
        comando.data_conclusao = datetime.utcnow()
        db.commit()
        return {"message": "Sucesso"}
    raise HTTPException(status_code=404, detail="Não encontrado")

# (Envia o comando. Usamos get_db pois é o painel que aciona esta rota)
@app.post("/api/comandos/enviar")
def enviar_comando(dados: ComandoCreate, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == dados.usuario_emissor).first()
    if not user or not user.chave_publica_c2:
        raise HTTPException(status_code=403, detail="Acesso negado. Você não possui uma chave C2 ativa.")

    ativo_alvo = db.query(Ativo).filter(Ativo.patrimonio == dados.patrimonio).first()
    if not ativo_alvo: raise HTTPException(status_code=404, detail="Máquina alvo não encontrada no banco.")

    dados_din = ativo_alvo.dados_dinamicos or {}
    if isinstance(dados_din, str):
        try: dados_din = json.loads(dados_din.replace("'", '"').replace("None", "null"))
        except: dados_din = {}
    
    is_protegida = dados_din.get("protecao_c2", False)

    if is_protegida and not user.is_admin:
        raise HTTPException(status_code=403, detail="⚠️ OPERAÇÃO BLOQUEADA: Máquina VIP.")

    try:
        chave_privada = serialization.load_pem_private_key(
            dados.chave_privada_pem.encode('utf-8'),
            password=dados.senha_chave.encode('utf-8')
        )
        chave_publica_extraida = chave_privada.public_key().public_bytes(
            encoding=serialization.Encoding.PEM, format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

        if chave_publica_extraida != user.chave_publica_c2: raise ValueError("As chaves não coincidem")
    except ValueError as ve:
        raise HTTPException(status_code=403, detail="Acesso bloqueado: PEM inválido ou Senha Incorreta.")

    novo_comando = ComandoAgente(
        patrimonio=dados.patrimonio,
        uuid_persistente=dados.uuid_persistente,
        script_content=dados.script_content,
        usuario_emissor=dados.usuario_emissor,
        status="PENDENTE"
    )
    db.add(novo_comando)
    db.commit()
    return {"message": "Comando autenticado e enfileirado!", "comando_id": novo_comando.id}

@app.get("/api/comandos/maquina/{patrimonio:path}")
def listar_comandos(patrimonio: str, db: Session = Depends(get_db)):
    return db.query(ComandoAgente).filter(ComandoAgente.patrimonio == patrimonio).order_by(ComandoAgente.data_criacao.desc()).limit(10).all()

# ==========================================
# 🔗 REGISTRO FINAL DE ROTAS
# ==========================================
app.include_router(router, prefix="/api") 
app.include_router(auth.router, prefix="/api")
app.include_router(inventario_core.router, prefix="/api")
app.include_router(inventario_categorias.router, prefix="/api")
app.include_router(inventario_relatorios.router, prefix="/api")
app.include_router(inventario_agente.router, prefix="/api")
app.include_router(unidades.router, prefix="/api")
app.include_router(auditoria.router, prefix="/api")
app.include_router(transferencia.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(manutencao.router, prefix="/api")
app.include_router(importacao.router, prefix="/api")
app.include_router(agendamentos.router, prefix="/api")
app.include_router(matriz.router, prefix="/api")