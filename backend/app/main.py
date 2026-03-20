import os
import json
import uuid
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
scheduler = BackgroundScheduler()
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
NGROK_DOMAIN = os.getenv("NGROK_DOMAIN", "")

origens_permitidas = [
    "http://localhost",
    "http://localhost:5174", 
    "http://localhost:8001",
    "https://wan-involves-elements-std.trycloudflare.com" # CORS base do Cloudflare (não precisa de portas ou caminhos)
]

if NGROK_DOMAIN:
    origens_permitidas.append(f"https://unidealistic-colourably-hae.ngrok-free.dev")

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
    db_path = "nexus.db"
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
    
    ativo = None
    
    # 1. TENTA ACHAR A MÁQUINA PELO SERIAL NUMBER
    if sn and sn != "N/A" and sn != "Desconhecido":
        ativo = db.query(Ativo).filter(Ativo.uuid_persistente == sn).first()
        
    # 2. 🚀 SE NÃO ACHAR, TENTA ACHAR PELO IP (Mágica para ligar com máquinas importadas do CSV)
    if not ativo and ip:
        todas_maquinas = db.query(Ativo).all()
        for a in todas_maquinas:
            dd = a.dados_dinamicos
            if isinstance(dd, str):
                try: dd = json.loads(dd.replace("'", '"').replace("None", "null"))
                except: dd = {}
            
            if isinstance(dd, dict):
                ip_banco = dd.get('ip') or dd.get('IP') or ""
                if ip_banco.strip() == ip:
                    ativo = a
                    break
    
    novos_dados_dinamicos = {
        "ip": ip,
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
        
        # Garante que o SQLAlchemy entenda a atualização convertendo em dicionário limpo
        dict_atual = {}
        if isinstance(ativo.dados_dinamicos, str):
            try: dict_atual = json.loads(ativo.dados_dinamicos.replace("'", '"'))
            except: pass
        elif isinstance(ativo.dados_dinamicos, dict):
            dict_atual = dict(ativo.dados_dinamicos)
            
        dict_atual.update(novos_dados_dinamicos)
        ativo.dados_dinamicos = json.loads(json.dumps(dict_atual)) # Salva JSON perfeito sem aspas simples
        
        # Se a máquina não tinha Serial, agora ela tem!
        if not ativo.uuid_persistente and sn and sn != "N/A":
            ativo.uuid_persistente = sn
            
        maquina_atual = ativo
    else:
        # Se não achou de jeito nenhum, cria uma nova
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

    hoje = datetime.utcnow().date()
    
    # HISTÓRICO E ALERTAS (O resto do código que já estava aí fica igual)
    ultima_leitura = db.query(HistoricoLeitura).filter(
        HistoricoLeitura.patrimonio == maquina_atual.patrimonio
    ).order_by(HistoricoLeitura.data_leitura.desc()).first()

    paginas_str = str(dados.telemetria.get('paginas_impressas', '0')).strip()
    if not paginas_str.isdigit():
        paginas_str = '0'

    nova_leitura = HistoricoLeitura(
        patrimonio=maquina_atual.patrimonio,
        paginas_totais=int(paginas_str),
        toner_nivel=str(dados.telemetria.get('nivel_toner_percentual', 'N/A')),
        cilindro_nivel=str(dados.telemetria.get('nivel_cilindro_percentual', 'N/A'))
    )
    db.add(nova_leitura)

    if dados.alerta_critico:
        alerta_hoje = db.query(LogAuditoria).filter(
            LogAuditoria.identificador == maquina_atual.patrimonio,
            LogAuditoria.acao == "ALERTA_TONER"
        ).order_by(LogAuditoria.data_hora.desc()).first()
        
        if not alerta_hoje or alerta_hoje.data_hora.date() < hoje:
            nome_maq = getattr(maquina_atual, 'nome_personalizado', None) or maquina_atual.modelo
            local_maq = getattr(maquina_atual, 'local', 'Local não definido')
            toner_atual = dados.telemetria.get('nivel_toner_percentual', '0%')
            db.add(LogAuditoria(
                usuario="Nexus Agente", acao="ALERTA_TONER", entidade="Multifuncional", 
                identificador=maquina_atual.patrimonio, 
                detalhes=f"🚨 O nível de suprimento da máquina '{nome_maq}' em '{local_maq}' atingiu nível crítico ({toner_atual})."
            ))

    db.commit()
    return {"patrimonio": maquina_atual.patrimonio, "nome": maquina_atual.modelo}


# ========================================================
# 🚀 FILA DE COMANDOS (Sincronização Remota)
# ========================================================

# 1. Rota que o botão do REACT chama
@app.post("/api/inventario/solicitar_coleta")
def solicitar_coleta(cliente: str = "PMSGO", db: Session = Depends(get_db)):
    novo_comando = ComandoAgente(
        cliente=cliente, 
        comando="FORCAR_COLETA", 
        status="PENDENTE"
    )
    db.add(novo_comando)
    db.commit()
    db.refresh(novo_comando)
    return {"message": "Comando salvo na fila", "id_comando": novo_comando.id}

# 2. Rota que o REACT fica checando
@app.get("/api/inventario/status_coleta")
def status_coleta(id_comando: int, db: Session = Depends(get_db)):
    comando = db.query(ComandoAgente).filter(ComandoAgente.id == id_comando).first()
    if comando:
        return {"status": comando.status}
    return {"status": "DESCONHECIDO"}

# 3. Rota que o AGENTE SENTINEL (Python Local) fica perguntando
@app.get("/api/agente/comando")
def checar_comando(cliente: str, db: Session = Depends(get_db)):
    comando = db.query(ComandoAgente).filter(
        ComandoAgente.cliente == cliente,
        ComandoAgente.status == "PENDENTE"
    ).order_by(ComandoAgente.id.asc()).first()

    if comando:
        return {"comando": comando.comando, "id_comando": comando.id}
    return {"comando": "NENHUM"}

class ConcluirComandoReq(BaseModel):
    id_comando: int
    status: str

# 4. Rota que o AGENTE SENTINEL avisa que terminou o serviço
@app.post("/api/agente/comando/concluir")
def concluir_comando(req: ConcluirComandoReq, db: Session = Depends(get_db)):
    comando = db.query(ComandoAgente).filter(ComandoAgente.id == req.id_comando).first()
    if comando:
        comando.status = req.status
        comando.data_conclusao = datetime.utcnow()
        db.commit()
    return {"message": "Comando baixado com sucesso"}


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