from app.db.database import SessionLocal
from app.models import Categoria

def atualizar_campos():
    print("⏳ Atualizando campos dinâmicos das categorias...")
    db = SessionLocal()
    try:
        categorias = db.query(Categoria).all()
        
        for cat in categorias:
            # Pega a lista atual de campos ou cria uma vazia
            campos_atuais = list(cat.campos_config) if cat.campos_config else []
            
            # 1. Adiciona 'observacao' em TODAS as categorias
            if 'observacao' not in campos_atuais:
                campos_atuais.append('observacao')
                
            # 2. Adiciona 'par_vinculo' APENAS no Conversor de Fibra
            if cat.nome.strip().lower() == 'conversor de fibra':
                if 'par_vinculo' not in campos_atuais:
                    campos_atuais.append('par_vinculo')
            
            # Salva de volta no banco
            cat.campos_config = campos_atuais
            
        db.commit()
        print("✅ SUCESSO: Campos 'observacao' e 'par_vinculo' injetados perfeitamente!")
    except Exception as e:
        print(f"❌ ERRO: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    atualizar_campos()