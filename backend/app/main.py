import os
import json
import uuid
import pytz
from datetime import datetime
from typing import Optional
from sqlalchemy import text

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler

# Importação dos seus módulos
from app.api import auth, inventario, unidades, auditoria, transferencia, usuarios, manutencao, importacao, agendamentos
from app.db.database import engine, SessionLocal 
from app.models import Base, Categoria, Usuario, Ativo, LogAuditoria, HistoricoLeitura, ComandoAgente

BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8001))

# Cria as tabelas no banco de dados se não existirem
Base.metadata.create_all(bind=engine)

# ==========================================
# 🚀 FUNÇÃO DE SEED (Alimentação Automática)
# ==========================================
def create_initial_data():
    db = SessionLocal()
    try:       
        # Garante o usuário admin com a senha padrão
        user = db.query(Usuario).filter(Usuario.username == "admin").first()
        if not user:
            print("👤 Criando usuário mestre: admin / admin123")
            novo_admin = Usuario(
                username="admin", 
                password="admin123", 
                is_admin=True,
                nome_exibicao="Administrador do Sistema" 
            )
            db.add(novo_admin)
            db.commit()
            print("✅ Usuário Admin criado e salvo com sucesso!")
            
        elif user.password != "admin123":
            user.password = "admin123"
            db.commit()
            print("✅ Senha do Admin resetada para o padrão.")
            
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
    from app.models import AgendamentoRelatorio
    from app.api.agendamentos import gerar_e_enviar_relatorio
    
    ativos = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.status == True).all()
    for ag in ativos:
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
FRONTEND_URL = os.getenv("FRONTEND_URL", "") # 🚀 Lê a URL do painel direto do .env

origens_permitidas = [
    "http://localhost",
    "http://localhost:5174", 
    "http://localhost:8001"
]

# Libera o acesso para o link do Cloudflare (ou qualquer outro) que estiver no .env
if FRONTEND_URL:
    origens_permitidas.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Injeção de Dependência do Banco de Dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 📥 ROTAS DE DOWNLOAD & UTILITÁRIOS
# ==========================================
@app.get("/api/usuarios/me")
def get_me():
    return {"username": "Operador Nexus", "is_admin": True}

@app.get("/api/backup/download")
def download_backup():
    db_path = "./data/nexus.db" # 🚀 Ajustado para buscar o banco dentro do cofre (data)
    if os.path.exists(db_path):
        return FileResponse(path=db_path, filename="nexus_backup.db", media_type="application/octet-stream")
    return {"error": "Arquivo de banco de dados não encontrado."}

@app.get("/api/inventario/download/sentinel")
def baixar_sentinel():
    caminho = os.path.join("app", "static", "Nexus_Sentinel_Instalador.exe")
    if os.path.exists(caminho):
        return FileResponse(caminho, filename="Nexus_Sentinel_Instalador.exe")
    return {"erro": "Arquivo Sentinel não encontrado. Verifique a pasta static."}

@app.get("/api/inventario/download/agente")
def baixar_agente():
    caminho = os.path.join("app", "static", "Nexus_Instalador.exe")
    if os.path.exists(caminho):
        return FileResponse(caminho, filename="Nexus_Instalador.exe")
    return {"erro": "Arquivo Agente não encontrado. Verifique a pasta static."}

# ==========================================
# 🤖 ROTAS DO AGENTE SENTINEL (TELEMETRIA)
# ==========================================

# Modelo de dados que o Sentinel envia
class TelemetriaImpressora(BaseModel):
    alerta_critico: bool
    patrimonio_sugerido: str
    dados_da_maquina: dict 
    localizacao: dict      
    telemetria: dict       

@app.post("/api/inventario/telemetria")
async def receber_telemetria_sentinel(dados: TelemetriaImpressora, db: Session = Depends(get_db)):
    sn = dados.dados_da_maquina.get('serial', '').strip()
    ip = dados.dados_da_maquina.get('ip', '').strip()
    hostname = dados.dados_da_maquina.get('hostname', '').strip()
    
    ativo = None
    todas_maquinas = db.query(Ativo).all()

    # 1. 🚀 BUSCA INTELIGENTE: Varre o banco procurando por Serial ou Hostname
    for a in todas_maquinas:
        # Checa a coluna direta
        if sn and sn != "N/A" and a.uuid_persistente == sn:
            ativo = a
            break
            
        # Abre o cofre dos dados dinâmicos para procurar lá dentro
        dd = a.dados_dinamicos
        if isinstance(dd, str):
            try: dd = json.loads(dd.replace("'", '"').replace("None", "null"))
            except: dd = {}
        if not isinstance(dd, dict): dd = {}

        sn_banco = str(dd.get('Serial') or dd.get('serial') or dd.get('Número de Série') or "").strip()
        host_banco = str(dd.get('Hostname') or dd.get('hostname') or "").strip()

        # Bateu o Serial? É ela!
        if sn and sn != "N/A" and sn == sn_banco:
            ativo = a
            break
            
        # Bateu o Hostname? É ela!
        if hostname and hostname != "N/A" and hostname == host_banco:
            ativo = a
            break

    # 2. Se os nomes e seriais falharem, tenta pelo IP em último caso
    if not ativo and ip:
        for a in todas_maquinas:
            dd = a.dados_dinamicos
            if isinstance(dd, str):
                try: dd = json.loads(dd.replace("'", '"').replace("None", "null"))
                except: dd = {}
            if isinstance(dd, dict):
                ip_banco = str(dd.get('ip') or dd.get('IP') or "").strip()
                if ip_banco == ip:
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

    maquina_atual = None

    if ativo:
        ativo.status = 'Online'
        ativo.ultima_comunicacao = datetime.utcnow()
        
        # Puxa os dados dinâmicos atuais (Onde ficam os seus campos misturados com os do Sentinel)
        dict_atual = {}
        if isinstance(ativo.dados_dinamicos, str):
            try: dict_atual = json.loads(ativo.dados_dinamicos.replace("'", '"').replace("None", "null"))
            except: pass
        elif isinstance(ativo.dados_dinamicos, dict):
            dict_atual = dict(ativo.dados_dinamicos)
            
        # 🚀 A MÁGICA ACONTECE AQUI: A Trava de Sobrescrita
        # O backend vai iterar sobre os dados que o Sentinel mandou.
        # Ele SÓ vai atualizar a chave se o Sentinel realmente tiver um dado válido.
        # Se o Sentinel mandar vazio ou "N/A", ele ignora e mantém a sua edição intacta!
        for chave, valor in novos_dados_dinamicos.items():
            valor_str = str(valor).strip()
            if valor is not None and valor_str != "" and valor_str != "N/A" and valor_str != "None":
                dict_atual[chave] = valor
        
        # Salva o dicionário fundido e protegido de volta no banco
        ativo.dados_dinamicos = json.loads(json.dumps(dict_atual))
        
        # Grava o SN na coluna principal para as próximas leituras serem ultra-rápidas
        if getattr(ativo, 'uuid_persistente', None) is None and sn and sn != "N/A":
            ativo.uuid_persistente = sn
            
        maquina_atual = ativo
    else:
        # Só cria uma máquina nova se realmente não achar nada
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
            dados_dinamicos=json.loads(json.dumps(novos_dados_dinamicos)),
            uuid_persistente=sn,
            ultima_comunicacao=datetime.utcnow()
        )
        db.add(novo_ativo)
        db.flush() 
        maquina_atual = novo_ativo

    # Salva o Histórico de Leitura (Odômetro)
    paginas_str = str(dados.telemetria.get('paginas_impressas', '0')).strip()
    if not paginas_str.isdigit(): paginas_str = '0'

    nova_leitura = HistoricoLeitura(
        patrimonio=maquina_atual.patrimonio,
        paginas_totais=int(paginas_str),
        toner_nivel=str(dados.telemetria.get('nivel_toner_percentual', 'N/A')),
        cilindro_nivel=str(dados.telemetria.get('nivel_cilindro_percentual', 'N/A'))
    )
    db.add(nova_leitura)
    db.commit()
    
    return {"patrimonio": maquina_atual.patrimonio, "nome": maquina_atual.modelo}



# ========================================================
# 🔗 REGISTRO DE ROTADORES (Controllers Externos)
# ========================================================
app.include_router(auth.router, prefix="/api")
app.include_router(inventario.router, prefix="/api")
app.include_router(unidades.router, prefix="/api")
app.include_router(auditoria.router, prefix="/api")
app.include_router(transferencia.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(manutencao.router, prefix="/api")
app.include_router(importacao.router, prefix="/api")
app.include_router(agendamentos.router, prefix="/api")