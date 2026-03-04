from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
import datetime
from app.db.database import Base

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True) # Ex: "Desktop", "Nobreak"
    # Aqui guardamos as regras. Ex: [{"nome": "Voltagem", "tipo": "texto"}, {"nome": "Potência", "tipo": "texto"}]
    campos_config = Column(JSON, default=list) 

class Ativo(Base):
    __tablename__ = "ativos"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, unique=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"))
    
    # Campos Universais (Todo equipamento tem)
    marca = Column(String, nullable=True)
    modelo = Column(String, nullable=True)
    secretaria = Column(String, nullable=True)
    setor = Column(String, nullable=True)
    tecnico = Column(String, nullable=True)

    status = Column(String, default="Ativo")
    
    # O Segredo: Campos Dinâmicos! (Guarda JSON com os dados específicos)
    # Ex: {"Processador": "i7", "Voltagem": "220V", "Memória": "8GB"}
    dados_dinamicos = Column(JSON, default=dict) 
    data_registro = Column(DateTime, default=datetime.datetime.utcnow)
    
    categoria = relationship("Categoria")

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"
    id = Column(Integer, primary_key=True, index=True)
    data_hora = Column(DateTime, default=datetime.datetime.utcnow)
    usuario = Column(String, index=True)
    acao = Column(String) 
    entidade = Column(String, nullable=True) 
    identificador = Column(String, nullable=True) 
    detalhes = Column(Text, nullable=True) 
    snapshot_item = Column(Text, nullable=True)

class Secretaria(Base):
    __tablename__ = "secretarias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)
    setores = relationship("Setor", back_populates="secretaria", cascade="all, delete-orphan")

class Setor(Base):
    __tablename__ = "setores"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    secretaria_id = Column(Integer, ForeignKey("secretarias.id"))
    secretaria = relationship("Secretaria", back_populates="setores")

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    is_admin = Column(Boolean, default=False)

class Transferencia(Base):
    __tablename__ = "transferencias"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, index=True)
    
    origem_secretaria = Column(String)
    origem_setor = Column(String)
    
    destino_secretaria = Column(String)
    destino_setor = Column(String)
    
    motivo = Column(Text)
    tecnico_responsavel = Column(String)
    data_transferencia = Column(DateTime, default=datetime.datetime.utcnow)

class RegistroManutencao(Base):
    __tablename__ = "registros_manutencao"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, index=True)
    status_anterior = Column(String)
    status_novo = Column(String)
    os_referencia = Column(String, nullable=True) # Ex: OS do Milvus
    motivo = Column(String)
    destino = Column(String, nullable=True) # Para onde foi descartado
    usuario = Column(String)
    data_registro = Column(DateTime, default=datetime.datetime.utcnow)