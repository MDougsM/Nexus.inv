from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean, Float
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.db.database import Base

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True)
    campos_config = Column(JSON, default=list)

# 🚀 NOVA ESTRUTURA HIERÁRQUICA (Substitui Secretaria e Setor)
class UnidadeAdministrativa(Base):
    __tablename__ = "unidades_administrativas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    tipo = Column(String) # SECRETARIA, DEPARTAMENTO, UNIDADE, SALA
    
    # Hierarquia Infinita (Parent-Child)
    pai_id = Column(Integer, ForeignKey("unidades_administrativas.id"), nullable=True)
    subunidades = relationship("UnidadeAdministrativa", 
                               backref=backref('pai', remote_side=[id]),
                               cascade="all, delete-orphan")
    
    # Metadados para Topologia e Plantas
    planta_imagem = Column(String, nullable=True) 
    coordenadas_json = Column(JSON, nullable=True) 

class Ativo(Base):
    __tablename__ = "ativos"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, unique=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"))
    
    # 🚀 Vínculo com a nova Hierarquia
    unidade_id = Column(Integer, ForeignKey("unidades_administrativas.id"), nullable=True)
    unidade = relationship("UnidadeAdministrativa")

    # 🏛️ CAMPOS GOVERNAMENTAIS (LICITAÇÃO/GARANTIA)
    numero_licitacao = Column(String, nullable=True)
    data_vencimento_garantia = Column(DateTime, nullable=True)
    responsavel_atual = Column(String, nullable=True)
    termo_responsabilidade_url = Column(String, nullable=True)

    # Mantemos para compatibilidade temporária
    secretaria = Column(String, nullable=True)
    setor = Column(String, nullable=True)
    
    # Outros campos originais
    dominio_proprio = Column(Boolean, default=False)
    marca = Column(String, nullable=True)
    modelo = Column(String, nullable=True)
    local = Column(String, nullable=True)
    nome_personalizado = Column(String, nullable=True)
    tecnico = Column(String, nullable=True)
    status = Column(String, default="Ativo")
    dados_dinamicos = Column(JSON, default=dict) 
    data_registro = Column(DateTime, default=datetime.utcnow)
    categoria = relationship("Categoria")
    uuid_persistente = Column(String, index=True, nullable=True)
    ultima_comunicacao = Column(DateTime, default=datetime.utcnow)
    dados_avancados = Column(JSON, nullable=True)
    deletado = Column(Boolean, default=False)

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

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password = Column(String)
    is_admin = Column(Boolean, default=False)
    nome_exibicao = Column(String, nullable=True)
    avatar = Column(String, default="letras")
    permissoes = Column(JSON, default=list)
    termos_aceitos = Column(Boolean, default=False)
    data_aceite = Column(DateTime, nullable=True)
    ip_aceite = Column(String(50), nullable=True)
    chave_publica_c2 = Column(Text, nullable=True)
    ultimo_acesso = Column(DateTime, nullable=True)

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
    patrimonio = Column(String, index=True)
    data_leitura = Column(DateTime, default=datetime.utcnow)
    paginas_totais = Column(Integer, default=0)
    toner_nivel = Column(String, nullable=True)
    cilindro_nivel = Column(String, nullable=True)

class ComandoAgente(Base):
    __tablename__ = "comandos_agente"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String, index=True) 
    uuid_persistente = Column(String, index=True) 
    script_content = Column(Text) 
    status = Column(String, default="PENDENTE") 
    output_log = Column(Text, nullable=True) 
    usuario_emissor = Column(String) 
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_conclusao = Column(DateTime, nullable=True)

class AgendamentoRelatorio(Base):
    __tablename__ = "agendamentos_relatorio"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True) 
    secretarias = Column(JSON, default=list) 
    setores = Column(JSON, default=list)     
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

class AtivoVinculo(Base):
    __tablename__ = "ativo_vinculos"
    id = Column(Integer, primary_key=True, index=True)
    patrimonio_pai = Column(String, index=True, nullable=False)
    patrimonio_filho = Column(String, index=True, nullable=False)
    tipo_relacao = Column(String, default="VINCULADO") # Ex: "Hospeda VM", "Monitor de", "Conectado a"
    data_vinculo = Column(DateTime, default=datetime.utcnow)

class DicionarioPropriedade(Base):
    __tablename__ = "dicionario_propriedades"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True, nullable=False)
    descricao = Column(String, nullable=True)