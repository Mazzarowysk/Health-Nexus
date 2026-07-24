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
        self.drawString(36, 762, "HEALTH NEXUS | MANUAL OFICIAL DO USUÁRIO & GUIA DE OPERAÇÃO CLINICA")
        
        # Footer Line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.8)
        self.line(36, 45, 576, 45)

        # Footer Text
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(576, 30, page_text)
        self.drawString(36, 30, "Documentação Oficial de Engenharia Hospitalar — Versão 1.0.1")
        self.restoreState()

def create_manual_user_pdf(filename="Manual_do_Usuario_Health_Nexus.pdf"):
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
    c_primary = colors.HexColor("#0f172a")
    c_secondary = colors.HexColor("#4f46e5")
    c_accent = colors.HexColor("#0284c7")
    c_emerald = colors.HexColor("#059669")
    c_warning = colors.HexColor("#d97706")
    c_bg_light = colors.HexColor("#f8fafc")
    c_bg_card = colors.HexColor("#f1f5f9")
    c_border = colors.HexColor("#cbd5e1")

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

    h1_style = ParagraphStyle(
        'SectionH1',
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=6
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

    card_title_style = ParagraphStyle(
        'CardTitle',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_primary,
        spaceAfter=4
    )

    story = []

    # Title Block
    story.append(Paragraph("Health Nexus — Manual Oficial do Usuário", title_style))
    story.append(Paragraph("Guia de Operação Hospitalar, Admissão de Pacientes, Triagem Manchester, Painel TV com Voz e Sincronização Turso", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceAfter=12))

    # Executive Overview Box
    overview_html = """<b>APRESENTAÇÃO DO SISTEMA:</b> O <b>Health Nexus</b> é uma solução completa de gestão hospitalar desenhada para proporcionar máxima segurança clínica, rapidez no atendimento e rastreabilidade total. Este manual instrui o corpo clínico e administrativo sobre a navegação, cadastro de pacientes, chamadas de TV por voz, prontuário eletrônico (PEP) e sincronização híbrida com a nuvem."""
    
    overview_table = Table([[Paragraph(overview_html, body_style)]], colWidths=[540])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ('PADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 10))

    # SECTION 1: PERFIS DE USUÁRIO (RBAC)
    story.append(Paragraph("1. Acesso, Autenticação e Perfis de Usuário (RBAC)", h1_style))
    story.append(Paragraph("O acesso ao sistema é protegido por autenticação JWT com senhas criptografadas via bcrypt. As permissões são divididas por cargos de acordo com a atuação profissional:", body_style))
    story.append(Spacer(1, 6))

    rbac_data = [
        [
            Paragraph("<b>Perfil / Cargo</b>", ParagraphStyle('TH1', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("<b>Escopo de Atuação e Permissões</b>", ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("<b>Nível de Acesso</b>", ParagraphStyle('TH3', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))
        ],
        [Paragraph("<b>Master</b>", body_style), Paragraph("Acesso irrestrito a todo o sistema, auditorias, nuvem e gestão de usuários.", body_style), Paragraph("Total / Super-Admin", body_style)],
        [Paragraph("<b>Administrador</b>", body_style), Paragraph("Gestão de leitos, tabelas de sistema, configurações e sincronização Turso.", body_style), Paragraph("Administrativo Geral", body_style)],
        [Paragraph("<b>Médico</b>", body_style), Paragraph("Atendimento nos consultórios, PEP (SOAPE), prescrição de medicamentos e alta.", body_style), Paragraph("Clínico / Especialista", body_style)],
        [Paragraph("<b>Enfermeiro</b>", body_style), Paragraph("Classificação de risco Manchester, sinais vitais, mapa de leitos e recepção.", body_style), Paragraph("Assistencial / Triagem", body_style)],
        [Paragraph("<b>Recepcionista</b>", body_style), Paragraph("Admissão de pacientes, busca de CEP, chamadas no Painel TV e agendamentos.", body_style), Paragraph("Recepção / Atendimento", body_style)]
    ]

    rbac_table = Table(rbac_data, colWidths=[100, 310, 130])
    rbac_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('GRID', (0,0), (-1,-1), 0.8, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light])
    ]))
    story.append(rbac_table)
    story.append(Spacer(1, 12))

    # SECTION 2: ADMISSÃO & BUSCA CEP & ANTIDUPLICIDADE
    story.append(Paragraph("2. Admissão de Pacientes, Busca de CEP e Prevenção de Duplicidades", h1_style))
    story.append(Paragraph("O cadastro do paciente reúne as informações demográficas centrais da instituição:", body_style))
    story.append(Spacer(1, 4))

    fields_p = [
        "<b>Nome Completo*:</b> Preenchimento obrigatório com validação antiduplicidade.",
        "<b>CPF*:</b> Validação automática contra duplicidades no banco de dados.",
        "<b>Data de Nascimento*:</b> Cálculo automático e exibição da idade do paciente.",
        "<b>CEP (Busca Inteligente):</b> Preenchimento automático do endereço com tripla contingência.",
        "<b>Endereço &amp; Número/Complemento:</b> Campos dedicados para rua, av, número residencial e complemento (ex: <i>120 / Ap 42</i>).",
        "<b>Bairro &amp; Cidade/UF:</b> Localização demográfica do paciente (ex: <i>São Paulo - SP</i>).",
        "<b>Telefones (Fixo e Celular):</b> Para contato e confirmação de consultas.",
        "<b>Valor da Consulta / Mensalidade:</b> Controle financeiro de convênio ou atendimento particular."
    ]

    for fp in fields_p:
        story.append(Paragraph(f"• {fp}", bullet_style))
    story.append(Spacer(1, 8))

    # CEP Feature Box
    cep_box_data = [[
        Paragraph("<b>🔍 Busca Automática por CEP (Tripla Redundância)</b>", card_title_style),
    ],[
        Paragraph("1. Ao digitar os 8 números do CEP (ex: <code>17702-342</code>), o sistema consulta a <b>ViaCEP</b>.<br/>"
                  "2. Se houver indisponibilidade, aciona automaticamente a <b>BrasilAPI</b>.<br/>"
                  "3. Caso ambas falhem, o servidor backend consulta o serviço local de contingência.<br/>"
                  "4. Você também pode clicar no ícone de <b>Lupa (🔍)</b> para forçar a busca a qualquer momento.<br/>"
                  "5. Localizado o endereço, o cursor salta automaticamente para o campo <b>Número / Complemento</b>.", body_style)
    ]]
    cep_table = Table(cep_box_data, colWidths=[540])
    cep_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_card),
        ('BORDER', (0,0), (-1,-1), 1, c_border),
        ('LINELEFT', (0,0), (0,-1), 4, c_secondary),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether([cep_table, Spacer(1, 8)]))

    # Duplicate Feature Box
    dup_box_data = [[
        Paragraph("<b>🛡️ Trava de Segurança Contra Duplicidade de Pacientes</b>", ParagraphStyle('WTitle', fontName='Helvetica-Bold', fontSize=10, textColor=c_warning)),
    ],[
        Paragraph("• Tentar cadastrar um paciente com <b>Nome Completo</b> (case-insensitive) ou <b>CPF</b> já existente gera bloqueio imediato na tela e erro <code>HTTP 409 Conflict</code>.<br/>"
                  "• Na admissão de emergência, se um paciente já tiver cadastro na base, o sistema reutiliza a ficha mestra automaticamente em vez de criar cadastros duplicados.", body_style)
    ]]
    dup_table = Table(dup_box_data, colWidths=[540])
    dup_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fffbeb")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#fef08a")),
        ('LINELEFT', (0,0), (0,-1), 4, c_warning),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether([dup_table, Spacer(1, 12)]))

    # SECTION 3: PAINEL TV & KANBAN
    story.append(Paragraph("3. Painel TV de Chamadas com Voz e Central de Atendimentos", h1_style))
    
    tv_box_data = [[
        Paragraph("<b>📢 Recursos do Painel TV &amp; Chamada Audível por Voz</b>", ParagraphStyle('TTitle', fontName='Helvetica-Bold', fontSize=10, textColor=c_accent)),
    ],[
        Paragraph("• <b>Anúncio Sonoro por Voz:</b> Chamada viva em português (<i>Web Speech API pt-BR</i>) sintetizada automaticamente informando o nome do paciente e a sala/consultório.<br/>"
                  "• <b>Modal Dinâmico de Chamada:</b> Botão no Painel TV abre um modal que carrega em tempo real a lista de pacientes aguardando atendimento na fila, permitindo selecionar o paciente e consultório desejado.<br/>"
                  "• <b>Integração Kanban:</b> Ao clicar em <i>'Chmar para Consulta'</i> na Central de Atendimentos, a TV atualiza a tela e fala a chamada de voz imediatamente.<br/>"
                  "• <b>Auto-Polling (3s):</b> Atualização automática contínua da tela da TV na sala de espera.", body_style)
    ]]
    tv_table = Table(tv_box_data, colWidths=[540])
    tv_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('LINELEFT', (0,0), (0,-1), 4, c_accent),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether([tv_table, Spacer(1, 12)]))

    # SECTION 4: TRIAGEM MANCHESTER & PEP
    story.append(Paragraph("4. Triagem Manchester, Prontuário Eletrônico (PEP) e Leitos", h1_style))
    story.append(Paragraph("A triagem estabelece a prioridade de atendimento médico com base no Protocolo de Manchester:", body_style))
    story.append(Spacer(1, 4))

    manch_data = [
        [Paragraph("<b>Cor / Nível</b>", ParagraphStyle('THM1', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Classificação Clínica</b>", ParagraphStyle('THM2', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
         Paragraph("<b>Tempo Máximo Recomendado</b>", ParagraphStyle('THM3', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white))],
        [Paragraph("<font color='#dc2626'><b>Vermelho</b></font>", body_style), Paragraph("<b>Emergência:</b> Risco iminente de morte.", body_style), Paragraph("Atendimento Imediato (0 min)", body_style)],
        [Paragraph("<font color='#ea580c'><b>Laranja</b></font>", body_style), Paragraph("<b>Muito Urgente:</b> Risco elevado.", body_style), Paragraph("Até 10 minutos", body_style)],
        [Paragraph("<font color='#ca8a04'><b>Amarelo</b></font>", body_style), Paragraph("<b>Urgente:</b> Gravidade moderada.", body_style), Paragraph("Até 60 minutos", body_style)],
        [Paragraph("<font color='#16a34a'><b>Verde</b></font>", body_style), Paragraph("<b>Pouco Urgente:</b> Baixa gravidade.", body_style), Paragraph("Até 120 minutos", body_style)],
        [Paragraph("<font color='#0284c7'><b>Azul</b></font>", body_style), Paragraph("<b>Não Urgente:</b> Quadro eletivo.", body_style), Paragraph("Até 240 minutos", body_style)],
    ]

    manch_table = Table(manch_data, colWidths=[100, 270, 170])
    manch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.8, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light])
    ]))
    story.append(manch_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Prontuário Eletrônico (PEP) no Padrão SOAPE:</b>", h2_style))
    pep_points = [
        "<b>S (Subjetivo):</b> Relato das queixas e sintomas informados pelo paciente.",
        "<b>O (Objetivo):</b> Dados de exame físico e sinais vitais (PA, FC, Temperatura, Peso).",
        "<b>A (Avaliação):</b> Hipótese diagnóstica e CID-10.",
        "<b>P (Plano):</b> Exames solicitados, conduta e orientações médicas.",
        "<b>E (Evolução / Prescrição):</b> Medicamentos prescritos, dosagens e assinatura digital SHA-256."
    ]
    for pp in pep_points:
        story.append(Paragraph(f"• {pp}", bullet_style))
    story.append(Spacer(1, 12))

    # SECTION 5: TURSO CLOUD & STATUS BADGE
    story.append(Paragraph("5. Sincronização Turso Cloud e Encerramento Seguro", h1_style))
    
    sync_box_data = [[
        Paragraph("<b>🔄 Recursos da Sincronização Híbrida Turso Cloud</b>", card_title_style),
    ],[
        Paragraph("• <b>Badge de Status no Cabeçalho (<code>sync-status-badge</code>):</b> Exibe em tempo real o estado da conexão ('Conectado ao Turso', 'Local sincronizado com Turso' ou 'Modo Local'). Clicar na badge abre o modal comparativo.<br/>"
                  "• <b>Modal Comparativo ao Logar:</b> Exibe tabela a tabela o total de registros e o timestamp do dado mais recente no SQLite local vs Turso Nuvem.<br/>"
                  "• <b>Sincronização Pós-Escrita:</b> Modal pergunta ao usuário após cadastros se deseja enviar as alterações para a nuvem imediatamente.<br/>"
                  "• <b>Auto-Shutdown Inteligente:</b> Fechar todas as abas encerra o servidor Node.js local automaticamente após margem de tolerância de 1.5s (permitindo reloads F5 sem desligar).", body_style)
    ]]
    sync_table = Table(sync_box_data, colWidths=[540])
    sync_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_card),
        ('BORDER', (0,0), (-1,-1), 1, c_border),
        ('LINELEFT', (0,0), (0,-1), 4, c_secondary),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether([sync_table, Spacer(1, 12)]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Manual do Usuário PDF gerado com sucesso via ReportLab em: {target_path}")

if __name__ == "__main__":
    create_manual_user_pdf()
