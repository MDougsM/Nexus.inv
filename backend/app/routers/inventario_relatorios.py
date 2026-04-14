import csv, io, re
from datetime import timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from app.models import Ativo, Categoria, LogAuditoria, HistoricoLeitura
from .inventario_core import get_db, obter_proximo_patrimonio

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Line
from reportlab.lib.enums import TA_CENTER
from reportlab.graphics.barcode import qr
from reportlab.lib.units import mm

router = APIRouter(prefix="/inventario", tags=["Inventário - Relatórios e Utilitários"])

class FiltroRelatorio(BaseModel):
    dataInicio: str
    dataFim: str
    secretarias: List[str]
    setores: List[str]
    patrimonio: Optional[str] = ""

class EtiquetasRequest(BaseModel):
    patrimonios: List[str]
    url_base: str = ""

@router.get("/leituras/{patrimonio_ou_id:path}")
def obter_historico_leituras(patrimonio_ou_id: str, db: Session = Depends(get_db)):
    ativo = db.query(Ativo).filter(or_(Ativo.patrimonio == patrimonio_ou_id, Ativo.id == (int(patrimonio_ou_id) if patrimonio_ou_id.isdigit() else -1))).first()
    if not ativo: return []
    leituras = db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == ativo.patrimonio).order_by(HistoricoLeitura.data_leitura.desc()).limit(1000).all()
    leituras.reverse() 
    return [{"id": l.id, "data_raw": (l.data_leitura - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S"), "paginas": l.paginas_totais} for l in leituras]

@router.get("/relatorio/mps/exportar")
def exportar_relatorio_mps(secretaria: str = "", local: str = "", db: Session = Depends(get_db)):
    cats = db.query(Categoria).filter(Categoria.nome.in_(["Multifuncional", "Impressora"])).all()
    query = db.query(Ativo).filter(Ativo.categoria_id.in_([c.id for c in cats]))
    if secretaria: query = query.filter(Ativo.secretaria == secretaria)
    if local: query = query.filter(Ativo.local == local)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Patrimonio', 'Modelo', 'IP', 'Serial', 'Secretaria', 'Local', 'Setor', 'Toner (%)', 'Cilindro (%)', 'Odometro Total', 'Status'])
    for a in query.all():
        specs = a.dados_dinamicos or {}
        writer.writerow([a.patrimonio, a.modelo, specs.get('ip', ''), specs.get('serial', ''), a.secretaria, a.local, a.setor, specs.get('toner', ''), specs.get('cilindro', ''), specs.get('paginas_totais', ''), a.status])
    
    return StreamingResponse(io.BytesIO(output.getvalue().encode('utf-8-sig')), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=Faturamento_MPS_{secretaria or 'Geral'}.csv"})

@router.post("/relatorios/faturamento")
def relatorio_faturamento_avancado(filtro: FiltroRelatorio, db: Session = Depends(get_db)):
    query = db.query(Ativo)
    if filtro.secretarias: query = query.filter(Ativo.secretaria.in_(filtro.secretarias))
    if filtro.setores: query = query.filter(Ativo.setor.in_(filtro.setores))
    if filtro.patrimonio: query = query.filter(Ativo.patrimonio.ilike(f"%{filtro.patrimonio}%"))
    
    relatorio = []
    for ativo in query.all():
        inicial = db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == ativo.patrimonio, HistoricoLeitura.data_leitura >= filtro.dataInicio).order_by(HistoricoLeitura.data_leitura.asc()).first()
        final = db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == ativo.patrimonio, HistoricoLeitura.data_leitura <= filtro.dataFim + " 23:59:59").order_by(HistoricoLeitura.data_leitura.desc()).first()
        if inicial and final:
            relatorio.append({"patrimonio": ativo.patrimonio, "modelo": ativo.modelo, "secretaria": ativo.secretaria, "setor": ativo.setor, "inicial": inicial.paginas_totais, "final": final.paginas_totais, "consumo": final.paginas_totais - inicial.paginas_totais})
    return relatorio

@router.post("/relatorios/faturamento/pdf")
def relatorio_faturamento_pdf(filtros: FiltroRelatorio, db: Session = Depends(get_db)):
    query = db.query(Ativo)
    if filtros.patrimonio: query = query.filter(Ativo.patrimonio.ilike(f"%{filtros.patrimonio}%"))
    if filtros.secretarias: query = query.filter(Ativo.secretaria.in_(filtros.secretarias))
    if filtros.setores: query = query.filter(Ativo.setor.in_(filtros.setores))
        
    dados_tabela = [["Patrimônio", "Modelo", "Secretaria", "Setor", "Inicial", "Final", "Consumo"]]
    total_consumo = 0

    for a in query.all():
        inicial = db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == a.patrimonio, HistoricoLeitura.data_leitura >= f"{filtros.dataInicio} 00:00:00").order_by(HistoricoLeitura.data_leitura.asc()).first()
        final = db.query(HistoricoLeitura).filter(HistoricoLeitura.patrimonio == a.patrimonio, HistoricoLeitura.data_leitura <= f"{filtros.dataFim} 23:59:59").order_by(HistoricoLeitura.data_leitura.desc()).first()
        if inicial and final and final.paginas_totais >= inicial.paginas_totais:
            consumo = final.paginas_totais - inicial.paginas_totais
            dados_tabela.append([a.patrimonio, a.modelo[:20] if a.modelo else 'Desc', a.secretaria[:15] if a.secretaria else 'S/N', a.setor[:15] if a.setor else 'S/N', str(inicial.paginas_totais), str(final.paginas_totais), str(consumo)])
            total_consumo += consumo

    dados_tabela.append(["", "", "", "", "", "TOTAL GERAL:", f"{total_consumo} pág."])
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    elementos = [Paragraph("Relatório de Faturamento Manual", getSampleStyleSheet()['Title']), Paragraph(f"Período: {filtros.dataInicio} até {filtros.dataFim}", getSampleStyleSheet()['Normal']), Spacer(1, 20)]
    
    tabela = Table(dados_tabela)
    tabela.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563EB")), ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke), ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('GRID', (0,0), (-1,-1), 1, colors.black), ('TEXTCOLOR', (-1, -1), (-1, -1), colors.HexColor("#dc2626"))]))
    elementos.append(tabela)
    doc.build(elementos)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Faturamento_{filtros.dataInicio}.pdf"})

@router.get("/patrimonios/status")
def status_patrimonios(db: Session = Depends(get_db)):
    ativos = db.query(Ativo.patrimonio, Ativo.modelo).filter(
        Ativo.deletado == False,
        Ativo.patrimonio.isnot(None),
        Ativo.patrimonio != ""
    ).all()

    usados = sorted(
        [{"patrimonio": a[0], "modelo": a[1] or "Desconhecido"} for a in ativos],
        key=lambda x: x["patrimonio"]
    )

    numeros_usados = set()
    for ativo in ativos:
        match = re.search(r"NXS-(\d{4})$", ativo[0] or "")
        if match:
            numeros_usados.add(int(match.group(1)))

    proximo_livre = None
    for numero in range(0, 10000):
        if numero not in numeros_usados:
            proximo_livre = f"NXS-{numero:04d}"
            break

    if proximo_livre is None:
        proximo_livre = "ESGOTADO"

    return {
        "proximo_livre": proximo_livre,
        "total_usados": len(usados),
        "lista_usados": usados
    }

@router.post("/patrimonios/etiquetas/pdf")
def gerar_etiquetas_pdf(req: EtiquetasRequest, db: Session = Depends(get_db)):
    ativos_db = db.query(Ativo).filter(Ativo.patrimonio.in_(req.patrimonios)).order_by(Ativo.patrimonio).all()
    if not ativos_db: raise HTTPException(status_code=400, detail="Nenhum patrimônio cadastrado encontrado neste intervalo.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(50*mm, 80*mm), leftMargin=3*mm, rightMargin=3*mm, topMargin=5*mm, bottomMargin=3*mm)
    elementos = []
    estilos = getSampleStyleSheet()
    
    for ativo in ativos_db:
        elementos.append(Paragraph("NEXUS.INV", ParagraphStyle('Topo', parent=estilos['Normal'], fontName='Helvetica-Bold', fontSize=10, alignment=TA_CENTER)))
        elementos.append(Spacer(1, 2*mm))
        linha = Drawing(40*mm, 1*mm)
        linha.add(Line(0, 0, 40*mm, 0, strokeColor=colors.HexColor("#cbd5e1"), strokeWidth=0.8))
        linha.hAlign = 'CENTER'
        elementos.append(linha)
        elementos.append(Spacer(1, 4*mm))

        url_qr = f"{req.url_base}/consulta/{ativo.patrimonio}" if req.url_base else f"https://nexus.inv/consulta/{ativo.patrimonio}"
        qr_code = qr.QrCodeWidget(url_qr)
        bounds = qr_code.getBounds()
        w, h = bounds[2] - bounds[0], bounds[3] - bounds[1]
        desenho_qr = Drawing(32*mm, 32*mm, transform=[(32*mm)/w, 0, 0, (32*mm)/h, 0, 0])
        desenho_qr.hAlign = 'CENTER'
        elementos.append(desenho_qr)
        elementos.append(Spacer(1, 6*mm))

        elementos.append(Paragraph(ativo.patrimonio, ParagraphStyle('Pat', parent=estilos['Normal'], fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER)))
        elementos.append(Spacer(1, 2*mm))
        elementos.append(Paragraph(ativo.categoria.nome.upper() if ativo.categoria else "EQUIPAMENTO", ParagraphStyle('Cat', parent=estilos['Normal'], fontName='Helvetica-Bold', fontSize=7, alignment=TA_CENTER)))
        elementos.append(PageBreak()) 
        
    doc.build(elementos)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=Nexus_Etiquetas_Termicas.pdf"})

@router.post("/upload-csv")
async def importar_csv(file: UploadFile = File(...), usuario_acao: str = Form(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'): raise HTTPException(status_code=400, detail="Formato inválido. Use um arquivo .csv")
    conteudo = await file.read()
    try: texto = conteudo.decode('utf-8')
    except: texto = conteudo.decode('latin-1')

    leitor = csv.DictReader(io.StringIO(texto), delimiter=';') 
    sucesso, erros = 0, 0
    for linha in leitor:
        try:
            patrimonio = linha.get("Patrimonio", "").strip()
            if not patrimonio or db.query(Ativo).filter(Ativo.patrimonio == patrimonio).first():
                erros += 1; continue
            nome_cat = linha.get("Categoria", "Diversos").strip() or "Diversos"
            cat = db.query(Categoria).filter(Categoria.nome == nome_cat).first()
            if not cat:
                cat = Categoria(nome=nome_cat, campos_config=[]); db.add(cat); db.commit(); db.refresh(cat)

            db.add(Ativo(patrimonio=patrimonio, categoria_id=cat.id, marca=linha.get("Marca", "").strip(), modelo=linha.get("Modelo", "").strip(), secretaria=linha.get("Secretaria", "").strip(), local=linha.get("Local", "").strip(), setor=linha.get("Setor", "").strip(), status=linha.get("Status", "Ativo").strip()))
            sucesso += 1
        except: erros += 1

    db.add(LogAuditoria(usuario=usuario_acao, acao="IMPORTACAO", entidade="Sistema", identificador="Planilha CSV", detalhes=f"Migração em lote: {sucesso} importados. {erros} ignorados/duplicados."))
    db.commit()
    return {"message": f"Migração concluída! Sucesso: {sucesso} | Ignorados: {erros}"}