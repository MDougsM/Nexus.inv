import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 🚀 TRAVA 1: Tenta ler o .env, se falhar ou não existir, força o caminho para a pasta "data"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/nexus.db")

# 🚀 TRAVA 2: Cria a pasta "data" automaticamente se ela não existir, evitando que o sistema quebre
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///./data"):
    os.makedirs("./data", exist_ok=True)

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()