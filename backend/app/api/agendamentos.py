import os
import csv
import io
from io import StringIO
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

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
    dia_inicio_ciclo: int
    dia_fim_ciclo: int
    dia_do_mes: int
    horario: str
    emails_destino: str

def gerar_e_enviar_relatorio(agendamento_id: int):
    print(f"\n[AGENDADOR] ⏳ Iniciando geração dupla (CSV+PDF) ID: {agendamento_id}")
    db = SessionLocal()
    try:
        agendamento = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.id == agendamento_id).first()
        if not agendamento or getattr(agendamento, 'status', None) is not True:
            return

        hoje = datetime.now()
        dia_inicio = getattr(agendamento, 'dia_inicio_ciclo', 1)
        dia_fim = getattr(agendamento, 'dia_fim_ciclo', 30)

        mes_atual = hoje.month
        ano_atual = hoje.year
        if mes_atual == 1:
            mes_anterior = 12
            ano_anterior = ano_atual - 1
        else:
            mes_anterior = mes_atual - 1
            ano_anterior = ano_atual

        def garantir_dia_valido(ano, mes, dia):
            import calendar
            return min(dia, calendar.monthrange(ano, mes)[1])

        dia_inicio_seguro = garantir_dia_valido(ano_anterior, mes_anterior, dia_inicio)
        dia_fim_seguro = garantir_dia_valido(ano_atual, mes_atual, dia_fim)

        data_ini_str = f"{ano_anterior}-{mes_anterior:02d}-{dia_inicio_seguro:02d}"
        data_fim_str = f"{ano_atual}-{mes_atual:02d}-{dia_fim_seguro:02d}"
        
        query_ativos = db.query(Ativo)
        if agendamento.secretarias and len(agendamento.secretarias) > 0:
            query_ativos = query_ativos.filter(Ativo.secretaria.in_(agendamento.secretarias))
        if agendamento.setores and len(agendamento.setores) > 0:
            query_ativos = query_ativos.filter(Ativo.setor.in_(agendamento.setores))
            
        lista_ativos = query_ativos.all()

        # DADOS BASE PARA AMBOS (CSV E PDF)
        dados_tabela = [["Patrimonio", "Modelo", "Secretaria", "Setor", "Contador Inicial", "Contador Final", "Consumo"]]
        total_consumo = 0

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
                if v_fim >= v_ini:
                    consumo = v_fim - v_ini
                    dados_tabela.append([ativo.patrimonio, ativo.modelo[:20] if ativo.modelo else 'S/N', ativo.secretaria[:15] if ativo.secretaria else 'S/N', ativo.setor[:15] if ativo.setor else 'S/N', str(v_ini), str(v_fim), str(consumo)])
                    total_consumo += consumo

        timestamp = hoje.strftime("%Y%m%d_%H%M%S")
        nome_limpo = agendamento.nome.replace(" ", "_").replace("/", "-")

        # ==========================================
        # 1. GERANDO O CSV
        # ==========================================
        caminho_csv = os.path.join(PASTA_RELATORIOS, f"{timestamp}_{nome_limpo}.csv")
        csv_buffer = StringIO()
        csv_writer = csv.writer(csv_buffer, delimiter=';')
        for linha in dados_tabela:
            csv_writer.writerow(linha)
        csv_writer.writerow(["", "", "", "", "", "TOTAL GERAL:", str(total_consumo)])

        csv_bytes = ("\uFEFF" + csv_buffer.getvalue()).encode('utf-8')
        with open(caminho_csv, "wb") as f:
            f.write(csv_bytes)

        db.add(RelatorioGerado(
            nome_relatorio=f"{agendamento.nome} (CSV)",
            data_emissao=hoje,
            caminho_arquivo=caminho_csv,
            tamanho_kb=round(len(csv_bytes) / 1024, 1)
        ))

        # ==========================================
        # 2. GERANDO O PDF
        # ==========================================
        dados_tabela_pdf = dados_tabela.copy()
        dados_tabela_pdf.append(["", "", "", "", "", "TOTAL GERAL:", f"{total_consumo} pag."])

        caminho_pdf = os.path.join(PASTA_RELATORIOS, f"{timestamp}_{nome_limpo}.pdf")
        doc = SimpleDocTemplate(caminho_pdf, pagesize=landscape(A4))
        elementos = []
        estilos = getSampleStyleSheet()
        
        elementos.append(Paragraph(f"Relatório de Faturamento - {agendamento.nome}", estilos['Title']))
        elementos.append(Paragraph(f"<b>Período apurado:</b> {data_ini_str} até {data_fim_str}", estilos['Normal']))
        elementos.append(Spacer(1, 20))
        
        tabela = Table(dados_tabela_pdf)
        estilo_tabela = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (-1, -1), (-1, -1), colors.HexColor("#dc2626"))
        ])
        tabela.setStyle(estilo_tabela)
        elementos.append(tabela)
        doc.build(elementos)

        db.add(RelatorioGerado(
            nome_relatorio=f"{agendamento.nome} (PDF)",
            data_emissao=hoje,
            caminho_arquivo=caminho_pdf,
            tamanho_kb=round(os.path.getsize(caminho_pdf) / 1024, 1)
        ))

        db.commit()
        print(f"[AGENDADOR] ✅ SUCESSO! CSV e PDF salvos no cofre.")

    except Exception as e:
        print(f"[AGENDADOR] ❌ ERRO GERAL: {e}")
    finally:
        db.close()


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
        media_type = 'application/pdf' if filename.endswith('.pdf') else 'text/csv'
        return FileResponse(relatorio.caminho_arquivo, filename=filename, media_type=media_type)
    raise HTTPException(404, "Arquivo não encontrado")

@router.delete("/gerados/{id_relatorio}")
def deletar_relatorio_gerado(id_relatorio: int, db: Session = Depends(get_db)):
    relatorio = db.query(RelatorioGerado).filter(RelatorioGerado.id == id_relatorio).first()
    if relatorio:
        if os.path.exists(relatorio.caminho_arquivo):
            os.remove(relatorio.caminho_arquivo)
        db.delete(relatorio)
        db.commit()
        return {"message": "Relatório apagado."}
    raise HTTPException(404, "Não encontrado")

@router.get("/")
def listar_agendamentos(db: Session = Depends(get_db)):
    return db.query(AgendamentoRelatorio).all()

@router.post("/")
def criar_agendamento(req: AgendamentoCreate, db: Session = Depends(get_db)):
    from app.main import scheduler 
    dados_agendamento = req.dict()
    dados_agendamento["status"] = True 
    novo = AgendamentoRelatorio(**dados_agendamento)
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

@router.post("/{id}/gerar-agora")
def forcar_geracao_agora(id: int, db: Session = Depends(get_db)):
    agendamento = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.id == id).first()
    if not agendamento: raise HTTPException(status_code=404, detail="Não encontrado")
    try:
        gerar_e_enviar_relatorio(id)
        return {"message": "Gerado com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def deletar_agendamento(id: int, db: Session = Depends(get_db)):
    from app.main import scheduler
    agendamento = db.query(AgendamentoRelatorio).filter(AgendamentoRelatorio.id == id).first()
    if not agendamento: raise HTTPException(404, "Não encontrado")
    try: scheduler.remove_job(f"relatorio_{id}")
    except: pass
    db.delete(agendamento)
    db.commit()
    return {"message": "Cancelado."}