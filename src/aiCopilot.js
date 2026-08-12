// 🤖 Nexus AI Knowledge Copilot Engine v2.0 — Expanded Pattern Matching
export const getNexusAICopilotResponse = (q, raw) => {
  let qNorm = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Normalização de Sinônimos Comuns para expandir a compreensão da IA
  qNorm = qNorm.replace(/\b(enfermeiro|medico|recepcionista|fisioterapeuta|doutor|tecnico|auxiliar)\b/g, 'profissional');
  qNorm = qNorm.replace(/\b(remedio|droga|pilula|injecao|comprimido)\b/g, 'medicamento');
  qNorm = qNorm.replace(/\b(cliente|doente|internado)\b/g, 'paciente');
  qNorm = qNorm.replace(/\b(marcar|agendar|reservar)\b/g, 'agendar');
  qNorm = qNorm.replace(/\b(deletar|apagar|remover|desativar)\b/g, 'excluir');

  // Helper: check if query contains ANY of the given tokens
  const has = (...tokens) => tokens.some(t => qNorm.includes(t));
  // Helper: check if query contains ALL of the given tokens
  const hasAll = (...tokens) => tokens.every(t => qNorm.includes(t));

  // ── PROFISSIONAIS ──────────────────────────────────────────────────────────
  if (hasAll('profissional', 'incluir') || hasAll('profissional', 'cadastrar') || hasAll('profissional', 'novo') || hasAll('profissional', 'adicionar') || hasAll('profissional', 'criar') ||
      has('incluir profissional', 'cadastrar profissional', 'novo profissional', 'adicionar profissional', 'corpo clinico', 'registrar profissional')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>incluir ou cadastrar um novo profissional</strong>, acesse a aba 🩺 <strong>Profissionais</strong> e clique em <strong>+ Novo Profissional</strong>. Preencha Nome, Registro/CRM, Especialidade e Telefone.', actionText: '🩺 Cadastrar Novo Profissional', actionType: 'openDoctorModal', actionTarget: 'medicos' };
  }
  if (hasAll('profissional', 'excluir') || hasAll('profissional', 'desativar') || hasAll('profissional', 'remover') || hasAll('profissional', 'deletar') || hasAll('profissional', 'lixeira')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>desativar um profissional</strong>, acesse 🩺 <strong>Profissionais</strong>, localize-o e clique no ícone de 🗑️ Lixeira. O histórico de atendimentos é preservado.', actionText: '🩺 Abrir Profissionais', actionType: 'switchTab', actionTarget: 'medicos' };
  }
  if (hasAll('profissional', 'editar') || hasAll('profissional', 'alterar') || hasAll('profissional', 'atualizar') || hasAll('crm', 'alterar') || hasAll('crm', 'atualizar')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>editar dados de um profissional</strong>, acesse 🩺 <strong>Profissionais</strong> e clique no ícone de ✏️ Lápis no card para alterar especialidade, CRM, telefone ou e-mail.', actionText: '🩺 Ir para Profissionais', actionType: 'switchTab', actionTarget: 'medicos' };
  }
  if (has('registro', 'conselho', 'validar', 'verificar', 'conselho classe')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Registro Profissional</strong> é validado automaticamente pelo sistema ao digitar o número.', actionText: '🩺 Ver Profissionais', actionType: 'switchTab', actionTarget: 'medicos' };
  }
  if (has('plantao', 'escala', 'turno', 'horario', 'alocar plantao')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>alocar um profissional na escala de plantão</strong>, acesse 📅 <strong>Escalas de Trabalho</strong>.', actionText: '📅 Abrir Escalas de Trabalho', actionType: 'switchTab', actionTarget: 'escalas' };
  }

  // ── PACIENTES ────────────────────────────────────────────────────────
  if (hasAll('paciente', 'incluir') || hasAll('paciente', 'cadastrar') || hasAll('paciente', 'novo') || hasAll('paciente', 'adicionar') ||
      has('incluir paciente', 'cadastrar paciente', 'novo paciente', 'admitir paciente', 'registrar paciente')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cadastrar um novo paciente</strong>, acesse 👥 <strong>Recepção & Pacientes</strong> e clique em <strong>+ Novo Paciente</strong> (atalho: <strong>Alt+N</strong>). Preencha CPF, Nome, Data de Nascimento e Telefone.', actionText: '👥 Admitir Novo Paciente', actionType: 'openPatientModal', actionTarget: 'pacientes' };
  }
  if (hasAll('paciente', 'buscar') || hasAll('paciente', 'procurar') || hasAll('paciente', 'encontrar') || has('buscar paciente', 'procurar cpf')) {
    return { title: 'Nexus AI Copilot', summary: 'Use a <strong>barra de busca na aba Recepção</strong> para encontrar pacientes por Nome ou CPF (com ou sem formatação). A busca é instantânea à medida que você digita.', actionText: '🔍 Ir para Recepção', actionType: 'switchTab', actionTarget: 'pacientes' };
  }
  if (hasAll('paciente', 'excluir') || hasAll('paciente', 'deletar') || hasAll('paciente', 'remover') || hasAll('paciente', 'lixeira')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>remover ou inativar um paciente</strong>, localize o paciente na aba Recepção e clique no ícone de 🗑️ Lixeira. O prontuário histórico é preservado.', actionText: '👥 Ir para Recepção', actionType: 'switchTab', actionTarget: 'pacientes' };
  }
  if (hasAll('paciente', 'fila') || hasAll('paciente', 'encaminhar') || hasAll('paciente', 'triagem') || has('enviar fila', 'fila espera', 'entrada ps', 'acolhimento')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>enviar um paciente para a fila de triagem</strong>, localize-o na Recepção e clique em <strong>"Enviar para Fila"</strong>. O paciente aparecerá na Tela de Atendimentos da enfermagem.', actionText: '👥 Ir para Recepção', actionType: 'switchTab', actionTarget: 'pacientes' };
  }

  // ── AGENDA / CONSULTAS ───────────────────────────────────────────────
  if (has('agendar', 'novo agendamento', 'marcar consulta', 'marcar hora', 'reservar horario', 'agendamento consulta')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>agendar uma consulta</strong>, acesse 📅 <strong>Agenda & Consultas</strong> e clique em <strong>Novo Agendamento</strong>. Selecione o profissional, data, horário e paciente.', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }
  if (has('cancelar agendamento', 'cancelar consulta', 'desmarcar consulta', 'desmarcar agendamento')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cancelar um agendamento</strong>, localize a consulta na Agenda e clique no ícone ❌. O registro é mantido no histórico com status "Cancelado".', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }
  if (has('reagendar', 'remarcar consulta', 'trocar horario consulta', 'mudar data consulta')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>reagendar uma consulta</strong>, localize o agendamento na Agenda e clique no ícone de 🔄 Relógio para selecionar a nova data e horário.', actionText: '📅 Abrir Agenda', actionType: 'switchTab', actionTarget: 'agenda' };
  }
  if (has('check-in', 'confirmar presenca', 'confirmar chegada', 'paciente chegou', 'paciente chegou')) {
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
    return { title: 'Nexus AI Copilot', summary: 'A <strong>Triagem Manchester</strong> é realizada na aba ⚕️ <strong>Atendimentos</strong>, registrando PA, FC, Temperatura, SpO2 e Glicemia. O sistema calcula automaticamente a cor de risco (Vermelho → Azul).', actionText: '⚕️ Abrir Triagem', actionType: 'switchTab', actionTarget: 'atendimento' };
  }

  // ── FARMÁCIA / ESTOQUE ───────────────────────────────────────────────
  if (has('adicionar medicamento', 'cadastrar medicamento', 'novo medicamento', 'incluir medicamento', 'adicionar remedio', 'cadastrar remedio')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>cadastrar um medicamento no estoque</strong>, acesse 💊 <strong>Farmácia & Estoque</strong> e clique em <strong>+ Novo Medicamento</strong>. Informe nome, lote, validade e quantidade.', actionText: '💊 Abrir Farmácia', actionType: 'switchTab', actionTarget: 'farmacia' };
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

  // ── ESCALAS DE TRABALHO ──────────────────────────────────────────────
  if (has('escala trabalho', 'escala plantao', 'plantao enfermeiro', 'plantao medico', 'turno trabalho', 'adicionar escala', 'nova escala')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>gerenciar escalas de plantão</strong>, acesse 📅 <strong>Escalas de Trabalho</strong>. A aba possui sub-seções separadas para Profissionais de saúde com controle de turno, data e consultório.', actionText: '📅 Abrir Escalas de Trabalho', actionType: 'switchTab', actionTarget: 'escalas' };
  }

  // ── USUÁRIOS / CONFIGURAÇÕES ─────────────────────────────────────────
  if (has('criar usuario', 'novo usuario', 'adicionar usuario', 'cadastrar usuario', 'incluir usuario', 'adicionar funcionario', 'registrar usuario')) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>criar um novo usuário</strong>, acesse ⚙️ <strong>Configurações → Gerenciar Usuários</strong> e clique em <strong>"+ Novo Usuário"</strong>. Defina nome, login, senha e papel de acesso (RBAC).', actionText: '⚙️ Gerenciar Usuários', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }
  if (has('excluir usuario', 'deletar usuario', 'remover usuario', 'lixeira usuario') || (has('usuario') && has('excluir', 'deletar', 'apagar', 'remover'))) {
    return { title: 'Nexus AI Copilot', summary: 'Para <strong>excluir um usuário</strong>, acesse ⚙️ <strong>Configurações → Gerenciar Usuários</strong> e clique no ícone 🗑️ Lixeira. Apenas perfis Master têm essa permissão.', actionText: '⚙️ Gerenciar Usuários', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }
  if (has('senha', 'reset senha', 'redefinir senha', 'mudar senha', 'esqueci senha', 'trocar senha')) {
    return { title: 'Nexus AI Copilot', summary: 'A <strong>redefinição de senha</strong> é feita na aba ⚙️ <strong>Configurações</strong>, clicando no ícone 🔑 Chave ao lado do usuário. Apenas o perfil Master pode resetar senhas.', actionText: '⚙️ Ir para Configurações', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }
  if (has('rbac', 'perfil acesso', 'permissao usuario', 'papel usuario', 'controle acesso', 'cargo usuario', 'alterar perfil')) {
    return { title: 'Nexus AI Copilot', summary: 'O <strong>Controle de Perfis (RBAC)</strong> gerencia o que cada usuário pode acessar. Para alterar o perfil de um usuário, acesse ⚙️ <strong>Configurações → Gerenciar Usuários</strong> e edite o cargo.', actionText: '⚙️ Controle de Perfis (RBAC)', actionType: 'switchTab', actionTarget: 'configuracoes' };
  }

  // ── CONSULTÓRIOS / SALAS ─────────────────────────────────────────────
  if (has('consultorio', 'sala atendimento', 'criar sala', 'nova sala', 'adicionar consultorio')) {
    return { title: 'Nexus AI Copilot', summary: 'Para gerenciar <strong>Salas & Consultórios</strong>, acesse 🚪 <strong>Consultórios</strong>. Aqui você pode criar, editar e monitorar a ocupação de cada sala em tempo real.', actionText: '🚪 Abrir Consultórios', actionType: 'switchTab', actionTarget: 'consultorios' };
  }

  // ── FINANCEIRO / FATURAMENTO ─────────────────────────────────────────
  if (has('faturamento', 'financeiro', 'cobranca', 'nota fiscal', 'recebimento', 'convenio', 'plano saude', 'sus')) {
    return { title: 'Nexus AI Copilot', summary: 'O módulo de <strong>Faturamento & Financeiro</strong> controla cobranças por convênio, SUS e particular. Acesse para visualizar receitas, emitir faturas e gerar relatórios financeiros.', actionText: '💰 Abrir Financeiro', actionType: 'switchTab', actionTarget: 'financeiro' };
  }

  // ── RELATÓRIOS ───────────────────────────────────────────────────────
  if (has('relatorio', 'gerar relatorio', 'exportar relatorio', 'imprimir relatorio', 'pdf relatorio', 'metricas', 'indicadores')) {
    return { title: 'Nexus AI Copilot', summary: 'Os <strong>Relatórios & Métricas</strong> estão disponíveis na aba 📊 <strong>Relatórios</strong>. Gere PDFs de atendimentos, internações, farmácia, financeiro e muito mais com filtros de período.', actionText: '📊 Abrir Relatórios', actionType: 'switchTab', actionTarget: 'relatorios' };
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
