import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Top Banner Line
        self.setStrokeColor(colors.HexColor("#6366f1"))
        self.setLineWidth(2)
        self.line(36, 756, 576, 756)

        # Header Text
        self.drawString(36, 762, "HEALTH NEXUS | MANUAL DE FLUXO OPERACIONAL E JORNADA DO PACIENTE")
        
        # Footer Line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.8)
        self.line(36, 45, 576, 45)

        # Footer Text
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(576, 30, page_text)
        self.drawString(36, 30, "Documentação Oficial de Engenharia Hospitalar & Processos Clínicos")
        self.restoreState()

def create_professional_pdf(filename="Manual_Fluxo_Operacional_Health_Nexus.pdf"):
    target_path = os.path.join(os.getcwd(), filename)
    doc = SimpleDocTemplate(
        target_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    c_primary = colors.HexColor("#0f172a") # Deep Slate/Navy
    c_secondary = colors.HexColor("#4f46e5") # Indigo
    c_accent = colors.HexColor("#0284c7") # Sky Blue
    c_emerald = colors.HexColor("#059669") # Emerald
    c_crimson = colors.HexColor("#dc2626") # Crimson
    c_bg_light = colors.HexColor("#f8fafc") # Card BG
    c_border = colors.HexColor("#e2e8f0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_secondary,
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=12,
        spaceAfter=4
    )

    flow_step_title = ParagraphStyle(
        'FlowStepTitle',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.white
    )

    flow_step_desc = ParagraphStyle(
        'FlowStepDesc',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#f1f5f9")
    )

    story = []

    # Title Section
    story.append(Spacer(1, 10))
    story.append(Paragraph("MANUAL DE FLUXO OPERACIONAL INTEGRADO", title_style))
    story.append(Paragraph("Arquitetura de Processos Hospitalares: Da Recepção ao Atendimento Clínico e Gestão de Leitos", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_secondary, spaceBefore=0, spaceAfter=15))

    # Executive Overview Box
    overview_html = """<b>RESUMO EXECUTIVO:</b> O <b>Health Nexus</b> é uma plataforma hospitalar integrada projetada para garantir rastreabilidade total, segurança do paciente e máxima eficiência operacional. Este documento detalha a jornada assistencial contínua, conectando a recepção, a triagem com o Protocolo de Manchester, o atendimento médico em consultórios, a prescrição eletrônica e a regulação de leitos (UTI/Enfermaria) em tempo real."""
    
    overview_table = Table([[Paragraph(overview_html, body_style)]], colWidths=[540])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 15))

    # Diagram Table
    story.append(Paragraph("1. VISÃO GERAL DA JORNADA DO PACIENTE", h2_style))
    
    diagram_data = [
        [
            Paragraph("<b>ETAPA 1</b><br/>Recepção & Entrada", flow_step_title),
            Paragraph("<b>ETAPA 2</b><br/>Triagem Manchester", flow_step_title),
            Paragraph("<b>ETAPA 3</b><br/>Consultório Médico", flow_step_title),
            Paragraph("<b>ETAPA 4</b><br/>Regulação de Leito", flow_step_title),
            Paragraph("<b>ETAPA 5</b><br/>Internação & Alta", flow_step_title)
        ],
        [
            Paragraph("Cadastro de chegada e abertura do atendimento.", flow_step_desc),
            Paragraph("Classificação de risco por cores (sinais vitais).", flow_step_desc),
            Paragraph("Consulta SOAP, prescrição e decisão clínica.", flow_step_desc),
            Paragraph("Fila de espera dinâmica por vaga (UTI/Enf).", flow_step_desc),
            Paragraph("Alocação física, higienização e alta final.", flow_step_desc)
        ]
    ]

    diagram_table = Table(diagram_data, colWidths=[108, 108, 108, 108, 108])
    diagram_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), c_primary),
        ('BACKGROUND', (1,0), (1,-1), c_secondary),
        ('BACKGROUND', (2,0), (2,-1), c_accent),
        ('BACKGROUND', (3,0), (3,-1), colors.HexColor("#d97706")),
        ('BACKGROUND', (4,0), (4,-1), c_emerald),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 1, colors.white),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(diagram_table)
    story.append(Spacer(1, 15))

    # Detailed Process Sections
    story.append(Paragraph("2. DETALHAMENTO DAS ETAPAS DO SISTEMA", h2_style))

    sections = [
        (
            "2.1 Acolhimento e Cadastro (Recepção)",
            c_primary,
            [
                "<b>Abertura do Atendimento:</b> O paciente é identificado pelo CPF/Nome na Recepção ou Agenda.",
                "<b>Geração da Ficha:</b> É criado um registro ativo de atendimento em saúde com status inicial <code>Aguardando_Triagem</code>.",
                "<b>Encaminhamento Automático:</b> A ficha entra instantaneamente na fila visual da enfermagem sem necessidade de papel."
            ]
        ),
        (
            "2.2 Triagem de Enfermagem & Classificação de Risco (Protocolo de Manchester)",
            c_secondary,
            [
                "<b>Coleta de Sinais Vitais:</b> Coleta de Pressão Arterial, Frequência Cardíaca, Temperatura Celsius e Peso (Kg).",
                "<b>Escore Manchester:</b> Atribuição de prioridade pelas cores internacionais: Vermelho (Emergência), Laranja (Muito Urgente), Amarelo (Urgente), Verde (Pouco Urgente) e Azul (Não Urgente).",
                "<b>Mudança de Status:</b> O atendimento evolui para <code>Aguardando_Atendimento</code> médico com contador de tempo de espera."
            ]
        ),
        (
            "2.3 Direcionamento e Atendimento nos Consultórios",
            c_accent,
            [
                "<b>Direcionamento de Ala/Consultório:</b> A equipe direciona o paciente para um consultório físico disponível (ex: Consultório 01 - Clínica Médica, Consultório 03 - Pediatria, Sala de Sutura).",
                "<b>PEP - Prontuário Eletrônico:</b> O médico registra a evolução em modelo SOAP (Subjetivo, Objetivo, Avaliação e Plano).",
                "<b>Prescrição & Assinatura Digital:</b> Emissão de medicamentos com validação de termos e assinatura médica."
            ]
        ),
        (
            "2.4 Decisão Médica ao Término da Consulta",
            colors.HexColor("#0284c7"),
            [
                "<b>Cenário A - Alta Médica (Encerrar):</b> Paciente medicado e liberado. O status muda para <code>Finalizado</code> com fechamento do prontuário.",
                "<b>Cenário B - Solicitação de Internação:</b> Paciente necessita de leito ou UTI. O médico clica em <i>'Solicitar Internação (UTI/Enf)'</i> ➔ O atendimento passa para <code>Aguardando_Leito</code>."
            ]
        ),
        (
            "2.5 Regulação, Alocação de Leitos e Higienização",
            c_emerald,
            [
                "<b>Fila de Internação:</b> O paciente aparece na fila dinâmica da aba <b>Gestão de Leitos</b> aguardando vaga.",
                "<b>Mapa de Leitos Hospitalares:</b> A regulação visualiza os leitos divididos por setores: UTI Adulto, Enfermaria, Pediatria e Maternidade.",
                "<b>Alocação Física:</b> Clica-se em <i>'Alocar Leito'</i> em um leito com status <code>Vago</code> ➔ O leito passa a <code>Ocupado</code> e o atendimento a <code>Internado</code>.",
                "<b>Ciclo de Alta e Higienização:</b> Ao dar alta do leito, o status altera temporariamente para <code>Higienização</code> (limpeza) e em seguida retorna para <code>Vago</code>."
            ]
        )
    ]

    for title, color, points in sections:
        box_data = [[Paragraph(f"<b>{title}</b>", ParagraphStyle('HHeader', fontName='Helvetica-Bold', fontSize=10.5, textColor=colors.white))]]
        box_table = Table(box_data, colWidths=[540])
        box_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), color),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(box_table)

        point_content = []
        for pt in points:
            point_content.append(Paragraph(f"• {pt}", bullet_style))
        
        detail_table = Table([[point_content]], colWidths=[540])
        detail_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BORDER', (0,0), (-1,-1), 1, c_border),
            ('PADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(detail_table)
        story.append(Spacer(1, 10))

    # Architecture & Security Highlights
    story.append(Spacer(1, 5))
    story.append(Paragraph("3. GARANTIAS TÉCNICAS E ARQUITETURA DE DADOS", h2_style))

    tech_points = [
        [
            Paragraph("<b>Sincronização Híbrida Cloud (Turso DB):</b> Dados persistidos na nuvem com tolerância a quedas de conexão local (offline fallback).", body_style),
            Paragraph("<b>Interface Responsiva & Modais Nativos:</b> 100% das mensagens operacionais seguem o design escuro e moderno do Health Nexus.", body_style)
        ],
        [
            Paragraph("<b>Controle de Acesso (RBAC):</b> Perfis diferenciados para Médicos, Enfermagem, Administradores e Desenvolvedores.", body_style),
            Paragraph("<b>Auditoria & Rastreabilidade:</b> Histórico completo de alterações de status, salas e leitos com carimbo de tempo (timestamp).", body_style)
        ]
    ]

    tech_table = Table(tech_points, colWidths=[264, 264])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(tech_table)

    # Signatures / Approval Footer
    story.append(Spacer(1, 20))
    sig_data = [
        [
            Paragraph("<b>Engenharia de Software & Arquitetura</b><br/>Health Nexus Development Team", ParagraphStyle('Sig', fontName='Helvetica', fontSize=8.5, alignment=1)),
            Paragraph("<b>Direção Clínica & Operações Hospitalares</b><br/>Health Nexus Management", ParagraphStyle('Sig', fontName='Helvetica', fontSize=8.5, alignment=1))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (0,0), 1, colors.HexColor("#94a3b8")),
        ('LINEABOVE', (1,0), (1,0), 1, colors.HexColor("#94a3b8")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(KeepTogether(sig_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF gerado com sucesso em: {target_path}")

if __name__ == "__main__":
    create_professional_pdf()
