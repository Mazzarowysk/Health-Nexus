// 🤖 Nexus AI Knowledge Copilot Engine v2.8 — Expanded Semantic NLP Pattern Matching
export const getNexusAICopilotResponse = (q, raw) => {
  let qNorm = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Normalização de Sinônimos Comuns para expandir a compreensão da IA via PLN
  qNorm = qNorm.replace(/\b(enfermeiro|medico|medica|recepcionista|fisioterapeuta|doutor|doutora|tecnico|auxiliar|colaborador|colaboradora|funcionario|funcionaria|equipe|clinico|membro)\b/g, 'profissional');
  qNorm = qNorm.replace(/\b(remedio|droga|pilula|injecao|comprimido|farmaco|insumo)\b/g, 'medicamento');
  qNorm = qNorm.replace(/\b(cliente|doente|internado|usuario sus)\b/g, 'paciente');
  qNorm = qNorm.replace(/\b(marcar|reservar)\b/g, 'agendar');
  qNorm = qNorm.replace(/\b(deletar|apagar|remover|desativar|inativar|desligar|limpar|lixeira|exclusao)\b/g, 'excluir');
  qNorm = qNorm.replace(/\b(adicionar|inserir|criar|incluir|admitir)\b/g, 'cadastrar');
  qNorm = qNorm.replace(/\b(alterar|modificar|atualizar|trocar|ajustar|mudar)\b/g, 'editar');
  qNorm = qNorm.replace(/\b(teleconsulta|videochamada|chamada de video|consulta online|webrtc|atendimento remoto|teleatendimento|consulta virtual|sala virtual)\b/g, 'telemedicina');
  qNorm = qNorm.replace(/\b(voice-to-soap|ditar|microfone|ditado por voz|ditado clinico|reconhecimento de fala)\b/g, 'ditado');
  qNorm = qNorm.replace(/\b(choque septico|alerta sepse|deterioracao clinica|escore preditivo)\b/g, 'sepse');
  qNorm = qNorm.replace(/\b(incompatibilidade|interacao medicamentosa|contraindicacao)\b/g, 'interacao');
  qNorm = qNorm.replace(/\b(zap|notificacao paciente|envio receita|receita celular)\b/g, 'whatsapp');
  qNorm = qNorm.replace(/\b(patient journey|jornada do paciente|trajetoria assistencial|stepper)\b/g, 'linha do cuidado');

  // Helper: check if query contains ANY of the given tokens
  const has = (...tokens) => tokens.some(t => qNorm.includes(t));
  // Helper: check if query contains ALL of the given tokens
  const hasAll = (...tokens) => tokens.every(t => qNorm.includes(t));

  // ── INTENÇÃO AMPLA: EXCLUSÃO / DESATIVAÇÃO / LIXEIRA GERAL ─────────────
  if (qNorm === 'excluir' || qNorm === 'cancelar' || qNorm === 'lixeira') {
    return {
      title: 'Nexus AI Copilot — Opções de Exclusão & Desativação',
      summary: `Você buscou por <strong>operações de exclusão/inativação</strong>. No Health Nexus, você pode realizar:<br>
• <strong>Excluir/Inativar Paciente:</strong> Acesse 👥 Recepção e use a 🗑️ Lixeira no card do paciente.<br>
• <strong>Excluir/Desativar Colaborador ou Médico:</strong> Acesse 🩺 Corpo Clínico e use a 🗑️ Lixeira.<br>
• <strong>Excluir Usuário de Acesso:</strong> Acesse ⚙️ Configurações → Gerenciar Usuários (perfil Master).<br>
• <strong>Cancelar Agendamento/Consulta:</strong> Acesse 📅 Agenda e clique no ❌.<br>
• <strong>Inativar Medicamento:</strong> Acesse 💊 Farmácia & Estoque.<br>
• <strong>Excluir Sala/Consultório:</strong> Acesse 🚪 Consultórios.<br>
• <strong>Cancelar Cobrança/Fatura:</strong> Acesse 💰 Faturamento & Financeiro.`,
      actionText: '👥 Ir para Recepção & Pacientes',
      actionType: 'switchTab',
      actionTarget: 'pacientes'
    };
  }

  // ── INTENÇÃO AMPLA: CADASTRO / NOVO GERAL ──────────────────────────────
  if (qNorm === 'cadastrar' || qNorm === 'novo' || qNorm === 'cadastro') {
    return {
      title: 'Nexus AI Copilot — Central de Cadastros & Novos Registros',
      summary: `Você buscou por <strong>cadastros e novos registros</strong>. Escolha onde deseja cadastrar:<br>
• <strong>Novo Paciente:</strong> 👥 Recepção & Pacientes (Alt+N)<br>
• <strong>Novo Profissional/Colaborador:</strong> 🩺 Profissionais & Corpo Clínico (+ Novo Médico)<br>
• <strong>Novo Agendamento:</strong> 📅 Agenda de Consultas<br>
• <strong>Novo Medicamento/Insumo:</strong> 💊 Farmácia & Estoque<br>
• <strong>Novo Plantão/Escala:</strong> 📅 Escalas de Trabalho<br>
• <strong>Novo Usuário do Sistema:</strong> ⚙️ Configurações (Master)`,
      actionText: '👥 Cadastrar Novo Paciente (Alt+N)',
      actionType: 'openPatientModal',
      actionTarget: 'pacientes'
    };
  }

  // ── PROFISSIONAIS / COLABORADORES ──────────────────────────────────────────
  if (hasAll('profissional', 'cadastrar') || hasAll('profissional', 'novo') ||
      has('cadastrar profissional', 'novo profissional', 'corpo clinico', 'registrar profissional', 'contratar profissional')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>incluir ou cadastrar um novo profissional/colaborador</strong>, acesse a aba 🩺 <strong>Profissionais</strong> e clique em <strong>+ Novo Médico/Profissional</strong>. Preencha Nome, Registro/CRM, Especialidade e Telefone.', actionText: '🩺 Cadastrar Novo Profissional', actionType: 'openDoctorModal', actionTarget: 'medicos' };
  }
  if (hasAll('profissional', 'excluir') || has('excluir profissional', 'desativar colaborador', 'remover funcionario', 'lixeira medico', 'excluir medico', 'excluir colaborador', 'excluir funcionario', 'desligar medico')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>desativar ou excluir um colaborador/médico</strong>, acesse 🩺 <strong>Profissionais & Corpo Clínico</strong>, localize o profissional e clique no ícone de 🗑️ Lixeira. O cadastro é inativado e o histórico médico permanece intacto.', actionText: '🩺 Abrir Corpo Clínico', actionType: 'switchTab', actionTarget: 'medicos' };
  }
  if (hasAll('profissional', 'editar') || hasAll('crm', 'editar') || has('editar colaborador', 'editar funcionario', 'editar medico', 'alterar especialidade')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>editar dados de um profissional ou colaborador</strong>, acesse 🩺 <strong>Profissionais</strong> e clique no ícone de ✏️ Lápis no card para alterar especialidade, CRM, telefone ou e-mail.', actionText: '🩺 Ir para Profissionais', actionType: 'switchTab', actionTarget: 'medicos' };
  }
  if (has('registro', 'conselho', 'validar', 'verificar', 'conselho classe', 'cfm', 'coren')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Registro Profissional (CRM/COREN)</strong> é validado automaticamente pelo sistema contra a base oficial ao digitar o número.', actionText: '🩺 Ver Profissionais', actionType: 'switchTab', actionTarget: 'medicos' };
  }
  if (has('plantao', 'escala', 'turno', 'horario', 'alocar plantao')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>alocar um profissional na escala de plantão</strong>, acesse 📅 <strong>Escalas de Trabalho</strong>.', actionText: '📅 Abrir Escalas de Trabalho', actionType: 'switchTab', actionTarget: 'escalas' };
  }

  // ── PACIENTES ────────────────────────────────────────────────────────
  if (hasAll('paciente', 'cadastrar') || hasAll('paciente', 'novo') ||
      has('cadastrar paciente', 'novo paciente', 'admitir paciente', 'registrar paciente')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cadastrar um novo paciente</strong>, acesse 👥 <strong>Recepção & Pacientes</strong> e clique em <strong>+ Novo Paciente</strong> (atalho: <strong>Alt+N</strong>). Preencha CPF, Nome, Data de Nascimento e Telefone.', actionText: '👥 Admitir Novo Paciente', actionType: 'openPatientModal', actionTarget: 'pacientes' };
  }
  if (hasAll('paciente', 'buscar') || hasAll('paciente', 'procurar') || hasAll('paciente', 'encontrar') || has('buscar paciente', 'procurar cpf')) {
    return { title: 'Nexus AI Copilot', summary: 'Use a <strong>barra de busca na aba Recepção</strong> para encontrar pacientes por Nome ou CPF (com ou sem formatação). A busca é instantânea à medida que você digita.', actionText: '🔍 Ir para Recepção', actionType: 'switchTab', actionTarget: 'pacientes' };
  }
  if (hasAll('paciente', 'excluir') || has('excluir paciente', 'deletar paciente', 'remover paciente', 'inativar paciente', 'lixeira paciente')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>remover, excluir ou inativar um paciente</strong>, localize o paciente na aba 👥 <strong>Recepção & Pacientes</strong> e clique no ícone de 🗑️ Lixeira. O prontuário histórico é preservado com segurança.', actionText: '👥 Ir para Recepção', actionType: 'switchTab', actionTarget: 'pacientes' };
  }
  if (hasAll('paciente', 'fila') || hasAll('paciente', 'encaminhar') || hasAll('paciente', 'triagem') || has('enviar fila', 'fila espera', 'entrada ps', 'acolhimento')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>enviar um paciente para a fila de triagem</strong>, localize-o na Recepção e clique em <strong>"Enviar para Fila"</strong>. O paciente aparecerá na Tela de Atendimentos da enfermagem.', actionText: '👥 Ir para Recepção', actionType: 'switchTab', actionTarget: 'pacientes' };
  }

  // ── AGENDA / CONSULTAS ───────────────────────────────────────────────
  if (has('agendar', 'novo agendamento', 'marcar consulta', 'marcar hora', 'reservar horario', 'agendamento consulta')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>agendar uma consulta</strong>, acesse 📅 <strong>Agenda & Consultas</strong> e clique em <strong>Novo Agendamento</strong>. Selecione o profissional, data, horário e paciente.', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }
  if (has('cancelar agendamento', 'cancelar consulta', 'desmarcar consulta', 'excluir agendamento', 'excluir consulta', 'deletar consulta')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cancelar ou excluir um agendamento</strong>, localize a consulta na Agenda e clique no ícone ❌. O registro é mantido no histórico com status "Cancelado".', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }
  if (has('reagendar', 'remarcar consulta', 'trocar horario consulta', 'mudar data consulta')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>reagendar uma consulta</strong>, localize o agendamento na Agenda e clique no ícone de 🔄 Relógio para selecionar a nova data e horário.', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }
  if (has('check-in', 'confirmar presenca', 'confirmar chegada', 'paciente chegou')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Check-in do paciente</strong> é feito na Agenda clicando em <strong>"Confirmar Presença"</strong> (✅) quando o paciente chega. Isso atualiza a fila de atendimento automaticamente.', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }

  // ── PRONTUÁRIO / ATENDIMENTO ─────────────────────────────────────────
  if (has('iniciar atendimento', 'abrir prontuario', 'chamar paciente consultorio', 'pep', 'ficha clinica')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>iniciar um atendimento</strong>, acesse ⚕️ <strong>Atendimentos</strong> e clique em "Atender" no paciente da fila. A ficha clínica PEP abre com cronômetro automático.', actionText: '⚕️ Abrir Atendimentos', actionType: 'switchTab', actionTarget: 'atendimento' };
  }
  if (has('prescricao', 'receita medica', 'prescrever remedio', 'prescricao eletronica', 'medicamento prescricao', 'posologia')) {
    return { title: 'Nexus AI Copilot', summary: 'A <strong>Prescrição Eletrônica</strong> está dentro do Prontuário (aba Prescrição). Busque o medicamento no estoque da farmácia, defina a dosagem e posologia, e salve para imprimir.', actionText: '⚕️ Abrir Prontuário', actionType: 'switchTab', actionTarget: 'atendimento' };
  }
  if (has('cid', 'diagnostico', 'cid-10', 'classificacao diagnostico')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>CID-10</strong> é registrado no Prontuário Médico durante o atendimento. A busca de código é feita digitando o nome da doença ou o código direto no campo de diagnóstico.', actionText: '⚕️ Abrir Prontuário', actionType: 'switchTab', actionTarget: 'atendimento' };
  }
  if (has('atestado', 'declaracao medica', 'afastamento', 'laudo medico')) {
    return { title: 'Nexus AI Copilot', summary: 'Os <strong>Atestados Médicos</strong> são emitidos pelo profissional no Prontuário, aba "Atestado". É possível definir o número de dias de afastamento e gerar PDF imprimível.', actionText: '⚕️ Abrir Prontuário', actionType: 'switchTab', actionTarget: 'atendimento' };
  }
  if (has('triagem', 'manchester', 'sinais vitais', 'pressao arterial', 'temperatura', 'spo2', 'glicemia', 'saturacao')) {
    return { title: 'Nexus AI Copilot', summary: 'A <strong>Triagem Manchester</strong> é realizada na aba ⚕️ <strong>Atendimentos</strong>, registrando PA, FC, Temperatura, SpO2 e Glicemia. O sistema calcula automaticamente a cor de risco (Vermelho → Azul) e aplica trava preditiva baseada em MEWS/Sepse.', actionText: '⚕️ Abrir Triagem', actionType: 'switchTab', actionTarget: 'atendimento' };
  }

  // ── TELEMEDICINA / WEBRTC / CONSULTA ONLINE ──────────────────────────
  if (has('telemedicina', 'teleconsulta', 'videochamada', 'webrtc', 'consulta online', 'chamada de video', 'camera', 'atendimento remoto', 'consulta virtual', 'sala virtual')) {
    return {
      title: 'Nexus AI Copilot — Sala Virtual de Telemedicina WebRTC',
      summary: 'A <strong>Telemedicina Integrada</strong> do Health Nexus permite realizar atendimentos médicos remotos com áudio e vídeo de alta definição criptografados ponta a ponta (WebRTC) diretamente no <strong>Prontuário Eletrônico (PEP)</strong>. O médico atende em tela dividida, registra anamnese SOAP, emite prescrições e envia receitas simultaneamente.',
      actionText: '📹 Abrir Prontuário & Telemedicina',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── DITADO CLÍNICO POR VOZ / VOICE-TO-SOAP ───────────────────────────
  if (has('ditado', 'voice-to-soap', 'fala', 'transcricao', 'ditar', 'microfone', 'falar prontuario', 'pontuacao automatica')) {
    return {
      title: 'Nexus AI Copilot — Ditado Clínico por Voz (Voice-to-SOAP)',
      summary: 'O recurso de <strong>Ditado Clínico por Voz</strong> utiliza a Web Speech API com PLN médico nativo em português. Ao clicar no botão do microfone nos campos de Anamnese ou Exame Físico, o médico dita a consulta e comandos de voz como <em>"vírgula"</em>, <em>"ponto"</em>, <em>"novo parágrafo"</em> e <em>"dois pontos"</em> são formatados em tempo real.',
      actionText: '🎙️ Ver no Prontuário Médico',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── ESCORE MEWS & ALERTA PREDITIVO DE SEPSE ──────────────────────────
  if (has('mews', 'sepse', 'alerta sepse', 'escore preditivo', 'deterioracao', 'choque', 'escore')) {
    return {
      title: 'Nexus AI Copilot — Escore Preditivo MEWS & Alerta de Sepse',
      summary: 'O algoritmo <strong>MEWS (Modified Early Warning Score)</strong> monitora sinais vitais (PA, FC, FR, Temp, SpO2 e Consciência AVPU) na Triagem Manchester e nos Leitos. Se o paciente atingir escore crítico (≥5) ou critérios de Sepse (qSOFA), o sistema <strong>auto-seleciona a cor Vermelha/Emergência</strong> com destaque pulsante e ativa trava de segurança contra rebaixamento indevido.',
      actionText: '⚠️ Abrir Triagem & MEWS',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── INTERAÇÕES MEDICAMENTOSAS / FARMACOLOGIA CLÍNICA ──────────────────
  if (has('interacao', 'interacoes', 'incompatibilidade', 'interacao medicamentosa', 'farmacologia', 'contraindicacao', 'risco de sangramento')) {
    return {
      title: 'Nexus AI Copilot — Verificador de Interações Medicamentosas',
      summary: 'A inteligência farmacológica do Health Nexus cruza em tempo real todos os medicamentos prescritos e dispensados. Identifica combinações de risco crítico (ex: Varfarina + AAS, Tramadol + Fluoxetina, Enalapril + Espironolactona) e exibe alertas imediatos com a <strong>conduta médica recomendada</strong> antes da gravação da receita.',
      actionText: '💊 Ver Prescrição Médica',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── WHATSAPP / NOTIFICAÇÃO DO PACIENTE ────────────────────────────────
  if (has('whatsapp', 'zap', 'notificacao paciente', 'envio receita', 'receita celular', 'mensagem')) {
    return {
      title: 'Nexus AI Copilot — Despacho de Receitas & Alertas via WhatsApp',
      summary: 'Permite o envio seguro e instantâneo das <strong>receitas médicas digitais, atestados, orientações de pós-consulta e avisos de chamada</strong> direto para o WhatsApp do paciente, eliminando custos de papel e facilitando a adesão ao tratamento.',
      actionText: '📲 Abrir Atendimentos',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── LINHA DO CUIDADO / PATIENT JOURNEY HUD ────────────────────────────
  if (has('linha do cuidado', 'patient journey', 'jornada', 'trajetoria', 'rastreabilidade', 'hud', 'periodo de atendimento')) {
    return {
      title: 'Nexus AI Copilot — Linha do Cuidado (Patient Journey HUD)',
      summary: 'A <strong>Linha do Cuidado</strong> apresenta o rastreamento cronológico e visual de cada passo do paciente no hospital (Recepção ➔ Triagem ➔ Chamada TV ➔ Consultório ➔ Farmácia ➔ Leito ➔ Alta), com auditoria dos tempos de permanência e histórico segmentado por período de atendimento.',
      actionText: '🧭 Ver Linha do Cuidado',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── ASSINATURA DIGITAL ICP-BRASIL (NUVEM & A1) ───────────────────────
  if (has('icp-brasil', 'icp', 'assinatura digital', 'certificado digital', 'birdid', 'neoid', 'certisign', 'vidaas', 'cfm 2299', 'mp 2200', 'carimbo de tempo', 'sha256', 'validar')) {
    return {
      title: 'Nexus AI Copilot — Assinatura Digital ICP-Brasil em Nuvem',
      summary: 'O Health Nexus integra emissão de <strong>Assinaturas Digitais Qualificadas ICP-Brasil</strong> em conformidade com a MP 2.200-2/2001 e Resolução CFM nº 2.299/2021. Suporta provedores em nuvem (<strong>BirdID, NeoID, Certisign RemoteID, VIDaaS</strong>) e certificados A1 locais, carimbando PDFs com Hash SHA-256 e QR Code rastreável no portal ITI.',
      actionText: '🔐 Ver no Prontuário Médico',
      actionType: 'switchTab',
      actionTarget: 'atendimento'
    };
  }

  // ── FATURAMENTO TISS 4.01 XML & TUSS (ANS) ───────────────────────────
  if (has('tiss', 'tuss', 'xml', 'guia tiss', 'ans', 'lote tiss', 'faturamento tiss', 'padrao tiss', '4.01', 'exportar tiss')) {
    return {
      title: 'Nexus AI Copilot — Faturamento TISS 4.01 XML (Padrão ANS)',
      summary: 'Gera e exporta lotes eletrônicos no padrão oficial <strong>TISS Versão 4.01.00 da ANS</strong> para envio a operadoras de saúde (Unimed, Bradesco, Amil, SulAmérica). O arquivo XML inclui Guias de Consulta e SADT com códigos TUSS e cálculo automático de Hash MD5 para eliminar glosas.',
      actionText: '📑 Abrir Faturamento TISS',
      actionType: 'switchTab',
      actionTarget: 'relatorios'
    };
  }

  // ── PWA & NOTIFICAÇÕES PUSH PARA PLANTÕES ────────────────────────────
  if (has('pwa', 'service worker', 'push', 'notificacao push', 'notificacoes', 'sobreaviso', 'alerta plantao', 'alerta celular', 'instalar app', 'offline')) {
    return {
      title: 'Nexus AI Copilot — PWA & Notificações Push de Plantão',
      summary: 'O Health Nexus opera como um <strong>Progressive Web App (PWA) instalável</strong> com Service Worker de alta velocidade offline. Conta com sistema de <strong>Notificações Push</strong> para médicos de sobreaviso, disparando alertas imediatos de pacientes críticos (MEWS ≥ 5 / Manchester Vermelho).',
      actionText: '📲 Ativar Notificações Push',
      actionType: 'requestPushNotifications',
      actionTarget: 'pwa'
    };
  }

  // ── FARMÁCIA / ESTOQUE ───────────────────────────────────────────────
  if (has('cadastrar medicamento', 'novo medicamento', 'cadastrar insumo')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cadastrar um medicamento no estoque</strong>, acesse 💊 <strong>Farmácia & Estoque</strong> e clique em <strong>+ Novo Medicamento</strong>. Informe nome, lote, validade e quantidade.', actionText: '💊 Abrir Farmácia', actionType: 'switchTab', actionTarget: 'farmacia' };
  }
  if (hasAll('medicamento', 'excluir') || has('excluir medicamento', 'inativar medicamento', 'remover remedio')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>inativar ou excluir um medicamento</strong>, acesse 💊 <strong>Farmácia & Estoque</strong>, localize o item e clique em Inativar/Excluir.', actionText: '💊 Abrir Farmácia', actionType: 'switchTab', actionTarget: 'farmacia' };
  }
  if (has('dispensar medicamento', 'dispensacao', 'entregar medicamento', 'dispensar remedio')) {
    return { title: 'Nexus AI Copilot', summary: 'A <strong>Dispensação de Medicamentos</strong> ocorre na aba 💊 <strong>Farmácia</strong>. O farmacêutico confirma os itens da prescrição e clica em "Confirmar Dispensação" para dar baixa no estoque.', actionText: '💊 Abrir Farmácia', actionType: 'switchTab', actionTarget: 'farmacia' };
  }
  if (has('estoque', 'estoque baixo', 'alerta estoque', 'validade medicamento', 'vencimento')) {
    return { title: 'Nexus AI Copilot', summary: 'Os <strong>Alertas de Estoque</strong> aparecem automaticamente na aba Farmácia quando itens atingem o estoque mínimo ou têm validade próxima (< 30 dias).', actionText: '💊 Verificar Estoque', actionType: 'switchTab', actionTarget: 'farmacia' };
  }

  // ── LEITOS / INTERNAÇÃO ──────────────────────────────────────────────
  if (has('internar paciente', 'internacao', 'abrir leito', 'alocar leito', 'admissao hospitalar')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>internar um paciente</strong>, acesse 🛏️ <strong>Gestão de Leitos</strong> e clique em <strong>Internar Paciente</strong> no leito desejado. Informe diagnóstico, responsável e ala.', actionText: '🛏️ Abrir Central de Leitos', actionType: 'switchTab', actionTarget: 'leitos' };
  }
  if (has('dar alta', 'alta hospitalar', 'liberar leito', 'liberar internado', 'higienizacao leito')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>dar alta a um paciente</strong>, acesse 🛏️ <strong>Gestão de Leitos</strong> ou o Kanban e clique em <strong>"Dar Alta"</strong>. O leito vai para status "Higienização" antes de ser liberado.', actionText: '🛏️ Abrir Gestão de Leitos', actionType: 'switchTab', actionTarget: 'leitos' };
  }
  if (has('leito ocupado', 'leito livre', 'ocupacao leito', 'disponibilidade leito', 'leito disponivel')) {
    return { title: 'Nexus AI Copilot', summary: 'A <strong>disponibilidade de leitos</strong> é visualizada em tempo real no 🛏️ <strong>Gestão de Leitos</strong> (lista) ou no Dashboard (gráfico donut de ocupação por ala).', actionText: '🛏️ Ver Gestão de Leitos', actionType: 'switchTab', actionTarget: 'leitos' };
  }
  if (hasAll('leito', 'excluir') || has('excluir leito', 'desativar leito', 'cancelar internacao')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>desativar um leito ou cancelar uma internação</strong>, acesse 🛏️ <strong>Gestão de Leitos</strong> e selecione a opção de desativação/alta.', actionText: '🛏️ Gestão de Leitos', actionType: 'switchTab', actionTarget: 'leitos' };
  }

  // ── ESCALAS DE TRABALHO ──────────────────────────────────────────────
  if (has('escala trabalho', 'escala plantao', 'plantao enfermeiro', 'plantao medico', 'turno trabalho', 'cadastrar plantao', 'cadastrar escala')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>gerenciar escalas de plantão</strong>, acesse 📅 <strong>Escalas de Trabalho</strong>. A aba possui sub-seções separadas para Profissionais de saúde com controle de turno, data e consultório.', actionText: '📅 Abrir Escalas de Trabalho', actionType: 'switchTab', actionTarget: 'escalas' };
  }

  // ── USUÁRIOS / CONFIGURAÇÕES ─────────────────────────────────────────
  if (has('cadastrar usuario', 'novo usuario', 'adicionar usuario', 'incluir usuario', 'adicionar funcionario', 'registrar usuario')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>criar um novo usuário de acesso</strong>, acesse ⚙️ <strong>Configurações → Gerenciar Usuários</strong> e clique em <strong>"+ Novo Usuário"</strong>. Defina nome, login, senha e papel de acesso (RBAC).', actionText: '⚙️ Gerenciar Usuários', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }
  if (has('excluir usuario', 'remover usuario', 'lixeira usuario') || (has('usuario') && has('excluir'))) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>excluir um usuário do sistema</strong>, acesse ⚙️ <strong>Configurações → Gerenciar Usuários</strong> e clique no ícone 🗑️ Lixeira. Apenas perfis Master têm essa permissão.', actionText: '⚙️ Gerenciar Usuários', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }
  if (has('senha', 'reset senha', 'redefinir senha', 'mudar senha', 'esqueci senha', 'trocar senha')) {
    return { title: 'Nexus AI Copilot', summary: 'A <strong>redefinição de senha</strong> é feita na aba ⚙️ <strong>Configurações</strong>, clicando no ícone 🔑 Chave ao lado do usuário. Apenas o perfil Master pode resetar senhas.', actionText: '⚙️ Ir para Configurações', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }
  if (has('rbac', 'perfil acesso', 'permissao usuario', 'papel usuario', 'controle acesso', 'cargo usuario', 'alterar perfil')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Controle de Perfis (RBAC)</strong> gerencia o que cada usuário pode acessar. Para alterar o perfil de um usuário, acesse ⚙️ <strong>Configurações → Gerenciar Usuários</strong> e edite o cargo.', actionText: '⚙️ Controle de Perfis (RBAC)', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }

  // ── CONSULTÓRIOS / SALAS ─────────────────────────────────────────────
  if (has('consultorio', 'sala atendimento', 'cadastrar sala', 'nova sala', 'cadastrar consultorio')) {
    return { title: 'Nexus AI Copilot', summary: 'Para gerenciar <strong>Salas & Consultórios</strong>, acesse 🚪 <strong>Consultórios</strong>. Aqui você pode cadastrar, editar, excluir salas e monitorar a ocupação em tempo real.', actionText: '🚪 Abrir Consultórios', actionType: 'switchTab', actionTarget: 'consultorios' };
  }
  if (has('excluir consultorio', 'excluir sala', 'remover consultorio', 'remover sala', 'desativar sala')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>excluir ou desativar um consultório</strong>, acesse 🚪 <strong>Consultórios</strong> e utilize o botão de exclusão na sala correspondente.', actionText: '🚪 Abrir Consultórios', actionType: 'switchTab', actionTarget: 'consultorios' };
  }

  // ── FINANCEIRO / FATURAMENTO ─────────────────────────────────────────
  if (has('faturamento', 'financeiro', 'cobranca', 'nota fiscal', 'recebimento', 'convenio', 'plano saude', 'sus', 'baixa manual', 'parcela')) {
    return { title: 'Nexus AI Copilot', summary: 'O módulo de <strong>Faturamento & Financeiro</strong> controla cobranças por convênio, SUS e particular, além de baixa manual de parcelas (individual ou em lote).', actionText: '💰 Abrir Financeiro', actionType: 'switchTab', actionTarget: 'financeiro' };
  }
  if (has('excluir fatura', 'cancelar cobranca', 'excluir cobranca', 'estornar', 'cancelar parcela')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cancelar ou excluir uma cobrança</strong>, acesse 💰 <strong>Financeiro</strong>, localize a fatura e clique em Cancelar/Estornar.', actionText: '💰 Abrir Financeiro', actionType: 'switchTab', actionTarget: 'financeiro' };
  }

  // ── RELATÓRIOS ───────────────────────────────────────────────────────
  if (has('relatorio', 'exportar relatorio', 'imprimir relatorio', 'pdf relatorio', 'metricas', 'indicadores', 'excel', 'csv')) {
    return { title: 'Nexus AI Copilot', summary: 'Os <strong>Relatórios & Métricas</strong> estão disponíveis na aba 📊 <strong>Relatórios</strong>. Gere PDFs e planilhas de atendimentos, internações, farmácia, financeiro e muito mais com filtros de período.', actionText: '📊 Abrir Relatórios', actionType: 'switchTab', actionTarget: 'relatorios' };
  }

  // ── PAINEL TV ────────────────────────────────────────────────────────
  if (has('painel tv', 'sala espera', 'chamar paciente', 'megafone', 'voz', 'chamada voz', 'tv recepcao')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Painel TV</strong> exibe o sistema de chamada de pacientes na sala de espera com síntese de voz. Clique no ícone de 📢 Megafone para chamar pelo nome.', actionText: '📺 Abrir Painel TV', actionType: 'switchTab', actionTarget: 'tv_panel' };
  }

  // ── SINCRONIZAÇÃO / NUVEM ────────────────────────────────────────────
  if (has('sincronizar', 'nuvem', 'offline', 'backup', 'turso', 'banco dados', 'conexao')) {
    return { title: 'Nexus AI Copilot', summary: 'O Health Nexus opera em modo <strong>Offline-First</strong>. Dados são gravados localmente e sincronizados automaticamente com o <strong>Turso Cloud DB</strong> quando a internet reconectar.', actionText: '⚙️ Ver Configurações de Banco', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }

  // ── KANBAN ───────────────────────────────────────────────────────────
  if (has('kanban', 'quadro', 'internacao kanban', 'fluxo internacao', 'board hospitalar')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Quadro Kanban Hospitalar</strong> exibe o fluxo completo de internação: Admissão → Exames → Tratamento → Alta. Arraste os cards entre colunas para atualizar o status.', actionText: '📋 Abrir Kanban', actionType: 'switchTab', actionTarget: 'kanban' };
  }

  // ── ALERTAS / ESTAGNAÇÃO ─────────────────────────────────────────────
  if (has('alerta', 'estagnacao', 'tempo espera', 'paciente aguardando', 'fila longa', 'delay atendimento')) {
    return { title: 'Nexus AI Copilot', summary: 'Os <strong>Alertas & Estagnação</strong> monitoram pacientes aguardando além do tempo protocolar por triagem Manchester. Acesse para identificar gargalos no atendimento.', actionText: '⚠️ Ver Alertas', actionType: 'switchTab', actionTarget: 'estagnacao' };
  }

  // ── MANUAL / AJUDA ───────────────────────────────────────────────────
  if (has('manual', 'ajuda', 'como usar', 'tutorial', 'guia', 'instrucao', 'documentacao', 'help')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Manual Interativo</strong> do Health Nexus cobre todos os módulos com guias passo a passo, FAQ operacional e descrição de cada botão. Clique abaixo para acessar.', actionText: '📖 Abrir Manual Interativo', actionType: 'openManual', actionTarget: 'geral' };
  }

  // ── DEFAULT ──────────────────────────────────────────────────────────
  const safeRaw = String(raw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return {
    title: 'Nexus AI Copilot',
    summary: `Analisei sua busca por "<strong>${safeRaw}</strong>". Confira abaixo as funcionalidades e guias correspondentes encontrados no sistema:`,
    actionText: '📖 Abrir Manual Interativo',
    actionType: 'openManual',
    actionTarget: 'geral'
  };
};
