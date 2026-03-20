import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta
import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.db.database import SessionLocal
from app.models import AgendamentoRelatorio, Ativo, HistoricoLeitura, RelatorioGerado

router = APIRouter(prefix="/agendamentos", tags=["Relatórios Automáticos"])

PASTA_RELATORIOS = "relatorios_gerados_csv"
os.makedirs(PASTA_RELATORIOS, exist_ok=True)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class AgendamentoCreate(BaseModel):
    nome: str
    secretarias: List[str]
    setores: List[str]
    dia_do_mes: int
    horario: str
    emails_destino: str

def gerar_e_enviar_relatorio(agendamento_id: int):
    db = SessionLocal()
    try:
        agendamento = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.id == agendamento_id).first()
        if not agendamento or not agendamento.status:
            return

        hoje = datetime.now()
        primeiro_dia_mes_atual = hoje.replace(day=1)
        ultimo_dia_mes_passado = primeiro_dia_mes_atual - timedelta(days=1)
        primeiro_dia_mes_passado = ultimo_dia_mes_passado.replace(day=1)

        data_ini_str = primeiro_dia_mes_passado.strftime("%Y-%m-%d")
        data_fim_str = ultimo_dia_mes_passado.strftime("%Y-%m-%d")

        query_ativos = db.query(Ativo)
        if agendamento.secretarias and len(agendamento.secretarias) > 0:
            query_ativos = query_ativos.filter(Ativo.secretaria.in_(agendamento.secretarias))
        if agendamento.setores and len(agendamento.setores) > 0:
            query_ativos = query_ativos.filter(Ativo.setor.in_(agendamento.setores))
            
        lista_ativos = query_ativos.all()

        csv_buffer = StringIO()
        csv_writer = csv.writer(csv_buffer, delimiter=';')
        csv_writer.writerow(["Patrimonio", "Modelo", "Secretaria", "Setor", "Contador Inicial", "Contador Final", "Consumo"])

        for ativo in lista_ativos:
            inicial = db.query(HistoricoLeitura).filter(
                HistoricoLeitura.patrimonio == ativo.patrimonio,
                HistoricoLeitura.data_leitura >= data_ini_str
            ).order_by(HistoricoLeitura.data_leitura.asc()).first()

            final = db.query(HistoricoLeitura).filter(
                HistoricoLeitura.patrimonio == ativo.patrimonio,
                HistoricoLeitura.data_leitura <= data_fim_str + " 23:59:59"
            ).order_by(HistoricoLeitura.data_leitura.desc()).first()

            if inicial and final:
                v_ini = inicial.paginas_totais
                v_fim = final.paginas_totais
                csv_writer.writerow([ativo.patrimonio, ativo.modelo, ativo.secretaria, ativo.setor, v_ini, v_fim, (v_fim - v_ini)])

        # 🚀 1. SALVAR NO DISCO E REGISTRAR NO BANCO DE DADOS
        timestamp = hoje.strftime("%Y%m%d_%H%M%S")
        nome_limpo = agendamento.nome.replace(" ", "_").replace("/", "-")
        nome_arquivo = f"{timestamp}_{nome_limpo}.csv"
        caminho_completo = os.path.join(PASTA_RELATORIOS, nome_arquivo)
        
        csv_bytes = ("\uFEFF" + csv_buffer.getvalue()).encode('utf-8')
        with open(caminho_completo, "wb") as f:
            f.write(csv_bytes)
            
        tamanho_kb = round(len(csv_bytes) / 1024, 1)

        # Regista no Banco de Dados
        novo_relatorio = RelatorioGerado(
            nome_relatorio=agendamento.nome,
            data_emissao=hoje,
            caminho_arquivo=caminho_completo,
            tamanho_kb=tamanho_kb
        )
        db.add(novo_relatorio)
        db.commit()

        print(f"✅ [SUCESSO] Relatório '{agendamento.nome}' registado no banco de dados!")

        # ==========================================
        # 📧 2. ENVIO DE E-MAIL (PRONTO MAS DESATIVADO)
        # ==========================================
        '''
        remetente = "seu_email@gmail.com"
        senha_app = "sua_senha_de_app" 
        msg = MIMEMultipart()
        msg['From'] = remetente
        msg['To'] = agendamento.emails_destino
        msg['Subject'] = f"📊 Fechamento NEXUS: {agendamento.nome} ({data_ini_str} a {data_fim_str})"
        corpo = f"Olá,\nSegue em anexo o relatório automático de faturamento.\nEquipe Nexus."
        msg.attach(MIMEText(corpo, 'plain'))
        anexo = MIMEApplication(csv_bytes)
        anexo.add_header('Content-Disposition', 'attachment', filename=nome_arquivo)
        msg.attach(anexo)

        try:
            servidor = smtplib.SMTP('smtp.gmail.com', 587)
            servidor.starttls()
            servidor.login(remetente, senha_app)
            servidor.send_message(msg)
            servidor.quit()
        except Exception as smtp_err:
            print(f"❌ [ERRO SMTP] Falha ao enviar: {smtp_err}")
        '''

    except Exception as e:
        print(f"❌ [ERRO GERAL] Falha ao rodar relatório agendado: {e}")
    finally:
        db.close()

# ========================================================
# 🚀 ROTAS DE GESTÃO DO COFRE (BANCO DE DADOS)
# ========================================================
@router.get("/gerados")
def listar_relatorios_gerados(db: Session = Depends(get_db)):
    relatorios = db.query(RelatorioGerado).order_by(RelatorioGerado.data_emissao.desc()).all()
    return [{
        "id": r.id,
        "nome": r.nome_relatorio,
        "data_emissao": r.data_emissao.strftime("%Y-%m-%d às %H:%M"),
        "tamanho": f"{r.tamanho_kb} KB"
    } for r in relatorios]

@router.get("/gerados/download/{id_relatorio}")
def baixar_relatorio_gerado(id_relatorio: int, db: Session = Depends(get_db)):
    relatorio = db.query(RelatorioGerado).filter(RelatorioGerado.id == id_relatorio).first()
    if relatorio and os.path.exists(relatorio.caminho_arquivo):
        filename = os.path.basename(relatorio.caminho_arquivo)
        return FileResponse(relatorio.caminho_arquivo, filename=filename, media_type='text/csv')
    raise HTTPException(404, "Arquivo não encontrado")

@router.delete("/gerados/{id_relatorio}")
def deletar_relatorio_gerado(id_relatorio: int, db: Session = Depends(get_db)):
    relatorio = db.query(RelatorioGerado).filter(RelatorioGerado.id == id_relatorio).first()
    if relatorio:
        # Apaga o ficheiro físico
        if os.path.exists(relatorio.caminho_arquivo):
            os.remove(relatorio.caminho_arquivo)
        # Apaga o registo do banco
        db.delete(relatorio)
        db.commit()
        return {"message": "Relatório apagado do servidor e do banco."}
    raise HTTPException(404, "Relatório não encontrado")

# ========================================================
# ROTAS DO AGENDADOR (ROBÔS) - MANTIDAS
# ========================================================
@router.get("/")
def listar_agendamentos(db: Session = Depends(get_db)):
    return db.query(AgendamentoRelatorio).all()

@router.post("/")
def criar_agendamento(req: AgendamentoCreate, db: Session = Depends(get_db)):
    from app.main import scheduler 
    novo = AgendamentoRelatorio(**req.dict())
    db.add(novo)
    db.commit()
    db.refresh(novo)

    hora, minuto = req.horario.split(":")
    scheduler.add_job(
        gerar_e_enviar_relatorio, 'cron', 
        day=req.dia_do_mes, hour=int(hora), minute=int(minuto), 
        args=[novo.id], id=f"relatorio_{novo.id}", replace_existing=True
    )
    return {"message": "Relatório programado!"}

@router.delete("/{id}")
def deletar_agendamento(id: int, db: Session = Depends(get_db)):
    from app.main import scheduler
    agendamento = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.id == id).first()
    if not agendamento: raise HTTPException(404, "Não encontrado")
    try: scheduler.remove_job(f"relatorio_{id}")
    except: pass
    db.delete(agendamento)
    db.commit()
    return {"message": "Agendamento cancelado."}