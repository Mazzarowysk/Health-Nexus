// ─── MANUAL INTERATIVO POR ABAS (HEALTH NEXUS v2.7.2) ────────────────────────
import { getNexusAICopilotResponse } from './aiCopilot.js';

// Normalizador de strings e remoção de acentos
export const removeAccents = (str) => {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
};

// Dicionário de Expansão Semântica e Sinônimos
export const SEMANTIC_SYNONYMS = {
  // Ações de Exclusão / Cancelamento
  excluir: ['excluir', 'exclusao', 'deletar', 'apagar', 'remover', 'remocao', 'inativar', 'inativacao', 'desativar', 'desativacao', 'cancelar', 'cancelamento', 'lixeira', 'desligar', 'estornar', 'descartar', 'eliminar'],
  // Ações de Cadastro / Criação
  cadastrar: ['cadastrar', 'cadastro', 'criar', 'criacao', 'novo', 'nova', 'novos', 'incluir', 'inclusao', 'adicionar', 'adicao', 'inserir', 'registrar', 'registro', 'admitir', 'admissao'],
  // Ações de Edição / Atualização
  editar: ['editar', 'edicao', 'alterar', 'alteracao', 'modificar', 'modificacao', 'atualizar', 'atualizacao', 'trocar', 'mudar', 'ajustar', 'corrigir', 'configurar'],
  // Entidades: Colaboradores / Médicos / Equipe
  colaborador: ['colaborador', 'colaboradora', 'colaboradores', 'funcionario', 'funcionaria', 'funcionarios', 'profissional', 'profissionais', 'medico', 'medica', 'medicos', 'doutor', 'doutora', 'enfermeiro', 'enfermeira', 'recepcionista', 'farmaceutico', 'equipe', 'corpo clinico', 'membro', 'operador'],
  // Entidades: Pacientes
  paciente: ['paciente', 'pacientes', 'cliente', 'clientes', 'doente', 'internado', 'internada', 'usuario sus', 'prontuario', 'ficha'],
  // Entidades: Medicamentos
  medicamento: ['medicamento', 'medicamentos', 'remedio', 'remedios', 'droga', 'drogas', 'farmaco', 'insumo', 'insumos', 'posologia', 'comprimido', 'ampola'],
  // Entidades: Agendamento / Consultas
  consulta: ['consulta', 'consultas', 'agendamento', 'agendamentos', 'agendar', 'marcar', 'horario', 'compromisso', 'reserva'],
  // Entidades: Leitos / Internação
  leito: ['leito', 'leitos', 'vaga', 'vagas', 'quarto', 'acomodacao', 'internacao', 'internar', 'enfermaria', 'uti'],
  // Entidades: Salas / Consultórios
  consultorio: ['consultorio', 'consultorios', 'sala', 'salas', 'posto', 'ambulatorio'],
  // Entidades: Financeiro / Faturamento
  financeiro: ['financeiro', 'faturamento', 'cobranca', 'fatura', 'parcela', 'baixa', 'pagamento', 'convenio', 'receita', 'despesa'],
  // Relatórios / Impressão
  relatorio: ['relatorio', 'relatorios', 'exportar', 'exportacao', 'imprimir', 'impressao', 'pdf', 'excel', 'planilha', 'csv', 'grafico', 'metricas', 'indicadores', 'kpi']
};

export const expandQueryTokens = (rawQuery) => {
  const qNorm = removeAccents(rawQuery);
  const words = qNorm.split(/\s+/).filter(Boolean);
  const expanded = new Set(words);

  words.forEach(word => {
    Object.entries(SEMANTIC_SYNONYMS).forEach(([key, synList]) => {
      const matchInList = synList.some(s => s === word || (word.length >= 4 && s.startsWith(word)) || (s.length >= 4 && word.startsWith(s)));
      if (matchInList || key === word) {
        synList.forEach(s => expanded.add(s));
        expanded.add(key);
      }
    });
  });

  return Array.from(expanded);
};

export const manualData = [
  {
    id: 'geral',
    title: 'Geral & Visão Geral',
    icon: 'fa-hospital',
    color: '#818cf8',
    summary: 'Visão holística da arquitetura do Health Nexus, fluxo do paciente e papéis de acesso do sistema.',
    roles: ['Master', 'Médico', 'Enfermeiro', 'Recepcionista', 'Farmacêutico'],
    buttons: [
      {
        icon: 'fa-shield-halved',
        name: 'Controle de Perfis (RBAC)',
        type: 'Segurança',
        color: '#6366f1',
        description: 'Gerencia permissões em tempo real. Cada usuário possui acesso restrito estritamente às telas autorizadas pelo seu papel.',
        shortcut: 'Sem atalho',
        rules: 'Apenas usuários Master (mazzarowysk) podem alterar perfis de outros usuários.',
        keywords: ['rbac', 'controle de perfis', 'permissões', 'papéis', 'acesso', 'segurança', 'cargos', 'master', 'médico', 'enfermeiro', 'recepcionista', 'farmacêutico', 'colaboradores', 'perfil de colaborador']
      },
      {
        icon: 'fa-route',
        name: 'Notificações Persistentes de Fluxo',
        type: 'Assistente de Navegação',
        color: '#10b981',
        description: 'Notificação flutuante no topo direito com rastreador de próxima etapa (📍 Sequência do Fluxo) e botão esmeralda "IR PARA A ABA ➔". Ao clicar, o card da notificação se fecha instantaneamente, o sistema redireciona para a aba correta e pré-seleciona o card do paciente com animação verde pulsante por 4,5 segundos.',
        shortcut: 'Modais de conclusão de fluxo',
        rules: 'Permanece fixa na tela até que o usuário clique no botão de navegação, feche no ícone X ou mude para a aba indicada.',
        keywords: ['notificação de fluxo', 'direcionamento', 'ir para a aba', 'fluxo concluído', 'aviso persistente', 'redirecionamento', 'rolagem suave', 'destaque luminoso', 'coluna alvo', 'consultório 01', 'pré-seleção pulsante']
      },
      {
        icon: 'fa-magnifying-glass-chart',
        name: 'Busca Spotlight Unificada no Manual',
        type: 'Navegação & Ajuda',
        color: '#38bdf8',
        description: 'Mecanismo de busca inteligente por Relevance Scoring no campo de pesquisa do Manual Interativo com dropdown suspenso em tempo real e expansão de sinônimos.',
        shortcut: 'Digitar no campo de busca do manual / Ctrl+K',
        rules: 'Calcula relevância por títulos, palavras-chave, sinônimos semânticos e tokens com normalização de acentos (NFD). Permite abrir detalhes ou mudar de aba clicando no dropdown.',
        keywords: ['busca no manual', 'pesquisa manual', 'spotlight manual', 'relevance scoring', 'dropdown manual', 'pesquisar botões', 'buscar ações', 'localizar funções', 'como fazer']
      },
      {
        icon: 'fa-chart-filter',
        name: 'Funil de Atendimento Hospitalar',
        type: 'Gráfico & Métrica',
        color: '#3b82f6',
        description: 'Exibe a taxa de conversão em tempo real das etapas do paciente: Recepção ➔ Triagem ➔ Consultório ➔ Exames/Medicação ➔ Alta.',
        shortcut: 'Topo do Dashboard',
        rules: 'Métrica calculada automaticamente com base nos atendimentos do dia, semana ou mês.',
        keywords: ['funil', 'gráfico de funil', 'etapas do atendimento', 'conversão', 'dashboard', 'estatística', 'indicadores']
      },
      {
        icon: 'fa-chart-pie',
        name: 'Ocupação de Leitos por Ala (Gráfico Donut)',
        type: 'Gráfico & Ocupação',
        color: '#10b981',
        description: 'Visualização percentual em gráfico de rosca da taxa de ocupação dos leitos hospitalares entre ocupados e disponíveis.',
        shortcut: 'Painel Superior Direito',
        rules: 'Atualiza em tempo real com mudanças na Central de Leitos.',
        keywords: ['gráfico de leitos', 'ocupação de leitos', 'donut', 'rosca', 'capacidade hospitalar', 'leitos vagos', 'porcentagem leitos']
      },
      {
        icon: 'fa-chart-simple',
        name: 'Histórico de Atendimentos Mensais (Linhas)',
        type: 'Gráfico Analítico',
        color: '#ec4899',
        description: 'Gráfico comparativo de tendência de consultas totais vs urgência (PS) ao longo dos dias do mês.',
        shortcut: 'Painel Inferior do Dashboard',
        rules: 'Permite identificar picos de demanda hospitalar por dia da semana.',
        keywords: ['gráfico de linhas', 'histórico mensal', 'evolução de atendimentos', 'tendência', 'volume de consultas']
      },
      {
        icon: 'fa-cloud-check',
        name: 'Indicador de Sincronização Turso',
        type: 'Rede & Dados',
        color: '#10b981',
        description: 'Exibe no cabeçalho o status de conexão com o banco na nuvem Turso DB. Verde indica dados sincronizados em tempo real.',
        shortcut: 'Clique no badge no topo',
        rules: 'Funciona em modo Offline-First. Se a internet cair, o sistema grava localmente e sincroniza automaticamente ao reconectar.',
        keywords: ['sincronização', 'turso', 'nuvem', 'cloud', 'offline', 'banco de dados', 'status conexão']
      },
      {
        icon: 'fa-stopwatch-20',
        name: 'Cronômetro de Auto-Sync 15 Minutos',
        type: 'Sincronização & Nuvem',
        color: '#f59e0b',
        description: 'Verifica a cada 15 minutos se existem alterações no banco de dados local. Se houver mudanças pendentes, solicita confirmação para enviar à nuvem.',
        shortcut: 'Cronômetro ativo no badge de status',
        rules: 'Executa automaticamente a cada 15 minutos.',
        keywords: ['15 minutos', 'cronômetro', 'auto-sync', 'comparativo', 'banco de dados', 'alterações pendentes', 'temporizador', 'sincronizar']
      },
      {
        icon: 'fa-moon-sun',
        name: 'Alternar Tema (Escuro / Claro)',
        type: 'Interface',
        color: '#f59e0b',
        description: 'Alterna a paleta visual entre o modo Dark Glassmorphism e Light Mode para conforto visual em plantões noturnos.',
        shortcut: 'Botão no topo direito',
        rules: 'A preferência visual é salva no localStorage do navegador do usuário.',
        keywords: ['tema escuro', 'tema claro', 'dark mode', 'light mode', 'mudar cor', 'glassmorphism', 'aparência']
      }
    ],
    workflow: [
      { step: 1, title: 'Chegada do Paciente', desc: 'O paciente é recebido na Recepção, onde é feito o cadastro ou busca por CPF.' },
      { step: 2, title: 'Triagem Manchester', desc: 'A enfermagem afere sinais vitais e atribui a cor de gravidade (Manchester).' },
      { step: 3, title: 'Atendimento Médico', desc: 'O médico chama o paciente via TV, registra anamnese, CID-10, prescrição e atestado.' },
      { step: 4, title: 'Desfecho / Encaminhamento', desc: 'O paciente recebe medicação na Farmácia ou é internado na Central de Leitos.' }
    ],
    faq: [
      { q: 'O sistema funciona se a internet da clínica cair?', a: 'Sim! O Health Nexus opera no conceito Offline-First. Toda operação é salva instantaneamente no IndexedDB/LocalStorage do computador local e enviada ao Turso Cloud DB assim que a conexão retornar.' },
      { q: 'Quem tem acesso ao reset de senhas e exclusões?', a: 'Por segurança, apenas o usuário Master (mazzarowysk) possui autorização para resetar senhas, gerenciar usuários e executar auditorias.' }
    ]
  },
  {
    id: 'agenda',
    title: 'Agenda & Consultas',
    icon: 'fa-calendar-check',
    color: '#93c5fd',
    summary: 'Gerenciamento completo de agendamentos eletivos, controle de horários por médico e status de presença.',
    roles: ['Recepcionista', 'Médico', 'Master'],
    buttons: [
      {
        icon: 'fa-calendar-plus',
        name: '📅 Novo Agendamento',
        type: 'Escrita / Cadastro',
        color: '#3b82f6',
        description: 'Reserva horário na agenda de um médico ou profissional de saúde para um paciente cadastrado.',
        shortcut: 'Botão Azul no topo da Agenda',
        rules: 'Impede agendamentos duplicados no mesmo horário para o mesmo médico.',
        keywords: ['agendar', 'novo agendamento', 'marcar consulta', 'reserva', 'horário médico', 'cadastrar consulta', 'incluir agendamento', 'novo horário']
      },
      {
        icon: 'fa-filter',
        name: '🔍 Filtro por Médico / Especialidade',
        type: 'Visualização / Filtro',
        color: '#818cf8',
        description: 'Filtra os compromissos exibidos na tela por profissional, colaborador ou especialidade médica.',
        shortcut: 'Select no topo da página',
        rules: 'Permite selecionar "Todos os Médicos" para visão geral do dia.',
        keywords: ['filtrar médico', 'especialidade', 'agenda médico', 'consultório', 'filtrar colaborador', 'buscar consulta']
      },
      {
        icon: 'fa-check-double',
        name: '✅ Confirmar Presença (Check-in)',
        type: 'Status / Operacional',
        color: '#10b981',
        description: 'Altera o status do agendamento para "Aguardando Atendimento" quando o paciente chega à clínica.',
        shortcut: 'Botão Check no item da agenda',
        rules: 'Notifica automaticamente o painel do médico responsável e a fila de recepção.',
        keywords: ['check-in', 'confirmar presença', 'paciente chegou', 'aguardando atendimento', 'chegada']
      },
      {
        icon: 'fa-clock-rotate-left',
        name: '🔄 Reagendar Consulta',
        type: 'Edição / Remarcação',
        color: '#f59e0b',
        description: 'Muda a data ou horário da consulta preservando as observações e histórico do paciente.',
        shortcut: 'Ícone de Relógio',
        rules: 'Exige confirmação da nova data e horário escolhidos.',
        keywords: ['reagendar', 'mudar data consulta', 'remarcar', 'trocar horário', 'editar consulta', 'alterar agendamento']
      },
      {
        icon: 'fa-ban',
        name: '❌ Cancelar / Excluir Agendamento',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Cancela ou exclui a consulta agendada informando a justificativa (Desistência, Falta, Imprevisto). O horário volta a ficar livre para outros pacientes.',
        shortcut: 'Ícone de Lixeira / X no card da consulta',
        rules: 'O registro é cancelado e preservado no histórico para fins de auditoria e liberação do slot.',
        keywords: ['excluir agendamento', 'excluir consulta', 'cancelar agendamento', 'cancelar consulta', 'deletar agendamento', 'deletar consulta', 'remover agendamento', 'remover consulta', 'apagar consulta', 'desmarcar consulta', 'lixeira agenda', 'inativar agendamento']
      }
    ],
    workflow: [
      { step: 1, title: 'Seleção da Data', desc: 'Escolha a data no calendário e o médico correspondente.' },
      { step: 2, title: 'Agendamento', desc: 'Selecione o horário livre, busque o paciente e confirme o agendamento.' },
      { step: 3, title: 'Check-in no Dia', desc: 'No dia da consulta, quando o paciente chegar, clique em "Confirmar Presença".' }
    ],
    faq: [
      { q: 'Como visualizar horários livres de um médico?', a: 'Selecione o médico no filtro superior. O sistema destacará os slots de horário disponíveis na cor verde.' },
      { q: 'Como excluir ou cancelar uma consulta agendada?', a: 'Localize o card da consulta na Agenda e clique no botão ❌ ou 🗑️ Lixeira para cancelar o agendamento.' }
    ]
  },
  {
    id: 'recepcao',
    title: 'Recepção & Pacientes',
    icon: 'fa-user-nurse',
    color: '#38bdf8',
    summary: 'Módulo dedicado ao acolhimento de pacientes, cadastro de prontuários base, exclusão/inativação e encaminhamento para filas.',
    roles: ['Recepcionista', 'Enfermeiro', 'Master'],
    buttons: [
      {
        icon: 'fa-user-plus',
        name: '➕ Novo Paciente',
        type: 'Escrita / Cadastro',
        color: '#10b981',
        description: 'Abre o formulário modal para registro de novos pacientes. Exige validação rigorosa de CPF com algoritmo de dígitos verificadores.',
        shortcut: 'Alt + N',
        rules: 'Campos obrigatórios: Nome Completo, CPF válido, Data de Nascimento e Telefone.',
        keywords: ['novo paciente', 'cadastrar paciente', 'adicionar paciente', 'registro paciente', 'cpf', 'incluir paciente', 'admitir paciente', 'adicionar cliente']
      },
      {
        icon: 'fa-search',
        name: '🔍 Buscar Paciente',
        type: 'Pesquisa / Localização',
        color: '#38bdf8',
        description: 'Realiza busca instantânea no banco de dados local e remoto à medida que o usuário digita o CPF ou Nome do paciente.',
        shortcut: 'Campo no topo da lista',
        rules: 'Aceita CPF com ou sem pontuação (ex: 123.456.789-00 ou 12345678900).',
        keywords: ['buscar paciente', 'procurar paciente', 'encontrar cpf', 'lista pacientes', 'consultar paciente', 'localizar paciente']
      },
      {
        icon: 'fa-user-gear',
        name: '📝 Editar Cadastro de Paciente',
        type: 'Edição / Atualização',
        color: '#f59e0b',
        description: 'Permite atualizar dados cadastrais, endereço via CEP, convênio de saúde ou telefone de contato do paciente.',
        shortcut: 'Ícone de Lápis no card do paciente',
        rules: 'Alterações são sincronizadas imediatamente com a nuvem Turso DB.',
        keywords: ['editar paciente', 'alterar cadastro', 'mudar telefone', 'mudar convênio', 'atualizar paciente', 'modificar paciente']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Inativar / Excluir Paciente (Lixeira)',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Inativa ou exclui o cadastro do paciente enviando para a lixeira da recepção. Prontuários históricos e consultas são mantidos em segurança por requisitos legais (LGPD/CFM).',
        shortcut: 'Ícone de Lixeira no card do paciente',
        rules: 'Exige confirmação para evitar exclusões acidentais. O paciente pode ser restaurado posteriormente na aba da lixeira.',
        keywords: ['excluir paciente', 'deletar paciente', 'remover paciente', 'apagar paciente', 'inativar paciente', 'lixeira paciente', 'excluir cliente', 'remover cliente', 'desativar paciente', 'exclusao paciente', 'deletar ficha']
      },
      {
        icon: 'fa-right-to-bracket',
        name: '🎟️ Enviar para Fila / Triagem',
        type: 'Ação Operacional',
        color: '#6366f1',
        description: 'Insere o paciente na Fila de Espera ativa para a Triagem de Enfermagem ou Consultório Médico direto.',
        shortcut: 'Botão Verde no card',
        rules: 'Define o horário exato de entrada para acompanhamento do Tempo de Espera (Estagnação).',
        keywords: ['enviar para fila', 'fila de espera', 'encaminhar triagem', 'entrada ps', 'chamar triagem']
      },
      {
        icon: 'fa-print',
        name: '📄 Imprimir Ficha de Atendimento',
        type: 'Exportação / PDF',
        color: '#8b5cf6',
        description: 'Gera documento PDF formatado com dados cadastrais e espaço para assinatura física do paciente.',
        shortcut: 'Ícone de Impressora',
        rules: 'Disponível para qualquer cadastro existente.',
        keywords: ['imprimir ficha', 'pdf paciente', 'gerar ficha', 'impressão recepção', 'exportar paciente']
      }
    ],
    workflow: [
      { step: 1, title: 'Identificação', desc: 'Solicite o CPF ou Nome do paciente e digite na barra de busca.' },
      { step: 2, title: 'Cadastro / Atualização', desc: 'Se o paciente não existir, clique em Novo Paciente e preencha os dados.' },
      { step: 3, title: 'Encaminhamento', desc: 'Clique em "Enviar para Fila" e informe o tipo de atendimento (Consulta Geral, Urgência, Retorno).' }
    ],
    faq: [
      { q: 'Como excluir ou inativar um paciente do sistema?', a: 'Na lista de pacientes da Recepção, localize o paciente e clique no ícone de 🗑️ Lixeira no card. O paciente será inativado e movido para a lixeira.' },
      { q: 'O que fazer se o sistema informar "CPF Já Cadastrado"?', a: 'Utilize a barra de busca por CPF para localizar o cadastro pré-existente e apenas atualize os dados do paciente se necessário.' }
    ]
  },
  {
    id: 'prontuario',
    title: 'Prontuário & Atendimento Médico',
    icon: 'fa-stethoscope',
    color: '#fcd34d',
    summary: 'Ambiente médico de alta performance para anamnese, diagnóstico CID-10, prescrição eletrônica e emissão de atestados.',
    roles: ['Médico', 'Enfermeiro', 'Master'],
    buttons: [
      {
        icon: 'fa-traffic-light',
        name: '🚦 Triagem Manchester',
        type: 'Classificação de Risco',
        color: '#ef4444',
        description: 'Registra os sinais vitais (PA, FC, Temp, SpO2, Glicemia) e atribui a cor de gravidade: Vermelho (0m), Laranja (10m), Amarelo (60m), Verde (120m), Azul (240m).',
        shortcut: 'Aba Triagem',
        rules: 'Calcula automaticamente alertas de taquicardia, febre ou hipóxia.',
        keywords: ['triagem manchester', 'classificação de risco', 'sinais vitais', 'pressão alta', 'febre', 'spo2', 'dor']
      },
      {
        icon: 'fa-notes-medical',
        name: '🩺 Iniciar Atendimento',
        type: 'Ação Clínica',
        color: '#10b981',
        description: 'Abre a ficha clínica do paciente selecionado na fila, iniciando o cronômetro do atendimento.',
        shortcut: 'Botão Verde na lista de esperados',
        rules: 'Altera o status do paciente na TV para "Em Atendimento".',
        keywords: ['iniciar atendimento', 'abrir prontuário', 'chamar consultório', 'pep', 'atender paciente']
      },
      {
        icon: 'fa-pills',
        name: '💊 Nova Prescrição Eletrônica',
        type: 'Prescrição / Receita',
        color: '#3b82f6',
        description: 'Busca medicamentos cadastrados no estoque da farmácia interna, adicionando posologia, dosagem e via de administração.',
        shortcut: 'Aba Prescrição no Prontuário',
        rules: 'Permite salvar receitas para impressão imediata em formato corporativo.',
        keywords: ['prescrição eletrônica', 'receita médica', 'prescrever remédio', 'posologia', 'medicamento', 'cadastrar receita']
      },
      {
        icon: 'fa-book-diagnostic',
        name: '📘 Pesquisa Integrada CID-10',
        type: 'Diagnóstico',
        color: '#8b5cf6',
        description: 'Campo inteligente com autocompletar para busca de código internacional de doenças (ex: J06.9, E11, I10).',
        shortcut: 'Campo CID-10',
        rules: 'Busca por código numérico ou palavra-chave do diagnóstico.',
        keywords: ['cid-10', 'diagnóstico', 'código doença', 'cid', 'hipótese diagnóstica']
      },
      {
        icon: 'fa-file-signature',
        name: '📄 Emissão de Atestado / Declaração',
        type: 'Documentação / PDF',
        color: '#ec4899',
        description: 'Gera atestado médico configurável (dias de afastamento, repouso ou declaração de comparecimento) com validação de CRM.',
        shortcut: 'Botão Atestado',
        rules: 'Preenche automaticamente os dados do médico logado.',
        keywords: ['emitir atestado', 'atestado médico', 'afastamento', 'declaração de comparecimento', 'imprimir atestado', 'laudo']
      },
      {
        icon: 'fa-bed-pulse',
        name: '🛏️ Solicitar Internação',
        type: 'Encaminhamento',
        color: '#f59e0b',
        description: 'Encaminha a ordem de internação do paciente direto para a Central de Leitos com a hipótese diagnóstica.',
        shortcut: 'Botão Solicitar Leito',
        rules: 'Insere o paciente na Fila de Alocação de Leitos.',
        keywords: ['solicitar internação', 'pedir leito', 'internar paciente', 'encaminhar UTI']
      },
      {
        icon: 'fa-circle-check',
        name: '🏁 Finalizar Consulta',
        type: 'Encerramento',
        color: '#059669',
        description: 'Salva todas as informações no prontuário definitivo e conclui o atendimento do paciente.',
        shortcut: 'Botão Concluir no rodapé',
        rules: 'Libera o médico para chamar o próximo paciente na TV.',
        keywords: ['finalizar consulta', 'concluir atendimento', 'fechar prontuário', 'dar alta médica', 'encerrar']
      },
      {
        icon: 'fa-ban',
        name: '❌ Cancelar / Excluir Atendimento',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Cancela o atendimento atual e devolve o paciente para a fila ou finaliza por desistência/abandono.',
        shortcut: 'Botão Cancelar no Prontuário',
        rules: 'Exige justificativa médica registrada.',
        keywords: ['cancelar atendimento', 'excluir atendimento', 'deletar atendimento', 'abandonou consulta', 'remover atendimento']
      }
    ],
    workflow: [
      { step: 1, title: 'Triagem', desc: 'Enfermagem registra sinais vitais e define a cor do protocolo Manchester.' },
      { step: 2, title: 'Anamnese', desc: 'Médico inicia o atendimento, registra a queixa principal e exame físico.' },
      { step: 3, title: 'Prescrição & CID-10', desc: 'Médico seleciona os medicamentos na farmácia e vincula o CID-10.' },
      { step: 4, title: 'Finalização', desc: 'Emite o atestado/receita impressa e clica em Finalizar Consulta.' }
    ],
    faq: [
      { q: 'Como consultar o histórico anterior do paciente?', a: 'No lado direito do prontuário, há a aba "Histórico de Atendimentos" com todas as consultas passadas registradas no sistema.' }
    ]
  },
  {
    id: 'tv',
    title: 'Painel TV & Sala de Espera',
    icon: 'fa-tv',
    color: '#a78bfa',
    summary: 'Sistema audiovisual interativo para chamada de pacientes na sala de espera com síntese de voz nativa.',
    roles: ['Recepcionista', 'Médico', 'Enfermeiro', 'Master'],
    buttons: [
      {
        icon: 'fa-bullhorn',
        name: '📢 Chamar Paciente na TV',
        type: 'Notificação / Chamada',
        color: '#8b5cf6',
        description: 'Dispara o alarme sonoro e pronuncia o nome do paciente via sintetizador de voz (ex: "Paciente Marcelo Mazaro, favor dirigir-se ao Consultório 01").',
        shortcut: 'Botão Chamada na Agenda/Prontuário',
        rules: 'Exibe a chamada em tela cheia na TV da recepção.',
        keywords: ['chamar paciente', 'tv', 'painel tv', 'chamar no consultório', 'megafone', 'alarme sonoro', 'voz', 'chamar']
      },
      {
        icon: 'fa-rotate-right',
        name: '🔁 Rechamar Paciente',
        type: 'Re-notificação',
        color: '#f59e0b',
        description: 'Re-executa o aviso sonoro e faz o nome do paciente piscar em destaque na tela da sala de espera.',
        shortcut: 'Botão Rechamar',
        rules: 'Atualiza o horário da última chamada na lista.',
        keywords: ['rechamar', 'chamar de novo', 'repete chamada', 'aviso sonoro', 'piscar tv']
      },
      {
        icon: 'fa-volume-high',
        name: '🔊 Ativar / Testar Áudio Voz',
        type: 'Configuração de Som',
        color: '#10b981',
        description: 'Testa os alto-falantes e a síntese de voz gTTS integrada ao navegador.',
        shortcut: 'Botão de Som no topo da TV',
        rules: 'Exige que o navegador tenha permissão de reprodução de áudio ativada.',
        keywords: ['testar som', 'áudio tv', 'sem som', 'voz não sai', 'volume', 'alto falantes']
      },
      {
        icon: 'fa-expand',
        name: '📺 Modo Tela Cheia (F11)',
        type: 'Exibição',
        color: '#3b82f6',
        description: 'Ajusta o layout para exibição dedicada em smart TVs ou monitores de parede na recepção.',
        shortcut: 'F11',
        rules: 'Oculta menus de navegação do sistema para foco exclusivo nas chamadas.',
        keywords: ['tela cheia', 'f11', 'smart tv', 'monitor recepção', 'full screen']
      }
    ],
    workflow: [
      { step: 1, title: 'Abertura da TV', desc: 'Abra a aba Painel TV no monitor/TV da sala de espera.' },
      { step: 2, title: 'Chamada no Consultório', desc: 'O médico ou recepcionista clica no ícone de Megafone ao lado do paciente.' },
      { step: 3, title: 'Exibição na Tela', desc: 'A TV emite o som, pronuncia a frase de chamada e exibe o histórico na tela.' }
    ],
    faq: [
      { q: 'Por que a voz não saiu na TV?', a: 'Certifique-se de que o volume do computador/TV está ligado e que você clicou ao menos uma vez na tela da TV para liberar o áudio do navegador.' }
    ]
  },
  {
    id: 'leitos',
    title: 'Gestão de Leitos & Internação',
    icon: 'fa-bed-pulse',
    color: '#f9a8d4',
    summary: 'Controle em tempo real de acomodações hospitalares, taxa de ocupação, movimentação e higienização.',
    roles: ['Enfermeiro', 'Médico', 'Master'],
    buttons: [
      {
        icon: 'fa-hospital-user',
        name: '📥 Internar Paciente',
        type: 'Alocação / Admissão',
        color: '#10b981',
        description: 'Aloca um paciente da fila de solicitação de leitos em uma acomodação livre.',
        shortcut: 'Botão Internar no leito vago',
        rules: 'Apenas leitos com status "Livre" podem receber pacientes.',
        keywords: ['internar', 'alocar leito', 'colocar no leito', 'internação', 'quarto', 'admitir internação']
      },
      {
        icon: 'fa-arrows-left-right',
        name: '🔄 Transferir de Leito',
        type: 'Movimentação',
        color: '#3b82f6',
        description: 'Muda a acomodação do paciente internado (ex: Enfermaria A -> UTI Leito 02).',
        shortcut: 'Ícone de Troca no card do leito',
        rules: 'Registra a data, hora e motivo da transferência no histórico do leito.',
        keywords: ['transferir leito', 'trocar de leito', 'mudar de quarto', 'transferência uti', 'editar leito']
      },
      {
        icon: 'fa-clipboard-check',
        name: '📋 Aprazamento & Prescrição de Enfermagem',
        type: 'Assistencial',
        color: '#8b5cf6',
        description: 'Permite à enfermagem checar e dar baixa nas medicações administradas por horário.',
        shortcut: 'Aba Aprazamento',
        rules: 'Exibe a lista de medicamentos prescritos pelo médico assistente.',
        keywords: ['aprazamento', 'checagem de enfermagem', 'dar medicação', 'horário remédio', 'enfermagem']
      },
      {
        icon: 'fa-door-open',
        name: '🚪 Conceder Alta Hospitalar',
        type: 'Desfecho / Alta',
        color: '#ef4444',
        description: 'Registra a alta do paciente e altera o status do leito para "Em Higienização".',
        shortcut: 'Botão Dar Alta',
        rules: 'O leito fica bloqueado para novas internações até que a higienização seja concluída.',
        keywords: ['alta hospitalar', 'dar alta', 'liberar leito', 'desocupar leito', 'alta', 'finalizar internação']
      },
      {
        icon: 'fa-broom',
        name: '✨ Concluir Higienização',
        type: 'Manutenção',
        color: '#f59e0b',
        description: 'Informa que a equipe de limpeza concluiu a sanitização do leito, retornando o status para "Livre".',
        shortcut: 'Botão Limpeza Concluída',
        rules: 'Retorna a cor do leito para verde no Mapa Geral.',
        keywords: ['higienização', 'limpeza leito', 'sanitização', 'leito livre', 'concluir limpeza']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Cancelar / Excluir Internação ou Desativar Leito',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Cancela uma solicitação de internação indevida ou desativa temporariamente um leito para manutenção hospitalar.',
        shortcut: 'Ícone de Lixeira no leito/solicitação',
        rules: 'Requer perfil Enfermeiro Chefe ou Master.',
        keywords: ['excluir internação', 'cancelar internação', 'desativar leito', 'excluir leito', 'remover leito', 'deletar leito', 'lixeira leitos']
      }
    ],
    workflow: [
      { step: 1, title: 'Solicitação', desc: 'Ordem de internação emitida no prontuário médico.' },
      { step: 2, title: 'Alocação', desc: 'Enfermagem clica em Internar em um leito com status Verde (Livre).' },
      { step: 3, title: 'Alta & Limpeza', desc: 'Ao dar Alta, o leito passa para Amarelo (Higienização). Após a limpeza, clica em Concluir Higienização.' }
    ],
    faq: [
      { q: 'O que indicam as cores dos leitos?', a: 'Verde = Livre | Vermelho = Ocupado | Amarelo = Em Higienização | Cinza = Manutenção/Bloqueado.' }
    ]
  },
  {
    id: 'kanban',
    title: 'Quadro Kanban Hospitalar',
    icon: 'fa-table-columns',
    color: '#60a5fa',
    summary: 'Fluxo visual de internação em 5 setores (PS, Corredor, Cirúrgica, Médica, UTI) com controle de SLAs e auditoria.',
    roles: ['Médico', 'Enfermeiro', 'Master'],
    buttons: [
      {
        icon: 'fa-arrows-up-down-left-right',
        name: '📋 Mover Paciente entre Setores (Kanban)',
        type: 'Fluxo Assistencial',
        color: '#3b82f6',
        description: 'Arrasta ou movimenta o card do paciente entre as 5 colunas hospitalares (PS 24h, Corredor 1d, Cirúrgica 7d, Médica 10d, UTI 5d).',
        shortcut: 'Arrastar card ou clicar em Mover',
        rules: 'Registra automaticamente o timestamp de entrada em cada ala.',
        keywords: ['kanban', 'mover paciente', 'mudar setor', 'fluxo internação', 'quadro hospitalar']
      },
      {
        icon: 'fa-clock',
        name: '⏱️ Monitor de SLAs e Prazos Hospitalares',
        type: 'Qualidade & Alertas',
        color: '#f59e0b',
        description: 'Exibe barras de progresso coloridas por tempo de permanência em cada coluna (Verde -> Âmbar -> Vermelho excedido).',
        shortcut: 'Indicador visual no card',
        rules: 'Alerta visualmente a equipe quando o limite da ala é ultrapassado.',
        keywords: ['sla kanban', 'tempo de permanência', 'estouro de prazo', 'alerta kanban']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Remover Card / Cancelar Fluxo Kanban',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Remove um paciente do quadro Kanban ao conceder alta ou cancelar o fluxo de internação.',
        shortcut: 'Ícone de Lixeira no card Kanban',
        rules: 'Registra o desfecho clínico do paciente no histórico.',
        keywords: ['excluir card kanban', 'remover do kanban', 'cancelar card', 'deletar card', 'desativar internação kanban']
      }
    ],
    workflow: [
      { step: 1, title: 'Admissão no PS', desc: 'Paciente entra na primeira coluna com SLA de até 24 horas.' },
      { step: 2, title: 'Encaminhamento', desc: 'Equipe move para Enfermaria Cirúrgica, Médica ou UTI conforme evolução.' },
      { step: 3, title: 'Desfecho / Alta', desc: 'Ao dar alta, o card é finalizado e enviado para o relatório de tempos.' }
    ],
    faq: [
      { q: 'Como funcionam os limites de tempo do Kanban?', a: 'Cada coluna tem um limite: PS (24h), Corredor (1 dia), Cirúrgica (7 dias), Médica (10 dias) e UTI (5 dias). Se o tempo for excedido, a barra fica vermelha.' }
    ]
  },
  {
    id: 'farmacia',
    title: 'Farmácia & Estoque',
    icon: 'fa-capsules',
    color: '#fbbf24',
    summary: 'Dispensação automatizada de receitas médicas, controle de estoque mínimo, lotes e datas de validade.',
    roles: ['Farmacêutico', 'Master'],
    buttons: [
      {
        icon: 'fa-prescription-bottle-medical',
        name: '💊 Dispensar Prescrição',
        type: 'Baixa de Estoque',
        color: '#10b981',
        description: 'Localiza as prescrições médicas ativas e realiza a saída automatizada dos itens entregues.',
        shortcut: 'Botão Dispensar',
        rules: 'Subtrai a quantidade do estoque da farmácia e registra o lote utilizado.',
        keywords: ['dispensar', 'entregar remédio', 'baixa de estoque', 'prescrição farmácia', 'dar saída']
      },
      {
        icon: 'fa-box-archive',
        name: '📦 Cadastrar Medicamento / Insumo',
        type: 'Cadastro / Estoque',
        color: '#3b82f6',
        description: 'Insere novos medicamentos ou insumos hospitalares na base de dados com integração OpenFDA.',
        shortcut: 'Botão Novo Item',
        rules: 'Campos obrigatórios: Nome Comercial, Princípio Ativo, Forma e Estoque Mínimo.',
        keywords: ['cadastrar medicamento', 'novo remédio', 'adicionar insumo', 'estoque mínimo', 'incluir medicamento', 'cadastrar remédio']
      },
      {
        icon: 'fa-file-invoice-dollar',
        name: '📥 Entrada de Estoque / Nota Fiscal',
        type: 'Entrada / Compra',
        color: '#8b5cf6',
        description: 'Registra a entrada de novas caixas/lotes com data de validade e fornecedor.',
        shortcut: 'Botão Dar Entrada',
        rules: 'Soma a quantidade ao saldo do estoque existente.',
        keywords: ['entrada de estoque', 'nota fiscal', 'fornecedor', 'lote', 'validade', 'adicionar quantidade']
      },
      {
        icon: 'fa-triangle-exclamation',
        name: '⚠️ Alertas de Estoque Crítico',
        type: 'Monitoramento',
        color: '#ef4444',
        description: 'Painel que lista medicamentos com saldo abaixo do estoque mínimo ou com validade próxima ao vencimento.',
        shortcut: 'Aba Alertas',
        rules: 'Destaca itens com menos de 30 dias para vencer.',
        keywords: ['estoque crítico', 'remédio vencendo', 'estoque baixo', 'validade', 'alerta farmácia']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Inativar / Excluir Medicamento (Lixeira)',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Inativa um medicamento do estoque hospitalar ou remove lotes vencidos/avariados.',
        shortcut: 'Ícone de Lixeira na lista de medicamentos',
        rules: 'Preserva o histórico de prescrições passadas que continham este fármaco.',
        keywords: ['excluir medicamento', 'excluir remédio', 'deletar remédio', 'remover medicamento', 'inativar medicamento', 'apagar insumo', 'lixeira farmácia', 'desativar remédio']
      }
    ],
    workflow: [
      { step: 1, title: 'Recepção da Receita', desc: 'Busque o paciente ou código da prescrição enviada pelo médico.' },
      { step: 2, title: 'Conferência de Lote', desc: 'Confira os medicamentos fisicamente com a tela de dispensação.' },
      { step: 3, title: 'Dispensação', desc: 'Clique em Confirmar Dispensação para dar baixa automática no estoque.' }
    ],
    faq: [
      { q: 'O que acontece quando o estoque atinge zero?', a: 'O medicamento é sinalizado em vermelho no Prontuário Médico, impedindo que o médico prescreva itens indisponíveis.' }
    ]
  },
  {
    id: 'financeiro',
    title: 'Faturamento & Financeiro',
    icon: 'fa-hand-holding-dollar',
    color: '#34d399',
    summary: 'Gestão financeira hospitalar, cobranças por convênio, SUS e particular, com baixa manual e em lote.',
    roles: ['Master', 'Recepcionista'],
    buttons: [
      {
        icon: 'fa-file-invoice-dollar',
        name: '💰 Nova Cobrança / Fatura',
        type: 'Faturamento / Cadastro',
        color: '#10b981',
        description: 'Registra uma nova cobrança ou fatura vinculada a uma consulta, procedimento ou internação.',
        shortcut: 'Botão + Nova Fatura',
        rules: 'Permite selecionar Convênio (Unimed, Bradesco, etc.), Particular ou SUS.',
        keywords: ['nova cobrança', 'cadastrar fatura', 'emitir cobrança', 'faturamento', 'novo faturamento']
      },
      {
        icon: 'fa-money-bill-transfer',
        name: '💳 Dar Baixa Manual de Parcela',
        type: 'Pagamento / Baixa',
        color: '#3b82f6',
        description: 'Permite quitar uma parcela individual preenchendo valor pago, forma de pagamento (Pix, Cartão, Dinheiro) e observações.',
        shortcut: 'Botão "Dar Baixa Manual"',
        rules: 'Atualiza o saldo a receber e emite comprovante de quitação.',
        keywords: ['baixa manual', 'pagar parcela', 'quitar fatura', 'receber pagamento', 'baixa de parcela', 'pix', 'cartão']
      },
      {
        icon: 'fa-layer-group',
        name: '📑 Baixa Manual em Lote',
        type: 'Pagamento em Lote',
        color: '#8b5cf6',
        description: 'Seleciona múltiplas parcelas simultaneamente e executa a baixa em massa com uma única confirmação.',
        shortcut: 'Botão "Baixa em Lote"',
        rules: 'Calcula o somatório total das faturas selecionadas automaticamente.',
        keywords: ['baixa em lote', 'quitar várias', 'baixa múltipla', 'recebimento em massa']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Cancelar / Excluir Fatura ou Cobrança',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Cancela ou estorna uma cobrança indevida, desfazendo a baixa e registrando o motivo de estorno.',
        shortcut: 'Ícone de Lixeira na listagem de faturas',
        rules: 'Apenas usuários Master ou Financeiro autorizado podem estornar valores.',
        keywords: ['excluir fatura', 'cancelar cobrança', 'excluir cobrança', 'estornar pagamento', 'remover parcela', 'deletar fatura', 'cancelar parcela']
      }
    ],
    workflow: [
      { step: 1, title: 'Geração da Fatura', desc: 'Procedimentos clínicos geram cobranças automáticas ou manuais.' },
      { step: 2, title: 'Baixa de Pagamento', desc: 'Recepcionista ou financeiro clica em Dar Baixa Manual (Pix, Cartão, Dinheiro).' },
      { step: 3, title: 'Conciliação', desc: 'Relatório financeiro consolida as receitas do dia e exporta em PDF.' }
    ],
    faq: [
      { q: 'Como dar baixa em várias parcelas de uma vez?', a: 'Marque as caixas de seleção das faturas desejadas e clique no botão "Baixa Manual em Lote".' }
    ]
  },
  {
    id: 'medicos',
    title: 'Profissionais & Equipe / Corpo Clínico',
    icon: 'fa-user-doctor',
    color: '#818cf8',
    summary: 'Gestão completa do corpo clínico hospitalar, médicos, enfermeiros, colaboradores e validação no CFM/COREN.',
    roles: ['Master', 'Médico', 'Recepcionista'],
    buttons: [
      {
        icon: 'fa-user-plus',
        name: '➕ Cadastrar / Incluir Novo Profissional (Colaborador)',
        type: 'Cadastro / Corpo Clínico',
        color: '#10b981',
        description: 'Cadastra um novo médico, enfermeiro ou colaborador no corpo clínico da instituição. Preencha Nome Completo, CRM/COREN, Especialidade, Telefone e E-mail com validação em tempo real.',
        shortcut: 'Botão "+ Novo Médico" na aba Corpo Clínico',
        rules: 'Exige CRM/COREN e Nome Completo válidos. O CRM é verificado contra a base oficial do CFM.',
        keywords: ['incluir médico', 'cadastrar médico', 'novo médico', 'adicionar médico', 'registro médico', 'corpo clínico', 'crm', 'especialista', 'contratar médico', 'incluir colaborador', 'cadastrar colaborador', 'novo colaborador', 'adicionar colaborador', 'cadastrar funcionário', 'incluir funcionário', 'novo profissional', 'cadastrar profissional', 'médicos', 'medico', 'colaboradores']
      },
      {
        icon: 'fa-user-pen',
        name: '📝 Editar Cadastro de Colaborador / Médico',
        type: 'Edição / Atualização',
        color: '#3b82f6',
        description: 'Altera especialidade, telefone de contato, e-mail ou dados cadastrais do profissional de saúde ou colaborador.',
        shortcut: 'Ícone de Lápis no card do profissional',
        rules: 'Permite atualizar os dados a qualquer momento.',
        keywords: ['editar médico', 'alterar médico', 'mudar especialidade', 'atualizar crm', 'editar colaborador', 'alterar colaborador', 'editar funcionário', 'atualizar profissional']
      },
      {
        icon: 'fa-calendar-days',
        name: '📅 Alocar Plantão de Profissional (Escala)',
        type: 'Escala de Trabalho',
        color: '#8b5cf6',
        description: 'Insere o médico ou enfermeiro na escala de plantão do dia, definindo consultório, turno e horário.',
        shortcut: 'Botão "Escala de Plantão"',
        rules: 'Atualiza o banner de plantonistas do dia na recepção e dashboard.',
        keywords: ['escala médico', 'plantão médico', 'alocar plantão', 'horário médico', 'escala de trabalho', 'escala colaborador']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Lixeira de Colaboradores & Médicos (Desativar / Excluir)',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Desativa ou exclui um colaborador, médico ou enfermeiro do corpo clínico enviando para a lixeira. Registros históricos de consultas, atendimentos e prescrições permanecem 100% preservados.',
        shortcut: 'Botão Lixeira no card do profissional / aba Lixeira',
        rules: 'Permite restaurar o profissional a qualquer momento na aba da lixeira.',
        keywords: ['excluir colaborador', 'excluir médico', 'excluir profissional', 'excluir funcionário', 'excluir enfermeiro', 'desativar colaborador', 'remover colaborador', 'deletar colaborador', 'lixeira colaborador', 'excluir equipe', 'desligar médico', 'inativar colaborador', 'deletar médico', 'remover médico', 'lixeira médico', 'apagar profissional', 'excluir funcionario', 'excluir medico']
      }
    ],
    workflow: [
      { step: 1, title: 'Acesse Corpo Clínico', desc: 'Clique na aba "Profissionais & Equipe" no menu lateral.' },
      { step: 2, title: 'Clique em Novo Profissional', desc: 'Clique no botão "+ Novo Médico" no canto superior direito.' },
      { step: 3, title: 'Preencha os Dados', desc: 'Informe o Nome, CRM/COREN, Especialidade, Telefone e E-mail, e clique em Salvar.' }
    ],
    faq: [
      { q: 'Como excluir ou desativar um colaborador / médico?', a: 'Acesse a aba "Profissionais & Equipe", localize o profissional desejado e clique no ícone de 🗑️ Lixeira no card. O profissional será desativado e o histórico de atendimentos preservado.' },
      { q: 'Como incluir ou cadastrar um novo médico/colaborador no sistema?', a: 'Acesse a aba "Profissionais & Equipe", clique no botão "+ Novo Médico", preencha os dados e clique em Salvar.' }
    ]
  },
  {
    id: 'consultorios',
    title: 'Salas & Consultórios',
    icon: 'fa-door-open',
    color: '#c084fc',
    summary: 'Gerenciamento físico e operacional de consultórios, ambulatórios, salas de triagem e ocupação em tempo real.',
    roles: ['Master', 'Médico', 'Recepcionista'],
    buttons: [
      {
        icon: 'fa-square-plus',
        name: '➕ Cadastrar Nova Sala / Consultório',
        type: 'Cadastro / Estrutura',
        color: '#10b981',
        description: 'Cria uma nova sala de atendimento ou consultório no hospital (ex: Consultório 01, Sala de Triagem 02).',
        shortcut: 'Botão "+ Nova Sala"',
        rules: 'Define número da sala, especialidade atendida e equipamentos disponíveis.',
        keywords: ['cadastrar sala', 'nova sala', 'novo consultório', 'cadastrar consultório', 'adicionar sala', 'criar consultório']
      },
      {
        icon: 'fa-pen-to-square',
        name: '📝 Editar Sala / Consultório',
        type: 'Edição',
        color: '#3b82f6',
        description: 'Altera o nome, especialidade alocada ou status operacional da sala.',
        shortcut: 'Ícone de Lápis no card do consultório',
        rules: 'Atualiza o painel de chamadas da TV automaticamente.',
        keywords: ['editar sala', 'editar consultório', 'alterar sala', 'modificar consultório']
      },
      {
        icon: 'fa-eye',
        name: '📊 Monitor de Ocupação em Tempo Real',
        type: 'Monitoramento',
        color: '#8b5cf6',
        description: 'Exibe quais consultórios estão ocupados com atendimentos em andamento e quais estão livres.',
        shortcut: 'Grid de Consultórios',
        rules: 'Atualiza em tempo real via WebSocket/IndexedDB.',
        keywords: ['ocupação consultório', 'sala livre', 'sala ocupada', 'monitor de salas']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Excluir / Desativar Sala de Atendimento',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Remove uma sala ou desativa temporariamente para reformas/manutenção.',
        shortcut: 'Ícone de Lixeira no card da sala',
        rules: 'Não permite excluir salas que estejam com atendimento em andamento no momento.',
        keywords: ['excluir consultório', 'excluir sala', 'remover consultório', 'remover sala', 'deletar consultório', 'deletar sala', 'desativar sala']
      }
    ],
    workflow: [
      { step: 1, title: 'Criação da Sala', desc: 'Cadastre a sala com nome e número identificador.' },
      { step: 2, title: 'Alocação de Plantonista', desc: 'Vincule o médico plantonista ao consultório na Escala de Trabalho.' },
      { step: 3, title: 'Chamada na TV', desc: 'Ao chamar o paciente, o sistema anuncia o consultório correspondente.' }
    ],
    faq: [
      { q: 'Como desativar ou excluir um consultório?', a: 'Na aba Salas & Consultórios, localize o card da sala e clique no ícone de 🗑️ Lixeira.' }
    ]
  },
  {
    id: 'escalas',
    title: 'Escalas de Trabalho & Plantões',
    icon: 'fa-calendar-check',
    color: '#a855f7',
    summary: 'Gerenciamento de turnos e plantões para médicos e enfermeiros com relatórios impressos e aviso de cobertura.',
    roles: ['Master', 'Médico', 'Enfermeiro'],
    buttons: [
      {
        icon: 'fa-calendar-plus',
        name: '➕ Cadastrar Novo Plantão / Escala',
        type: 'Escalas / Cadastro',
        color: '#10b981',
        description: 'Cadastra um plantão de trabalho para médicos ou enfermeiros indicando data, turno (6h, 12h, 24h) e consultório/setor.',
        shortcut: 'Botão "+ Novo Plantão"',
        rules: 'Avisa automaticamente caso o profissional já possua outro plantão no mesmo horário.',
        keywords: ['cadastrar plantão', 'novo plantão', 'escala de trabalho', 'incluir plantão', 'escala médica', 'escala enfermagem', 'novo turno']
      },
      {
        icon: 'fa-print',
        name: '🖨️ Imprimir Escala Mensal',
        type: 'Impressão / Relatório',
        color: '#3b82f6',
        description: 'Gera relatório formatado da escala de plantão para afixação nos quadros do hospital.',
        shortcut: 'Botão Imprimir Escala',
        rules: 'Exibe nome do profissional, registro CRM/COREN, setor e horários.',
        keywords: ['imprimir escala', 'relatório escala', 'quadro de plantão', 'pdf escala', 'exportar escala']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Cancelar / Excluir Plantão da Escala',
        type: 'Ação Crítica / Exclusão',
        color: '#ef4444',
        description: 'Remove um plantão agendado por motivo de licença, permuta ou readequação de equipe.',
        shortcut: 'Ícone de Lixeira na linha da escala',
        rules: 'Requer perfil Enfermeiro Chefe, Diretor Clínico ou Master.',
        keywords: ['excluir plantão', 'cancelar plantão', 'remover escala', 'deletar plantão', 'apagar plantão', 'troca de plantão']
      }
    ],
    workflow: [
      { step: 1, title: 'Selecione a Categoria', desc: 'Escolha entre Escala de Médicos ou Escala de Enfermeiros.' },
      { step: 2, title: 'Clique em Novo Plantão', desc: 'Informe a data, o profissional, o turno e a sala alocada.' },
      { step: 3, title: 'Confirme a Escala', desc: 'Salve o plantão e visualize o status atualizado no banner superior.' }
    ],
    faq: [
      { q: 'Como verificar os médicos de plantão hoje?', a: 'No topo da aba Corpo Clínico ou Escalas, consulte o banner "Médicos de Plantão Hoje".' }
    ]
  },
  {
    id: 'estagnacao',
    title: 'Alertas & Estagnação',
    icon: 'fa-triangle-exclamation',
    color: '#f59e0b',
    summary: 'Monitoramento em tempo real de pacientes que excederam os limites de tempo de espera (protocolo Manchester e permanência no PS).',
    roles: ['Master', 'Médico', 'Enfermeiro'],
    buttons: [
      {
        icon: 'fa-hourglass-half',
        name: '⏱️ Monitor de Permanência PS (12h)',
        type: 'Alerta Clínico',
        color: '#ef4444',
        description: 'Rastreia o tempo decorrido desde a recepção com categorização por cores (Azul <10h, Amarelo 10-12h, Vermelho >12h).',
        shortcut: 'Card de Estagnação',
        rules: 'Dispara sinal sonoro e visual para a equipe de enfermagem.',
        keywords: ['estagnação', 'tempo no ps', 'alerta de demora', 'paciente esperando', 'permanência']
      },
      {
        icon: 'fa-bell',
        name: '🚨 Alerta Pulsante de Demora Excessiva',
        type: 'Segurança do Paciente',
        color: '#f59e0b',
        description: 'Destaca cards de pacientes cujo tempo de espera para consulta excedeu 30 minutos na fila da recepção.',
        shortcut: 'Painel de Alertas',
        rules: 'Permite remanejar o paciente para outro consultório livre com 1 clique.',
        keywords: ['alerta sonoro', 'demora atendimento', 'gargalo recepção', 'desafogar ps']
      }
    ],
    workflow: [
      { step: 1, title: 'Detecção Automática', desc: 'O sistema calcula o tempo desde o acolhimento até a triagem/consulta.' },
      { step: 2, title: 'Sinalização', desc: 'Pacientes em risco de estagnação aparecem no topo da lista com tag âmbar/vermelha.' },
      { step: 3, title: 'Intervenção', desc: 'A gestão remaneja médicos ou chama o paciente com prioridade.' }
    ],
    faq: [
      { q: 'Como funciona o cálculo de estagnação?', a: 'Compara o horário de entrada do paciente com o tempo máximo aceitável para a cor de gravidade atribuída no protocolo Manchester.' }
    ]
  },
  {
    id: 'relatorios',
    title: 'Relatórios & Métricas',
    icon: 'fa-chart-pie',
    color: '#34d399',
    summary: 'Dashboards analíticos de tempo de permanência, produtividade médica, estagnação de atendimento e faturamento.',
    roles: ['Master', 'Médico'],
    buttons: [
      {
        icon: 'fa-chart-column',
        name: '📈 Dashboard de Produtividade Médica',
        type: 'Métricas & Desempenho',
        color: '#3b82f6',
        description: 'Exibe o volume de consultas concluídas por médico, tempo médio de atendimento e diagnósticos mais frequentes.',
        shortcut: 'Aba Relatórios',
        rules: 'Permite filtrar por dia, semana ou mês.',
        keywords: ['produtividade médica', 'relatório de consultas', 'desempenho médico', 'métricas', 'produtividade colaborador']
      },
      {
        icon: 'fa-file-pdf',
        name: '📄 Exportar Relatório em PDF',
        type: 'Exportação / PDF',
        color: '#10b981',
        description: 'Gera documento gerencial impresso com gráficos e tabelas consolidadas.',
        shortcut: 'Botão Exportar PDF',
        rules: 'Gera arquivo formatado com cabeçalho oficial do hospital.',
        keywords: ['exportar pdf', 'imprimir relatório', 'baixar pdf', 'relatório impresso', 'gerar pdf']
      },
      {
        icon: 'fa-file-excel',
        name: '📊 Exportar Dados em Planilha (Excel / CSV)',
        type: 'Exportação de Dados',
        color: '#059669',
        description: 'Baixa todas as linhas brutas de atendimentos, faturas ou medicamentos em formato XLSX e CSV para análises avançadas.',
        shortcut: 'Botão Exportar Excel',
        rules: 'Compatível com Microsoft Excel, Google Sheets e PowerBI.',
        keywords: ['exportar excel', 'baixar planilha', 'exportar csv', 'tabela excel', 'dados brutos']
      }
    ],
    workflow: [
      { step: 1, title: 'Filtro', desc: 'Selecione o período desejado e o módulo de análise.' },
      { step: 2, title: 'Análise de Gargalos', desc: 'Verifique pacientes na Fila de Estagnação para remanejar equipes.' },
      { step: 3, title: 'Exportação', desc: 'Baixe o relatório gerencial em PDF ou Excel para reuniões de acompanhamento.' }
    ],
    faq: [
      { q: 'Como exportar relatórios para o Excel?', a: 'Na aba Relatórios, selecione a categoria desejada e clique em "Exportar Excel / CSV".' }
    ]
  },
  {
    id: 'configuracoes',
    title: 'Configurações & Turso Cloud DB',
    icon: 'fa-sliders',
    color: '#a5b4fc',
    summary: 'Administração de usuários, atribuição de senhas, controle de acessos RBAC e sincronização em nuvem.',
    roles: ['Master'],
    buttons: [
      {
        icon: 'fa-user-xmark',
        name: '🗑️ Excluir Usuário do Sistema (Lixeira)',
        type: 'Ação Crítica / Administração',
        color: '#ef4444',
        description: 'Remove um usuário de login do sistema através do ícone da Lixeira na lista de usuários. O sistema confirma a exclusão, remove do banco local e sincroniza a remoção com a nuvem Turso Cloud DB, retornando automaticamente à listagem geral de usuários.',
        shortcut: 'Ícone de Lixeira na lista de usuários (Configurações)',
        rules: 'Disponível apenas para o usuário Master. Não permite excluir o próprio usuário logado no momento.',
        keywords: ['excluir usuário', 'deletar usuário', 'remover usuário', 'apagar usuário', 'lixeira usuário', 'excluir usuario', 'deletar usuario', 'remover usuario', 'exclusao usuario', 'excluir login', 'excluir operador', 'excluir conta', 'desativar conta']
      },
      {
        icon: 'fa-users-gear',
        name: '👥 Gerenciar Usuários & Permissões (RBAC)',
        type: 'Administração & Segurança',
        color: '#6366f1',
        description: 'Abre o painel de criação e edição de usuários da clínica (Master, Médico, Enfermeiro, Recepcionista, Farmacêutico).',
        shortcut: 'Botão Gerenciar Usuários',
        rules: 'Apenas acessível pelo usuário Master (mazzarowysk).',
        keywords: ['gerenciar usuários', 'criar usuário', 'novo usuário', 'perfis', 'rbac', 'permissões', 'funções', 'cargo', 'adicionar usuário', 'cadastrar usuário', 'incluir usuário', 'cadastrar colaborador login']
      },
      {
        icon: 'fa-key',
        name: '🔑 Reset / Alteração de Senhas',
        type: 'Segurança',
        color: '#ec4899',
        description: 'Permite redefinir a senha de acesso de qualquer funcionário cadastrado no sistema.',
        shortcut: 'Ícone de Chave na lista de usuários',
        rules: 'A senha é criptografada e salva localmente e na nuvem Turso.',
        keywords: ['reset senha', 'alterar senha', 'mudar senha', 'esqueci a senha', 'redefinir senha', 'senha', 'trocar senha']
      },
      {
        icon: 'fa-cloud-arrow-up',
        name: '☁️ Sincronizar Agora (Turso Cloud)',
        type: 'Nuvem & Dados',
        color: '#10b981',
        description: 'Força o envio imediato de todas as tabelas locais (pacientes, atendimentos, leitos) para a nuvem Turso DB.',
        shortcut: 'Botão Sincronizar Agora',
        rules: 'Grava log da data e hora da última sincronização.',
        keywords: ['sincronizar', 'turso', 'nuvem', 'cloud', 'sync', 'enviar dados', 'salvar nuvem', 'backup nuvem']
      },
      {
        icon: 'fa-cloud-arrow-down',
        name: '📥 Restaurar do Banco da Nuvem',
        type: 'Restauração',
        color: '#f59e0b',
        description: 'Baixa o estado completo armazenado no Turso Cloud DB e substitui o banco local.',
        shortcut: 'Botão Restaurar do Banco',
        rules: 'Requer confirmação prévia para evitar perda de dados não sincronizados.',
        keywords: ['restaurar', 'backup', 'baixar nuvem', 'recuperar banco', 'reset banco']
      },
      {
        icon: 'fa-clock-rotate-left',
        name: '🛡️ Histórico de Auditoria de Acessos',
        type: 'Auditoria & Logs',
        color: '#8b5cf6',
        description: 'Exibe o registro histórico de logins de cada usuário com validação da data de criação da conta.',
        shortcut: 'Ícone de Escudo / Log',
        rules: 'Filtra e exclui acessos simulados anteriores à data de criação do cadastro.',
        keywords: ['auditoria', 'logs', 'acessos', 'histórico de login', 'auditar', 'quem acessou']
      }
    ],
    workflow: [
      { step: 1, title: 'Cadastro de Equipe', desc: 'Clique em Gerenciar Usuários e cadastre médicos e enfermeiros com seus respectivos papéis.' },
      { step: 2, title: 'Definição de Senhas', desc: 'Defina a senha inicial e informe ao usuário.' },
      { step: 3, title: 'Sincronização', desc: 'Clique em Sincronizar Agora para garantir que a equipe já esteja salva na nuvem Turso.' }
    ],
    faq: [
      { q: 'Como excluir um usuário do sistema?', a: 'Na aba Configurações, acesse "Gerenciar Usuários" e clique no ícone de 🗑️ Lixeira ao lado do usuário que deseja remover. A exclusão será sincronizada com a nuvem Turso.' },
      { q: 'Como recuperar a senha do usuário Master?', a: 'A senha do usuário master pode ser restaurada via console ou pelo script de credenciais oficiais do sistema.' }
    ]
  }
];

// ─── MOTOR DE BUSCA SEMÂNTICO (SEMANTIC SEARCH ENGINE) ───────────────────────

export const searchManualEngine = (rawQuery, currentUserRole = 'Master') => {
  const query = (rawQuery || '').trim();
  if (!query) {
    return {
      isSearching: false,
      buttonMatches: [],
      tabMatches: [],
      workflowMatches: [],
      faqMatches: [],
      aiCopilot: null
    };
  }

  const qNorm = removeAccents(query);
  const rawTokens = qNorm.split(/\s+/).filter(Boolean);
  const expandedTokens = expandQueryTokens(query);

  const isExcluirQuery = expandedTokens.some(t => SEMANTIC_SYNONYMS.excluir.includes(t));
  const isCadastrarQuery = expandedTokens.some(t => SEMANTIC_SYNONYMS.cadastrar.includes(t));
  const isEditarQuery = expandedTokens.some(t => SEMANTIC_SYNONYMS.editar.includes(t));

  const buttonMatches = [];

  manualData.forEach(module => {
    if (!module.buttons || !Array.isArray(module.buttons)) return;

    module.buttons.forEach(btn => {
      const nameNorm = removeAccents(btn.name);
      const descNorm = removeAccents(btn.description);
      const typeNorm = removeAccents(btn.type);
      const rulesNorm = removeAccents(btn.rules || '');
      const keywordsNorm = (btn.keywords || []).map(removeAccents);

      let score = 0;

      // 1. Match Exato no Nome (+400)
      if (nameNorm === qNorm) {
        score += 400;
      } else if (nameNorm.includes(qNorm)) {
        score += 280;
      }

      // 2. Match Exato ou Substring em Palavras-Chave (+300)
      keywordsNorm.forEach(kw => {
        if (kw === qNorm) {
          score += 320;
        } else if (kw.includes(qNorm) || qNorm.includes(kw)) {
          score += 220;
        }
      });

      // 3. Match de Tokens Diretos
      let directHits = 0;
      rawTokens.forEach(t => {
        if (nameNorm.includes(t) || keywordsNorm.some(k => k.includes(t))) {
          directHits++;
        }
      });
      if (rawTokens.length > 0 && directHits === rawTokens.length) {
        score += 180;
      } else {
        score += directHits * 50;
      }

      // 4. Expansão Semântica (Sinônimos e Derivações)
      let semanticHits = 0;
      expandedTokens.forEach(t => {
        if (nameNorm.includes(t) || keywordsNorm.some(k => k.includes(t))) {
          semanticHits++;
        }
      });
      score += semanticHits * 25;

      // 5. Impulso Especial para Intenção Ampla de Ação (ex: "excluir", "cadastrar", "editar")
      const isDeleteCard = btn.type.toLowerCase().includes('exclus') || btn.type.toLowerCase().includes('crítica') ||
                           nameNorm.includes('excluir') || nameNorm.includes('lixeira') || nameNorm.includes('cancelar') || nameNorm.includes('desativar') || nameNorm.includes('inativar') ||
                           keywordsNorm.some(k => k.includes('excluir') || k.includes('deletar') || k.includes('remover') || k.includes('inativar') || k.includes('lixeira'));

      const isCreateCard = btn.type.toLowerCase().includes('cadastr') || btn.type.toLowerCase().includes('escrita') ||
                           nameNorm.includes('novo') || nameNorm.includes('cadastrar') || nameNorm.includes('incluir') ||
                           keywordsNorm.some(k => k.includes('novo') || k.includes('cadastrar') || k.includes('incluir') || k.includes('adicionar'));

      const isEditCard = btn.type.toLowerCase().includes('edi') || btn.type.toLowerCase().includes('atualiz') ||
                         nameNorm.includes('editar') || nameNorm.includes('alterar') ||
                         keywordsNorm.some(k => k.includes('editar') || k.includes('alterar') || k.includes('atualizar'));

      if (isExcluirQuery && isDeleteCard) {
        score += 260;
      }
      if (isCadastrarQuery && isCreateCard) {
        score += 220;
      }
      if (isEditarQuery && isEditCard) {
        score += 220;
      }

      // 6. Match no Tipo da Funcionalidade (+60)
      if (typeNorm.includes(qNorm)) score += 70;

      // 7. Match na Descrição & Regras
      if (descNorm.includes(qNorm)) score += 40;
      if (rulesNorm.includes(qNorm)) score += 40;

      rawTokens.forEach(t => {
        if (descNorm.includes(t)) score += 8;
        if (rulesNorm.includes(t)) score += 8;
      });

      if (score > 0) {
        buttonMatches.push({
          ...btn,
          _moduleId: module.id,
          _moduleTitle: module.title,
          _moduleColor: module.color,
          _score: score,
          _isDelete: isDeleteCard,
          _isCreate: isCreateCard,
          _isEdit: isEditCard
        });
      }
    });
  });

  buttonMatches.sort((a, b) => b._score - a._score);

  // 2. Pesquisar Abas / Módulos
  const tabMatches = manualData.filter(m => {
    const titleNorm = removeAccents(m.title);
    const summaryNorm = removeAccents(m.summary);
    const idNorm = removeAccents(m.id);
    return titleNorm.includes(qNorm) || idNorm.includes(qNorm) || summaryNorm.includes(qNorm) ||
           expandedTokens.some(t => titleNorm.includes(t) || idNorm.includes(t));
  });

  // 3. Pesquisar FAQ / Dúvidas
  const faqMatches = [];
  manualData.forEach(module => {
    if (module.faq && Array.isArray(module.faq)) {
      module.faq.forEach(item => {
        const qNormStr = removeAccents(item.q);
        const aNormStr = removeAccents(item.a);

        let score = 0;
        if (qNormStr.includes(qNorm)) score += 250;
        if (aNormStr.includes(qNorm)) score += 80;

        expandedTokens.forEach(t => {
          if (qNormStr.includes(t)) score += 35;
          if (aNormStr.includes(t)) score += 15;
        });

        if (score > 30) {
          faqMatches.push({ item, module, score });
        }
      });
    }
  });
  faqMatches.sort((a, b) => b.score - a.score);

  // 4. Copilot Response
  const aiCopilot = getNexusAICopilotResponse(qNorm, rawQuery);

  return {
    isSearching: true,
    rawQuery,
    qNorm,
    buttonMatches,
    tabMatches,
    faqMatches,
    aiCopilot
  };
};

// ─── MAPEAMENTO DE ABAS E NAVEGAÇÃO ASSISTIDA DO MANUAL ──────────────────────

export const MODULE_TAB_MAP = {
  'geral': 'dashboard',
  'agenda': 'agenda',
  'recepcao': 'pacientes',
  'prontuario': 'atendimento',
  'tv': 'tv_panel',
  'estagnacao': 'estagnacao',
  'leitos': 'leitos',
  'kanban': 'kanban',
  'farmacia': 'farmacia',
  'financeiro': 'financeiro',
  'medicos': 'medicos',
  'consultorios': 'consultorios',
  'escalas': 'escalas',
  'relatorios': 'relatorios',
  'configuracoes': 'configuracoes'
};

let manualBeaconKeydownHandler = null;

export const hideManualReturnBeacon = () => {
  const existing = document.getElementById('hn-manual-return-beacon');
  if (existing) {
    existing.style.opacity = '0';
    existing.style.transform = 'translateY(20px) scale(0.95)';
    setTimeout(() => existing.remove(), 250);
  }
  if (manualBeaconKeydownHandler) {
    document.removeEventListener('keydown', manualBeaconKeydownHandler);
    manualBeaconKeydownHandler = null;
  }
};

export const showManualReturnBeacon = (navState) => {
  hideManualReturnBeacon();
  window.__nexusManualNavigationState = navState;

  const beacon = document.createElement('div');
  beacon.id = 'hn-manual-return-beacon';
  beacon.innerHTML = `
    <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; box-shadow: 0 0 14px rgba(124, 58, 237, 0.6);">
      <i class="fa-solid fa-book-bookmark"></i>
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px; max-width: 240px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 0.68rem; color: #a5b4fc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;">📌 Guia Interativo</span>
        <span style="font-size: 0.65rem; background: rgba(99, 102, 241, 0.25); color: #e0e7ff; padding: 1px 6px; border-radius: 6px; font-weight: 600;">Alt + M</span>
      </div>
      <strong style="color: #f8fafc; font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${navState.btnName || navState.moduleTitle}">
        ${navState.btnName || navState.moduleTitle}
      </strong>
    </div>
    <button id="btn-return-to-manual-beacon" style="
      background: linear-gradient(135deg, #6366f1, #7c3aed); color: #ffffff;
      border: 1px solid rgba(192, 132, 252, 0.4); border-radius: 10px;
      padding: 8px 14px; font-size: 0.8rem; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); white-space: nowrap;
    " onmouseover="this.style.filter='brightness(1.15)'" onmouseout="this.style.filter='none'">
      <i class="fa-solid fa-arrow-turn-down-left"></i> Voltar ao Manual
    </button>
    <button id="btn-close-manual-beacon" style="
      background: rgba(255, 255, 255, 0.08); border: none; color: #94a3b8;
      width: 26px; height: 26px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; font-size: 0.8rem;
      cursor: pointer; transition: all 0.2s ease; margin-left: 2px;
    " onmouseover="this.style.color='#fff'; this.style.background='rgba(239, 68, 68, 0.3)'" onmouseout="this.style.color='#94a3b8'; this.style.background='rgba(255, 255, 255, 0.08)'" title="Fechar Guia">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  document.body.appendChild(beacon);

  const handleReturn = () => {
    const st = window.__nexusManualNavigationState || navState;
    hideManualReturnBeacon();
    showInteractiveManualModal(st.moduleId, st.btnName, st.searchQuery);
  };

  beacon.querySelector('#btn-return-to-manual-beacon')?.addEventListener('click', handleReturn);
  beacon.querySelector('#btn-close-manual-beacon')?.addEventListener('click', () => {
    hideManualReturnBeacon();
  });

  manualBeaconKeydownHandler = (e) => {
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      handleReturn();
    }
  };
  document.addEventListener('keydown', manualBeaconKeydownHandler);
};

export const navigateFromManualToSystem = (moduleId, btnName = '', actionType = '') => {
  const mod = manualData.find(m => m.id === moduleId);
  const targetTab = MODULE_TAB_MAP[moduleId] || moduleId;

  // Fechar modais abertos do manual
  const openManualModal = document.getElementById('hn-interactive-manual-modal');
  if (openManualModal) openManualModal.remove();
  const openDetailModal = document.getElementById('hn-card-detail-modal');
  if (openDetailModal) openDetailModal.remove();

  // Executar navegação de aba no sistema
  if (typeof window.switchTab === 'function') {
    window.switchTab(targetTab);
  }

  // Executar ações contextuais se existirem
  if (actionType === 'openDoctorModal' || (btnName && (btnName.includes('Novo Médico') || btnName.includes('Novo Profissional')))) {
    setTimeout(() => { document.getElementById('btn-open-doctor-modal')?.click(); }, 350);
  } else if (actionType === 'openPatientModal' || (btnName && btnName.includes('Novo Paciente'))) {
    setTimeout(() => { document.getElementById('btn-open-patient-modal')?.click(); }, 350);
  }

  // Ativar beacon flutuante para retorno assistido
  showManualReturnBeacon({
    moduleId: moduleId || 'geral',
    moduleTitle: mod ? mod.title : 'Manual',
    btnName: btnName || (mod ? mod.title : 'Manual Interativo'),
    searchQuery: '',
    targetTab: targetTab
  });
};

// ─── COMPONENTE MODAL DE DETALHES DO CARD (POPUP EXPANDIDO) ───────────────────

export const showCardDetailModal = (buttonItem, moduleItem) => {
  const existing = document.getElementById('hn-card-detail-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-card-detail-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(5, 7, 15, 0.85);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    z-index: 1000000; display: flex; align-items: center; justify-content: center;
    padding: 20px; font-family: system-ui, -apple-system, sans-serif;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes hnPopIn {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes hnFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
    <div style="
      background: linear-gradient(145deg, #0f172a, #090d16);
      border: 2px solid ${buttonItem.color}; border-radius: 20px;
      width: 92%; max-width: 680px; max-height: 85vh; overflow-y: auto;
      padding: 28px; display: flex; flex-direction: column; gap: 20px;
      box-shadow: 0 0 45px ${buttonItem.color}55, 0 25px 50px -12px rgba(0,0,0,0.85);
      animation: hnPopIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative; scrollbar-width: thin;
    ">
      <!-- BOTÃO FECHAR -->
      <button id="card-detail-close-btn" style="
        position: absolute; top: 20px; right: 20px;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
        color: #94a3b8; width: 38px; height: 38px; border-radius: 10px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
        transition: all 0.2s;
      " onmouseover="this.style.color='#fff'; this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.color='#94a3b8'; this.style.background='rgba(255,255,255,0.06)'">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- CABEÇALHO DO CARD EXPANDIDO -->
      <div style="display: flex; align-items: center; gap: 16px; padding-right: 40px;">
        <div style="
          width: 58px; height: 58px; border-radius: 14px; background: ${buttonItem.color}22;
          border: 2px solid ${buttonItem.color}; display: flex; align-items: center;
          justify-content: center; font-size: 1.8rem; color: ${buttonItem.color};
          box-shadow: 0 0 20px ${buttonItem.color}66; flex-shrink: 0;
        ">
          <i class="fa-solid ${buttonItem.icon}"></i>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
            <span style="background: ${buttonItem.color}; color: #0f172a; font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 800; text-transform: uppercase;">
              ${buttonItem.type}
            </span>
            <span style="background: rgba(255,255,255,0.08); color: #94a3b8; font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 600;">
              📌 Aba: ${moduleItem ? moduleItem.title : 'Sistema'}
            </span>
          </div>
          <h3 style="color: #f8fafc; font-size: 1.35rem; font-weight: 800; margin: 0; line-height: 1.3;">
            ${buttonItem.name}
          </h3>
        </div>
      </div>

      <!-- SEÇÃO 1: DESCRIÇÃO DETALHADA -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px;">
        <h4 style="color: #38bdf8; font-size: 0.92rem; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-circle-info"></i> O que esta funcionalidade faz em detalhes:
        </h4>
        <p style="color: #cbd5e1; font-size: 0.98rem; line-height: 1.6; margin: 0;">
          ${buttonItem.description}
        </p>
      </div>

      <!-- SEÇÃO 2: ATALHO & REGRAS DE NEGÓCIO -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
          <h5 style="color: #a5b4fc; font-size: 0.85rem; font-weight: 700; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-keyboard"></i> Atalho / Onde Clicar
          </h5>
          <p style="color: #f8fafc; font-size: 0.9rem; font-weight: 600; margin: 0;">${buttonItem.shortcut || 'Disponível na barra principal'}</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
          <h5 style="color: #f59e0b; font-size: 0.85rem; font-weight: 700; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-shield-halved"></i> Regras & Segurança
          </h5>
          <p style="color: #f8fafc; font-size: 0.88rem; margin: 0;">${buttonItem.rules || 'Validação padrão de permissões.'}</p>
        </div>
      </div>

      <!-- SEÇÃO 3: PERFIS PERMITIDOS -->
      ${moduleItem && moduleItem.roles ? `
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
          <h5 style="color: #94a3b8; font-size: 0.85rem; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-user-gear"></i> Perfis Autorizados a Usar:
          </h5>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${moduleItem.roles.map(r => `<span style="font-size: 0.78rem; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 3px 12px; border-radius: 12px; font-weight: 700;">${r}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- SEÇÃO 4: FLUXO DE EXECUÇÃO EM TEMPO REAL -->
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 14px;">
        <h5 style="color: #34d399; font-size: 0.85rem; font-weight: 700; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-cloud-check"></i> Sincronização & Tempo Real:
        </h5>
        <p style="color: #cbd5e1; font-size: 0.88rem; margin: 0; line-height: 1.5;">
          Ao clicar no botão <strong>${buttonItem.name}</strong> no módulo <strong>${moduleItem ? moduleItem.title : 'Sistema'}</strong>, as informações são imediatamente gravadas no banco de dados local e replicadas via Turso Cloud na nuvem.
        </p>
      </div>

      <!-- RODAPÉ COM BOTÃO DE IR PARA A TELA (PRATICAR AÇÃO) -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap;">
        <button id="card-detail-navigate-btn" style="
          padding: 10px 20px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669);
          color: #fff; font-weight: 700; font-size: 0.9rem; display: inline-flex; align-items: center;
          gap: 8px; cursor: pointer; border: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
          transition: all 0.2s;
        " onmouseover="this.style.filter='brightness(1.15)'" onmouseout="this.style.filter='none'">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Ir para a Tela & Praticar (Navegar)
        </button>

        <button id="card-detail-close-btn-footer" style="
          padding: 10px 22px; border-radius: 10px; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12); color: #e2e8f0; font-weight: 600; font-size: 0.9rem;
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
          <i class="fa-solid fa-xmark"></i> Fechar Detalhes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const handleClose = (e) => {
    if (e.target.id === 'card-detail-close-btn' || e.target.closest('#card-detail-close-btn') || e.target.id === 'card-detail-close-btn-footer' || e.target === overlay) {
      overlay.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };

  const handleNavigate = () => {
    navigateFromManualToSystem(moduleItem ? moduleItem.id : 'geral', buttonItem.name);
  };

  overlay.querySelector('#card-detail-navigate-btn')?.addEventListener('click', handleNavigate);

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };

  overlay.addEventListener('click', handleClose);
  document.addEventListener('keydown', handleEsc);
};

// ─── COMPONENTE MODAL / RENDERIZADOR DO MANUAL INTERATIVO ────────────────────

export const showInteractiveManualModal = (initialTabId = 'geral', targetBtnName = null, initialSearchQuery = '') => {
  const existing = document.getElementById('hn-interactive-manual-modal');
  if (existing) existing.remove();

  // Se passou targetBtnName mas não encontrou tabId, tenta localizar o módulo
  if (targetBtnName && (!initialTabId || initialTabId === 'geral')) {
    for (const m of manualData) {
      if (m.buttons && m.buttons.some(b => b.name === targetBtnName)) {
        initialTabId = m.id;
        break;
      }
    }
  }

  let activeTabId = initialTabId || 'geral';
  let searchQuery = initialSearchQuery || '';

  const overlay = document.createElement('div');
  overlay.id = 'hn-interactive-manual-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(5, 7, 15, 0.88);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    z-index: 999999; display: flex; align-items: center; justify-content: center;
    padding: 20px; font-family: system-ui, -apple-system, sans-serif;
  `;

  let currentUserRole = 'Master';
  try {
    const storedUser = JSON.parse(sessionStorage.getItem('hn_user'));
    if (storedUser && storedUser.role) currentUserRole = storedUser.role;
  } catch(e) {}

  const renderModalContent = () => {
    const currentIndex = manualData.findIndex(m => m.id === activeTabId);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const activeData = manualData[validIndex];

    const prevIndex = validIndex > 0 ? validIndex - 1 : -1;
    const nextIndex = validIndex < manualData.length - 1 ? validIndex + 1 : -1;

    const searchResult = searchManualEngine(searchQuery, currentUserRole);
    const isSearching = searchResult.isSearching;
    const filteredButtons = isSearching ? searchResult.buttonMatches : activeData.buttons;

    let aiResponseHtml = '';
    if (isSearching && searchResult.aiCopilot) {
      const aiCopilot = searchResult.aiCopilot;
      
      const targetTab = manualData.find(m => m.id === aiCopilot.actionTarget) || manualData[0];
      const targetRoles = targetTab.roles || [];
      const isMaster = currentUserRole === 'Master' || currentUserRole === 'Administrador';
      const hasAccess = isMaster || targetRoles.includes(currentUserRole);

      if (hasAccess) {
        aiResponseHtml = `
          <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(79, 70, 229, 0.1)); border: 1px solid rgba(167, 139, 250, 0.35); border-radius: 14px; padding: 16px; display: flex; gap: 14px; animation: hnFadeIn 0.35s ease; margin-bottom: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; box-shadow: 0 0 16px rgba(124, 58, 237, 0.6);">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                <h5 style="color: #c4b5fd; font-size: 0.98rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 6px;">
                  ${aiCopilot.title}
                </h5>
                <span style="font-size: 0.68rem; background: rgba(124, 58, 237, 0.3); color: #ddd6fe; border: 1px solid rgba(167, 139, 250, 0.4); padding: 2px 8px; border-radius: 10px; font-weight: 700;">
                  IA Ativa
                </span>
              </div>
              <p style="color: #f1f5f9; font-size: 0.88rem; margin: 0; line-height: 1.55;">
                ${aiCopilot.summary}
              </p>
              ${aiCopilot.actionTarget ? `
                <div style="margin-top: 10px; display: flex; gap: 8px;">
                  <button class="manual-nav-tab" data-tab="${aiCopilot.actionTarget}" style="background: #7c3aed; color: white; border: none; padding: 7px 14px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4); transition: all 0.2s;" onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
                    ${aiCopilot.actionText || 'Ver no Manual ➔'}
                  </button>
                  <button class="manual-direct-sys-nav" data-target-tab="${aiCopilot.actionTarget}" data-action-type="${aiCopilot.actionType || ''}" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; padding: 7px 14px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Tela do Sistema ➔
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    }

    const navTabsHtml = manualData.map((m, idx) => {
      const isActive = m.id === activeTabId;
      if (isActive) {
        return `
          <button class="manual-nav-tab active" data-tab="${m.id}" style="
            display: flex; align-items: center; gap: 9px; padding: 10px 18px;
            border-radius: 12px; border: 2px solid ${m.color};
            background: linear-gradient(135deg, ${m.color}EE, #4f46e5);
            color: #ffffff; font-weight: 700; cursor: pointer; transition: all 0.25s ease;
            white-space: nowrap; font-size: 0.9rem;
            box-shadow: 0 0 20px ${m.color}77, inset 0 1px 0 rgba(255,255,255,0.4);
            transform: translateY(-1px); flex-shrink: 0;
          ">
            <span style="font-size: 0.75rem; background: #ffffff; color: #0f172a; padding: 2px 8px; border-radius: 10px; font-weight: 800;">
              ${idx + 1}
            </span>
            <i class="fa-solid ${m.icon}" style="color: #ffffff; font-size: 1.05rem;"></i>
            <span style="letter-spacing: 0.3px;">${m.title}</span>
            <span style="font-size: 0.65rem; background: rgba(0,0,0,0.35); color: #fff; padding: 2px 7px; border-radius: 12px; font-weight: 700; text-transform: uppercase; margin-left: 4px; border: 1px solid rgba(255,255,255,0.3);">
              ● ATIVO
            </span>
          </button>
        `;
      } else {
        return `
          <button class="manual-nav-tab" data-tab="${m.id}" style="
            display: flex; align-items: center; gap: 8px; padding: 9px 14px;
            border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03); color: #94a3b8; font-weight: 500;
            cursor: pointer; transition: all 0.2s ease; white-space: nowrap; font-size: 0.86rem;
            opacity: 0.82; flex-shrink: 0;
          " onmouseover="this.style.opacity='1'; this.style.borderColor='${m.color}'; this.style.background='rgba(255,255,255,0.07)'" onmouseout="this.style.opacity='0.82'; this.style.borderColor='rgba(255,255,255,0.08)'; this.style.background='rgba(255,255,255,0.03)'">
            <span style="font-size: 0.7rem; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 6px; color: ${m.color}; font-weight: 600;">
              ${idx + 1}
            </span>
            <i class="fa-solid ${m.icon}" style="color: ${m.color}; font-size: 0.95rem;"></i>
            <span>${m.title}</span>
          </button>
        `;
      }
    }).join('');

    const buttonsCardsHtml = filteredButtons.length > 0 ? filteredButtons.map(b => `
      <div class="manual-button-card" data-btn-name="${encodeURIComponent(b.name)}" data-module-id="${b._moduleId || activeTabId}" style="
        background: rgba(15, 23, 42, 0.65); border: 1px solid ${b._isDelete ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)'};
        border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; cursor: pointer;
      " onmouseover="this.style.borderColor='${b.color}'; this.style.transform='translateY(-3px) scale(1.008)'; this.style.boxShadow='0 8px 24px ${b.color}33'" onmouseout="this.style.borderColor='${b._isDelete ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)'}'; this.style.transform='none'; this.style.boxShadow='none'">
        
        <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${b.color};"></div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-left: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: ${b.color}22; border: 1px solid ${b.color}44; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i class="fa-solid ${b.icon}" style="color: ${b.color}; font-size: 1.15rem;"></i>
            </div>
            <strong style="color: #f8fafc; font-size: 1.02rem;">${b.name}</strong>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: ${b._isDelete ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)'}; color: ${b._isDelete ? '#f87171' : b.color}; font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 700; text-transform: uppercase; border: 1px solid ${b._isDelete ? 'rgba(239, 68, 68, 0.3)' : 'transparent'};">
              ${b.type}
            </span>
            <span style="font-size: 0.72rem; color: #a5b4fc; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); padding: 3px 10px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i> Detalhes & Navegar
            </span>
          </div>
        </div>

        <p style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.5; margin: 0; padding-left: 8px;">
          ${b.description}
        </p>

        <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.78rem; color: #94a3b8; padding-left: 8px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
          <div><i class="fa-solid fa-keyboard" style="color: #a5b4fc; margin-right: 5px;"></i> <strong>Atalho:</strong> ${b.shortcut}</div>
          ${b.rules ? `<div><i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; margin-right: 5px;"></i> <strong>Regra:</strong> ${b.rules}</div>` : ''}
        </div>
        ${isSearching && b._moduleTitle ? `<div style="padding-left: 8px; margin-top: 4px; color: ${b.color}; font-size: 0.78rem; font-weight: 600;"><i class="fa-solid fa-folder-open" style="margin-right: 4px;"></i> Encontrado em: ${b._moduleTitle}</div>` : ''}
      </div>
    `).join('') : `
      <div style="text-align: center; padding: 30px; color: #94a3b8; width: 100%;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
        <p>Nenhuma funcionalidade encontrada para "<strong>${searchQuery}</strong>".</p>
      </div>
    `;

    const workflowStepsHtml = activeData.workflow.map(w => `
      <div style="display: flex; gap: 14px; align-items: flex-start;">
        <div style="
          width: 32px; height: 32px; border-radius: 50%; background: ${activeData.color};
          color: #0f172a; font-weight: 700; display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; flex-shrink: 0; box-shadow: 0 0 12px ${activeData.color}66;
        ">
          ${w.step}
        </div>
        <div style="flex: 1;">
          <h5 style="color: #f8fafc; font-size: 0.95rem; margin: 0 0 4px 0;">${w.title}</h5>
          <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.4; margin: 0;">${w.desc}</p>
        </div>
      </div>
    `).join('');

    const faqHtml = activeData.faq ? activeData.faq.map(f => `
      <details style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
        <summary style="color: #38bdf8; font-weight: 600; font-size: 0.88rem; cursor: pointer;">
          ❓ ${f.q}
        </summary>
        <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.5; margin-top: 8px; margin-bottom: 0;">
          ${f.a}
        </p>
      </details>
    `).join('') : '';

    const tabsHeaderHtml = `
      <button id="manual-tab-prev-btn" ${prevIndex === -1 ? 'disabled style="opacity:0.4; cursor:not-allowed; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; border-radius:8px; padding:8px 12px; font-size:0.8rem;"' : 'style="background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:#a5b4fc; border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.82rem; font-weight:600;"'}>
        <i class="fa-solid fa-chevron-left"></i> Anterior
      </button>

      <div id="manual-tabs-nav-container" style="
        flex: 1; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: thin;
        scroll-behavior: smooth; padding: 4px 0;
      ">
        ${navTabsHtml}
      </div>

      <button id="manual-tab-next-btn" ${nextIndex === -1 ? 'disabled style="opacity:0.4; cursor:not-allowed; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; border-radius:8px; padding:8px 12px; font-size:0.8rem;"' : 'style="background:linear-gradient(135deg, rgba(99,102,241,0.35), rgba(168,85,247,0.3)); border:1px solid rgba(168,85,247,0.5); color:#f3e8ff; border-radius:8px; padding:8px 14px; display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; font-size:0.82rem;"'}>
        Próxima <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    const bodyHtml = `
      <!-- COLUNA ESQUERDA: LISTA DE BOTÕES & FUNCIONALIDADES -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- BANNER DA ABA COM TAG DE DESTAQUE DA ABA ATIVA -->
        <div style="
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95));
          border: 2px solid ${activeData.color}; border-radius: 14px; padding: 18px;
          display: flex; align-items: center; gap: 16px; position: relative;
          box-shadow: 0 0 20px ${activeData.color}33;
        ">
          <div style="
            width: 54px; height: 54px; border-radius: 12px; background: ${activeData.color};
            display: flex; align-items: center; justify-content: center; font-size: 1.7rem; color: #0f172a;
            box-shadow: 0 0 14px ${activeData.color}aa; font-weight: 700; flex-shrink: 0;
          ">
            <i class="fa-solid ${activeData.icon}"></i>
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;">
              <span style="font-size: 0.72rem; background: ${activeData.color}; color: #0f172a; padding: 3px 10px; border-radius: 20px; font-weight: 800; text-transform: uppercase;">
                📌 MÓDULO ${validIndex + 1} DE ${manualData.length} (EM CONSULTA)
              </span>
              <h4 style="color: #f8fafc; font-size: 1.2rem; font-weight: 800; margin: 0;">${activeData.title}</h4>
            </div>
            <p style="color: #cbd5e1; font-size: 0.88rem; margin: 0 0 8px 0; line-height: 1.4;">${activeData.summary}</p>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">Perfis Autorizados:</span>
              ${activeData.roles.map(r => `<span style="font-size: 0.68rem; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); padding: 2px 8px; border-radius: 10px; font-weight: 600;">${r}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- TÍTULO DA SEÇÃO DE BOTÕES -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
          <h5 style="color: #e2e8f0; font-size: 0.95rem; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-sliders" style="color: ${activeData.color};"></i>
            Mapeamento Completo de Botões & Ações (${filteredButtons.length})
          </h5>
          <span style="font-size: 0.78rem; color: #64748b;">Clique para ver detalhes ou navegar</span>
        </div>

        <!-- CARDS DE BOTÕES -->
        <div id="manual-buttons-list-container" style="display: flex; flex-direction: column; gap: 12px;">
          ${aiResponseHtml}
          ${buttonsCardsHtml}
        </div>
      </div>

      <!-- COLUNA DIREITA: FLUXO PASSO A PASSO & FAQ -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- CARD DE FLUXO RECOMENDADO -->
        <div style="
          background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 16px;
        ">
          <h5 style="color: #f8fafc; font-size: 0.95rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-diagram-project" style="color: #38bdf8;"></i>
            Fluxo Operacional Passo a Passo
          </h5>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${workflowStepsHtml}
          </div>
        </div>

        <!-- CARD DE FAQ DA ABA -->
        ${faqHtml ? `
          <div style="
            background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px;
          ">
            <h5 style="color: #f8fafc; font-size: 0.95rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-circle-question" style="color: #f59e0b;"></i>
              Dúvidas Frequentes do Módulo
            </h5>
            ${faqHtml}
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('manual-tabs-header-container').innerHTML = tabsHeaderHtml;
    document.getElementById('manual-content-body-container').innerHTML = bodyHtml;

    // Se houver um targetBtnName para destacar
    if (targetBtnName) {
      setTimeout(() => {
        const matchingCard = overlay.querySelector(`[data-btn-name="${encodeURIComponent(targetBtnName)}"]`);
        if (matchingCard) {
          matchingCard.classList.add('hn-manual-highlight-pulse');
          matchingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  overlay.innerHTML = `
    <div style="
      background: #090d16; border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px; width: 95%; max-width: 1150px; height: 90vh;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    ">
      <!-- HEADER DO MODAL -->
      <div style="
        padding: 18px 24px; background: rgba(15, 23, 42, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #3b82f6);
            display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.3rem; flex-shrink: 0;
          ">
            <i class="fa-solid fa-book-bookmark"></i>
          </div>
          <div>
            <h3 style="color: #f8fafc; font-size: 1.25rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 10px;">
              Manual Interativo do Usuário
              <span style="font-size: 0.75rem; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 2px 8px; border-radius: 12px;">v2.7.0 Navegação Assistida</span>
            </h3>
            <p style="color: #94a3b8; font-size: 0.82rem; margin: 2px 0 0 0;">
              Documentação exaustiva de cada funcionalidade, botão e regra de negócio por módulo
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="manual-search-wrapper" style="position: relative; width: 380px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.85rem; z-index: 2;"></i>
            <input type="text" id="manual-modal-search" placeholder="Buscar (ex: excluir paciente, colaborador, receita)..." value="${searchQuery}" autocomplete="off" style="
              width: 100%; padding: 8px 12px 8px 34px; background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f8fafc;
              font-size: 0.85rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;
            " onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
            
            <!-- Dropdown de Resultados da Busca em Tempo Real -->
            <div id="manual-search-dropdown-results" style="
              position: absolute; top: calc(100% + 8px); right: 0; width: 480px; max-width: 90vw;
              background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 14px; max-height: 460px;
              overflow-y: auto; z-index: 1000005; display: none; padding: 12px;
              box-shadow: 0 20px 45px rgba(0,0,0,0.85); scrollbar-width: thin;
            ">
            </div>
          </div>
          <button id="manual-modal-close" style="
            background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
            color: #94a3b8; width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
            transition: all 0.2s;
          " onmouseover="this.style.color='#fff'; this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.color='#94a3b8'; this.style.background='rgba(255,255,255,0.06)'">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- BARRA DE NAVEGAÇÃO DE ABAS COM BOTÕES EXPLICITOS DE AVANÇO -->
      <div id="manual-tabs-header-container" style="
        padding: 10px 18px; background: rgba(15, 23, 42, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex; align-items: center; gap: 8px; position: relative;
      ">
      </div>

      <!-- CORPO PRINCIPAL DO MANUAL -->
      <div id="manual-content-body-container" style="
        flex: 1; overflow-y: auto; padding: 24px; display: grid;
        grid-template-columns: 2.2fr 1fr; gap: 24px; scrollbar-width: thin;
      ">
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const updateManualSearchDropdown = () => {
    const searchDropdown = overlay.querySelector('#manual-search-dropdown-results');
    if (!searchDropdown) return;

    const rawQuery = searchQuery.trim();
    if (!rawQuery) {
      searchDropdown.style.display = 'none';
      searchDropdown.innerHTML = '';
      return;
    }

    const searchResult = searchManualEngine(rawQuery, currentUserRole);
    const { buttonMatches, tabMatches, faqMatches } = searchResult;

    if (buttonMatches.length === 0 && tabMatches.length === 0 && faqMatches.length === 0) {
      searchDropdown.innerHTML = `
        <div style="text-align: center; padding: 20px 10px; color: #94a3b8;">
          <i class="fa-solid fa-magnifying-glass" style="font-size: 1.6rem; margin-bottom: 8px; opacity: 0.5;"></i>
          <p style="font-size: 0.84rem; margin: 0;">Nenhuma correspondência direta para "<strong>${rawQuery}</strong>".</p>
        </div>
      `;
      searchDropdown.style.display = 'block';
      return;
    }

    let html = '';

    // Renderizar Funcionalidades
    if (buttonMatches.length > 0) {
      const isDeleteSearch = buttonMatches.some(b => b._isDelete);
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: ${isDeleteSearch ? '#f87171' : '#10b981'}; letter-spacing: 0.5px; padding: 4px 8px 6px 8px; display: flex; align-items: center; justify-content: space-between;">
        <span>${isDeleteSearch ? '🗑️ Ações & Opções de Exclusão' : '⚙️ Funcionalidades Correspondentes'} (${buttonMatches.length})</span>
        <span style="font-size: 0.65rem; color: #64748b; font-weight: 500;">Relevância Alta</span>
      </div>`;

      buttonMatches.slice(0, 10).forEach(btn => {
        html += `
          <div class="manual-dropdown-item" data-type="btn" data-module-id="${btn._moduleId}" data-btn-name="${encodeURIComponent(btn.name)}" style="
            padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(15, 23, 42, 0.75); margin-bottom: 6px; border: 1px solid ${btn._isDelete ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)'};
          " onmouseover="this.style.background='${btn._isDelete ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.22)'}'; this.style.borderColor='${btn.color}'" onmouseout="this.style.background='rgba(15, 23, 42, 0.75)'; this.style.borderColor='${btn._isDelete ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)'}'">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="color: #ffffff; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid ${btn.icon}" style="color: ${btn.color}; font-size: 0.95rem;"></i>
                ${btn.name}
              </strong>
              <span style="font-size: 0.65rem; background: rgba(255,255,255,0.08); color: ${btn._moduleColor || '#818cf8'}; padding: 3px 8px; border-radius: 8px; font-weight: 700;">
                ${btn._moduleTitle}
              </span>
            </div>
            <p style="color: #cbd5e1; font-size: 0.78rem; margin: 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${btn.description}
            </p>
          </div>
        `;
      });
    }

    // Renderizar Módulos
    if (tabMatches.length > 0) {
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #818cf8; letter-spacing: 0.5px; padding: 10px 8px 4px 8px;">📌 Módulos (${tabMatches.length})</div>`;
      tabMatches.slice(0, 5).forEach(mod => {
        html += `
          <div class="manual-dropdown-item" data-type="tab" data-module-id="${mod.id}" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 9px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(255,255,255,0.03); margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.05);
          " onmouseover="this.style.background='rgba(99, 102, 241, 0.25)'; this.style.borderColor='rgba(129, 140, 248, 0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.05)'">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid ${mod.icon}" style="color: ${mod.color}; font-size: 0.95rem;"></i>
              <span style="font-weight: 700; color: #f8fafc; font-size: 0.86rem;">${mod.title}</span>
            </div>
            <span style="font-size: 0.68rem; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 3px 9px; border-radius: 10px; font-weight: 700;">Ver Módulo ➔</span>
          </div>
        `;
      });
    }

    // Renderizar Dúvidas FAQ
    if (faqMatches.length > 0) {
      html += `<div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.5px; padding: 10px 8px 4px 8px;">❓ Dúvidas Frequentes (${faqMatches.length})</div>`;
      faqMatches.slice(0, 4).forEach(({ item, module }) => {
        html += `
          <div class="manual-dropdown-item" data-type="faq" data-module-id="${module.id}" style="
            padding: 9px 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;
            background: rgba(255,255,255,0.03); margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.05);
          " onmouseover="this.style.background='rgba(245, 158, 11, 0.2)'; this.style.borderColor='rgba(245, 158, 11, 0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.05)'">
            <strong style="color: #f8fafc; font-size: 0.84rem; display: block; margin-bottom: 2px;">❓ ${item.q}</strong>
            <p style="color: #94a3b8; font-size: 0.76rem; margin: 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.a}</p>
          </div>
        `;
      });
    }

    searchDropdown.innerHTML = html;
    searchDropdown.style.display = 'block';
  };

  const searchInputEl = overlay.querySelector('#manual-modal-search');
  if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      updateManualSearchDropdown();
      renderModalContent();
    });
    searchInputEl.addEventListener('focus', () => {
      if (searchQuery.trim().length > 0) {
        updateManualSearchDropdown();
      }
    });
  }

  renderModalContent();

  setTimeout(() => {
    const activeTabEl = overlay.querySelector('.manual-nav-tab.active');
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 50);

  overlay.addEventListener('click', (e) => {
    const directSysNav = e.target.closest('.manual-direct-sys-nav');
    if (directSysNav) {
      const tgtTab = directSysNav.dataset.targetTab;
      const actType = directSysNav.dataset.actionType;
      navigateFromManualToSystem(tgtTab, '', actType);
      return;
    }

    const dropdownItem = e.target.closest('.manual-dropdown-item');
    if (dropdownItem) {
      const type = dropdownItem.dataset.type;
      const moduleId = dropdownItem.dataset.moduleId;
      const dropdownEl = overlay.querySelector('#manual-search-dropdown-results');
      if (dropdownEl) dropdownEl.style.display = 'none';

      if (type === 'btn') {
        const btnName = decodeURIComponent(dropdownItem.dataset.btnName || '');
        const modData = manualData.find(m => m.id === moduleId);
        const foundBtn = modData ? modData.buttons.find(b => b.name === btnName) : null;
        if (foundBtn) {
          showCardDetailModal(foundBtn, modData);
        }
      } else if (type === 'tab' || type === 'faq') {
        activeTabId = moduleId;
        searchQuery = '';
        if (searchInputEl) searchInputEl.value = '';
        renderModalContent();
      }
      return;
    }

    if (!e.target.closest('.manual-search-wrapper')) {
      const dropdownEl = overlay.querySelector('#manual-search-dropdown-results');
      if (dropdownEl) dropdownEl.style.display = 'none';
    }

    const btnCard = e.target.closest('.manual-button-card');
    if (btnCard) {
      const btnName = decodeURIComponent(btnCard.dataset.btnName || '');
      const moduleId = btnCard.dataset.moduleId || activeTabId;
      const modData = manualData.find(m => m.id === moduleId);
      const foundBtn = modData ? modData.buttons.find(b => b.name === btnName) : null;
      if (foundBtn) {
        showCardDetailModal(foundBtn, modData);
        return;
      }
    }

    const tabBtn = e.target.closest('.manual-nav-tab');
    if (tabBtn) {
      const target = tabBtn.dataset.tab;
      if (target) {
        activeTabId = target;
        renderModalContent();
        setTimeout(() => {
          const newActive = overlay.querySelector('.manual-nav-tab.active');
          if (newActive) newActive.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 50);
      }
      return;
    }

    const btnPrev = e.target.closest('#manual-tab-prev-btn');
    if (btnPrev) {
      const cIndex = manualData.findIndex(m => m.id === activeTabId);
      if (cIndex > 0) {
        activeTabId = manualData[cIndex - 1].id;
        renderModalContent();
        setTimeout(() => {
          const newActive = overlay.querySelector('.manual-nav-tab.active');
          if (newActive) newActive.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 50);
      }
      return;
    }

    const btnNext = e.target.closest('#manual-tab-next-btn');
    if (btnNext) {
      const cIndex = manualData.findIndex(m => m.id === activeTabId);
      if (cIndex < manualData.length - 1) {
        activeTabId = manualData[cIndex + 1].id;
        renderModalContent();
        setTimeout(() => {
          const newActive = overlay.querySelector('.manual-nav-tab.active');
          if (newActive) newActive.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 50);
      }
      return;
    }

    if (e.target.id === 'manual-modal-close' || e.target.closest('#manual-modal-close') || e.target === overlay) {
      overlay.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      const detailModal = document.getElementById('hn-card-detail-modal');
      if (!detailModal) {
        overlay.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    }
  };
  document.addEventListener('keydown', handleEsc);
};

// ─── EMBEDDED MANUAL TABBED VIEW ─────────────────────────────────────────────

export const renderEmbeddedTabbedManual = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  let currentTabId = 'geral';

  const updateEmbeddedView = () => {
    const currentIndex = manualData.findIndex(m => m.id === currentTabId);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const active = manualData[validIndex];

    const prevIndex = validIndex > 0 ? validIndex - 1 : -1;
    const nextIndex = validIndex < manualData.length - 1 ? validIndex + 1 : -1;

    const tabsHeaderHtml = manualData.map((m, idx) => {
      const isActive = m.id === currentTabId;
      if (isActive) {
        return `
          <button class="emb-tab-btn active" data-tab="${m.id}" style="
            padding: 8px 16px; border-radius: 8px; border: 2px solid ${m.color};
            background: linear-gradient(135deg, ${m.color}DD, #4f46e5); color: #fff;
            font-size: 0.84rem; font-weight: 700; cursor: pointer; display: inline-flex;
            align-items: center; gap: 6px; white-space: nowrap; transition: all 0.2s;
            box-shadow: 0 0 12px ${m.color}66; flex-shrink: 0;
          ">
            <span style="font-size: 0.7rem; background: #fff; color: #0f172a; padding: 1px 6px; border-radius: 6px; font-weight: 800;">${idx + 1}</span>
            <i class="fa-solid ${m.icon}"></i>
            <span>${m.title}</span>
            <span style="font-size: 0.6rem; background: rgba(0,0,0,0.3); color: #fff; padding: 1px 5px; border-radius: 8px; font-weight: 700;">● ATIVO</span>
          </button>
        `;
      } else {
        return `
          <button class="emb-tab-btn" data-tab="${m.id}" style="
            padding: 7px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 0.82rem; font-weight: 500;
            cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
            transition: all 0.2s; opacity: 0.85; flex-shrink: 0;
          ">
            <span style="font-size: 0.68rem; color: ${m.color}; font-weight: 700;">${idx + 1}</span>
            <i class="fa-solid ${m.icon}" style="color: ${m.color};"></i>
            <span>${m.title}</span>
          </button>
        `;
      }
    }).join('');

    const buttonsListHtml = active.buttons.map(b => `
      <div class="emb-manual-card" data-btn-name="${encodeURIComponent(b.name)}" style="
        background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer;
        transition: all 0.2s ease; position: relative;
      " onmouseover="this.style.borderColor='${b.color}'; this.style.transform='translateY(-2px)'; this.style.background='rgba(15, 23, 42, 0.75)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'; this.style.transform='none'; this.style.background='rgba(15, 23, 42, 0.5)'">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="color: #f8fafc; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid ${b.icon}" style="color: ${b.color};"></i>
            ${b.name}
          </strong>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.68rem; background: rgba(255,255,255,0.08); color: ${b.color}; padding: 2px 8px; border-radius: 10px; font-weight: 600;">
              ${b.type}
            </span>
          </div>
        </div>
        <p style="color: #cbd5e1; font-size: 0.82rem; line-height: 1.4; margin: 0 0 6px 0;">${b.description}</p>
        <div style="font-size: 0.74rem; color: #94a3b8; display: flex; gap: 12px; flex-wrap: wrap;">
          <span>⌨️ <strong>Atalho:</strong> ${b.shortcut}</span>
          ${b.rules ? `<span>⚠️ <strong>Regra:</strong> ${b.rules}</span>` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-top: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <h4 style="color: #f8fafc; font-size: 0.95rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-layer-group" style="color: #a5b4fc;"></i>
            Navegação por Abas do Sistema
          </h4>
          <button id="btn-open-full-manual-modal" class="btn btn-primary" style="font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <i class="fa-solid fa-expand"></i> Abrir Manual Interativo Completo
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <button id="emb-prev-btn" ${prevIndex === -1 ? 'disabled style="padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:#64748b; border-radius:8px; cursor:not-allowed; font-size:0.8rem; font-weight:600; flex-shrink:0; opacity:0.4;"' : 'style="padding:8px 12px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:#a5b4fc; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:600; flex-shrink:0;"'}>
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <div style="flex: 1; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: thin; scroll-behavior: smooth;">
            ${tabsHeaderHtml}
          </div>

          <button id="emb-next-btn" ${nextIndex === -1 ? 'disabled style="padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); color:#64748b; border-radius:8px; cursor:not-allowed; font-size:0.8rem; font-weight:600; flex-shrink:0; opacity:0.4;"' : 'style="padding:8px 12px; background:linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.25)); border:1px solid rgba(168,85,247,0.5); color:#f3e8ff; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:600; flex-shrink:0;"'}>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div style="max-height: 380px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin;">
          ${buttonsListHtml}
        </div>
      </div>
    `;

    container.querySelectorAll('.emb-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.tab;
        if (target) {
          currentTabId = target;
          updateEmbeddedView();
        }
      });
    });

    const btnPrev = container.querySelector('#emb-prev-btn');
    if (btnPrev && prevIndex !== -1) btnPrev.addEventListener('click', () => { currentTabId = manualData[prevIndex].id; updateEmbeddedView(); });

    const btnNext = container.querySelector('#emb-next-btn');
    if (btnNext && nextIndex !== -1) btnNext.addEventListener('click', () => { currentTabId = manualData[nextIndex].id; updateEmbeddedView(); });

    const btnFull = container.querySelector('#btn-open-full-manual-modal');
    if (btnFull) {
      btnFull.addEventListener('click', () => {
        showInteractiveManualModal(currentTabId);
      });
    }

    container.querySelectorAll('.emb-manual-card').forEach(card => {
      card.addEventListener('click', () => {
        const btnName = decodeURIComponent(card.dataset.btnName || '');
        const foundBtn = active.buttons.find(b => b.name === btnName);
        if (foundBtn) {
          showCardDetailModal(foundBtn, active);
        }
      });
    });
  };

  updateEmbeddedView();
};
