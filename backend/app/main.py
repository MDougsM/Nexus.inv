import os
import json
import uuid
import pytz
from datetime import datetime
from typing import Optional
from sqlalchemy import text
from cryptography.hazmat.primitives import serialization

# 🛡️ CORREÇÃO: Removido Flask (causador do erro) e corrigido imports do FastAPI
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from app.schemas import ComandoCreate, ComandoResultado

# 🚀 1. AQUI ESTÁ A PRIMEIRA MUDANÇA: Tiramos o 'inventario' do app.api
from app.api import auth, unidades, auditoria, transferencia, usuarios, manutencao, importacao, agendamentos

# 🚀 E IMPORTAMOS OS 4 ARQUIVOS NOVOS DA PASTA ROUTERS
from app.routers import inventario_core, inventario_categorias, inventario_relatorios, inventario_agente

from app.db.database import engine, SessionLocal, get_db
from app.models import Base, Categoria, Usuario, Ativo, LogAuditoria, HistoricoLeitura, ComandoAgente

# 🛡️ CORREÇÃO: Definindo o router que estava faltando no topo
router = APIRouter()

BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8001))

# Cria as tabelas no banco de dados se não existirem
Base.metadata.create_all(bind=engine)

# ==========================================
# 🔑 GUARDA-COSTAS DO AGENTE SENTINEL (API KEY)
# ==========================================
# Essa é a chave de 64 caracteres que só o Agente conhece
AGENTE_SECRET_TOKEN = "NEXUS_AGENTE_V5_9b7e1f2a4c6d8e0f3a5b7c9d1e2f4a6b8c0d2e4f6a8b0c2d"

def validar_token_agente(x_nexus_token: str = Header(None)):
    if not x_nexus_token or x_nexus_token != AGENTE_SECRET_TOKEN:
        print(f"⚠️ Tentativa de invasão bloqueada! Token recebido: {x_nexus_token}")
        raise HTTPException(status_code=403, detail="Acesso negado. Token de Agente inválido ou ausente.")

# ==========================================
# 👤 ROTA DE PERFIL (VERSÃO CORRIGIDA FASTAPI)
# ==========================================
@router.put("/usuarios/perfil/atualizar")
async def atualizar_perfil(request: Request, db: Session = Depends(get_db)):
    dados = await request.json()
    username = dados.get('username')

    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # ⚖️ LÓGICA DO ACEITE / REVOGAÇÃO DOS TERMOS
    if 'termos_aceitos' in dados:
        aceitou = dados.get('termos_aceitos')
        usuario.termos_aceitos = aceitou
        
        if aceitou:
            usuario.data_aceite = datetime.utcnow()
            usuario.ip_aceite = request.client.host 
            print(f"✅ Termos aceitos por {username} no IP {usuario.ip_aceite}")
        else:
            usuario.data_aceite = None
            usuario.ip_aceite = None
            print(f"❌ Assinatura revogada por {username}")

    # Atualizações normais
    if 'nome_exibicao' in dados:
        usuario.nome_exibicao = dados.get('nome_exibicao')
    if 'avatar' in dados:
        usuario.avatar = dados.get('avatar')
    if 'email' in dados:
        usuario.email = dados.get('email')

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
# 🚀 FUNÇÃO DE SEED (Alimentação Automática)
# ==========================================
def create_initial_data():
    db = SessionLocal()
    try:       
        # Garante o usuário admin com a senha padrão e TERMOS ACEITOS
        user = db.query(Usuario).filter(Usuario.username == "admin").first()
        
        if not user:
            print("👤 Criando usuário mestre: admin / admin123")
            novo_admin = Usuario(
                username="admin", 
                password="admin123", 
                is_admin=True,
                nome_exibicao="Administrador do Sistema",
                termos_aceitos=True, # 🚀 Nasce com os termos aceitos!
                data_aceite=datetime.now(),
                ip_aceite="127.0.0.1 (Sistema)"
            )
            db.add(novo_admin)
            db.commit()
            print("✅ Usuário Admin criado e salvo com sucesso!")
            
        else:
            # Se o Admin já existe, mas está com a senha errada ou SEM os termos:
            mudou_algo = False
            
            if user.password != "admin123":
                user.password = "admin123"
                mudou_algo = True
                print("✅ Senha do Admin resetada para o padrão.")
                
            # Garante que o Admin atual seja atualizado para a regra nova
            if not user.termos_aceitos:
                user.termos_aceitos = True
                user.data_aceite = datetime.now()
                user.ip_aceite = "127.0.0.1 (Atualização do Sistema)"
                mudou_algo = True
                print("✅ Termos de uso validados automaticamente para o Admin.")
                
            if mudou_algo:
                db.commit()
            
        # GARANTE A CATEGORIA MULTIFUNCIONAL NO BANCO
        cat_print = db.query(Categoria).filter(Categoria.nome == "Multifuncional").first()
        if not cat_print:
            nova_cat = Categoria(nome="Multifuncional", campos_config=["ip", "toner", "cilindro", "paginas_totais", "alerta_critico", "serial"])
            db.add(nova_cat)
            db.commit()
            
    except Exception as e:
        print(f"❌ Erro crítico ao popular banco: {e}")
        db.rollback() 
    finally:
        db.close()

# Executa o seed
create_initial_data()

app = FastAPI(title="NEXUS API")

# Inicia o relógio do sistema
fuso_horario = pytz.timezone('America/Campo_Grande')
scheduler = BackgroundScheduler(timezone=fuso_horario)
scheduler.start()

# Carrega os relatórios do banco para a memória quando o servidor liga
@app.on_event("startup")
def carregar_cron_jobs():
    db = SessionLocal()
    # Import dinâmico para evitar circular import
    from app.api.agendamentos import gerar_e_enviar_relatorio
    from app.models import AgendamentoRelatorio
    
    ativos = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.status == True).all()
    for ag in ativos:
        if ag.horario:
            hora, minuto = ag.horario.split(":")
            job_id = f"relatorio_{ag.id}"
            scheduler.add_job(
                gerar_e_enviar_relatorio, 'cron', 
                day=ag.dia_do_mes, hour=int(hora), minute=int(minuto), 
                args=[ag.id], id=job_id, replace_existing=True
            )
    db.close()
    print(f"⏰ APScheduler iniciado! {len(ativos)} relatório(s) agendado(s) na memória.")

# ==========================================
# 🔒 CONFIGURAÇÃO DE SEGURANÇA (CORS)
# ==========================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "") 

origens_permitidas = [
    "http://localhost",
    "http://localhost:5174", 
    "http://localhost:8001"
]

if FRONTEND_URL:
    origens_permitidas.append(FRONTEND_URL)

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
def ping_usuario(dados: PingRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == dados.username).first()
    if usuario:
        usuario.ultimo_acesso = datetime.utcnow()
        db.commit()
    return {"status": "ok"}

@app.get("/api/usuarios/me")
def get_me():
    return {"username": "Operador Nexus", "is_admin": True}

@app.get("/api/backup/download")
def download_backup():
    db_path = "./data/nexus.db" 
    if os.path.exists(db_path):
        return FileResponse(path=db_path, filename="nexus_backup.db", media_type="application/octet-stream")
    return {"error": "Arquivo de banco de dados não encontrado."}

@app.get("/api/inventario/download/sentinel")
def baixar_sentinel():
    caminho = os.path.join("app", "static", "Nexus_Sentinel_Instalador.exe")
    if os.path.exists(caminho):
        return FileResponse(caminho, filename="Nexus_Sentinel_Instalador.exe")
    return {"erro": "Arquivo Sentinel não encontrado."}

@app.get("/api/inventario/download/agente")
def baixar_agente():
    caminho = os.path.join("app", "static", "Nexus_Instalador_v5.5.exe")
    if os.path.exists(caminho):
        return FileResponse(caminho, filename="Nexus_Instalador_v5.5.exe")
    return {"erro": "Arquivo Agente não encontrado."}

# ==========================================
# 🤖 ROTAS DO AGENTE SENTINEL (TELEMETRIA)
# ==========================================
class TelemetriaImpressora(BaseModel):
    alerta_critico: bool
    patrimonio_sugerido: str
    dados_da_maquina: dict 
    localizacao: dict      
    telemetria: dict      

@app.post("/api/inventario/telemetria", dependencies=[Depends(validar_token_agente)])
async def receber_telemetria_sentinel(dados: TelemetriaImpressora, db: Session = Depends(get_db)):
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


# ==========================================
# 💻 ROTAS DO TERMINAL REMOTO (C2)
# ==========================================
@app.post("/api/comandos/enviar")
def enviar_comando(dados: ComandoCreate, db: Session = Depends(get_db)):
    
    # 1. Busca o usuário que está tentando enviar o comando
    user = db.query(Usuario).filter(Usuario.username == dados.usuario_emissor).first()
    if not user or not user.chave_publica_c2:
        raise HTTPException(status_code=403, detail="Acesso negado. Você não possui uma chave C2 ativa.")

    # 🚀 A NOVA TRAVA: VERIFICA SE A MÁQUINA ESTÁ NA LISTA DE PROTEÇÃO MÁXIMA
    ativo_alvo = db.query(Ativo).filter(Ativo.patrimonio == dados.patrimonio).first()
    if not ativo_alvo:
        raise HTTPException(status_code=404, detail="Máquina alvo não encontrada no banco.")

    # Puxa os dados dinâmicos com segurança para ver se a flag existe
    dados_din = ativo_alvo.dados_dinamicos or {}
    if isinstance(dados_din, str):
        import json
        try: dados_din = json.loads(dados_din.replace("'", '"').replace("None", "null"))
        except: dados_din = {}
    
    is_protegida = dados_din.get("protecao_c2", False)

    # A REGRA DE OURO: Se a máquina é VIP e o usuário NÃO é admin global -> BLOQUEIA!
    if is_protegida and not user.is_admin:
        raise HTTPException(
            status_code=403, 
            detail="⚠️ OPERAÇÃO BLOQUEADA: Esta máquina está sob Proteção Nível Máximo (Diretoria/Servidor). Apenas Administradores Globais podem injetar comandos nela."
        )

    # 2. TENTA ABRIR A CHAVE PRIVADA COM A SENHA FORNECIDA (Sua lógica RSA original continua aqui)
    from cryptography.hazmat.primitives import serialization
    try:
        chave_privada = serialization.load_pem_private_key(
            dados.chave_privada_pem.encode('utf-8'),
            password=dados.senha_chave.encode('utf-8')
        )
        chave_publica_extraida = chave_privada.public_key().public_bytes(
            encoding=serialization.Encoding.PEM, format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

        if chave_publica_extraida != user.chave_publica_c2:
            raise ValueError("As chaves não coincidem")
            
    except ValueError as ve:
        if "As chaves não coincidem" in str(ve):
            raise HTTPException(status_code=403, detail="Acesso bloqueado: Este arquivo .PEM pertence a outro técnico.")
        else:
            raise HTTPException(status_code=403, detail="Acesso bloqueado: Senha da chave incorreta.")
    except Exception as e:
        raise HTTPException(status_code=403, detail="Acesso bloqueado: O arquivo .PEM enviado é inválido ou está corrompido.")

    # 3. SE PASSOU POR TODA A SEGURANÇA, ENFILEIRA O COMANDO!
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

@app.get("/api/agente/comandos/pendentes/{uuid_persistente}", dependencies=[Depends(validar_token_agente)])
def verificar_comandos(uuid_persistente: str, db: Session = Depends(get_db)):
    comando = db.query(ComandoAgente).filter(
        ComandoAgente.uuid_persistente == uuid_persistente,
        ComandoAgente.status == "PENDENTE"
    ).order_by(ComandoAgente.data_criacao.asc()).first()
    
    if comando:
        comando.status = "EXECUTANDO"
        db.commit()
        return {"tem_comando": True, "comando_id": comando.id, "script_content": comando.script_content}
    return {"tem_comando": False}

@app.post("/api/agente/comandos/resultado", dependencies=[Depends(validar_token_agente)])
def receber_resultado_comando(dados: ComandoResultado, db: Session = Depends(get_db)):
    comando = db.query(ComandoAgente).filter(ComandoAgente.id == dados.comando_id).first()
    if comando:
        comando.status = dados.status
        comando.output_log = dados.output_log
        comando.data_conclusao = datetime.utcnow()
        db.commit()
        return {"message": "Sucesso"}
    raise HTTPException(status_code=404, detail="Não encontrado")

# ==========================================
# 🔗 REGISTRO FINAL DE ROTAS
# ==========================================
app.include_router(router, prefix="/api") 
app.include_router(auth.router, prefix="/api")

# 🚀 2. AQUI ESTÁ A SEGUNDA MUDANÇA: Retiramos o 'inventario.router' e colocamos as 4 ramificações novas
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