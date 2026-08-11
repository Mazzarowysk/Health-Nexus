// ─── MANUAL INTERATIVO POR ABAS (HEALTH NEXUS v1.2.1) ────────────────────────

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
        rules: 'Apenas usuários Master (mazzarowysk) podem alterar perfis de outros usuários.'
      },
      {
        icon: 'fa-cloud-check',
        name: 'Indicador de Sincronização Turso',
        type: 'Rede & Dados',
        color: '#10b981',
        description: 'Exibe no cabeçalho o status de conexão com o banco na nuvem Turso DB. Verde indica dados sincronizados em tempo real.',
        shortcut: 'Clique no badge no topo',
        rules: 'Funciona em modo Offline-First. Se a internet cair, o sistema grava localmente e sincroniza automaticamente ao reconectar.'
      },
      {
        icon: 'fa-moon-sun',
        name: 'Alternar Tema (Escuro / Claro)',
        type: 'Interface',
        color: '#f59e0b',
        description: 'Alterna a paleta visual entre o modo Dark Glassmorphism e Light Mode para conforto visual em plantões noturnos.',
        shortcut: 'Botão no topo direito',
        rules: 'A preferência visual é salva no localStorage do navegador do usuário.'
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
      { q: 'Quem tem acesso ao reset de senhas?', a: 'Por segurança, apenas o usuário Master (mazzarowysk) possui autorização para resetar senhas ou alterar papéis de acesso.' }
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
        type: 'Escrita',
        color: '#3b82f6',
        description: 'Reserva horário na agenda de um médico específico para um paciente cadastrado.',
        shortcut: 'Botão Azul no topo da Agenda',
        rules: 'Impede agendamentos duplicados no mesmo horário para o mesmo médico.'
      },
      {
        icon: 'fa-filter',
        name: '🔍 Filtro por Médico / Especialidade',
        type: 'Visualização',
        color: '#818cf8',
        description: 'Filtra os compromissos exibidos na tela por profissional ou por especialidade médica.',
        shortcut: 'Select no topo da página',
        rules: 'Permite selecionar "Todos os Médicos" para visão geral do dia.'
      },
      {
        icon: 'fa-check-double',
        name: '✅ Confirmar Presença (Check-in)',
        type: 'Status',
        color: '#10b981',
        description: 'Altera o status do agendamento para "Aguardando Atendimento" quando o paciente chega à clínica.',
        shortcut: 'Botão Check no item da agenda',
        rules: 'Notifica automaticamente o painel do médico responsável.'
      },
      {
        icon: 'fa-clock-rotate-left',
        name: '🔄 Reagendar Consulta',
        type: 'Edição',
        color: '#f59e0b',
        description: 'Muda a data ou horário da consulta preservando as observações e histórico do paciente.',
        shortcut: 'Ícone de Relógio',
        rules: 'Exige confirmação da nova data escolhida.'
      },
      {
        icon: 'fa-ban',
        name: '❌ Cancelar Agendamento',
        type: 'Ação Crítica',
        color: '#ef4444',
        description: 'Cancela a consulta informando a justificativa (Desistência, Falta, Imprevisto).',
        shortcut: 'Ícone de Lixeira / X',
        rules: 'O registro não é apagado fisicamente; permanece no histórico como "Cancelado".'
      }
    ],
    workflow: [
      { step: 1, title: 'Seleção da Data', desc: 'Escolha a data no calendário e o médico correspondente.' },
      { step: 2, title: 'Agendamento', desc: 'Selecione o horário livre, busque o paciente e confirme o agendamento.' },
      { step: 3, title: 'Check-in no Dia', desc: 'No dia da consulta, quando o paciente chegar, clique em "Confirmar Presença".' }
    ],
    faq: [
      { q: 'Como visualizar horários livres de um médico?', a: 'Selecione o médico no filtro superior. O sistema destacará os slots de horário disponíveis na cor verde.' }
    ]
  },
  {
    id: 'recepcao',
    title: 'Recepção & Pacientes',
    icon: 'fa-user-nurse',
    color: '#38bdf8',
    summary: 'Módulo dedicado ao acolhimento de pacientes, cadastro de prontuários base e encaminhamento para filas de atendimento.',
    roles: ['Recepcionista', 'Enfermeiro', 'Master'],
    buttons: [
      {
        icon: 'fa-user-plus',
        name: '➕ Novo Paciente',
        type: 'Escrita / Cadastro',
        color: '#10b981',
        description: 'Abre o formulário modal para registro de novos pacientes. Exige validação rigorosa de CPF com algoritmo de dígitos verificadores.',
        shortcut: 'Alt + N',
        rules: 'Campos obrigatórios: Nome Completo, CPF válido, Data de Nascimento e Telefone.'
      },
      {
        icon: 'fa-search',
        name: '🔍 Buscar Paciente',
        type: 'Pesquisa',
        color: '#38bdf8',
        description: 'Realiza busca instantânea no banco de dados local e remoto à medida que o usuário digita o CPF ou Nome do paciente.',
        shortcut: 'Campo no topo da lista',
        rules: 'Aceita CPF com ou sem pontuação (ex: 123.456.789-00 ou 12345678900).'
      },
      {
        icon: 'fa-user-gear',
        name: '📝 Editar Cadastro',
        type: 'Edição',
        color: '#f59e0b',
        description: 'Permite atualizar dados cadastrais, endereço, convênio de saúde ou telefone de contato do paciente.',
        shortcut: 'Ícone de Lápis no card do paciente',
        rules: 'Alterações são sincronizadas imediatamente com a nuvem.'
      },
      {
        icon: 'fa-right-to-bracket',
        name: '🎟️ Enviar para Fila / Triagem',
        type: 'Ação Operacional',
        color: '#6366f1',
        description: 'Insere o paciente na Fila de Espera ativa para a Triagem de Enfermagem ou Consultório Médico direto.',
        shortcut: 'Botão Verde no card',
        rules: 'Define o horário exato de entrada para acompanhamento do Tempo de Espera (Estagnação).'
      },
      {
        icon: 'fa-print',
        name: '📄 Imprimir Ficha de Atendimento',
        type: 'Exportação / PDF',
        color: '#8b5cf6',
        description: 'Gera documento PDF formatado com dados cadastrais e espaço para assinatura física do paciente.',
        shortcut: 'Ícone de Impressora',
        rules: 'Disponível para qualquer cadastro existente.'
      }
    ],
    workflow: [
      { step: 1, title: 'Identificação', desc: 'Solicite o CPF ou Nome do paciente e digite na barra de busca.' },
      { step: 2, title: 'Cadastro / Atualização', desc: 'Se o paciente não existir, clique em Novo Paciente e preencha os dados.' },
      { step: 3, title: 'Encaminhamento', desc: 'Clique em "Enviar para Fila" e informe o tipo de atendimento (Consulta Geral, Urgência, Retorno).' }
    ],
    faq: [
      { q: 'O que fazer se o sistema informar "CPF Já Cadastrado"?', a: 'Utilize a barra de busca por CPF para localizar o cadastro pré-existente e apenas atualize os dados do paciente se necessário.' },
      { q: 'Posso cadastrar pacientes estrangeiros sem CPF?', a: 'Para estrangeiros sem CPF, o sistema aceita código temporário emitido com autorização do perfil Master.' }
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
        rules: 'Calcula automaticamente alertas de taquicardia, febre ou hipóxia.'
      },
      {
        icon: 'fa-notes-medical',
        name: '🩺 Iniciar Atendimento',
        type: 'Ação Clínica',
        color: '#10b981',
        description: 'Abre a ficha clínica do paciente selecionado na fila, iniciando o cronômetro do atendimento.',
        shortcut: 'Botão Verde na lista de esperados',
        rules: 'Altera o status do paciente na TV para "Em Atendimento".'
      },
      {
        icon: 'fa-pills',
        name: '💊 Nova Prescrição Eletrônica',
        type: 'Prescrição',
        color: '#3b82f6',
        description: 'Busca medicamentos cadastrados no estoque da farmácia interna, adicionando posologia, dosagem e via de administração.',
        shortcut: 'Aba Prescrição no Prontuário',
        rules: 'Permite salvar receitas para impressão imediata em formato corporativo.'
      },
      {
        icon: 'fa-book-diagnostic',
        name: '📘 Pesquisa Integrada CID-10',
        type: 'Diagnóstico',
        color: '#8b5cf6',
        description: 'Campo inteligente com autocompletar para busca de código internacional de doenças (ex: J06.9, E11, I10).',
        shortcut: 'Campo CID-10',
        rules: 'Busca por código numérico ou palavra-chave do diagnóstico.'
      },
      {
        icon: 'fa-file-signature',
        name: '📄 Emissão de Atestado / Declaração',
        type: 'Documentação',
        color: '#ec4899',
        description: 'Gera atestado médico configurável (dias de afastamento, repouso ou declaração de comparecimento) com validação de CRM.',
        shortcut: 'Botão Atestado',
        rules: 'Preenche automaticamente os dados do médico logado.'
      },
      {
        icon: 'fa-bed-pulse',
        name: '🛏️ Solicitar Internação',
        type: 'Encaminhamento',
        color: '#f59e0b',
        description: 'Encaminha a ordem de internação do paciente direto para a Central de Leitos com a hipótese diagnóstica.',
        shortcut: 'Botão Solicitar Leito',
        rules: 'Insere o paciente na Fila de Alocação de Leitos.'
      },
      {
        icon: 'fa-circle-check',
        name: '🏁 Finalizar Consulta',
        type: 'Encerramento',
        color: '#059669',
        description: 'Salva todas as informações no prontuário definitivo e conclui o atendimento do paciente.',
        shortcut: 'Botão Concluir no rodape',
        rules: 'Libera o médico para chamar o próximo paciente na TV.'
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
        type: 'Notificação',
        color: '#8b5cf6',
        description: 'Dispara o alarme sonoro e pronuncia o nome do paciente via sintetizador de voz (ex: "Paciente Marcelo Mazaro, favor dirigir-se ao Consultório 01").',
        shortcut: 'Botão Chamada na Agenda/Prontuário',
        rules: 'Exibe a chamada em tela cheia na TV da recepção.'
      },
      {
        icon: 'fa-rotate-right',
        name: '🔁 Rechamar Paciente',
        type: 'Re-notificação',
        color: '#f59e0b',
        description: 'Re-executa o aviso sonoro e faz o nome do paciente piscar em destaque na tela da sala de espera.',
        shortcut: 'Botão Rechamar',
        rules: 'Atualiza o horário da última chamada na lista.'
      },
      {
        icon: 'fa-volume-high',
        name: '🔊 Ativar / Testar Áudio Voz',
        type: 'Configuração de Som',
        color: '#10b981',
        description: 'Testa os alto-falantes e a síntese de voz gTTS integrada ao navegador.',
        shortcut: 'Botão de Som no topo da TV',
        rules: 'Exige que o navegador tenha permissão de reprodução de áudio ativada.'
      },
      {
        icon: 'fa-expand',
        name: '📺 Modo Tela Cheia (F11)',
        type: 'Exibição',
        color: '#3b82f6',
        description: 'Ajusta o layout para exibição dedicada em smart TVs ou monitores de parede na recepção.',
        shortcut: 'F11',
        rules: 'Oculta menus de navegação do sistema para foco exclusivo nas chamadas.'
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
        type: 'Alocação',
        color: '#10b981',
        description: 'Aloca um paciente da fila de solicitação de leitos em uma acomodação livre.',
        shortcut: 'Botão Internar no leito vago',
        rules: 'Apenas leitos com status "Livre" podem receber pacientes.'
      },
      {
        icon: 'fa-arrows-left-right',
        name: '🔄 Transferir de Leito',
        type: 'Movimentação',
        color: '#3b82f6',
        description: 'Muda a acomodação do paciente internado (ex: Enfermaria A -> UTI Leito 02).',
        shortcut: 'Ícone de Troca no card do leito',
        rules: 'Registra a data, hora e motivo da transferência no histórico do leito.'
      },
      {
        icon: 'fa-clipboard-check',
        name: '📋 Aprazamento & Prescrição de Enfermagem',
        type: 'Assistencial',
        color: '#8b5cf6',
        description: 'Permite à enfermagem checar e dar baixa nas medicações administradas por horário.',
        shortcut: 'Aba Aprazamento',
        rules: 'Exibe a lista de medicamentos prescritos pelo médico assistente.'
      },
      {
        icon: 'fa-door-open',
        name: '🚪 Conceder Alta Hospitalar',
        type: 'Desfecho',
        color: '#ef4444',
        description: 'Registra a alta do paciente e altera o status do leito para "Em Higienização".',
        shortcut: 'Botão Dar Alta',
        rules: 'O leito fica bloqueado para novas internações até que a higienização seja concluída.'
      },
      {
        icon: 'fa-broom',
        name: '✨ Concluir Higienização',
        type: 'Manutenção',
        color: '#f59e0b',
        description: 'Informa que a equipe de limpeza concluiu a sanitização do leito, retornando o status para "Livre".',
        shortcut: 'Botão Limpeza Concluída',
        rules: 'Retorna a cor do leito para verde no Mapa Geral.'
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
        rules: 'Subtrai a quantidade do estoque da farmácia e registra o lote utilizado.'
      },
      {
        icon: 'fa-box-archive',
        name: '📦 Cadastrar Medicamento',
        type: 'Cadastro',
        color: '#3b82f6',
        description: 'Insere novos medicamentos ou insumos hospitalares na base de dados.',
        shortcut: 'Botão Novo Item',
        rules: 'Campos obrigatórios: Nome Comercial, Princípio Ativo, Forma e Estoque Mínimo.'
      },
      {
        icon: 'fa-file-invoice-dollar',
        name: '📥 Entrada de Estoque / Nota Fiscal',
        type: 'Entrada',
        color: '#8b5cf6',
        description: 'Registra a entrada de novas caixas/lotes com data de validade e fornecedor.',
        shortcut: 'Botão Dar Entrada',
        rules: 'Soma a quantidade ao saldo do estoque existente.'
      },
      {
        icon: 'fa-triangle-exclamation',
        name: '⚠️ Alertas de Estoque Crítico',
        type: 'Monitoramento',
        color: '#ef4444',
        description: 'Painel que lista medicamentos com saldo abaixo do estoque mínimo ou com validade próxima ao vencimento.',
        shortcut: 'Aba Alertas',
        rules: 'Destaca itens com menos de 30 dias para vencer.'
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
    id: 'relatorios',
    title: 'Relatórios & Estagnação',
    icon: 'fa-chart-pie',
    color: '#34d399',
    summary: 'Dashboards analíticos de tempo de permanência, produtividade médica, estagnação de atendimento e faturamento.',
    roles: ['Master', 'Médico'],
    buttons: [
      {
        icon: 'fa-hourglass-half',
        name: '⏱️ Alerta de Estagnação de Atendimento',
        type: 'Indicador Assistencial',
        color: '#ef4444',
        description: 'Sinaliza automaticamente pacientes que excederam 30 minutos na fila sem atendimento.',
        shortcut: 'Aba Estagnação',
        rules: 'Destaca itens em vermelho para intervenção imediata da gestão.'
      },
      {
        icon: 'fa-chart-column',
        name: '📈 Dashboard de Produtividade Médica',
        type: 'Métricas',
        color: '#3b82f6',
        description: 'Exibe o volume de consultas concluídas por médico, tempo médio de atendimento e diagnósticos mais frequentes.',
        shortcut: 'Aba Relatórios',
        rules: 'Permite filtrar por dia, semana ou mês.'
      },
      {
        icon: 'fa-file-pdf',
        name: '📄 Exportar Relatório em PDF',
        type: 'Exportação',
        color: '#10b981',
        description: 'Gera documento gerencial impresso com gráficos e tabelas consolidadas.',
        shortcut: 'Botão Exportar PDF',
        rules: 'Gera arquivo formatado com cabeçalho oficial do hospital.'
      }
    ],
    workflow: [
      { step: 1, title: 'Filtro', desc: 'Selecione o período desejado e o módulo de análise.' },
      { step: 2, title: 'Análise de Gargalos', desc: 'Verifique pacientes na Fila de Estagnação para remanejar equipes.' },
      { step: 3, title: 'Exportação', desc: 'Baixe o relatório gerencial em PDF para reuniões de acompanhamento.' }
    ],
    faq: [
      { q: 'Como é calculated o tempo de estagnação?', a: 'É a diferença entre o horário de check-in/recepção e o momento atual sem que tenha havido inicio de atendimento médico.' }
    ]
  },
  {
    id: 'configuracoes',
    title: 'Configurações & Turso Cloud DB',
    icon: 'fa-sliders',
    color: '#a5b4fc',
    summary: 'Administração de usuários, atribuição de senhas, sincronização em nuvem e ferramentas de auditoria.',
    roles: ['Master'],
    buttons: [
      {
        icon: 'fa-users-gear',
        name: '👥 Gerenciar Usuários & Permissões',
        type: 'Administração',
        color: '#6366f1',
        description: 'Abre o painel de criação e edição de usuários da clínica (Master, Médico, Enf, Rec, Farm).',
        shortcut: 'Botão Gerenciar Usuários',
        rules: 'Apenas acessível pelo usuário Master (mazzarowysk).'
      },
      {
        icon: 'fa-key',
        name: '🔑 Reset / Alteração de Senhas',
        type: 'Segurança',
        color: '#ec4899',
        description: 'Permite redefinir a senha de acesso de qualquer funcionário cadastrado no sistema.',
        shortcut: 'Ícone de Chave na lista de usuários',
        rules: 'A senha é criptografada e salva localmente e na nuvem Turso.'
      },
      {
        icon: 'fa-cloud-arrow-up',
        name: '☁️ Sincronizar Agora (Turso Cloud)',
        type: 'Nuvem',
        color: '#10b981',
        description: 'Força o envio imediato de todas as tabelas locais (pacientes, atendimentos, leitos) para a nuvem Turso DB.',
        shortcut: 'Botão Sincronizar Agora',
        rules: 'Grava log da data e hora da última sincronização.'
      },
      {
        icon: 'fa-cloud-arrow-down',
        name: '📥 Restaurar do Banco da Nuvem',
        type: 'Restauração',
        color: '#f59e0b',
        description: 'Baixa o estado completo armazenado no Turso Cloud DB e substitui o banco local.',
        shortcut: 'Botão Restaurar do Banco',
        rules: 'Requer confirmação prévia para evitar perda de dados não sincronizados.'
      },
      {
        icon: 'fa-clock-rotate-left',
        name: '🛡️ Histórico de Auditoria de Acessos',
        type: 'Auditoria',
        color: '#8b5cf6',
        description: 'Exibe o registro histórico de logins de cada usuário com validação da data de criação da conta.',
        shortcut: 'Ícone de Escudo / Log',
        rules: 'Filtra e exclui acessos simulados anteriores à data de criação do cadastro.'
      }
    ],
    workflow: [
      { step: 1, title: 'Cadastro de Equipe', desc: 'Clique em Gerenciar Usuários e cadastre médicos e enfermeiros com seus respectivos papéis.' },
      { step: 2, title: 'Definição de Senhas', desc: 'Defina a senha inicial e informe ao usuário.' },
      { step: 3, title: 'Sincronização', desc: 'Clique em Sincronizar Agora para garantir que a equipe já esteja salva na nuvem Turso.' }
    ],
    faq: [
      { q: 'Como recuperar a senha do mazzarowysk (Master)?', a: 'A senha do usuário master pode ser restaurada via console ou pelo script de credenciais oficiais do sistema.' }
    ]
  }
];

// ─── MODAL DE DETALHES DO CARD (EXPANSÃO LIGHTBOX) ──────────────────────────

export const showCardDetailModal = (buttonItem, moduleItem) => {
  const existing = document.getElementById('hn-card-detail-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hn-card-detail-modal';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(3, 5, 12, 0.88);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    z-index: 1000000; display: flex; align-items: center; justify-content: center;
    padding: 20px; font-family: system-ui, -apple-system, sans-serif;
    animation: hnFadeIn 0.25s ease-out;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes hnPopIn {
        from { opacity: 0; transform: scale(0.9) translateY(14px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
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

      <!-- RODAPÉ -->
      <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
        <button id="card-detail-close-btn-footer" style="padding: 10px 24px; border-radius: 10px; background: #6366f1; color: #fff; font-weight: 600; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none;">
          <i class="fa-solid fa-check"></i> Fechar Detalhes
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

export const showInteractiveManualModal = (initialTabId = 'geral') => {
  const existing = document.getElementById('hn-interactive-manual-modal');
  if (existing) existing.remove();

  let activeTabId = initialTabId;
  let searchQuery = '';

  const overlay = document.createElement('div');
  overlay.id = 'hn-interactive-manual-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(5, 7, 15, 0.88);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    z-index: 999999; display: flex; align-items: center; justify-content: center;
    padding: 20px; font-family: system-ui, -apple-system, sans-serif;
  `;

  const renderModalContent = () => {
    const currentIndex = manualData.findIndex(m => m.id === activeTabId);
    const validIndex = currentIndex >= 0 ? currentIndex : 0;
    const activeData = manualData[validIndex];

    const prevIndex = validIndex > 0 ? validIndex - 1 : -1;
    const nextIndex = validIndex < manualData.length - 1 ? validIndex + 1 : -1;

    // Filtrar conteúdo por busca se houver query
    const filteredButtons = activeData.buttons.filter(b => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) ||
             b.description.toLowerCase().includes(q) ||
             b.type.toLowerCase().includes(q) ||
             (b.rules && b.rules.toLowerCase().includes(q));
    });

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
      <div class="manual-button-card" data-btn-name="${encodeURIComponent(b.name)}" style="
        background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; cursor: pointer;
      " onmouseover="this.style.borderColor='${b.color}'; this.style.transform='translateY(-3px) scale(1.008)'; this.style.boxShadow='0 8px 24px ${b.color}33'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='none'; this.style.boxShadow='none'">
        
        <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${b.color};"></div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-left: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: ${b.color}22; border: 1px solid ${b.color}44; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid ${b.icon}" style="color: ${b.color}; font-size: 1.15rem;"></i>
            </div>
            <strong style="color: #f8fafc; font-size: 1.02rem;">${b.name}</strong>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: rgba(255,255,255,0.08); color: ${b.color}; font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 600; text-transform: uppercase;">
              ${b.type}
            </span>
            <span style="font-size: 0.72rem; color: #a5b4fc; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); padding: 3px 10px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i> Ampliar
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
      </div>
    `).join('') : `
      <div style="text-align: center; padding: 30px; color: #94a3b8; width: 100%;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
        <p>Nenhum botão ou funcionalidade encontrada para "<strong>${searchQuery}</strong>".</p>
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
              display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.3rem;
            ">
              <i class="fa-solid fa-book-bookmark"></i>
            </div>
            <div>
              <h3 style="color: #f8fafc; font-size: 1.25rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 10px;">
                Manual Interativo do Usuário
                <span style="font-size: 0.75rem; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 2px 8px; border-radius: 12px;">v1.2.1 Por Abas</span>
              </h3>
              <p style="color: #94a3b8; font-size: 0.82rem; margin: 2px 0 0 0;">
                Documentação exaustiva de cada funcionalidade, botão e regra de negócio por módulo
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="position: relative; width: 260px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.85rem;"></i>
              <input type="text" id="manual-modal-search" placeholder="Buscar botão ou ação..." value="${searchQuery}" style="
                width: 100%; padding: 8px 12px 8px 34px; background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f8fafc;
                font-size: 0.85rem; outline: none; transition: border-color 0.2s;
              " onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
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
        <div style="
          padding: 10px 18px; background: rgba(15, 23, 42, 0.7);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex; align-items: center; gap: 8px; position: relative;
        ">
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
        </div>

        <!-- CORPO PRINCIPAL DO MANUAL -->
        <div style="
          flex: 1; overflow-y: auto; padding: 24px; display: grid;
          grid-template-columns: 2.2fr 1fr; gap: 24px; scrollbar-width: thin;
        ">
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
                box-shadow: 0 0 14px ${activeData.color}aa; font-weight: 700;
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
                <div style="display: flex; gap: 6px; align-items: center;">
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
              <span style="font-size: 0.78rem; color: #64748b;">Passe o mouse para destacar</span>
            </div>

            <!-- CARDS DE BOTÕES -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
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
        </div>
      </div>
    `;
  };

  renderModalContent();
  document.body.appendChild(overlay);

  // AUTO SCROLL PARA MANTER A ABA ATIVA SEMPRE CENTRALIZADA NO MENU SUPERIOR
  setTimeout(() => {
    const activeTabEl = overlay.querySelector('.manual-nav-tab.active');
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 50);

  // EVENT DELEGATION PARA MUDANÇA DE ABAS, BUSCA, AMPLIAR CARD E ROLAGEM
  overlay.addEventListener('click', (e) => {
    // Clique para Ampliar Card
    const btnCard = e.target.closest('.manual-button-card');
    if (btnCard) {
      const btnName = decodeURIComponent(btnCard.dataset.btnName || '');
      const currentIndex = manualData.findIndex(m => m.id === activeTabId);
      const activeData = manualData[currentIndex >= 0 ? currentIndex : 0];
      const foundBtn = activeData ? activeData.buttons.find(b => b.name === btnName) : null;
      if (foundBtn) {
        showCardDetailModal(foundBtn, activeData);
        return;
      }
    }

    const tabBtn = e.target.closest('.manual-nav-tab');
    if (tabBtn) {
      activeTabId = tabBtn.dataset.tab;
      renderModalContent();
    }

    if (e.target.id === 'manual-tab-prev-btn' || e.target.closest('#manual-tab-prev-btn')) {
      const idx = manualData.findIndex(m => m.id === activeTabId);
      if (idx > 0) {
        activeTabId = manualData[idx - 1].id;
        renderModalContent();
      }
    }

    if (e.target.id === 'manual-tab-next-btn' || e.target.closest('#manual-tab-next-btn')) {
      const idx = manualData.findIndex(m => m.id === activeTabId);
      if (idx < manualData.length - 1) {
        activeTabId = manualData[idx + 1].id;
        renderModalContent();
      }
    }

    if (e.target.id === 'manual-modal-close' || e.target.closest('#manual-modal-close') || e.target === overlay) {
      overlay.remove();
    }
  });

  overlay.addEventListener('input', (e) => {
    if (e.target.id === 'manual-modal-search') {
      searchQuery = e.target.value;
      renderModalContent();
    }
  });
};

// ─── RENDERIZADOR COMPACTO EMBUTIDO PARA ABA CONFIGURAÇÕES ───────────────────

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
    const prevTab = prevIndex !== -1 ? manualData[prevIndex] : null;
    const nextTab = nextIndex !== -1 ? manualData[nextIndex] : null;

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
        <div style="font-size: 0.74rem; color: #94a3b8; display: flex; gap: 12px;">
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
          <button id="btn-open-full-manual-modal" class="btn btn-primary" style="font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
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
    if (btnFootNext) btnFootNext.addEventListener('click', () => { currentTabId = nextTab.id; updateEmbeddedView(); });

    const btnFull = container.querySelector('#btn-open-full-manual-modal');
    if (btnFull) {
      btnFull.addEventListener('click', () => {
        showInteractiveManualModal(currentTabId);
      });
    }
  };

  updateEmbeddedView();
};
