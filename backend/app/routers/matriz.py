import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, sessionmaker
from pydantic import BaseModel
from datetime import date, timedelta
from app.db.database import MasterSessionLocal, Empresa, TENANTS_DB_DIR, get_tenant_engine, MasterBase, SuperAdmin, TENANTS_DB_DIR
from app.models import Usuario, Base, LogAuditoria
from passlib.context import CryptContext
from app.api.usuarios import gerar_senha_temporaria, enviar_email_recuperacao
from fastapi.responses import FileResponse

router = APIRouter(prefix="/matriz", tags=["Modo Deus"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ResetMasterRequest(BaseModel):
    email: str

def get_master_db(request: Request):
    """Garante que apenas requisições da NEXUS_MASTER acessem esta rota."""
    if request.headers.get("x-empresa") != "NEXUS_MASTER":
        raise HTTPException(403, "Acesso negado à Matriz.")
    db = MasterSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/perfil-mestre")
def buscar_perfil_mestre(db: Session = Depends(get_master_db)):
    # Como só existe um Nexus, buscamos o primeiro
    admin = db.query(SuperAdmin).filter(SuperAdmin.username == "Nexus").first()
    return {"username": admin.username, "email": admin.email_recuperacao}

@router.put("/perfil-mestre")
def atualizar_perfil_mestre(dados: dict, db: Session = Depends(get_master_db)):
    admin = db.query(SuperAdmin).filter(SuperAdmin.username == "Nexus").first()
    if not admin: raise HTTPException(404)
    
    # Atualiza o e-mail de recuperação
    if "email" in dados:
        admin.email_recuperacao = dados["email"]
    
    # Se quiser mudar a senha mestre por aqui também:
    if "nova_senha" in dados and dados["nova_senha"]:
        admin.password_hash = pwd_context.hash(dados["nova_senha"])
        
    db.commit()
    return {"message": "Perfil Mestre atualizado com sucesso!"}

@router.post("/reset-master-acesso")
def reset_senha_master(req: ResetMasterRequest, db: Session = Depends(get_master_db)):
    admin = db.query(SuperAdmin).filter(SuperAdmin.email_recuperacao == req.email.strip()).first()
    
    if not admin:
        raise HTTPException(404, "E-mail de recuperação não reconhecido pela Matriz.")
    
    nova_senha = gerar_senha_temporaria(12) # Gera uma senha forte de 12 dígitos
    admin.password_hash = pwd_context.hash(nova_senha)
    db.commit()
    
    # Usa sua conta logistica.newpc@gmail.com configurada no .env
    enviar_email_recuperacao(admin.email_recuperacao, nova_senha, "Nexus (Mestre)")
    
    return {"message": "Uma nova credencial mestre foi enviada para o seu e-mail de segurança."}

def get_master_db(request: Request):
    if request.headers.get("x-empresa") != "NEXUS_MASTER":
        raise HTTPException(403, "Acesso negado.")
    db = MasterSessionLocal()
    try: yield db
    finally: db.close()

# --- SCHEMAS ---
class EmpresaUpdate(BaseModel):
    codigo: str
    valor: float
    dia_vencimento: int
    ciclo: str
    limite_maquinas: int
    em_manutencao: bool

class UserTenantAction(BaseModel):
    empresa_cod: str
    username: str
    password: str = None
    is_admin: bool = False

# --- ROTAS DE GESTÃO DE EMPRESAS ---

@router.get("/empresas")
def listar_empresas(db: Session = Depends(get_master_db)):
    return db.query(Empresa).all()

@router.put("/empresas/{id}/atualizar")
def atualizar_empresa(id: int, req: EmpresaUpdate, db: Session = Depends(get_master_db)):
    emp = db.query(Empresa).filter(Empresa.id == id).first()
    if not emp: raise HTTPException(404)

    novo_codigo = req.codigo.strip().upper()
    
    # 🚀 Lógica de Renomear Arquivo Físico
    if novo_codigo != emp.codigo_acesso:
        velho_path = os.path.join(TENANTS_DB_DIR, emp.db_nome)
        novo_db_nome = f"empresa_{novo_codigo.lower()}.db"
        novo_path = os.path.join(TENANTS_DB_DIR, novo_db_nome)
        
        try:
            if os.path.exists(velho_path):
                os.rename(velho_path, novo_path)
            emp.codigo_acesso = novo_codigo
            emp.db_nome = novo_db_nome
        except Exception as e:
            raise HTTPException(500, f"Erro ao renomear banco: {str(e)}")

    emp.valor_contrato = req.valor
    emp.dia_vencimento = req.dia_vencimento
    emp.ciclo_pagamento = req.ciclo
    emp.limite_maquinas = req.limite_maquinas
    emp.em_manutencao = req.em_manutencao
    db.commit()
    return {"message": "Empresa atualizada!"}

@router.post("/empresas/{id}/confirmar-pagamento")
def confirmar_pagamento(id: int, db: Session = Depends(get_master_db)):
    emp = db.query(Empresa).filter(Empresa.id == id).first()
    if not emp: raise HTTPException(404)
    
    hoje = date.today()
    # Lógica: Se pagou hoje, o próximo vencimento será no próximo mês, no dia estipulado
    proximo_mes = hoje.month + 1
    proximo_ano = hoje.year
    if proximo_mes > 12:
        proximo_mes = 1
        proximo_ano += 1
        
    emp.proximo_vencimento = date(proximo_ano, proximo_mes, emp.dia_vencimento)
    emp.inadimplente = False
    db.commit()
    return {"message": f"Pagamento confirmado para {emp.codigo_acesso}. Próximo vencimento: {emp.proximo_vencimento}"}

# --- ROTAS DE GESTÃO DE USUÁRIOS DO CLIENTE ---

@router.get("/usuarios-cliente/{empresa_cod}")
def listar_usuarios_do_cliente(empresa_cod: str):
    master_db = MasterSessionLocal()
    emp = master_db.query(Empresa).filter(Empresa.codigo_acesso == empresa_cod).first()
    master_db.close()
    
    engine = get_tenant_engine(emp.db_nome)
    SessionTemp = sessionmaker(bind=engine)
    db = SessionTemp()
    users = db.query(Usuario).all()
    db.close()
    return users

@router.post("/usuarios-cliente/criar")
def criar_usuario_no_cliente(req: UserTenantAction):
    master_db = MasterSessionLocal()
    emp = master_db.query(Empresa).filter(Empresa.codigo_acesso == req.empresa_cod).first()
    master_db.close()
    
    engine = get_tenant_engine(emp.db_nome)
    SessionTemp = sessionmaker(bind=engine)
    db = SessionTemp()
    
    novo = Usuario(
        username=req.username, 
        password=pwd_context.hash(req.password),
        is_admin=req.is_admin,
        termos_aceitos=True # Já nasce aceito por ser criado pelo Master
    )
    db.add(novo)
    db.commit()
    db.close()
    return {"message": "Usuário criado no cliente!"}

@router.get("/empresas/{id}/download")
def baixar_banco_dados(id: int, db: Session = Depends(get_master_db)):
    """Baixa o arquivo SQLite do cliente fisicamente."""
    emp = db.query(Empresa).filter(Empresa.id == id).first()
    if not emp: raise HTTPException(404, "Empresa não encontrada.")
    
    file_path = os.path.join(TENANTS_DB_DIR, emp.db_nome)
    if not os.path.exists(file_path):
        raise HTTPException(404, "Arquivo de banco de dados não encontrado no servidor.")
        
    return FileResponse(path=file_path, filename=emp.db_nome, media_type='application/octet-stream')

class BroadcastRequest(BaseModel):
    titulo: str
    mensagem: str

@router.post("/broadcast")
def enviar_comunicado_global(req: BroadcastRequest, db: Session = Depends(get_master_db)):
    empresas = db.query(Empresa).filter(Empresa.ativo == True).all()
    sucessos = 0
    for emp in empresas:
        try:
            engine = get_tenant_engine(emp.db_nome)
            TenantSession = sessionmaker(bind=engine)
            t_db = TenantSession()
            # Insere o aviso no log de auditoria de cada cliente (Fica registrado pro Admin deles ver)
            t_db.add(LogAuditoria(usuario="NEXUS_SYSTEM", acao="COMUNICADO", entidade="Sistema", identificador=req.titulo.upper(), detalhes=req.mensagem))
            t_db.commit()
            t_db.close()
            sucessos += 1
        except: pass
    return {"message": f"Aviso transmitido para {sucessos} clientes!"}