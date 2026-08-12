// ─── MANUAL INTERATIVO POR ABAS (HEALTH NEXUS v1.2.1) ────────────────────────
import { getNexusAICopilotResponse } from './aiCopilot.js';
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
        keywords: ['rbac', 'controle de perfis', 'permissões', 'papéis', 'acesso', 'segurança', 'cargos', 'master', 'médico', 'enfermeiro', 'recepcionista', 'farmacêutico']
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
        rules: 'Impede agendamentos duplicados no mesmo horário para o mesmo médico.',
        keywords: ['agendar', 'novo agendamento', 'marcar consulta', 'reserva', 'horário médico']
      },
      {
        icon: 'fa-filter',
        name: '🔍 Filtro por Médico / Especialidade',
        type: 'Visualização',
        color: '#818cf8',
        description: 'Filtra os compromissos exibidos na tela por profissional ou por especialidade médica.',
        shortcut: 'Select no topo da página',
        rules: 'Permite selecionar "Todos os Médicos" para visão geral do dia.',
        keywords: ['filtrar médico', 'especialidade', 'agenda médico', 'consultório']
      },
      {
        icon: 'fa-check-double',
        name: '✅ Confirmar Presença (Check-in)',
        type: 'Status',
        color: '#10b981',
        description: 'Altera o status do agendamento para "Aguardando Atendimento" quando o paciente chega à clínica.',
        shortcut: 'Botão Check no item da agenda',
        rules: 'Notifica automaticamente o painel do médico responsável.',
        keywords: ['check-in', 'confirmar presença', 'paciente chegou', 'aguardando atendimento']
      },
      {
        icon: 'fa-clock-rotate-left',
        name: '🔄 Reagendar Consulta',
        type: 'Edição',
        color: '#f59e0b',
        description: 'Muda a data ou horário da consulta preservando as observações e histórico do paciente.',
        shortcut: 'Ícone de Relógio',
        rules: 'Exige confirmação da nova data escolhida.',
        keywords: ['reagendar', 'mudar data consulta', 'remarcar', 'trocar horário']
      },
      {
        icon: 'fa-ban',
        name: '❌ Cancelar Agendamento',
        type: 'Ação Crítica',
        color: '#ef4444',
        description: 'Cancela a consulta informando a justificativa (Desistência, Falta, Imprevisto).',
        shortcut: 'Ícone de Lixeira / X',
        rules: 'O registro não é apagado fisicamente; permanece no histórico como "Cancelado".',
        keywords: ['cancelar agendamento', 'cancelar consulta', 'faltou', 'desistiu', 'deletar agendamento']
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
        rules: 'Campos obrigatórios: Nome Completo, CPF válido, Data de Nascimento e Telefone.',
        keywords: ['novo paciente', 'cadastrar paciente', 'adicionar paciente', 'registro paciente', 'cpf']
      },
      {
        icon: 'fa-search',
        name: '🔍 Buscar Paciente',
        type: 'Pesquisa',
        color: '#38bdf8',
        description: 'Realiza busca instantânea no banco de dados local e remoto à medida que o usuário digita o CPF ou Nome do paciente.',
        shortcut: 'Campo no topo da lista',
        rules: 'Aceita CPF com ou sem pontuação (ex: 123.456.789-00 ou 12345678900).',
        keywords: ['buscar paciente', 'procurar paciente', 'encontrar cpf', 'lista pacientes']
      },
      {
        icon: 'fa-user-gear',
        name: '📝 Editar Cadastro',
        type: 'Edição',
        color: '#f59e0b',
        description: 'Permite atualizar dados cadastrais, endereço, convênio de saúde ou telefone de contato do paciente.',
        shortcut: 'Ícone de Lápis no card do paciente',
        rules: 'Alterações são sincronizadas imediatamente com a nuvem.',
        keywords: ['editar paciente', 'alterar cadastro', 'mudar telefone', 'mudar convênio']
      },
      {
        icon: 'fa-right-to-bracket',
        name: '🎟️ Enviar para Fila / Triagem',
        type: 'Ação Operacional',
        color: '#6366f1',
        description: 'Insere o paciente na Fila de Espera ativa para a Triagem de Enfermagem ou Consultório Médico direto.',
        shortcut: 'Botão Verde no card',
        rules: 'Define o horário exato de entrada para acompanhamento do Tempo de Espera (Estagnação).',
        keywords: ['enviar para fila', 'fila de espera', 'encaminhar triagem', 'entrada ps']
      },
      {
        icon: 'fa-print',
        name: '📄 Imprimir Ficha de Atendimento',
        type: 'Exportação / PDF',
        color: '#8b5cf6',
        description: 'Gera documento PDF formatado com dados cadastrais e espaço para assinatura física do paciente.',
        shortcut: 'Ícone de Impressora',
        rules: 'Disponível para qualquer cadastro existente.',
        keywords: ['imprimir ficha', 'pdf paciente', 'gerar ficha', 'impressão recepção']
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
        keywords: ['iniciar atendimento', 'abrir prontuário', 'chamar consultório', 'pep']
      },
      {
        icon: 'fa-pills',
        name: '💊 Nova Prescrição Eletrônica',
        type: 'Prescrição',
        color: '#3b82f6',
        description: 'Busca medicamentos cadastrados no estoque da farmácia interna, adicionando posologia, dosagem e via de administração.',
        shortcut: 'Aba Prescrição no Prontuário',
        rules: 'Permite salvar receitas para impressão imediata em formato corporativo.',
        keywords: ['prescrição eletrônica', 'receita médica', 'prescrever remédio', 'posologia', 'medicamento']
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
        type: 'Documentação',
        color: '#ec4899',
        description: 'Gera atestado médico configurável (dias de afastamento, repouso ou declaração de comparecimento) com validação de CRM.',
        shortcut: 'Botão Atestado',
        rules: 'Preenche automaticamente os dados do médico logado.',
        keywords: ['emitir atestado', 'atestado médico', 'afastamento', 'declaração de comparecimento', 'imprimir atestado']
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
        shortcut: 'Botão Concluir no rodape',
        rules: 'Libera o médico para chamar o próximo paciente na TV.',
        keywords: ['finalizar consulta', 'concluir atendimento', 'fechar prontuário', 'dar alta médica']
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
        rules: 'Exibe a chamada em tela cheia na TV da recepção.',
        keywords: ['chamar paciente', 'tv', 'painel tv', 'chamar no consultório', 'megafone', 'alarme sonoro', 'voz']
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
        type: 'Alocação',
        color: '#10b981',
        description: 'Aloca um paciente da fila de solicitação de leitos em uma acomodação livre.',
        shortcut: 'Botão Internar no leito vago',
        rules: 'Apenas leitos com status "Livre" podem receber pacientes.',
        keywords: ['internar', 'alocar leito', 'colocar no leito', 'internação', 'quarto']
      },
      {
        icon: 'fa-arrows-left-right',
        name: '🔄 Transferir de Leito',
        type: 'Movimentação',
        color: '#3b82f6',
        description: 'Muda a acomodação do paciente internado (ex: Enfermaria A -> UTI Leito 02).',
        shortcut: 'Ícone de Troca no card do leito',
        rules: 'Registra a data, hora e motivo da transferência no histórico do leito.',
        keywords: ['transferir leito', 'trocar de leito', 'mudar de quarto', 'transferência uti']
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
        type: 'Desfecho',
        color: '#ef4444',
        description: 'Registra a alta do paciente e altera o status do leito para "Em Higienização".',
        shortcut: 'Botão Dar Alta',
        rules: 'O leito fica bloqueado para novas internações até que a higienização seja concluída.',
        keywords: ['alta hospitalar', 'dar alta', 'liberar leito', 'desocupar leito', 'alta']
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
        rules: 'Subtrai a quantidade do estoque da farmácia e registra o lote utilizado.',
        keywords: ['dispensar', 'entregar remédio', 'baixa de estoque', 'prescrição farmácia']
      },
      {
        icon: 'fa-box-archive',
        name: '📦 Cadastrar Medicamento',
        type: 'Cadastro',
        color: '#3b82f6',
        description: 'Insere novos medicamentos ou insumos hospitalares na base de dados.',
        shortcut: 'Botão Novo Item',
        rules: 'Campos obrigatórios: Nome Comercial, Princípio Ativo, Forma e Estoque Mínimo.',
        keywords: ['cadastrar medicamento', 'novo remédio', 'adicionar insumo', 'estoque mínimo']
      },
      {
        icon: 'fa-file-invoice-dollar',
        name: '📥 Entrada de Estoque / Nota Fiscal',
        type: 'Entrada',
        color: '#8b5cf6',
        description: 'Registra a entrada de novas caixas/lotes com data de validade e fornecedor.',
        shortcut: 'Botão Dar Entrada',
        rules: 'Soma a quantidade ao saldo do estoque existente.',
        keywords: ['entrada de estoque', 'nota fiscal', 'fornecedor', 'lote', 'validade']
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
    id: 'medicos',
    title: 'Corpo Clínico & Médicos',
    icon: 'fa-user-doctor',
    color: '#818cf8',
    summary: 'Gestão completa do corpo clínico hospitalar, inclusão/cadastro de médicos, acompanhamento de especialidades e validação de CRM no CFM.',
    roles: ['Master', 'Médico', 'Recepcionista'],
    buttons: [
      {
        icon: 'fa-user-plus',
        name: '➕ Cadastrar / Incluir Novo Médico',
        type: 'Cadastro / Corpo Clínico',
        color: '#10b981',
        description: 'Cadastra um novo médico no corpo clínico da instituição. Preencha Nome Completo, CRM, UF, Especialidade, Telefone e E-mail com validação em tempo real.',
        shortcut: 'Botão "+ Novo Médico" na aba Corpo Clínico',
        rules: 'Exige CRM e Nome Completo válidos. O CRM é verificado contra a base oficial do CFM.',
        keywords: ['incluir médico', 'cadastrar médico', 'novo médico', 'adicionar médico', 'registro médico', 'corpo clínico', 'crm', 'especialista', 'contratar médico', 'incluir clinico', 'cadastrar clinico', 'médico', 'medico', 'incluir medico', 'cadastrar medico']
      },
      {
        icon: 'fa-user-pen',
        name: '📝 Editar Cadastro de Médico',
        type: 'Edição',
        color: '#3b82f6',
        description: 'Altera especialidade, telefone de contato, e-mail ou dados cadastrais do profissional médico.',
        shortcut: 'Ícone de Lápis no card do médico',
        rules: 'Permite atualizar os dados a qualquer momento.',
        keywords: ['editar médico', 'alterar médico', 'mudar especialidade', 'atualizar crm']
      },
      {
        icon: 'fa-calendar-days',
        name: '📅 Alocar Plantão de Médico (Escala)',
        type: 'Escala de Trabalho',
        color: '#8b5cf6',
        description: 'Insere o médico na escala de plantão do dia, definindo consultório, turno e horário.',
        shortcut: 'Botão "Escala de Plantão"',
        rules: 'Atualiza o banner de plantonistas do dia na recepção e dashboard.',
        keywords: ['escala médico', 'plantão médico', 'alocar plantão', 'horário médico', 'escala de trabalho']
      },
      {
        icon: 'fa-trash-can',
        name: '🗑️ Lixeira de Médicos (Desativar)',
        type: 'Remoção / Inativação',
        color: '#ef4444',
        description: 'Inativa um médico do corpo clínico enviando para a lixeira. Registros históricos de consultas permanecem preservados.',
        shortcut: 'Botão Lixeira na aba Médicos',
        rules: 'Permite restaurar o médico a qualquer momento.',
        keywords: ['excluir médico', 'desativar médico', 'deletar médico', 'remover médico', 'lixeira médico']
      }
    ],
    workflow: [
      { step: 1, title: 'Acesse Corpo Clínico', desc: 'Clique na aba "Corpo Clínico" no menu lateral.' },
      { step: 2, title: 'Clique em Novo Médico', desc: 'Clique no botão "+ Novo Médico" no canto superior direito.' },
      { step: 3, title: 'Preencha os Dados', desc: 'Informe o Nome, CRM, Especialidade, Telefone e E-mail, e clique em Salvar.' }
    ],
    faq: [
      { q: 'Como incluir ou cadastrar um novo médico no sistema?', a: 'Acesse a aba "Corpo Clínico & Médicos" no menu lateral, clique no botão "+ Novo Médico", preencha Nome, CRM e Especialidade, e clique em Salvar.' },
      { q: 'Como validar o CRM do médico junto ao CFM?', a: 'O sistema realiza a checagem automática com o portal do Conselho Federal de Medicina (CFM) ao digitar o CRM.' }
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
        type: 'Escalas',
        color: '#10b981',
        description: 'Cadastra um plantão de trabalho para médicos ou enfermeiros indicando data, turno (6h, 12h, 24h) e consultório/setor.',
        shortcut: 'Botão "+ Novo Plantão"',
        rules: 'Avisa automaticamente caso o profissional já possua outro plantão no mesmo horário.',
        keywords: ['cadastrar plantão', 'novo plantão', 'escala de trabalho', 'incluir plantão', 'escala médica', 'escala enfermagem']
      },
      {
        icon: 'fa-print',
        name: '🖨️ Imprimir Escala Mensal',
        type: 'Impressão / Relatório',
        color: '#3b82f6',
        description: 'Gera relatório formatado da escala de plantão para afixação nos quadros do hospital.',
        shortcut: 'Botão Imprimir Escala',
        rules: 'Exibe nome do profissional, registro CRM/COREN, setor e horários.',
        keywords: ['imprimir escala', 'relatório escala', 'quadro de plantão', 'pdf escala']
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
        rules: 'Destaca itens em vermelho para intervenção imediata da gestão.',
        keywords: ['estagnação', 'paciente esperando', 'gargalo', 'alerta de demora', 'tempo excedido']
      },
      {
        icon: 'fa-chart-column',
        name: '📈 Dashboard de Produtividade Médica',
        type: 'Métricas',
        color: '#3b82f6',
        description: 'Exibe o volume de consultas concluídas por médico, tempo médio de atendimento e diagnósticos mais frequentes.',
        shortcut: 'Aba Relatórios',
        rules: 'Permite filtrar por dia, semana ou mês.',
        keywords: ['produtividade médica', 'relatório de consultas', 'desempenho médico', 'métricas']
      },
      {
        icon: 'fa-file-pdf',
        name: '📄 Exportar Relatório em PDF',
        type: 'Exportação',
        color: '#10b981',
        description: 'Gera documento gerencial impresso com gráficos e tabelas consolidadas.',
        shortcut: 'Botão Exportar PDF',
        rules: 'Gera arquivo formatado com cabeçalho oficial do hospital.',
        keywords: ['exportar pdf', 'imprimir relatório', 'baixar pdf', 'relatório impresso']
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
        icon: 'fa-user-xmark',
        name: '🗑️ Excluir Usuário (Lixeira)',
        type: 'Ação Crítica / Administração',
        color: '#ef4444',
        description: 'Remove um usuário do sistema através do ícone da Lixeira na lista de usuários. O sistema confirma a exclusão, remove do banco local e sincroniza a remoção com a nuvem Turso Cloud DB, retornando automaticamente à listagem geral de usuários.',
        shortcut: 'Ícone de Lixeira na lista de usuários (Configurações)',
        rules: 'Disponível apenas para o usuário Master. Não permite excluir o próprio usuário logado.',
        keywords: ['excluir usuário', 'deletar usuário', 'remover usuário', 'apagar usuário', 'lixeira', 'excluir usuario', 'deletar usuario', 'remover usuario', 'exclusao']
      },
      {
        icon: 'fa-users-gear',
        name: '👥 Gerenciar Usuários & Permissões',
        type: 'Administração',
        color: '#6366f1',
        description: 'Abre o painel de criação e edição de usuários da clínica (Master, Médico, Enf, Rec, Farm).',
        shortcut: 'Botão Gerenciar Usuários',
        rules: 'Apenas acessível pelo usuário Master (mazzarowysk).',
        keywords: ['gerenciar usuários', 'criar usuário', 'novo usuário', 'perfis', 'rbac', 'permissões', 'funções', 'cargo', 'adicionar usuário']
      },
      {
        icon: 'fa-key',
        name: '🔑 Reset / Alteração de Senhas',
        type: 'Segurança',
        color: '#ec4899',
        description: 'Permite redefinir a senha de acesso de qualquer funcionário cadastrado no sistema.',
        shortcut: 'Ícone de Chave na lista de usuários',
        rules: 'A senha é criptografada e salva localmente e na nuvem Turso.',
        keywords: ['reset senha', 'alterar senha', 'mudar senha', 'esqueci a senha', 'redefinir senha', 'senha']
      },
      {
        icon: 'fa-cloud-arrow-up',
        name: '☁️ Sincronizar Agora (Turso Cloud)',
        type: 'Nuvem',
        color: '#10b981',
        description: 'Força o envio imediato de todas as tabelas locais (pacientes, atendimentos, leitos) para a nuvem Turso DB.',
        shortcut: 'Botão Sincronizar Agora',
        rules: 'Grava log da data e hora da última sincronização.',
        keywords: ['sincronizar', 'turso', 'nuvem', 'cloud', 'sync', 'enviar dados', 'salvar nuvem']
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
        type: 'Auditoria',
        color: '#8b5cf6',
        description: 'Exibe o registro histórico de logins de cada usuário com validação da data de criação da conta.',
        shortcut: 'Ícone de Escudo / Log',
        rules: 'Filtra e exclui acessos simulados anteriores à data de criação do cadastro.',
        keywords: ['auditoria', 'logs', 'acessos', 'histórico de login', 'auditar']
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
    let filteredButtons = [];
    const isSearching = searchQuery.trim().length > 0;
    
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      manualData.forEach(module => {
        module.buttons.forEach(b => {
          const match = b.name.toLowerCase().includes(q) ||
                 b.description.toLowerCase().includes(q) ||
                 b.type.toLowerCase().includes(q) ||
                 (b.rules && b.rules.toLowerCase().includes(q)) ||
                 (b.keywords && b.keywords.some(k => k.toLowerCase().includes(q)));
                 
          if (match) {
             filteredButtons.push({ ...b, _moduleTitle: module.title, _moduleId: module.id });
          }
        });
      });
    } else {
      filteredButtons = activeData.buttons;
    }
    
    let aiResponseHtml = '';
    if (isSearching) {
      const aiCopilot = getNexusAICopilotResponse(searchQuery, searchQuery);
      const isDefault = aiCopilot.summary.includes('Analisei sua busca');
      
      const isQuestion = searchQuery.trim().endsWith('?') || /^(como|onde|qual|o que|quem|quando|por que|posso|tem como|adicionar|incluir)/i.test(searchQuery.trim());
      
      // Verificação RBAC do Assistente
      let currentUserRole = 'Desconhecido';
      try {
        const storedUser = JSON.parse(sessionStorage.getItem('hn_user'));
        if (storedUser && storedUser.role) currentUserRole = storedUser.role;
      } catch(e) {}

      if (!isDefault) {
        // Encontra a aba destino do manual e os papéis associados
        const targetTab = manualData.find(m => m.id === aiCopilot.actionTarget) || manualData[0];
        const targetRoles = targetTab.roles || [];
        
        const isMaster = currentUserRole === 'Master' || currentUserRole === 'Administrador';
        const hasAccess = isMaster || targetRoles.includes(currentUserRole);

        if (hasAccess) {
          aiResponseHtml = `
            <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 70, 229, 0.05)); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 12px; padding: 16px; display: flex; gap: 14px; animation: hnFadeIn 0.4s ease; margin-bottom: 16px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #7c3aed; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 0 15px rgba(124, 58, 237, 0.5);">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <h5 style="color: #a78bfa; font-size: 0.95rem; font-weight: 700; margin: 0 0 6px 0;">${aiCopilot.title}</h5>
                <p style="color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.5;">
                  ${aiCopilot.summary}
                </p>
                <div style="margin-top: 10px;">
                  <button class="manual-nav-tab" data-tab="${aiCopilot.actionTarget}" style="background: #7c3aed; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 600;">
                    ${aiCopilot.actionText}
                  </button>
                </div>
              </div>
            </div>
          `;
        } else {
          // Sem Permissão para o copilot resolver a ação
          aiResponseHtml = `
            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05)); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; display: flex; gap: 14px; animation: hnFadeIn 0.4s ease; margin-bottom: 16px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #ef4444; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h5 style="color: #f87171; font-size: 0.95rem; font-weight: 700; margin: 0 0 6px 0;">Acesso Restrito - Assistente IA</h5>
                <p style="color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.5;">
                  A IA encontrou uma funcionalidade para a sua busca <em>"${searchQuery}"</em>. No entanto, ela exige um perfil de acesso diferente do seu.
                </p>
                <div style="margin-top: 8px; font-size: 0.85rem; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #ef4444;">
                  ⚠️ Seu perfil atual <strong>(${currentUserRole})</strong> não possui permissão. Ação reservada para: <strong>${targetRoles.join(', ')}</strong>.
                </div>
              </div>
            </div>
          `;
        }
      } else if (isQuestion && filteredButtons.length > 0) {
        const bestMatch = filteredButtons[0];
        
        // Verifica se o usuário tem permissão para a aba onde o botão reside
        const targetRoles = manualData.find(m => m.id === (bestMatch._moduleId || activeTabId))?.roles || [];
        const isMaster = currentUserRole === 'Master' || currentUserRole === 'Administrador';
        const hasAccess = isMaster || targetRoles.includes(currentUserRole);

        if (hasAccess) {
          aiResponseHtml = `
            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; display: flex; gap: 14px; animation: hnFadeIn 0.4s ease; margin-bottom: 16px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);">
                <i class="fa-solid fa-robot"></i>
              </div>
              <div>
                <h5 style="color: #34d399; font-size: 0.95rem; font-weight: 700; margin: 0 0 6px 0;">Assistente IA do Health Nexus</h5>
                <p style="color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.5;">
                  Com base na sua busca <em>"${searchQuery}"</em>, recomendo que você acesse o módulo <strong style="color: ${bestMatch.color || '#3b82f6'};">${bestMatch._moduleTitle || activeData.title}</strong> e utilize a funcionalidade <strong>${bestMatch.name}</strong>.
                </p>
                <div style="margin-top: 8px; font-size: 0.85rem; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #10b981;">
                  💡 <strong>Dica da IA:</strong> ${bestMatch.description}
                  ${bestMatch.rules ? `<br><br>⚠️ <strong>Atenção:</strong> ${bestMatch.rules}` : ''}
                </div>
              </div>
            </div>
          `;
        } else {
          // Resposta Restrita (Sem Permissão)
          aiResponseHtml = `
            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05)); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; display: flex; gap: 14px; animation: hnFadeIn 0.4s ease; margin-bottom: 16px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #ef4444; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h5 style="color: #f87171; font-size: 0.95rem; font-weight: 700; margin: 0 0 6px 0;">Acesso Restrito - Assistente IA</h5>
                <p style="color: #e2e8f0; font-size: 0.9rem; margin: 0; line-height: 1.5;">
                  A funcionalidade <strong>${bestMatch.name}</strong> resolve a sua busca <em>"${searchQuery}"</em>. No entanto, ela faz parte do módulo <strong style="color: ${bestMatch.color || '#3b82f6'};">${bestMatch._moduleTitle || activeData.title}</strong>, que exige um perfil de acesso diferente do seu.
                </p>
                <div style="margin-top: 8px; font-size: 0.85rem; color: #94a3b8; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #ef4444;">
                  ⚠️ <strong>Atenção:</strong> Seu perfil atual <strong>(${currentUserRole})</strong> não possui permissão. Ação reservada para: <strong>${targetRoles.join(', ')}</strong>. Se precisar executar esta ação, contate um gestor.
                </div>
              </div>
            </div>
          `;
        }
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
        ${isSearching && b._moduleTitle ? `<div style="padding-left: 8px; margin-top: 4px; color: ${b.color}; font-size: 0.78rem; font-weight: 600;"><i class="fa-solid fa-folder-open" style="margin-right: 4px;"></i> Encontrado em: ${b._moduleTitle}</div>` : ''}
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
  renderModalContent();

  // AUTO SCROLL PARA MANTER A ABA ATIVA SEMPRE CENTRALIZADA NO MENU SUPERIOR
  setTimeout(() => {
    const activeTabEl = overlay.querySelector('.manual-nav-tab.active');
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 50);

  // EVENT DELEGATION PARA MUDANÇA DE ABAS, BUSCA, AMPLIAR CARD E ROLAGEM
  overlay.addEventListener('click', (e) => {
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
