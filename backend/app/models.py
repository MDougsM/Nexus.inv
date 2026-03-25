from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True) # Ex: "Desktop", "Nobreak"
    campos_config = Column(JSON, default=list) 

class Ativo(Base):
    __tablename__ = "ativos"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, unique=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"))
    
    # Campos Universais
    marca = Column(String, nullable=True)
    modelo = Column(String, nullable=True)
    secretaria = Column(String, nullable=True)
    local = Column(String, nullable=True)
    nome_personalizado = Column(String, nullable=True)
    setor = Column(String, nullable=True)
    tecnico = Column(String, nullable=True)
    status = Column(String, default="Ativo")
    
    # O Segredo: Campos Dinâmicos!
    dados_dinamicos = Column(JSON, default=dict) 
    data_registro = Column(DateTime, default=datetime.utcnow)
    
    categoria = relationship("Categoria")

    uuid_persistente = Column(String, index=True, nullable=True)
    ultima_comunicacao = Column(DateTime, default=datetime.utcnow)

class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"
    id = Column(Integer, primary_key=True, index=True)
    data_hora = Column(DateTime, default=datetime.utcnow)
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
    nome_exibicao = Column(String, nullable=True)
    avatar = Column(String, default="letras")
    permissoes = Column(JSON, default=list)

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
    data_transferencia = Column(DateTime, default=datetime.utcnow)

class RegistroManutencao(Base):
    __tablename__ = "registros_manutencao"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, index=True)
    status_anterior = Column(String)
    status_novo = Column(String)
    os_referencia = Column(String, nullable=True) 
    motivo = Column(String)
    destino = Column(String, nullable=True) 
    usuario = Column(String)
    data_registro = Column(DateTime, default=datetime.utcnow)

class HistoricoLeitura(Base):
    __tablename__ = "historico_leituras"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, index=True) # Liga a leitura à impressora
    data_leitura = Column(DateTime, default=datetime.utcnow)
    paginas_totais = Column(Integer, default=0)
    toner_nivel = Column(String, nullable=True)
    cilindro_nivel = Column(String, nullable=True)

class ComandoAgente(Base):
    __tablename__ = "comandos_agente"
    
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, index=True) # Máquina alvo
    uuid_persistente = Column(String, index=True) # O ID físico do PC para ele saber que é pra ele
    script_content = Column(Text) # O código PowerShell/CMD a ser rodado
    status = Column(String, default="PENDENTE") # PENDENTE, EXECUTANDO, CONCLUIDO, ERRO
    output_log = Column(Text, nullable=True) # A resposta do terminal do cliente
    usuario_emissor = Column(String) # Qual Admin mandou rodar
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_conclusao = Column(DateTime, nullable=True)

class AgendamentoRelatorio(Base):
    __tablename__ = "agendamentos_relatorio"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True) 
    secretarias = Column(JSON, default=list) 
    setores = Column(JSON, default=list)     
    
    # 🚀 NOVOS CAMPOS: Ciclo de Faturamento
    dia_inicio_ciclo = Column(Integer, default=1)
    dia_fim_ciclo = Column(Integer, default=30)
    
    dia_do_mes = Column(Integer)      
    horario = Column(String)          
    emails_destino = Column(Text)     
    status = Column(Boolean, default=True) 
    data_criacao = Column(DateTime, default=datetime.utcnow)

class RelatorioGerado(Base):
    __tablename__ = "relatorios_gerados"
    
    id = Column(Integer, primary_key=True, index=True)
    nome_relatorio = Column(String, index=True)
    data_emissao = Column(DateTime, default=datetime.utcnow)
    caminho_arquivo = Column(String)
    tamanho_kb = Column(Float)