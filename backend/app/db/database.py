import os
import urllib.parse
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, Date, text
from sqlalchemy.orm import declarative_base, sessionmaker
from fastapi import Request, HTTPException
from datetime import date, timedelta
from passlib.context import CryptContext



# 🚀 CONFIGURAÇÕES MESTRE - POSTGRESQL (NÍVEL ENTERPRISE)
POSTGRES_USER = os.getenv("POSTGRES_USER", "nexus")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "Nexus@Deus2026")
POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "db")

# 🚀 Codificando a senha para evitar bugs com o caractere '@'
SENHA_SEGURA = urllib.parse.quote_plus(POSTGRES_PASSWORD)

MASTER_DATABASE_URL = os.getenv("MASTER_DATABASE_URL", f"postgresql://{POSTGRES_USER}:{SENHA_SEGURA}@{POSTGRES_SERVER}:5432/nexus_master")
TENANTS_DB_DIR = "./data/tenants"

master_engine = create_engine(MASTER_DATABASE_URL)
MasterSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=master_engine)
MasterBase = declarative_base()
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==========================================
# 🏦 TABELAS DO BANCO MESTRE (O OLHO DE DEUS)
# ==========================================
class Empresa(MasterBase):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    codigo_acesso = Column(String, unique=True, index=True) 
    db_nome = Column(String, unique=True) 
    ativo = Column(Boolean, default=True)
    valor_contrato = Column(Float, default=0.0)
    ciclo_pagamento = Column(String, default="MENSAL")
    dia_vencimento = Column(Integer, default=10)
    proximo_vencimento = Column(Date, nullable=True)
    inadimplente = Column(Boolean, default=False)
    limite_maquinas = Column(Integer, default=50)
    em_manutencao = Column(Boolean, default=False)

class SuperAdmin(MasterBase):
    __tablename__ = "super_admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password_hash = Column(String) 
    email_recuperacao = Column(String, nullable=True)

MasterBase.metadata.create_all(bind=master_engine)

# ==========================================
# 🌱 SEMEADOR MESTRE E GERAÇÃO DA SENHA
# ==========================================
def seed_master_db():
    db = MasterSessionLocal()
    try:
        admin = db.query(SuperAdmin).filter(SuperAdmin.username == "Nexus").first()
        if not admin:
            print("👑 Criando Conta Super Admin Mestre na Matriz PostgreSQL...")
            senha_padrao_crua = os.getenv("MASTER_DEFAULT_PASSWORD", "Nexus@Deus2026")
            hash_senha = pwd_context.hash(senha_padrao_crua)
            novo_admin = SuperAdmin(
                username="Nexus", 
                password_hash=hash_senha, 
                email_recuperacao="logistica.newpc@gmail.com"
            )
            db.add(novo_admin)
            db.query(SuperAdmin).filter(SuperAdmin.username == "admin").delete()
                
        emp = db.query(Empresa).filter(Empresa.codigo_acesso == "NEWPC").first()
        if not emp:
            db.add(Empresa(
                codigo_acesso="NEWPC", 
                db_nome="empresa_newpc", # 🚀 Removido o ".db" do SQLite
                ativo=True, 
                limite_maquinas=0,
                em_manutencao=False
            ))
        
        db.commit()
    except Exception as e:
        print(f"❌ Erro ao popular banco mestre: {e}")
        db.rollback()
    finally:
        db.close()

# ==========================================
# 🏢 ROTEADOR DE INQUILINOS (TENANTS - MULTI DATABASE)
# ==========================================
tenant_engines = {}

def get_tenant_engine(db_nome: str):
    # Limpamos o nome caso ainda venha com ".db" do banco antigo
    db_nome_pg = db_nome.replace(".db", "").lower()

    if db_nome_pg not in tenant_engines:
        # 1. Conecta na raiz do Postgres para verificar se o banco da empresa existe
        default_url = f"postgresql://{POSTGRES_USER}:{SENHA_SEGURA}@{POSTGRES_SERVER}:5432/postgres"
        try:
            temp_engine = create_engine(default_url, isolation_level="AUTOCOMMIT")
            with temp_engine.connect() as conn:
                res = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_nome_pg}'"))
                if not res.fetchone():
                    print(f"🏢 Criando novo Banco de Dados Corporativo para: {db_nome_pg}")
                    conn.execute(text(f"CREATE DATABASE {db_nome_pg}"))
        except Exception as e:
            print(f"Erro ao verificar/criar banco do inquilino: {e}")

        # 2. Cria a conexão oficial de alta performance
        db_url = f"postgresql://{POSTGRES_USER}:{SENHA_SEGURA}@{POSTGRES_SERVER}:5432/{db_nome_pg}"
        engine = create_engine(db_url)
        
        from app.models import Base 
        Base.metadata.create_all(bind=engine)
        
        tenant_engines[db_nome_pg] = engine
        
    return tenant_engines[db_nome_pg]

def get_db(request: Request = None):
    if not request: yield None; return
    empresa_header = request.headers.get("x-empresa")
    
    if empresa_header == "NEXUS_MASTER":
        db = MasterSessionLocal()
        try: yield db
        finally: db.close()
        return

    master_db = MasterSessionLocal()
    empresa = master_db.query(Empresa).filter(Empresa.codigo_acesso == empresa_header).first()
    
    if not empresa:
        master_db.close()
        raise HTTPException(status_code=404, detail="Inquilino não identificado.")

    hoje = date.today()
    if empresa.proximo_vencimento and hoje > empresa.proximo_vencimento:
        if not empresa.inadimplente:
            empresa.inadimplente = True
            master_db.commit()
    
    if empresa.inadimplente:
        master_db.close()
        raise HTTPException(status_code=402, detail="ACESSO BLOQUEADO: Contate a Central, erro de pagamento.")

    master_db.close()
    
    engine = get_tenant_engine(empresa.db_nome)
    TenantSessionLocal = sessionmaker(bind=engine)
    db = TenantSessionLocal()
    try: yield db
    finally: db.close()

def renovar_assinatura(empresa: Empresa):
    hoje = date.today()
    novo_ano = hoje.year
    novo_mes = hoje.month + 1
    
    if novo_mes > 12:
        novo_mes = 1; novo_ano += 1
        
    empresa.proximo_vencimento = date(novo_ano, novo_mes, empresa.dia_vencimento)
    empresa.inadimplente = False
    return empresa