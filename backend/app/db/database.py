import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, Date
from sqlalchemy.orm import declarative_base, sessionmaker
from fastapi import Request, HTTPException
from datetime import date, timedelta
from passlib.context import CryptContext

# 🚀 CONFIGURAÇÕES MESTRE
MASTER_DATABASE_URL = os.getenv("MASTER_DATABASE_URL", "sqlite:///./data/nexus_master.db")
TENANTS_DB_DIR = os.getenv("TENANTS_DB_DIR", "./data/tenants")

os.makedirs("./data", exist_ok=True)
os.makedirs(TENANTS_DB_DIR, exist_ok=True)

master_engine = create_engine(MASTER_DATABASE_URL, connect_args={"check_same_thread": False})
MasterSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=master_engine)
MasterBase = declarative_base()
Base = declarative_base() # Molde para os inquilinos

# Criptografia para a Senha Master
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
    limite_maquinas = Column(Integer, default=50) # 0 = Ilimitado
    em_manutencao = Column(Boolean, default=False) # Trava de manutenção

class SuperAdmin(MasterBase):
    __tablename__ = "super_admins"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password_hash = Column(String) # Senha agora é fortemente criptografada
    email_recuperacao = Column(String, nullable=True) # E-mail para reset de emergência

# Cria/Atualiza as tabelas mestres
MasterBase.metadata.create_all(bind=master_engine)

# ==========================================
# 🌱 SEMEADOR MESTRE E GERAÇÃO DA SENHA
# ==========================================
def seed_master_db():
    db = MasterSessionLocal()
    try:
        # Verifica se o Nexus existe
        admin = db.query(SuperAdmin).filter(SuperAdmin.username == "Nexus").first()
        
        # Se não existir, cria!
        if not admin:
            print("👑 Criando Conta Super Admin Mestre na Matriz...")
            senha_padrao_crua = os.getenv("MASTER_DEFAULT_PASSWORD", "Nexus@Deus2026")
            hash_senha = pwd_context.hash(senha_padrao_crua)
            
            # 🚀 USANDO 'password_hash' AQUI:
            novo_admin = SuperAdmin(
                username="Nexus", 
                password_hash=hash_senha, 
                email_recuperacao="logistica.newpc@gmail.com"
            )
            db.add(novo_admin)
            
            # Limpeza do admin antigo, se existir
            db.query(SuperAdmin).filter(SuperAdmin.username == "admin").delete()
                
        # Garante a empresa NEWPC
        emp = db.query(Empresa).filter(Empresa.codigo_acesso == "NEWPC").first()
        if not emp:
            db.add(Empresa(
                codigo_acesso="NEWPC", 
                db_nome="empresa_newpc.db", 
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
# 🏢 ROTEADOR DE INQUILINOS (TENANTS)
# ==========================================
tenant_engines = {}

def get_tenant_engine(db_nome: str):
    """Cria e guarda o motor do banco de dados de cada empresa na memória"""
    if db_nome not in tenant_engines:
        db_url = f"sqlite:///{TENANTS_DB_DIR}/{db_nome}"
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
        
        # Usa o Base para gerar as tabelas do cliente na hora que ele logar a primeira vez
        from app.models import Base 
        Base.metadata.create_all(bind=engine)
        
        tenant_engines[db_nome] = engine
        
    return tenant_engines[db_nome]

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

    # 🚨 VERIFICAÇÃO AUTOMÁTICA DE VENCIMENTO
    hoje = date.today()
    if empresa.proximo_vencimento and hoje > empresa.proximo_vencimento:
        if not empresa.inadimplente:
            empresa.inadimplente = True
            master_db.commit()
    
    if empresa.inadimplente:
        master_db.close()
        raise HTTPException(status_code=402, detail="ACESSO BLOQUEADO: Contate a Central, erro de pagamento.")

    master_db.close()
    
    # Conexão normal com o banco do cliente
    engine = get_tenant_engine(empresa.db_nome)
    TenantSessionLocal = sessionmaker(bind=engine)
    db = TenantSessionLocal()
    try: yield db
    finally: db.close()

# 🚀 FUNÇÃO PARA RENOVAÇÃO DE CICLO (Chamar ao confirmar pagamento)
def renovar_assinatura(empresa: Empresa):
    # Mantém o dia fixo (ex: todo dia 10)
    hoje = date.today()
    novo_ano = hoje.year
    novo_mes = hoje.month + 1
    
    if novo_mes > 12:
        novo_mes = 1; novo_ano += 1
        
    empresa.proximo_vencimento = date(novo_ano, novo_mes, empresa.dia_vencimento)
    empresa.inadimplente = False
    return empresa