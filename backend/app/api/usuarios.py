from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import SessionLocal
from app.models import Usuario, LogAuditoria
from pydantic import BaseModel
from passlib.context import CryptContext

router = APIRouter(prefix="/usuarios", tags=["Gestão de Usuários"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# CONFIGURAÇÃO DE SEGURANÇA E CRIPTOGRAFIA
# (DEVE FICAR AQUI NO TOPO!)
# ==========================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    # Trata o caso em que o banco antigo tem senha em texto puro (admin123)
    # Se a senha salva no banco não tiver o formato do bcrypt, ele compara direto
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return plain_password == hashed_password

# ==========================================
# MODELOS DE DADOS
# ==========================================
class UsuarioCreate(BaseModel):
    username: str
    password: str
    is_admin: bool
    usuario_acao: str

class UsuarioUpdate(BaseModel):
    username: str
    password: str = None # Opcional na edição
    is_admin: bool
    usuario_acao: str
    motivo: str

class JustificativaRequest(BaseModel):
    usuario: str
    motivo: str

# ==========================================
# ROTAS
# ==========================================
@router.get("/")
def listar_usuarios(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).all()
    return [{"id": u.id, "username": u.username, "is_admin": u.is_admin} for u in usuarios]

@router.post("/")
def criar_usuario(req: UsuarioCreate, db: Session = Depends(get_db)):
    if not req.username.strip(): raise HTTPException(400, "Nome não pode ser vazio.")
    
    # Verifica duplicidade ignorando case
    if db.query(Usuario).filter(func.lower(Usuario.username) == req.username.strip().lower()).first():
        raise HTTPException(400, "Este usuário já existe.")
    
    # Salva com a senha Criptografada (HASH)
    novo_user = Usuario(
        username=req.username.strip(), 
        password=get_password_hash(req.password), 
        is_admin=req.is_admin
    )
    db.add(novo_user)
    db.flush()

    nivel = "Administrador" if req.is_admin else "Técnico"
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="CRIACAO", entidade="Usuário", identificador=req.username, detalhes=f"Criou acesso nível {nivel}"))
    db.commit()
    return {"message": "Criado com sucesso"}

@router.put("/{user_id}")
def editar_usuario(user_id: int, req: UsuarioUpdate, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user: raise HTTPException(404, "Usuário não encontrado.")
    
    if user.username == "admin" and req.username.lower() != "admin":
        raise HTTPException(400, "O nome do administrador mestre não pode ser alterado.")

    nome_antigo = user.username
    novo_nome = req.username.strip()

    # Verifica se o novo nome já pertence a outra pessoa
    if db.query(Usuario).filter(func.lower(Usuario.username) == novo_nome.lower(), Usuario.id != user_id).first():
        raise HTTPException(400, "Já existe outro usuário com este nome.")

    user.username = novo_nome
    user.is_admin = req.is_admin
    
    # Atualiza a senha criptografada só se o usuário digitou uma nova
    if req.password: 
        user.password = get_password_hash(req.password)

    db.add(LogAuditoria(usuario=req.usuario_acao, acao="EDICAO", entidade="Usuário", identificador=novo_nome, detalhes=f"Alterou cadastro de '{nome_antigo}'. Motivo: {req.motivo}"))
    db.commit()
    return {"message": "Atualizado"}

@router.delete("/{user_id}")
def deletar_usuario(user_id: int, req: JustificativaRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user: raise HTTPException(404, "Usuário não encontrado.")
    if user.username == "admin": raise HTTPException(400, "O admin não pode ser excluído.")

    username = user.username
    db.delete(user)
    db.add(LogAuditoria(usuario=req.usuario, acao="EXCLUSAO", entidade="Usuário", identificador=username, detalhes=f"Revogou acesso. Motivo: {req.motivo}"))
    db.commit()
    return {"message": "Excluído"}

# ==========================================
# ROTA DE LOGIN (AUTENTICAÇÃO)
# ==========================================
@router.post("/login")
def fazer_login(dados: dict, db: Session = Depends(get_db)):
    username = dados.get("username")
    password = dados.get("password")
    
    # Procura o utilizador no banco
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    
    # Se não existir ou a password estiver errada
    if not usuario or not verify_password(password, usuario.password):
        db.add(LogAuditoria(usuario=username, acao="LOGIN FALHADO", entidade="Segurança", identificador="N/A", detalhes="Tentativa de login com credenciais inválidas."))
        db.commit()
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos!")
    
    # Regista o sucesso do login
    db.add(LogAuditoria(usuario=usuario.username, acao="LOGIN", entidade="Segurança", identificador="N/A", detalhes="Sessão iniciada com sucesso."))
    db.commit()
    
    return {
        "message": "Login efetuado com sucesso!",
        "username": usuario.username,
        "is_admin": usuario.is_admin
    }