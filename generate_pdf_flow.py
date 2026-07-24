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
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b")
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )

    flow_step_title = ParagraphStyle(
        'FlowStepTitle',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.white,
        alignment=1 # Center
    )

    flow_step_desc = ParagraphStyle(
        'FlowStepDesc',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#f8fafc"),
        alignment=1 # Center
    )

    story = []

    # Title Block
    story.append(Paragraph("Manual de Fluxo Operacional &amp; Jornada Assistencial", title_style))
    story.append(Paragraph("Arquitetura de Processos Clínicos, Triagem Manchester, Chamadas de TV com Voz e Regulação de Leitos", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceAfter=15))

    # Executive Overview Card
    overview_html = """<b>RESUMO EXECUTIVO:</b> O <b>Health Nexus</b> é uma plataforma hospitalar integrada projetada para garantir rastreabilidade total, segurança do paciente e máxima eficiência operacional. Este documento detalha a jornada assistencial contínua, conectando a recepção, a triagem com o Protocolo de Manchester, o Painel TV com chamadas de voz, o atendimento médico em consultórios, a prescrição eletrônica e a regulação de leitos (UTI/Enfermaria) em tempo real."""
    
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
            Paragraph("<b>ETAPA 1</b><br/>Recepção &amp; Entrada", flow_step_title),
            Paragraph("<b>ETAPA 2</b><br/>Triagem Manchester", flow_step_title),
            Paragraph("<b>ETAPA 3</b><br/>Painel TV &amp; Voz", flow_step_title),
            Paragraph("<b>ETAPA 4</b><br/>Consultório Médico", flow_step_title),
            Paragraph("<b>ETAPA 5</b><br/>Regulação &amp; Leitos", flow_step_title)
        ],
        [
            Paragraph("Cadastro de chegada e validação antiduplicidade por Nome/CPF.", flow_step_desc),
            Paragraph("Classificação de risco por cores (sinais vitais).", flow_step_desc),
            Paragraph("Anúncio audível por síntese de voz (Web Speech pt-BR).", flow_step_desc),
            Paragraph("Consulta SOAP, prontuário PEP e prescrição eletrônica.", flow_step_desc),
            Paragraph("Alocação física em UTI/Enfermaria, higienização e alta.", flow_step_desc)
        ]
    ]

    diagram_table = Table(diagram_data, colWidths=[108, 108, 108, 108, 108])
    diagram_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), c_primary),
        ('BACKGROUND', (1,0), (1,-1), c_secondary),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#0284c7")),
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
            "2.1 Acolhimento, Cadastro e Prevenção de Duplicidades (Recepção)",
            c_primary,
            [
                "<b>Abertura do Atendimento:</b> O paciente é identificado pelo CPF/Nome na Recepção.",
                "<b>Trava Antiduplicidade:</b> O sistema valida se o Nome Completo (case-insensitive) ou CPF já existem na base (HTTP 409 Conflict em caso de colisão).",
                "<b>Reutilização Inteligente:</b> Em novas admissões de pacientes já cadastrados, o sistema reaproveita a ficha mestra em vez de duplicar o prontuário."
            ]
        ),
        (
            "2.2 Triagem de Enfermagem &amp; Classificação de Risco (Protocolo de Manchester)",
            c_secondary,
            [
                "<b>Coleta de Sinais Vitais:</b> Registro de Pressão Arterial, Frequência Cardíaca, Temperatura Celsius e Peso (Kg).",
                "<b>Escore Manchester:</b> Atribuição de prioridade por cores: Vermelho (Emergência), Laranja (Muito Urgente), Amarelo (Urgente), Verde (Pouco Urgente) e Azul (Não Urgente).",
                "<b>Status Assistencial:</b> Evolução para status <code>Aguardando_Atendimento</code> médico na fila Kanban."
            ]
        ),
        (
            "2.3 Painel TV de Chamadas com Síntese de Voz Audível (Web Speech API)",
            colors.HexColor("#0284c7"),
            [
                "<b>Anúncio Sonoro de Voz:</b> Chamada automatizada por síntese de voz (pt-BR) informando nome e consultório do paciente.",
                "<b>Acionamento pelo Kanban:</b> Ao clicar em <i>'Chamar para Consulta'</i> na Central de Atendimentos, a TV atualiza a tela e fala o nome.",
                "<b>Modal Dinâmico:</b> A própria aba do Painel TV permite selecionar pacientes da fila ativa ou digitar dados manualmente.",
                "<b>Auto-Refresh (3s):</b> Sincronização automática contínua para atualizar o histórico da sala de espera."
            ]
        ),
        (
            "2.4 Direcionamento e Atendimento nos Consultórios (PEP SOAPE)",
            colors.HexColor("#d97706"),
            [
                "<b>PEP - Prontuário Eletrônico:</b> Registro da evolução clínica no padrão SOAPE (Subjetivo, Objetivo, Avaliação, Plano e Evolução).",
                "<b>Prescrição &amp; Assinatura Digital:</b> Emissão de receita medicamentosa com assinatura e hash de segurança.",
                "<b>Finalização de Consulta:</b> Encerramento do atendimento ou encaminhamento para internação hospitalar."
            ]
        ),
        (
            "2.5 Regulação, Alocação de Leitos e Higienização",
            c_emerald,
            [
                "<b>Fila de Internação:</b> Paciente encaminhado para o mapa de leitos com status <code>Aguardando_Leito</code>.",
                "<b>Mapa de Leitos Hospitalares:</b> Visão em tempo real de setores (UTI Adulto, Enfermaria, Pediatria e Maternidade).",
                "<b>Alocação e Higienização:</b> O leito passa de <code>Vago</code> para <code>Ocupado</code>. Na alta, cumpre ciclo de <code>Higienização</code> antes de ser liberado."
            ]
        )
    ]

    for title, color, points in sections:
        box_data = [[Paragraph(f"<b>{title}</b>", ParagraphStyle('HHeader', fontName='Helvetica-Bold', fontSize=10.5, textColor=colors.white))]]
        box_table = Table(box_data, colWidths=[540])
        box_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), color),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))

        content_cells = []
        for p in points:
            content_cells.append([Paragraph(f"• {p}", bullet_style)])

        content_table = Table(content_cells, colWidths=[540])
        content_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BORDER', (0,0), (-1,-1), 0.8, c_border),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))

        story.append(KeepTogether([box_table, content_table, Spacer(1, 10)]))

    # Matrix Table Summary
    story.append(Spacer(1, 10))
    story.append(Paragraph("3. MATRIZ DE RESPONSABILIDADES E FLUXO DE DADOS", h2_style))

    matrix_data = [
        [
            Paragraph("<b>Perfil / Papel</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("<b>Ação Principal</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("<b>Entrada de Dados</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("<b>Saída / Evento</b>", ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))
        ],
        [
            Paragraph("<b>Recepção</b>", body_style),
            Paragraph("Admissão e checagem", body_style),
            Paragraph("CPF, Nome, Busca CEP", body_style),
            Paragraph("Ficha em <code>Aguardando_Triagem</code>", body_style)
        ],
        [
            Paragraph("<b>Enfermagem</b>", body_style),
            Paragraph("Triagem e Sinais Vitais", body_style),
            Paragraph("PA, FC, Temp, Queixas", body_style),
            Paragraph("Cor Manchester e tempo de espera", body_style)
        ],
        [
            Paragraph("<b>Médico</b>", body_style),
            Paragraph("Chamada &amp; Prontuário", body_style),
            Paragraph("Evolução SOAP e Prescrição", body_style),
            Paragraph("Anúncio sonora TV &amp; Alta ou Leito", body_style)
        ],
        [
            Paragraph("<b>Regulação</b>", body_style),
            Paragraph("Gestão de Leitos", body_style),
            Paragraph("Setor, Leito Vago/Ocupado", body_style),
            Paragraph("Internação física e Higienização", body_style)
        ]
    ]

    matrix_table = Table(matrix_data, colWidths=[90, 140, 150, 160])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.8, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light])
    ]))

    story.append(matrix_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF gerado com sucesso em: {target_path}")

if __name__ == "__main__":
    create_professional_pdf()
