from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, inventario, unidades, auditoria, transferencia, usuarios, manutencao, importacao
from app.db.database import engine, SessionLocal 
from app.models import Base, Categoria, Usuario, Ativo, LogAuditoria, HistoricoLeitura
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
import os, json

# Cria as tabelas no banco de dados se não existirem
Base.metadata.create_all(bind=engine)

# FUNÇÃO DE SEED (Alimentação Automática)
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

# ==========================================
# 🔒 CONFIGURAÇÃO DE SEGURANÇA (CORS)
# ==========================================
NGROK_DOMAIN = os.getenv("NGROK_DOMAIN", "")

origens_permitidas = [
    "http://localhost",
    "http://localhost:5174", 
    "http://localhost:8001",
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
# ==========================================

# Injeção de Dependência do Banco de Dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/usuarios/me")
def get_me():
    return {"username": "Operador Nexus", "is_admin": True}

@app.get("/api/backup/download")
def download_backup():
    db_path = "nexus.db"
    if os.path.exists(db_path):
        return FileResponse(path=db_path, filename="nexus_backup.db", media_type="application/octet-stream")
    return {"error": "Arquivo de banco de dados não encontrado."}

@app.get("/api/download/agente")
def baixar_agente():
    caminho_arquivo = "/app/app/static/Nexus_Agente.exe"
    if os.path.exists(caminho_arquivo):
        return FileResponse(path=caminho_arquivo, filename="Nexus_Instalador.exe", media_type='application/octet-stream')
    return {"erro": "Arquivo do agente não encontrado no servidor."}

# Modelo de dados que o Sentinel envia
class TelemetriaImpressora(BaseModel):
    alerta_critico: bool
    patrimonio_sugerido: str
    dados_da_maquina: dict 
    localizacao: dict      
    telemetria: dict       

# A ROTA DE RECONHECIMENTO DO SENTINEL
@app.post("/api/inventario/telemetria")
async def receber_telemetria_sentinel(dados: TelemetriaImpressora, db: Session = Depends(get_db)):
    sn = dados.dados_da_maquina.get('serial')
    ip = dados.dados_da_maquina.get('ip')
    
    cat = db.query(Categoria).filter(Categoria.nome == "Multifuncional").first()
    cat_id = cat.id if cat else None
    
    ativo = db.query(Ativo).filter(Ativo.uuid_persistente == sn).first()
    
    novos_dados_dinamicos = {
        "ip": ip,
        "toner": dados.telemetria.get('nivel_toner_percentual'),
        "cilindro": dados.telemetria.get('nivel_cilindro_percentual'),
        "paginas_totais": dados.telemetria.get('paginas_impressas'),
        "serial": sn,
        "alerta_critico": dados.alerta_critico
    }

    # Variável para rastrear a máquina (nova ou existente)
    maquina_atual = None

    if ativo:
        ativo.status = 'Online'
        ativo.ultima_comunicacao = datetime.utcnow()
        
        dict_atual = ativo.dados_dinamicos if ativo.dados_dinamicos else {}
        dict_atual.update(novos_dados_dinamicos)
        ativo.dados_dinamicos = dict_atual
        maquina_atual = ativo
    else:
        novo_ativo = Ativo(
            patrimonio=dados.patrimonio_sugerido,
            categoria_id=cat_id,
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
        db.flush() # Salva temporariamente para pegar o ID/Patrimônio
        maquina_atual = novo_ativo

    # ========================================================
    # 🎯 MISSÃO A: HISTÓRICO DE ODÔMETRO (FATURAMENTO)
    # ========================================================
    hoje = datetime.utcnow().date()
    
    # Verifica se já gravamos uma leitura HOJE para não flodar o banco
    ultima_leitura = db.query(HistoricoLeitura).filter(
        HistoricoLeitura.patrimonio == maquina_atual.patrimonio
    ).order_by(HistoricoLeitura.data_leitura.desc()).first()

    if not ultima_leitura or ultima_leitura.data_leitura.date() < hoje:
        # Se for um dia novo, cria um snapshot do odômetro
        nova_leitura = HistoricoLeitura(
            patrimonio=maquina_atual.patrimonio,
            paginas_totais=int(dados.telemetria.get('paginas_impressas') or 0),
            toner_nivel=str(dados.telemetria.get('nivel_toner_percentual', 'N/A')),
            cilindro_nivel=str(dados.telemetria.get('nivel_cilindro_percentual', 'N/A'))
        )
        db.add(nova_leitura)

    ## ========================================================
    # 🎯 MISSÃO B: GATILHO DE ALERTAS (TONER < 15%) INTERNO
    # ========================================================
    if dados.alerta_critico:
        # Verifica se já gritamos sobre ESSA máquina HOJE, para não flodar o Feed
        alerta_hoje = db.query(LogAuditoria).filter(
            LogAuditoria.identificador == maquina_atual.patrimonio,
            LogAuditoria.acao == "ALERTA_TONER"
        ).order_by(LogAuditoria.data_hora.desc()).first()
        
        precisa_alertar = True
        if alerta_hoje and alerta_hoje.data_hora.date() >= hoje:
            precisa_alertar = False # Já avisou hoje, fica quieto.
            
        if precisa_alertar:
            nome_maq = getattr(maquina_atual, 'nome_personalizado', None) or maquina_atual.modelo
            local_maq = getattr(maquina_atual, 'local', 'Local não definido')
            toner_atual = dados.telemetria.get('nivel_toner_percentual', '0%')
            
            detalhes_alerta = f"🚨 O nível de suprimento da máquina '{nome_maq}' em '{local_maq}' atingiu nível crítico ({toner_atual})."
            
            db.add(LogAuditoria(
                usuario="Nexus Agente", 
                acao="ALERTA_TONER", 
                entidade="Multifuncional", 
                identificador=maquina_atual.patrimonio, 
                detalhes=detalhes_alerta
            ))

    db.commit()
    
    return {"patrimonio": maquina_atual.patrimonio, "nome": maquina_atual.modelo}

# Registrando as rotas 
app.include_router(auth.router, prefix="/api")
app.include_router(inventario.router, prefix="/api")
app.include_router(unidades.router, prefix="/api")
app.include_router(auditoria.router, prefix="/api")
app.include_router(transferencia.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(manutencao.router, prefix="/api")
app.include_router(importacao.router, prefix="/api")