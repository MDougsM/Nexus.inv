import os
import json
import random
import string
import smtplib
from email.message import EmailMessage
from datetime import datetime
from typing import Optional, List
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse # 🚀 PARA O DOWNLOAD DO ARQUIVO .PEM
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import Usuario, LogAuditoria
from pydantic import BaseModel
from passlib.context import CryptContext
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query

# 🚀 IMPORTAÇÕES DE SEGURANÇA MILITAR
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


load_dotenv()

router = APIRouter(prefix="/usuarios", tags=["Gestão de Usuários"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ==========================================
# CONFIGURAÇÃO DE SEGURANÇA E CRIPTOGRAFIA
# ==========================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return plain_password == hashed_password

def gerar_senha_temporaria(tamanho=8):
    """Gera uma senha forte aleatória (Letras, números e símbolos)"""
    caracteres = string.ascii_letters + string.digits + "@#$%"
    return ''.join(random.choice(caracteres) for i in range(tamanho))

def enviar_email_recuperacao(destinatario, nova_senha, username):
    """O 'Carteiro' que envia o e-mail para o usuário"""
    
    # 🚀 PUXANDO DO .ENV (Profissional e Seguro)
    EMAIL_REMETENTE = os.getenv("SMTP_EMAIL")
    SENHA_APP = os.getenv("SMTP_PASSWORD")

    # Se as variáveis estiverem vazias ou com o texto de exemplo, ativa o Modo Simulação
    if not EMAIL_REMETENTE or not SENHA_APP or EMAIL_REMETENTE == "seu.email.do.sistema@gmail.com":
        print(f"⚠️ [MODO SIMULAÇÃO] E-mail SMTP não configurado no .env.")
        print(f"⚠️ A nova senha gerada para o usuário '{username}' é: {nova_senha}")
        return # Sai da função para não dar erro na tela do usuário

    msg = EmailMessage()
    msg['Subject'] = "NEXUS.INV - Recuperação de Acesso"
    msg['From'] = EMAIL_REMETENTE
    msg['To'] = destinatario
    msg.set_content(f"""
Olá, {username}!

Uma solicitação de recuperação de senha foi feita para a sua conta no sistema NEXUS.INV.
Sua nova senha temporária de acesso é: {nova_senha}

Recomendamos fortemente que você altere esta senha na aba 'Meu Perfil' assim que fizer o login.

Atenciosamente,
Equipe de Segurança NEXUS INC.
""")

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMETENTE, SENHA_APP)
            smtp.send_message(msg)
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        raise HTTPException(500, "Erro ao enviar o e-mail. Verifique as configurações de SMTP do servidor.")


# ==========================================
# MODELOS DE DADOS (Pydantic)
# ==========================================
class UsuarioCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None # 🚀 AGORA ACEITA E-MAIL
    is_admin: bool
    permissoes: List[str] = []
    usuario_acao: str

class UsuarioUpdate(BaseModel):
    username: str
    password: Optional[str] = None
    email: Optional[str] = None # 🚀 AGORA ACEITA E-MAIL
    is_admin: bool
    permissoes: List[str] = [] 
    usuario_acao: str
    motivo: str

class JustificativaRequest(BaseModel):
    usuario: str
    motivo: str

class PerfilUpdate(BaseModel):
    username: str
    nome_exibicao: str
    avatar: str
    email: Optional[str] = None

class SenhaUpdate(BaseModel):
    username: str
    senha_atual: str
    senha_nova: str

# 🚀 MODELO PARA A ROTA DO ESQUECI A SENHA
class RecuperarSenhaRequest(BaseModel):
    email: str


class ChaveRequest(BaseModel):
    usuario_alvo: str
    usuario_acao: str # Quem está executando a ação (Admin Global)
    senha_arquivo: str = "Nexus@123" # Senha para proteger o .pem
# ==========================================
# ROTAS
# ==========================================
@router.post("/recuperar-senha")
def recuperar_senha(req: RecuperarSenhaRequest, db: Session = Depends(get_db)):
    """Gera uma senha nova e envia para o e-mail do usuário"""
    user = db.query(Usuario).filter(Usuario.email == req.email.strip()).first()
    
    if not user:
        raise HTTPException(404, "Não encontramos nenhum usuário vinculado a este e-mail.")
    
    nova_senha = gerar_senha_temporaria()
    user.password = get_password_hash(nova_senha)
    
    db.add(LogAuditoria(usuario="SISTEMA", acao="RECUPERACAO_SENHA", entidade="Segurança", identificador=user.username, detalhes="Nova senha temporária gerada e enviada para o e-mail cadastrado."))
    db.commit()
    
    # Chama o nosso carteiro
    enviar_email_recuperacao(user.email, nova_senha, user.username)
    
    return {"message": "Sua nova senha foi enviada para o e-mail com sucesso!"}

@router.get("/")
def listar_usuarios(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).all()
    return [{
        "id": u.id, 
        "username": u.username, 
        "email": u.email,  
        "is_admin": u.is_admin,
        "permissoes": getattr(u, 'permissoes', []) or [], 
        "nome_exibicao": getattr(u, 'nome_exibicao', u.username) or u.username,
        "avatar": getattr(u, 'avatar', 'letras') or 'letras',
        "termos_aceitos": getattr(u, 'termos_aceitos', False),
        # 🚀 A MÁGICA ACONTECE AQUI: Devolvemos o último acesso formatado pro React!
        "ultimo_acesso": u.ultimo_acesso.isoformat() + "Z" if getattr(u, 'ultimo_acesso', None) else None
    } for u in usuarios]

@router.post("/")
def criar_usuario(req: UsuarioCreate, db: Session = Depends(get_db)):
    if not req.username.strip(): raise HTTPException(400, "Nome não pode ser vazio.")
    if db.query(Usuario).filter(func.lower(Usuario.username) == req.username.strip().lower()).first():
        raise HTTPException(400, "Este usuário já existe.")
    
    # Verifica se o e-mail já está em uso (Se tiver digitado um)
    if req.email and db.query(Usuario).filter(func.lower(Usuario.email) == req.email.strip().lower()).first():
        raise HTTPException(400, "Este e-mail já está sendo utilizado por outro usuário.")
    
    novo_user = Usuario(
        username=req.username.strip(), 
        password=get_password_hash(req.password), 
        email=req.email.strip() if req.email else None, # 🚀 SALVA O E-MAIL
        is_admin=req.is_admin,
        permissoes=req.permissoes 
    )
    db.add(novo_user)
    db.flush()

    nivel = "Administrador Mestre" if req.is_admin else "Acesso Restrito"
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="CRIACAO", entidade="Usuário", identificador=req.username, detalhes=f"Criou acesso nível: {nivel}"))
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

    if db.query(Usuario).filter(func.lower(Usuario.username) == novo_nome.lower(), Usuario.id != user_id).first():
        raise HTTPException(400, "Já existe outro usuário com este nome.")

    if req.email and db.query(Usuario).filter(func.lower(Usuario.email) == req.email.strip().lower(), Usuario.id != user_id).first():
        raise HTTPException(400, "Este e-mail já está em uso por outro usuário.")

    user.username = novo_nome
    user.email = req.email.strip() if req.email else None # 🚀 ATUALIZA O E-MAIL
    user.is_admin = req.is_admin
    user.permissoes = req.permissoes

    if req.password: 
        user.password = get_password_hash(req.password)

    db.add(LogAuditoria(usuario=req.usuario_acao, acao="EDICAO", entidade="Usuário", identificador=novo_nome, detalhes=f"Alterou permissões/cadastro de '{nome_antigo}'. Motivo: {req.motivo}"))
    db.commit()
    return {"message": "Atualizado"}

@router.put("/perfil/atualizar")
def atualizar_perfil(req: PerfilUpdate, db: Session = Depends(get_db)):
    # 🚀 RASTREADOR 1
    print(f"➡️ [DEBUG] Chegou no backend! E-mail enviado pelo React: {req.email}")
    
    user = db.query(Usuario).filter(Usuario.username == req.username).first()
    if not user: raise HTTPException(404, "Usuário não encontrado")

    if req.email and db.query(Usuario).filter(func.lower(Usuario.email) == req.email.strip().lower(), Usuario.username != req.username).first():
        raise HTTPException(400, "Este e-mail já está em uso.")

    user.nome_exibicao = req.nome_exibicao
    user.avatar = req.avatar
    user.email = req.email.strip() if req.email else None
    db.commit()
    
    # 🚀 RASTREADOR 2
    print(f"✅ [DEBUG] O e-mail {user.email} foi salvo no banco com sucesso!")
    
    return {"message": "Perfil atualizado"}

@router.put("/senha/trocar")
def trocar_senha(req: SenhaUpdate, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == req.username).first()
    if not user or not verify_password(req.senha_atual, user.password):
        raise HTTPException(401, "Senha atual incorreta")

    user.password = get_password_hash(req.senha_nova)
    db.commit()
    return {"message": "Senha atualizada com sucesso"}

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

@router.post("/login")
def fazer_login(dados: dict, db: Session = Depends(get_db)):
    username = dados.get("username")
    password = dados.get("password")
    
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    
    if not usuario or not verify_password(password, usuario.password):
        db.add(LogAuditoria(usuario=username, acao="LOGIN FALHADO", entidade="Segurança", identificador="N/A", detalhes="Tentativa de login com credenciais inválidas."))
        db.commit()
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos!")
    
    db.add(LogAuditoria(usuario=usuario.username, acao="LOGIN", entidade="Segurança", identificador="N/A", detalhes="Sessão iniciada com sucesso."))
    db.commit()
    
    return {
        "message": "Login efetuado com sucesso!",
        "username": usuario.username,
        "is_admin": usuario.is_admin,
        "permissoes": getattr(usuario, 'permissoes', []) or [],
        "termos_aceitos": getattr(usuario, 'termos_aceitos', False)
    }


# ==========================================
# GESTÃO DE CHAVES C2 (Criptografia RSA)
# ==========================================
@router.get("/chaves/listar")
def listar_status_chaves(usuario_acao: str = Query(...), db: Session = Depends(get_db)):
    """Retorna a lista de chaves. Admins veem todos, comuns veem só a si mesmos."""
    user_req = db.query(Usuario).filter(Usuario.username == usuario_acao).first()
    if not user_req: return []

    # 🚀 Agora puxa TODOS os usuários cadastrados no banco
    operadores = db.query(Usuario).all()
    
    # 🔒 TRAVA DE SEGURANÇA MANTIDA:
    if not user_req.is_admin:
        # Se NÃO for admin, ele corta a lista e mostra APENAS ele mesmo
        operadores = [u for u in operadores if u.username == usuario_acao]
        
    return [{
        "username": u.username,
        "tem_chave": bool(u.chave_publica_c2)
    } for u in operadores]

@router.post("/chaves/gerar")
def gerar_par_chaves_c2(req: ChaveRequest, db: Session = Depends(get_db)):
    """Gera RSA 4096."""
    user_acao = db.query(Usuario).filter(Usuario.username == req.usuario_acao).first()
    if not user_acao: raise HTTPException(403, "Usuário executor inválido.")
    
    # 🚀 TRAVA DE SEGURANÇA: Usuário comum não gera chave pros outros
    if not user_acao.is_admin and req.usuario_acao != req.usuario_alvo:
        raise HTTPException(403, "Você só pode gerar chaves para o seu próprio usuário.")

    user = db.query(Usuario).filter(Usuario.username == req.usuario_alvo).first()
    if not user: raise HTTPException(404, "Usuário alvo não encontrado.")

    chave_privada = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    pem_privado = chave_privada.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.BestAvailableEncryption(req.senha_arquivo.encode())
    ).decode('utf-8')

    chave_publica = chave_privada.public_key()
    pem_publico = chave_publica.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    user.chave_publica_c2 = pem_publico
    db.add(LogAuditoria(usuario=req.usuario_acao, acao="SEGURANÇA", entidade="Chave C2", identificador=req.usuario_alvo, detalhes="Gerou novo par de chaves RSA."))
    db.commit()

    return PlainTextResponse(content=pem_privado, status_code=200)

@router.delete("/chaves/revogar/{usuario_alvo}")
def revogar_chave_c2(usuario_alvo: str, usuario_acao: str, db: Session = Depends(get_db)):
    """Deleta a chave pública do banco."""
    user_acao_obj = db.query(Usuario).filter(Usuario.username == usuario_acao).first()
    
    # 🚀 TRAVA DE SEGURANÇA: Usuário comum não deleta chave dos outros
    if not user_acao_obj.is_admin and usuario_acao != usuario_alvo:
        raise HTTPException(403, "Você só pode revogar a sua própria chave.")

    user = db.query(Usuario).filter(Usuario.username == usuario_alvo).first()
    if not user: raise HTTPException(404, "Usuário não encontrado.")

    user.chave_publica_c2 = None
    db.add(LogAuditoria(usuario=usuario_acao, acao="SEGURANÇA", entidade="Chave C2", identificador=usuario_alvo, detalhes="Revogou a chave de acesso C2."))
    db.commit()
    return {"message": "Acesso revogado com sucesso!"}