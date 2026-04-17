import psycopg2
from passlib.context import CryptContext
import urllib.parse

# 1. Configuração da Senha Mestra do Sistema
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
senha_nova_hash = pwd_context.hash("Nexus@2026") # 🚀 Sua nova senha será esta

# 2. Conexão com o Postgres (Porta 5433 que abrimos no Docker)
senha_db = urllib.parse.quote_plus("Nexus@Deus2026")
conn = psycopg2.connect(f"postgresql://nexus:{senha_db}@localhost:5433/empresa_newpc")
cur = conn.cursor()

try:
    print("🔍 Verificando usuários existentes...")
    cur.execute("SELECT id, username FROM usuarios;")
    usuarios = cur.fetchall()
    print(f"👥 Usuários encontrados no banco: {usuarios}")

    # Atualiza o admin para ter uma senha válida ou cria um novo
    print("\n🔐 Atualizando senha do admin para formato Bcrypt...")
    cur.execute("""
        UPDATE usuarios 
        SET password = %s, is_admin = True 
        WHERE username = 'admin';
    """, (senha_nova_hash,))
    
    if cur.rowcount == 0:
        print("➕ Admin não encontrado, criando novo usuário 'nexus_admin'...")
        cur.execute("""
            INSERT INTO usuarios (username, password, is_admin, nome_exibicao, termos_aceitos)
            VALUES (%s, %s, %s, %s, %s);
        """, ('nexus_admin', senha_nova_hash, True, 'Nexus Mestre', True))

    conn.commit()
    print("\n✅ SUCESSO! Tente logar com:")
    print("👤 Usuário: admin (ou nexus_admin)")
    print("🔑 Senha: Nexus@2026")

except Exception as e:
    print(f"❌ Erro: {e}")
finally:
    cur.close()
    conn.close()