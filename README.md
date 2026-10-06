# Health Nexus — Sistema de Gestão Hospitalar

**Versão:** `2.9.23`  
**Status:** Em produção (Production-Ready)  
**Última atualização:** Outubro 2026

---

## 📘 Documentação & Manual do Usuário

- 📄 **Inclusão Oficial de Exames no PDF do PEP & Botões de Emissão Imediata (v2.9.23):**
  1. **Seção Dedicada de Apoio Diagnóstico no PDF (`4. SOLICITAÇÕES DE EXAMES DIAGNÓSTICOS & APOIO TERAPÊUTICO - SADT / CPOE`):** O documento impresso do Prontuário Eletrônico do Paciente agora integra todas as requisições de exames emitidas no atendimento com colunas para Data/Hora, Protocolo (`REQ-...`), Exame & Preparo orientado, Prioridade (Rotina / Urgência / Emergência), Indicação Clínica e CRM do Médico Solicitante.
  2. **Botão de Emissão no Cabeçalho do PEP:** Adicionado o botão `📄 Imprimir PEP (PDF)` no topo do prontuário ao lado de Teleconsulta e WhatsApp para download instantâneo do prontuário completo.
  3. **Botão no Rodapé do Formulário SOAP:** Incluído atalho `📄 Imprimir PEP (PDF)` tanto em modo de preenchimento ativo quanto em modo de auditoria/leitura.

- 🛡️ **Rastreabilidade de Exames, Novo Desfecho no PEP & Proteção Contra Alta Acidental (v2.9.22):**
  1. **Novo Desfecho Assistencial Dedicado no PEP:** Incorporada a opção `🧪 Aguardar Resultados de Exames (Laboratório / Imagem)` no seletor de desfechos do Prontuário Eletrônico, permitindo manter o paciente formalmente em atendimento ambulatorial enquanto aguarda a liberação dos laudos diagnósticos.
  2. **Comutação Automática Inteligente & Banner Orientador:** Ao adicionar qualquer exame ao pedido no PEP, o sistema altera automaticamente o desfecho para `Aguardar Resultados de Exames` e exibe um banner orientador azul com explicação assistencial clara, eliminando a seleção acidental de alta.
  3. **Guarda Preventiva Contra Alta Precoce:** Se o médico tentar mudar o desfecho para "Alta Médica" enquanto houver exames adicionados na requisição, o sistema intercepta e solicita confirmação explícita para evitar o encerramento inadvertido da passagem.
  4. **Visibilidade Contínua no Kanban de Atendimentos:** O paciente com exames solicitados permanece ativo na coluna *"Em Consulta / Exames"* com cartão destacado em azul oceano, badge luminoso pulsante `🧪 Aguardando Exames (X pedidos)` e prévia dos exames pendentes.
  5. **Aba Dedicada "🧪 Exames Solicitados" no Prontuário Consolidado:** O modal de histórico do paciente agora conta com a 3ª aba exclusiva de exames, listando número de protocolo, data/hora, lista completa de itens, prioridade, indicação clínica e botão de reimpressão da requisição técnica oficial.
  6. **Auto-Recuperação de Cadastros (Auto-Cura):** Rotina preventiva na inicialização do sistema identifica e restaura para status `Ativo` e `Aguardando_Exames` qualquer paciente que tenha recebido alta indevida possuindo requisições de exames em aberto.

- 🧪 **Setor Estruturado de Solicitação de Exames no PEP & Previsão Preditiva por IA (CPOE) (v2.9.21):**
  1. **Setor Dedicado de Exames no Prontuário Eletrônico:** Integrado logo após o Plano Terapêutico e antes do Desfecho do Atendimento, separando formalmente a prescrição de fármacos das solicitações diagnósticas (Computerized Physician Order Entry - CPOE).
  2. **Catálogo Multicomplexidade Completo:** Cobertura de rotina básica ambulatorial até exames de ponta e medicina de precisão, divididos em 4 eixos com busca textual e tags rápidas:
     - *Laboratório:* Hemograma completo, HbA1c, glicemia, perfil lipídico, creatinina com TFG, eletrólitos, coagulograma (TAP/INR), enzimas cardíacas (Troponina ultrassensível, CK-MB, NT-proBNP), lactato arterial, hemoculturas (2 pares), EAS e urocultura.
     - *Imagem:* Radiografias de tórax e abdome, ultrassonografia total e de vias urinárias, Doppler vascular venoso e de carótidas, mamografia bilateral, tomografias computadorizadas (crânio, tórax, abdome com/sem contraste, angiotomografia TEP/coronárias) e ressonância magnética (crânio, coluna, colangiorressonância).
     - *Métodos Gráficos:* ECG 12 derivações, ecocardiograma transtorácico, Holter 24h, MAPA 24h, ergometria, espirometria e EEG.
     - *Alta Complexidade & Precisão:* PET-CT oncológico, cintilografia miocárdica, painéis genéticos NGS, biópsia líquida, RT-PCR multiplex respiratório e painel farmacogenético (CYP2C19/CYP2D6).
  3. **Motor Preditivo Inteligente Baseado no Histórico do Paciente:**
     - Identifica condições crônicas preexistentes no histórico (Diabetes sugere HbA1c, microalbuminúria e creatinina; Hipertensão sugere ECG e lipídico; Cardiopatias sugerem BNP e ecocardiograma).
     - Monitora medicações contínuas (anticoagulantes como Varfarina sugerem coagulograma; amiodarona sugere TSH/fígado; lítio sugere litemia; estatinas sugerem enzimas hepáticas).
     - Cruza com a queixa atual/sinais vitais (dor torácica sugere protocolo IAM com ECG e troponina; suspeita de AVC sugere TC de crânio e INR).
     - Aplica diretrizes de rastreamento por idade e sexo (mamografia bienal 50-69 anos, sangue oculto nas fezes 50-75 anos, densitometria aos 65 anos).
  4. **Trava de Não-Duplicidade & Alerta de Contraste:** Sinaliza exames repetidos com tempo decorrido para evitar duplicidades desnecessárias e alerta sobre risco renal ou alergia ao iodo em tomografias com contraste.
  5. **Impressão da Requisição Médica Oficial & Persistência Local:** Permite emitir e imprimir requisições formatadas com indicação clínica, preparos e CRM do solicitante, além de salvar no banco `exam_requests` e anexar automaticamente os exames selecionados à assinatura do PEP.

- 🚪 **Homologação Completa da Alta Médica no PEP & Abertura Automática do Prontuário Pós-Alta (v2.9.20):**
  1. **Execução Completa da Alta no PEP:** Ao selecionar o desfecho "Alta Médica (Encerrar Consulta)" ou "Alta Hospitalar (Encerrar Internação & Liberar Leito)" e clicar em `✍️ Assinar & Encaminhar`, o sistema executa o encerramento assistencial integral:
     - Libera imediatamente qualquer leito ocupado pelo paciente no censo hospitalar (ex: leitos de UTI, enfermaria ou observação), alterando o status para `Higienizacao`, limpando a ocupação e registrando o timestamp de liberação.
     - Atualiza o registro de internação (`hospitalizations`) para `Alta` com data e hora.
     - Finaliza todos os atendimentos (`encounters`) e triagens abertas do paciente, removendo chamadas pendentes no Painel TV.
     - Registra anotação clínica oficial no prontuário (`clinical_notes`) e atualiza o cadastro do paciente com `status: 'Alta'`, `lastDischargeDate` e `receptionFinalized: true`.
  2. **Transição Automática para a Aba Pacientes:** O modal do PEP é fechado e a aplicação transiciona automaticamente para a aba **Pacientes**, eliminando retenção indevida no consultório.
  3. **Abertura do Prontuário com Destaque da Última Alta Concedida:** Na aba Pacientes, a tabela é filtrada pelo nome do paciente e o modal de **Prontuário & Histórico Clínico** abre imediatamente, exibindo no topo o card oficial de alta com a data e horário exatos da liberação (`🗓️ Data da Última Alta Concedida: DD/MM/AAAA às HH:MM`) e confirmação de ciclo assistencial finalizado.

- 📺 **Eliminação Definitiva de Duplicidades no Painel TV (Chamador) & Filtro de Internados (v2.9.19):**
  1. **Deduplicação Estrita por Paciente na Fila:** Corrigida a ausência de controle de unicidade em `loadTVWaitingQueue`. Cada paciente agora é indexado e normalizado de forma única (`normName`), garantindo que um mesmo paciente jamais apareça em dois cards concorrentes (#90, #91, etc.) na fila do telão da recepção.
  2. **Filtro Automático de Pacientes Internados e com Alta:** Pacientes já admitidos em leitos hospitalares, enfermarias ou UTI (`status: 'Internado'`), acomodados em leitos ocupados ou que receberam alta médica (`status: 'Alta'`) não aguardam na sala de espera e são filtrados automaticamente da fila do Painel TV.
  3. **Auto-Reconciliação no Banco de Dados (`localDB`):** Ao carregar a fila ou registrar transferência para leito (`/transfer-to-bed`), o sistema identifica e encerra automaticamente atendimentos ambulatoriais órfãos (`Em_Atendimento`) de pacientes que já foram admitidos em leitos hospitalares, limpando registros residuais permanentemente.
  4. **Conduta Clínica Consciente no Smart Flow Guide:** Ao abrir a aba do Painel TV com um paciente internado em foco (ex: Leito de UTI), o Guia de Fluxo identifica o paciente no leito e orienta a conduta correta (acesso ao Mapa de Leitos e Evolução no Prontuário PEP), eliminando recomendações inconsistentes de chamá-lo à recepção.

- 📋 **Acionamento Completo do Botão "Ver Prescrição" no Card de Fluxo & Tabela da Farmácia (v2.9.18):**
  1. **Abertura Imediata do Receituário pelo Card de Fluxo:** O botão de ação recomendada `📋 Ver Prescrições de [Paciente] ➔` no Smart Flow Guide (Painel de Governança) agora executa a navegação completa: direciona para a aba de Farmácia, ativa a sub-aba de prescrições (`rx`), filtra a tabela pelo paciente em foco e abre instantaneamente o modal completo de **Receituário & Prescrição Médica** com todos os fármacos, doses, vias e checagens da enfermagem.
  2. **Botão Dedicado "Ver Prescrição" na Tabela da Farmácia:** Cada linha de prescrição na tabela de circuito fechado da Farmácia passou a contar com o botão dedicado `📄 Ver Prescrição`, permitindo abrir a qualquer momento a visualização detalhada da receita médica.
  3. **Emissão Direta de PDF na Etiqueta de Dispensação:** O botão `Etiqueta / Guia` aciona de forma integrada o download do PDF oficial da prescrição com todas as dosagens, aprazamento e identificação do prescritor.
- 💊 **Busca e Autocomplete de Medicamentos via API (ANVISA / OpenFDA) & Catálogo Hospitalar (v2.9.18):**
  1. **Catálogo Hospitalar Pré-carregado:** Incorporada lista pré-carregada e imediata de soluções cristaloides (Ringer Lactato, Soro Fisiológico, Glicose), drogas vasoativas de UTI (Noradrenalina, Adrenalina, Dobutamina, Dopamina), sedativos, analgésicos e antimicrobianos, garantindo sugestões instantâneas ao digitar a partir de 2 letras.
  2. **Consulta Dinâmica à API ANVISA & Base OpenFDA:** Ao digitar o nome do medicamento na prescrição ou na farmácia, o sistema consulta a API oficial e a base internacional OpenFDA com sintaxe Lucene compatível e termos mapeados, retornando princípios ativos, apresentações farmacêuticas e vias de administração com badges visuais (`🏥 Hospitalar`, `⚡ ANVISA`, `⚡ OpenFDA`).
  3. **Feedback Visual de Busca & Fallback Resiliente:** Adicionado indicador de busca em tempo real (`Consultando ANVISA / base farmacêutica...`) enquanto os dados são obtidos, com fallback direto no navegador caso o backend esteja em modo desconectado. A mensagem de "medicamento livre / não tabelado" só é exibida se nenhuma base encontrar o termo, assegurando flexibilidade para fármacos especiais.
- 📄 **Correção da Emissão & Download de PDF da Prescrição Médica (v2.9.18):**
  1. **Resolução de Incompatibilidade de Dados:** Corrigido o extrator de medicamentos no gerador de PDF (`generatePrescriptionPDF`), que tentava realizar o parse exclusivamente de `medicationsJson` (campo inexistente na estrutura atual), provocando erro de execução e travando o clique no botão `Imprimir PDF`.
  2. **Suporte Multi-Formato & Fallback:** A função agora suporta com segurança arrays nativos (`prescription.medications`), strings serializadas e coleções de itens, além de buscar automaticamente no `localDB` caso a prescrição não esteja retida em memória.
  3. **Proteção de Tabelas & Logomarca:** O cabeçalho e a renderização do AutoTable foram blindados contra falhas de imagem, garantindo que o documento seja baixado imediatamente com carimbo de autenticidade, prescritor e tabela de medicamentos preenchida.
- 🩺 **Abertura Direta do Formulário Clínico no PEP & Eliminação de Botões Redundantes (v2.9.18):**
  1. **Abertura Imediata no Formulário SOAP ao Atender:** Ao clicar em `Atender (PEP)` no Painel de Consultórios, na Central de Atendimentos ou no Guia de Fluxo, a janela do Prontuário Eletrônico abre diretamente no **Formulário do PEP (SOAP)** com todos os campos prontos para preenchimento imediato (Subjetivo, Objetivo com sinais vitais, Avaliação com CID-10, Conduta/Prescrição e resumo IA Copilot 2.0), eliminando a necessidade de cliques intermediários em abas ou listas.
  2. **Eliminação de Botões Duplicados:** Corrigida a redundância visual onde o cabeçalho do modal e a lista de registros apresentavam simultaneamente dois botões idênticos "Incluir Novo PEP" a poucos pixels de distância. O cabeçalho foi despoluído (mantendo Teleconsulta, WhatsApp e Fechar) e a ação de nova evolução ficou concentrada de forma limpa e única no painel de histórico.
  3. **Histórico Sempre Acessível:** A aba `📋 Histórico de PEPs Existentes` continua acessível a qualquer momento como segunda aba e pelo botão `← Voltar para Lista de PEPs` no formulário.
- 💰 **Emissão de Guia TISS Individual & Fechamento de Lotes ANS (v2.9.18):**
  1. **Acionamento Direto na Tela de Faturamento:** Além do Smart Flow Guide, o botão principal **`📄 Emitir Guia Individual`** no cabeçalho da aba de Faturamento TISS abre a janela de faturamento imediatamente com tratamento de exceções blindado para qualquer paciente da base cadastral.
  2. **Seletor Dinâmico de Pacientes:** O modal conta com um campo suspenso dedicado (`Selecionar / Alternar Paciente para Emissão da Guia`), permitindo alternar instantaneamente entre qualquer paciente do hospital com recálculo automático de procedimentos, convênios e valores.
  3. **Direcionamento Imediato pelo Card de Fluxo:** Ao clicar em `💰 Emitir Guia TISS de [Paciente] ➔` no Smart Flow Guide (tanto no card flutuante quanto no painel lateral de governança), o sistema agora transiciona instantaneamente para a aba dedicada de **Faturamento TISS** (`tiss`). Corrigido o comportamento anterior, onde o botão mantinha o usuário retido no relatório financeiro sem disparar a emissão.
  4. **Modal Completo de Fechamento de Guia TISS (Padrão ANS v4.01):** A ação abre automaticamente a janela de emissão de guia centrada na tela, já pré-carregada com os dados do paciente (nome, CPF, matrícula ou CNS, classificação Manchester e confirmação da alta médica).
  5. **Conferência de Procedimentos TUSS & Valores:** O modal apura os procedimentos médicos realizados (Consulta Pronto-Socorro / Acolhimento TUSS `10101012`, Avaliação Médica de Urgência TUSS `20101015` e Diária Hospitalar TUSS `60011501` caso tenha havido internação em leito), permitindo conferência transparente dos honorários e do valor total da conta.
  6. **Vinculação ao Lote e Geração de XML Eletrônico:** A equipe pode vincular a guia a um lote aberto existente da operadora (Unimed, Bradesco, SulAmérica, Amil ou Particular) ou criar um novo lote automaticamente, além de poder baixar o arquivo XML individual ou o lote completo validado contra glosas para envio à operadora.
- ⚡ **Card de Fluxo como Espinha Dorsal Operacional & Sincronização em Tempo Real da Alta (v2.9.18):**
  1. **Ação do Card como Guia e Condutor Real:** O botão principal de ação recomendada no Smart Flow Guide (tanto no card flutuante quanto no painel lateral acoplado) atua como a espinha dorsal do sistema. Ao clicar em `📋 Finalizar Atendimento na Recepção ➔`, a plataforma executa imediatamente a baixa de acolhimento: finaliza todos os atendimentos (*encounters*) e triagens abertas do paciente, cancela chamadas no Painel TV, libera leitos ocupados para higienização e avança o guia para o Faturamento TISS.
  2. **Atualização Instantânea na Tabela de Pacientes:** Ao conceder alta no Prontuário Eletrônico (PEP) ou finalizar na recepção pelo Card de Fluxo, o cadastro do paciente na tabela de Pacientes Cadastrados passa a exibir imediatamente o crachá verde com a data e horário exatos da liberação: `🟢 Alta — DD/MM/AAAA às HH:MM ➔`.
  3. **Proteção Contra Sobreposição:** O mecanismo de localização atual (`getPatientCurrentLocation`) agora verifica e respeita a alta médica concedida, impedindo que atendimentos antigos já concluídos sobreponham o status com "Sala de Espera" ou outras etapas superadas.
- 🔀 **Correção Visual do Modal de Transferência de Setor & Sincronização Multissetorial (v2.9.18):**
  1. **Resolução de Tela Borrada ao Mover Setor:** Corrigido problema estrutural no modal de mudança de ala (`movePatientSectorFromHistory`), onde a máscara escura de fundo (`modal-overlay`) fechava antes do corpo do diálogo, gerando uma cortina escura embaçada sobre o prontuário. O modal foi reconstruído com layout moderno centrado na tela, exibindo cabeçalho estilizado, identificação do paciente, setor de origem e seletor intuitivo da ala de destino.
  2. **Procedimento de Mudar de Setor (Regulação Interna):** Na prática hospitalar, "Mover Setor" representa a transferência interna do paciente entre diferentes unidades assistenciais (por agravo clínico para UTI, por melhora para Enfermaria, ou por preparo cirúrgico). A confirmação sincroniza em cascata o Kanban de Internação (reiniciando o SLA do novo setor), o Censo de Leitos, o prontuário clínico e a localização do paciente no Smart Flow Guide.
  3. **Redirecionamento Imediato para o Setor Alocado:** Ao confirmar a mudança de setor, o sistema encerra os modais e navega imediatamente para o **Kanban de Internação**, aplicando o filtro da ala de destino e centralizando suavemente o card do paciente com realce pulsante (*spotlight glow*), assegurando visualização instantânea de onde o paciente foi alocado.
- 📋 **Ordenação Rigorosa de PEPs & Histórico Clínico (Mais Recente Sempre no Topo) (v2.9.18):**
  1. **Mais Recente no Topo em Todas as Listagens:** Tanto na aba `Listagem de PEPs Existentes` do modal médico quanto nas `Evoluções por Ala` e na `Linha do Tempo Visual` do histórico do paciente, as evoluções clínicas são rigorosamente ordenadas de forma cronológica decrescente: o registro mais recente fica sempre no topo e os mais antigos ficam abaixo.
  2. **Resolução Abrangente de Timestamps:** A ordenação avalia a data mais recente de qualquer evento associado à passagem (`updated_at`, `lastStatusUpdate`, `completed_at`, `discharged_at`, `closed_at`, `observation_started_at`, `admitted_at`, `triaged_at`, `created_at`), garantindo que alterações recentes, altas ou rascunhos em andamento assumam o primeiro lugar imediatamente.
  3. **Data e Hora Humanizadas em Cada Card:** Exibição consistente da data e horário exatos da evolução (`DD/MM/AAAA às HH:MM`), eliminando traços ou datas em branco e facilitando a tomada de decisão da equipe médica e assistencial.
- 🧭 **Acoplamento Multidirecional em 4 Lados da Tela & Cockpit Horizontal do Smart Flow Guide (v2.9.18):**
  1. **4 Posições de Ancoragem Fixa e Modo Flutuante:** O Smart Flow Guide (Painel de Governança) agora oferece liberdade total de organização espacial: **Lateral Direita** (420px), **Lateral Esquerda** (420px), **Topo da Tela** (barra horizontal estilo Cockpit de 74px) e **Base da Tela** (barra horizontal estilo Cockpit de 74px), além do modo **Card Flutuante Livre**.
  2. **Cockpit Horizontal em Linha (Topo e Base):** Ao acoplar no topo ou na base, o painel assume o formato de fita horizontal compacta (74px de altura) com o paciente ativo, a linha do tempo de 7 etapas da jornada hospitalar em linha, o atalho para a próxima ação recomendada e os controles de janela, liberando 100% da largura útil da tela para tabelas densas, censo de leitos e prontuários.
  3. **Zonas de Encaixe com Iluminação Neon Dinâmica (Snap Inteligente):** Ao arrastar o card flutuante em direção a qualquer uma das 4 bordas da tela (< 130px nas laterais, < 80px no topo/base), uma moldura luminosa em azul-neon surge destacando a borda correspondente, o sistema pré-adapta o espaço central em tempo real e um crachá centralizado informa a direção ativa (`➡️ Solte para Fixar na Lateral Direita`, `⬅️ Solte para Fixar na Lateral Esquerda`, `⬆️ Solte para Fixar no Topo da Tela` ou `⬇️ Solte para Fixar na Base da Tela`). Ao soltar, a fixação ocorre suavemente com som de confirmação (*chime*).
  4. **Menu Popover de Seleção Rápida em 1 Clique:** Botão dedicado no cabeçalho com ícone de miras direcionais (`fa-arrows-to-dot`) abre um seletor visual para alternar instantaneamente entre qualquer um dos 4 lados ou desencaixar para o modo flutuante livre.
  5. **Persistência de Preferência no Navegador:** A orientação escolhida fica gravada em `localStorage: hn_flow_dock_pos`, sendo preservada entre sessões, abas e recarregamentos.
- 🔍 **Varredura Completa de Visualização & Correção de Ícones e Ações Ocultas (v2.9.17):**
  1. **Fixação Sticky da Coluna de Ações:** Na tabela de pacientes cadastrados e demais tabelas clínicas (Farmácia, TISS, Financeiro), a coluna de **Ações** agora possui fixação permanente (`position: sticky; right: 0; background: var(--bg-secondary); z-index: 6; box-shadow: -8px 0 16px rgba(0,0,0,0.45)`). Isso assegura que os 5 botões de ação essenciais (*Admitir no PS*, *Prontuário/Histórico*, *Gerar PDF*, *Editar Cadastro* e *Excluir*) fiquem **100% visíveis e operacionais**, mesmo quando o Painel de Governança estiver acoplado à direita ou em notebooks e telas de 1366x768.
  2. **Condensação Inteligente de Metadados:** Em telas compactas ou quando o painel lateral estiver aberto, as colunas secundárias de baixa prioridade de triagem imediata (*Cidade*, *Telefones*, *Valor da Conta* e *CPF*) deixam de ocupar colunas extras avulsas e passam a ser exibidas de forma elegante e harmoniosa em linhas secundárias sob o nome do paciente, com micro-ícones informativos (🎂 Data de Nascimento, 📞 Telefone, 📍 Cidade e 🪪 CPF). Nenhuma informação é perdida e a tabela ganha mais de 450px de respiro visual.
  3. **Kanban de Atendimentos Sem Esmagamento:** Ajuste responsivo na grade de 4 colunas da Central de Atendimentos (`minmax(250px, 1fr)` com rolagem horizontal suave), eliminando sobreposição ou quebra de palavras nos botões de conduta dos cards (*PEP*, *Prescrição*, *Observação*, *Finalizar* e *Chamar Painel*).
  4. **Proteção de Tabelas Financeiras:** O container de parcelas e títulos em Relatórios e TISS passou a operar com `overflow-x: auto` e scrollbar fina integrada, prevenindo cortes involuntários.
- 🩺 **Resiliência Local & Correção na Central de Atendimentos (v2.9.16):** Resolução definitiva do erro visual nas 4 colunas Kanban (*Aguardando Triagem*, *Aguardando Médico*, *Em Consulta*, *Em Observação (PS)*). Foi corrigida a referência segura ao objeto de governança (`window._SFG`) e garantida a ordem estrita de inicialização das funções construtoras de cards (`buildTriageCard`, `buildWaitCard`, `buildActiveCard`, `buildObsCard`). Adicionalmente, implementou-se fallback automático e transparente para o banco local (`localDB`) na ausência de resposta da rede, substituindo mensagens impeditivas por estados vazios assistenciais humanizados e acolhedores com botão de atualização rápida.
- 📺 **Correção de Diagramação & Desencavalamento dos Cards da Fila no Painel TV (v2.9.15):** Reestruturação completa do layout dos cards de pacientes aguardando chamada na TV. Anteriormente, em grids de 4 colunas ou telas menores, os botões "Chamar" e "Consultório" ficavam sobrepostos ("remontados") em cima do badge de status clínico e escondiam o nome do paciente. Os cards foram reorganizados em níveis verticais harmoniosos (linha 1: avatar, nome completo do paciente e número da fila; linha 2: badge de status e etiqueta de foco; linha 3: botões de ação com largura distribuída), garantindo zero sobreposição, legibilidade total e acionamento direto sem colisões visuais.
- 🔍 **Efeito Físico de Descolamento 3D & Ampliação de Cards e Letras no Guia de Fluxo (v2.9.14):** Experiência visual refinada e focada para o Card de Fluxo e Painel Lateral de Governança:
  1. **Descolamento e Elevação 3D:** Ao manter o mouse posicionado sobre qualquer card ou bloco interno (Módulo Atual, Paciente em Foco, Ação Recomendada, cards métricos do Radar Hospitalar ou atalhos de conduta), o card específico "descola" da superfície com elevação (`translateY(-6px)`), fundo sólido de alto contraste, ampliação evidente de 8% a 10% (`scale(1.075)` a `scale(1.10)`) e sombra profunda com realce ciano.
  2. **Ampliação das Letras e Legibilidade:** Textos, números e badges ampliam proporcionalmente junto ao card, com nitidez otimizada e sem qualquer corte lateral.
  3. **Troca e Retorno Suave:** Ao retirar o cursor ou mover entre cards, o card anterior retorna suavemente à posição plana de repouso enquanto o novo card se descola instantaneamente.
  4. **Navegação Normal e Fluida ao Clicar:** Clicar sobre qualquer card continua respondendo de forma imediata, direcionando para a etapa clínica indicada.
- 📅 **Padronização de Data de Nascimento em Formato Brasileiro (DD/MM/AAAA) (v2.9.13):** Correção no cabeçalho do Prontuário & Histórico Clínico do Paciente. Datas cadastradas em padrão ISO (`AAAA-MM-DD`, ex: `1980-05-05`) agora são exibidas de forma amigável no formato nacional `DD/MM/AAAA` (ex: `05/05/1980`), garantindo leitura assistencial clara e em conformidade com as boas práticas de documentação médica.
- ⚡ **Inicialização Inteligente & Suporte Completo Dual-Stack (IPv4/IPv6) (v2.9.12):** Otimização da rotina de inicialização local (`iniciar-sistema.bat` e atalho de desktop). Anteriormente, ao abrir pelo atalho no notebook, o navegador abria com timeout cego de 5 segundos enquanto o servidor Node ainda estava subindo, além do Vite ficar restrito apenas ao IPv6 loopback (`::1`), fazendo o Chrome acusar `ERR_CONNECTION_REFUSED` caso tentasse conexão via IPv4 (`127.0.0.1`). Agora:
  1. O servidor Vite foi explicitamente configurado com `host: '0.0.0.0'` e proxy direto IPv4, garantindo resposta imediata tanto por `localhost` quanto por `127.0.0.1` e pela rede local.
  2. Inicialização via atalho direto com comando nativo do Windows e tempo otimizado de 2 segundos.
  3. Adicionado `cd /d "%~dp0"` no inicializador em lote, assegurando execução estável a partir de qualquer pasta, atalho da Área de Trabalho ou barra de tarefas.
- 🩺 **Abertura Direta da Folha de Evolução Médica (PEP) na Ação Recomendada (v2.9.11):** Ao clicar no botão em destaque **"🩺 Abrir Folha de Evolução (PEP) de [Nome] ➔"** no Smart Flow Guide (tanto no card flutuante quanto no painel de governança acoplado à direita), o Prontuário Eletrônico abre imediatamente com os dados do paciente em atendimento e transiciona diretamente para o **Formulário do PEP (SOAP)**, pronto para a digitação da anamnese, exame físico, hipótese diagnóstica CID-10 e prescrição médica. Elimina qualquer tentativa de rolagem em cards inexistentes de consultório físico quando o paciente estiver acomodado em poltrona de observação ou leito, garantindo agilidade assistencial e resposta imediata com um único clique.
- 🔍 **Correção Responsiva & Alinhamento Inteligente da Busca Global (Spotlight / Ctrl+K) (v2.9.10):** Correção completa de sobreposição e esmagamento do menu suspenso de busca global. Anteriormente, quando o painel lateral de governança estava acoplado na direita (`420px`), o espaço horizontal do cabeçalho superior era comprimido, reduzindo o campo de busca para dimensões mínimas e forçando o dropdown a herdar uma largura estreita e ilegível com quebras verticais de palavras. Foi implementada uma arquitetura responsiva inteligente:
  1. O container de resultados agora possui largura fixa otimizada (`540px`, limitado a `calc(100vw - 32px)`), cálculo dinâmico de centralização e margem de segurança contra as bordas da tela.
  2. Eliminação total de barras de rolagem horizontais (`overflow-x: hidden`).
  3. Adaptação orgânica dos elementos do cabeçalho quando o painel lateral estiver acoplado, ocultando subtítulos redundantes e condensando botões para garantir espaço amplo e confortável para o campo de pesquisa.
- 💡 **Encaixe Magnético Neon & Adaptação Fluida de Layout ao Arrastar o Card de Fluxo (v2.9.10):** Ao arrastar o card flutuante do Smart Flow Guide em direção à borda direita da tela, o sistema hospitalar inicia uma animação orgânica e inteligente:
  1. A área de destino (`width: 420px`, `100vh`) acende sutilmente com um gradiente neon ciano translúcido (`rgba(56, 189, 248, 0.04)`), borda de pulso suave e o badge luminoso `Solte para Acoplar Painel`.
  2. **Sincronização Dinâmica do Badge:** A mensagem indicativa em formato pílula neon acompanha em tempo real toda a movimentação vertical do card pelo cursor ou toque, posicionando-se sempre com elegância logo abaixo da base do card flutuante (com respiro de segurança de viewport para nunca ser cortada).
  3. Concomitantemente, o container do sistema (`.app-container`) se contrai de forma fluida (curva `cubic-bezier(0.16, 1, 0.3, 1)`), abrindo espaço antecipadamente na tela e eliminando qualquer salto abrupto ou sobreposição.
  4. Se o usuário mover o card de volta para o centro da tela, a área neon se dissolve e o layout retorna suavemente à largura total.
  5. Ao soltar na zona de acoplamento, a transição para o Painel Lateral fixo ocorre instantaneamente sem sobressaltos visuais, mantendo o fluxo assistencial em perfeito andamento.
  6. Suporte completo a telas sensíveis ao toque (tablets e monitores assistenciais touchscreen).
- 🎯 **Isolamento de Sessão & Desmarcação Rápida de Paciente no Smart Flow Guide (v2.9.9):** Eliminação completa de retenção persistente de pacientes em evidência (impedindo que nomes legados fiquem assombrando a navegação sem interação do usuário). O contexto do paciente agora utiliza escopo estrito de sessão (`sessionStorage`), com expurgo automático de chaves residuais de armazenamento local. Foi implementado o botão de ação rápida **`✕ Desmarcar`** diretamente no cabeçalho do card do paciente no Smart Flow Guide e atalho de liberação imediata, permitindo alternar instantaneamente entre a condução individual do paciente e a visão geral da unidade hospitalar. Além disso, a troca de abas passou a verificar se há paciente real em foco antes de emitir qualquer destaque visual, prevenindo marcações fantasmas em tabelas, quadros Kanban e filas de atendimento.
- 🧭 **Smart Flow Guide com Adaptação Omnidirecional Estrita por Aba Ativa (v2.9.8):** O Guia de Fluxo Inteligente — a espinha dorsal de governança assistencial do Health Nexus — agora adapta suas recomendações, botões de ação e alternativas em tempo real e de forma 100% precisa em conformidade com a aba clicada pelo usuário. Qualquer navegação na barra lateral ou no cabeçalho (Dashboard, Recepção, Triagem, Consultórios, Farmácia, Leitos, Kanban, Faturamento/TISS, Agenda, Escalas, Estagnação, Relatórios, Configurações) sincroniza instantaneamente o card, mantendo o contexto do paciente ativo (quando houver) contextualizado dentro daquela tela específica, sem desvios forçados ou perda de foco operacional.
- 🏠 **Abertura Padrão no Dashboard & Consistência do Smart Flow Guide (v2.9.7):** Ao entrar no sistema — no primeiro acesso, após novo login ou na recuperação de sessão —, o Health Nexus abre obrigatoriamente no **Dashboard Principal** (Painel Geral), garantindo que a equipe já visualize de imediato os indicadores de plantão, ocupação e volume assistencial. O Smart Flow Guide se posiciona de forma consistente, exibindo a etapa inicial de acolhimento (Recepção), orientando o cadastro ou localização na fila, mantendo preservada a sua preferência de fixação (painel acoplado ou card flutuante). Além disso, clicar no logotipo ou no título principal *Health Nexus* no topo do sistema retorna instantaneamente ao Dashboard a partir de qualquer módulo operacional.
- 🧭 **Smart Flow Guide com Acoplamento Lateral Dinâmico & Desacoplamento Fluido por Arrasto (v2.9.6):** O card flutuante de governança clínica e condução passo a passo agora pode ser arrastado até a lateral direita da tela (ou acoplado com um clique no botão dedicado no topo do card), transformando-se instantaneamente em um **Painel Lateral do Sistema** em altura total (`100vh`). O layout do sistema se adapta de forma fluida (`calc(100vw - 420px)`), garantindo que nenhuma tela, tabela, gráfico ou prontuário fique encoberto. O painel expandido enriquece a experiência assistencial com radar hospitalar ao vivo (contadores de fila na Recepção, Triagem, Consultórios e Leitos ocupados), visão aprofundada do paciente ativo com atalhos imediatos para o PEP e Painel TV, e linha do tempo clínica com 7 etapas interativas. Para voltar ao formato menor flutuante, basta clicar no cabeçalho do painel e arrastá-lo para a esquerda (centro da tela) ou clicar no botão de desacoplamento, restaurando a janela compacta sem perder o contexto do atendimento.
- 🔄 **Sincronização Bidirecional e Mapeamento Canônico Leitos & Kanban de Internação (v2.9.5):** Unificação transparente entre as alas físicas de leito (*UTI Adulto*, *UTI Pediátrica*, *CTI*, *Enfermaria*, *Isolamento*, *Pediatria*) e as colunas operacionais do Kanban (`uti`, `clinica_medica`, `clinica_cirurgica`, `pronto_socorro`). Elimina divergências entre nomes descritivos de alas e identificadores internos de coluna, garantindo que qualquer paciente alocado em leito de UTI ou enfermaria apareça de imediato no quadro Kanban, nos contadores dos filtros superiores, no Funil da Jornada Hospitalar e nas metas de tempo (SLA), com reconciliação automática de registros legados.
- 🚨 **Alerta Pulsante de Observação > 12h no PEP & Instrução de Decisão Clínica (Resolução CFM nº 2.079/14):** Ao abrir o Prontuário Eletrônico (PEP) de paciente com permanência em observação excedendo o limite regulamentar de 12 horas, o card da observação em aberto pulsa continuamente com halo de alerta (`pep-obs-pulse-alert`), badge normativo `PERMANÊNCIA > 12H` e botões de ação imediata. Simultaneamente, o painel lateral de Governança Clínica (Smart Flow Guide) calcula e exibe os parâmetros vitais reais do paciente (PA, FC, Temp, SpO2, MEWS, Manchester) instruindo os dois caminhos clínicos: **Internação Hospitalar imediata (UTI/Enfermaria)** em caso de agravo/instabilidade hemodinâmica ou **Alta Médica da Observação** em caso de estabilidade e melhora clínica.
- 🩺 **Prontuário Eletrônico (PEP) com Listagem Direta & Inclusão Intuitiva:** Ao clicar em *Abrir PEP*, o sistema apresenta de imediato a listagem de todas as evoluções clínicas anteriores do paciente organizadas cronologicamente por ala/setor. Inclui botão de ação rápida `➕ Incluir Novo PEP` no cabeçalho e topo da lista, cards informativos com prévia dos blocos SOAP, visualizador detalhado com carimbo CFM e botão `← Voltar para Lista de PEPs` para navegação fluida sem fechar o modal.
- 🛡️ **Trava de Alerta Assistencial para PEP Pendente de Finalização / Em Andamento:** Proteção clínica ativa ao clicar em `➕ Incluir Novo PEP`. Se o paciente já possuir uma evolução médica iniciada e não finalizada/assinada (Rascunho), o sistema bloqueia a criação cega de folhas duplicadas e exibe um modal de decisão clínica estruturado: detalha o setor, profissional, data/hora da última alteração, hipótese diagnóstica e prévia da anamnese, permitindo ao médico: (1) *Continuar Editando PEP Existente*, (2) *Abrir Nova Folha de Evolução Mesmo Assim* ou (3) *Cancelar*.
- ✍️ **Humanização Assistencial Contínua & Redação Natural (pt-BR):** Regra permanente de workspace (`.agents/rules/humanizacao.md` e `AGENTS.md`) e skill `humanizer` ativas em todo o sistema, telas e documentações. Elimina clichês robóticos de IA e adota linguagem empática, direta e com voz ativa para equipes de enfermagem, médicos, recepção e pacientes.
- ⚠️ **Alerta e Trava Antiduplicidade de Atendimento Ativo:** Sistema de segurança assistencial que bloqueia a criação inadvertida de novos atendimentos para pacientes que já possuem passagem ativa no Pronto-Socorro (em Triagem, Consultório, Leito ou Observação). Apresenta modal com localização física, status clínico e tempo no PS, disponibilizando ações de *Visualizar Atendimento em Andamento*, *Encerrar Anterior e Abrir Novo* ou *Cancelar*.
- 🛏️ **Sala de Observação Consolidada (1 Card por Paciente):** Deduplicação inteligente de vagas na Sala de Observação e no Kanban de Atendimento (Resolução CFM nº 2.079/14), auto-higienizando registros duplicados legados no banco e garantindo integridade visual e documental.
- 🧭 **Linha do Cuidado & Trajetória Completa do Paciente (Patient Journey Timeline):** Rastreabilidade assistencial de ponta a ponta desde a Recepção &rarr; Triagem Manchester &rarr; Chamada TV &rarr; Consultório PEP SOAP ou Observação do PS &rarr; Farmácia & Prescrição &rarr; Gestão de Leitos &rarr; Alta Médica com histórico por períodos de atendimento.
- 🛏️ **Observação do Pronto-Socorro (PS) & Resolução CFM nº 2.079/14:** Módulo dedicado à supervisão de pacientes em leitos/poltronas de observação no PS, com metas normativas de reavaliação médica (12h) e permanência máxima (24h), cronômetro ao vivo com alertas de SLA, 4 KPIs rápidos e ações clínicas integradas (PEP, Prescrição, Internação hospitalar definitiva e Alta da observação com registro temporal).
- 🔄 **Kanban de Atendimento com 4 Colunas & Desfecho Duplo na Triagem:** Central de atendimentos com fluxo completo: *Aguardando Triagem* &rarr; *Aguardando Atendimento* &rarr; *Em Consulta* &rarr; *Em Observação (PS)*. Na Triagem Manchester, o enfermeiro pode direcionar o paciente para *Consultório Médico* ou diretamente para *Observação do PS*.
- 🛏️ **Gestão de Leitos em Tempo Real & Censo Crítico:** Alocação de leitos estratificada (UTI Adulto, UTI Neonatal, Semi-UTI, CTI, Clínica Médica, Clínica Cirúrgica, Pediatria, Maternidade e Isolamento) com sincronização imediata de cache (`/transfer-to-bed`, `/admit`), realce visual pulsante no mapa de leitos (`⚡ Paciente em Foco`) e proteção contra filtros que possam ocultar o leito selecionado.
- 🎯 **Smart Flow Guide (Guia de Fluxo Inteligente Assistencial):** Na etapa de Leitos e Internação, mantém foco clínico estrito na condução terapêutica do paciente internado (Evolução Médica no PEP como ação primária, com opções de alta, foco no leito e acompanhamento no Kanban), impedindo desvios prematuros para fechamento de conta antes da alta médica definitiva.
- 🌐 **Manual Interativo por Abas (SPA):** Acessível diretamente pelo botão `📖 Manual do Usuário` no topo do sistema ou pela busca global `Ctrl + K`.
- 🧩 **Arquitetura Frontend Modular (`src/modules/`):** Código desacoplado em módulos de responsabilidade única (`ui.js`, `sync.js`, `api.js`, `auth.js`, `journey.js`) garantindo alta manutenibilidade, isolamento de escopo e facilidade para testes automatizados.
- 📌 **Navegação Assistida & Retorno Rápido:** Ao pesquisar e navegar para qualquer tela pelo manual, um widget flutuante de retorno (*Floating Return Beacon*) é ativado no canto inferior direito (`Alt + M`) com destaque visual do card (*Smart Highlight Pulse*).
- ☁️ **Sincronização em Nuvem de Alta Disponibilidade (Dual-Pipeline):** Sincronização atômica e resiliente entre navegadores e Turso Cloud LibSQL com fallback direto HTTP, timeout de 15s, retentativas automáticas e feedback de contagem de registros.
- 📕 **Documento PDF Oficial de Impressão:** [Manual_do_Usuario_Health_Nexus.pdf](file:///c:/Health%20Nexus/Manual_do_Usuario_Health_Nexus.pdf) e [Manual_Fluxo_Operacional_Health_Nexus.pdf](file:///c:/Health%20Nexus/Manual_Fluxo_Operacional_Health_Nexus.pdf)
- 📄 **Manual Completo em Markdown (Com Fluxogramas):** [MANUAL_DO_USUARIO_HEALTH_NEXUS.md](file:///c:/Health%20Nexus/MANUAL_DO_USUARIO_HEALTH_NEXUS.md)
- 🔑 **Lista de Logins & Credenciais de Médicos/Enfermeiros:** [LOGINS_MEDICOS_ENFERMEIROS.txt](file:///c:/Health%20Nexus/LOGINS_MEDICOS_ENFERMEIROS.txt)

---

## 🏗️ Infraestrutura & Integrações

| Serviço | Status | Descrição |
|---|---|---|
| 🐙 **GitHub** | ✅ Ativo | Branch `main` · Commits disparam deploys automáticos |
| ▲ **Vercel** | ✅ Ativo | Hospeda Frontend (Vite) + Backend (Express API serverless) |
| 🗄️ **Turso (LibSQL)** | ✅ Ativo | Banco de dados edge distribuído com Dual-Pipeline de sincronização |
| 📊 **OpenFDA / ANVISA** | ✅ Ativo | Busca de medicamentos por nome genérico ou comercial — gratuito |
| 🧠 **CFM Portal** | ✅ Ativo | Verificação de CRM médico via portal oficial CFM |
| 📍 **ViaCEP** | ✅ Ativo | Autopreenchimento de endereço por CEP |
| 🏥 **CID-10** | ✅ Ativo | Base completa embarcada localmente (offline-first) |

---

## 📦 Stack Tecnológica

- **Frontend:** HTML5 + JavaScript (Modular SPA em `src/modules/` e `src/tabs/`) · Vite 5 · Chart.js · jsPDF · SheetJS
- **Backend:** Node.js + Express.js (API REST) · JWT · Bcrypt
- **Banco de dados:** SQLite local (`local.db`) + Turso cloud (LibSQL) via `@libsql/client`
- **CSS:** Design System próprio — Glassmorphism dark + Light mode completo
- **Tipografia:** Outfit (títulos) + Inter (corpo) via Google Fonts
- **Ícones:** Font Awesome 6

---

## 🧩 Módulos Implementados (Visão Geral 360º)

1. **Autenticação & Controle de Acesso (RBAC)**  
   Login com JWT e gestão de papéis: `Master`, `Médico`, `Enfermeiro`, `Recepcionista`, `Desenvolvedor`, `Administrador`, `Farmacêutico`, `Gestor Financeiro`, `Biomédico`, `Auxiliar`.  
   - Liberação de logins para corpo clínico com acessos operacionais restritos.
   - Auditoria de segurança de acessos (últimos 5 acessos e modal de auditoria até 100 acessos por usuário).
   - **Purga de Usuários de Simulação com Lista de Exceções (*Whitelist*):** Ferramenta exclusiva do Usuário Master (`mazzarowysk`) para expurgar contas fictícias geradas por testes em lote, com seleção visual e proteção automática de contas vitais (`mazzarowysk`, `bcoltri`, `ffacco`, `admin`, `pforte`).
   - Preservação inteligente de usuários durante a limpeza/geração de dados de teste.

2. **Dashboard (Health Nexus)**  
   KPIs e gráficos gerenciais em tempo real via Chart.js:  
   - Atendimentos por período, taxa de ocupação de leitos, receita mensal e evolução de pacientes.
   - **Gráficos e Funis Interativos:** Gráficos funcionam como botões e filtros dinâmicos que redirecionam para as listas com os dados já filtrados.

3. **Agenda de Consultas**  
   - Agendamento inteligente com seleção de médico e consultório dinâmicos.  
   - **Cards KPI interativos** (Total, Confirmados, Em Atendimento, Concluídos): clique para filtrar a lista.
   - Filtros por data, médico, consultório e status.

4. **Pacientes (Admissão & Lixeira)**  
   - CRUD completo com autopreenchimento de endereço via API ViaCEP.  
   - Prevenção contra CPFs e nomes duplicados.  
   - Lixeira com soft-delete e restauração.
   - **Status de Alta Preservado:** Data e hora da última alta registradas no prontuário e exibidas com badge informativo.

5. **Atendimentos (Kanban & Triagem Manchester)**  
   - Fluxo visual em 4 colunas dinâmicas: *Aguardando Triagem* &rarr; *Aguardando Atendimento* &rarr; *Em Consulta* &rarr; *Em Observação (PS)*.  
   - Priorização por cores de risco (Manchester: Vermelho, Laranja, Amarelo, Verde, Azul).  
   - **Desfecho Duplo na Triagem:** Encaminhar para Consultório Médico ou para Leito de Observação no PS.  
   - Prontuário eletrônico (PEP SOAP) integrado.  
   - Chamada de paciente integrada com Painel TV (Web Speech API).

6. **Observação do Pronto-Socorro (PS)**  
   - Módulo normatizado conforme a **Resolução CFM nº 2.079/14**.  
   - Grid visual de pacientes em observação com tempo decorrido ao vivo.  
   - Alertas visuais de limite assistencial: amarelo (&ge;12h - reavaliação médica prioritária) e vermelho pulsante (&ge;24h - limite legal ultrapassado com necessidade de alta ou internação imediata).  
   - 4 Ações rápidas por paciente: Abrir PEP SOAP, Prescrever Medicamento, Transferir/Internar em Leito Hospitalar e Concluir Alta da Observação.

7. **Painel TV (Chamador com Voz)**  
   - Tela cheia para sala de espera.  
   - Anuncia paciente com voz sintetizada (Web Speech API) e exibe nome em destaque.

8. **Prontuário Eletrônico (PEP SOAP) & Trajetória Assistencial**  
   - Autosave, assinatura digital, prescrições médicas e receituário.  
   - **Linha do Tempo Completa da Jornada do Paciente:** Visualização de todos os períodos assistenciais (Recepção &rarr; Triagem Manchester &rarr; Chamada TV &rarr; Consultório PEP &rarr; Leito de Internação / Observação &rarr; Alta Médica).

9. **Alertas & Estagnação**  
   - Monitoramento proativo de gargalos assistenciais.  
   - **Cards KPI clicáveis** com filtro instantâneo da tabela.  
   - Painel exclusivo de aprovação de novos acessos e monitoramento de gargalos.

10. **Leitos & Censo Hospitalar (Gestão Avançada)**  
    - Mapa visual de leitos: Livre (verde) · Ocupado (vermelho) · Higienização (amarelo) · Manutenção (cinza).  
    - Categorias completas: UTI Adulto, UTI Neonatal, Semi-UTI, CTI, Clínica Médica, Clínica Cirúrgica, Pediatria, Maternidade e Isolamento.  
    - **Painel Detalhado do Leito:** Exibe ocupante atual, data/hora da admissão, tempo de permanência, atalho direto para PEP e histórico completo de todas as ocupações anteriores.  
    - **Inabilitação Automática de Leitos Ocupados:** Prevenção ativa contra dupla ocupação em leitos individuais.  
    - **Ciclo de Higienização:** Alta hospitalar redireciona automaticamente o leito para limpeza com liberação em 1 clique.

11. **Kanban de Internação Interativo**  
    Gestão visual Kanban do fluxo de internação hospitalar com metas evolutivas (SLA):  
    - **5 colunas de setor:** Pronto Socorro (PS), Corredor de Internação, Clínica Cirúrgica, Clínica Médica (SUS) e UTI.  
    - **Metas de tempo por setor:** PS: 24h · Corredor: 1d · Cirúrgica: 7d · Médica: 10d · UTI: 5d.  
    - **Evolução Clínica & Auditoria de SLAs.**

12. **Farmácia & Estoque Hospitalar**  
    - Gerenciamento de medicamentos e insumos com **pesquisa em tempo real via APIs globais (RxNav, NLM, OpenFDA)**.  
    - Preenchimento automático de dados (fabricante, tarja, dosagem).  
    - Notificações automáticas de estoque baixo.

13. **Financeiro (Títulos & Parcelas)**  
    - Faturamento, recebimentos (Pix/Cartão/Dinheiro) e contas a pagar.  
    - **Janela Dedicada:** Dashboard de relatórios financeiros expandido em tela cheia.  
    - **Cards KPI Interativos:** Filtro instantâneo de contas a vencer, vencidas, pagas e visão geral.  
    - **Gráficos Glassmorphism:** Distribuição por status (Donut) e volume por métodos de pagamento (Bar) com Chart.js.

14. **Corpo Clínico & Consultórios Médicos**  
    - Gestão de médicos com CRM, especialidade, alocação de consultórios e inativação/exclusão.
    - **Vínculo em Tempo Real com Painel TV:** Ao chamar o paciente no painel sonoro, o consultório exibe o paciente chamado com botão de 1-clique para abertura do PEP.

15. **Relatórios & Exportação**  
    - Exportação completa e padronizada para PDF, XLSX e CSV.

16. **⏰ Escalas de Trabalho & Plantões (Médicos e Enfermeiros)**  
    Gestão operacional completa de turnos de trabalho com orelhas dedicadas e permissões RBAC por perfil:  
    - **Orelha 🩺 Escala de Médicos:** Plantões ordenados por data, CRM, especialidade, turnos e horas.  
    - **Orelha 💉 Escala de Enfermeiros:** Escalas operacionais com COREN, função e turnos (6h, 12h, 12x36).

---

## 🚀 Diferenciais de Interatividade (v2.7.3)

- **🧭 Linha do Cuidado & Trajetória Completa (Patient Flow Timeline):** Ao buscar qualquer paciente por nome ou CPF no sistema ou no prontuário, a equipe médica e de enfermagem pode visualizar a linha do tempo cronológica com todas as fases assistenciais de cada período de atendimento.
- **🛏️ Painel Detalhado de Leito & Histórico de Ocupantes:** Clique em qualquer leito para consultar a ficha do ocupante e o histórico completo de internações passadas daquele leito.
- **🔍 Motor de Busca Semântica Multi-Tier:** Reconhece sinônimos clínicos e operacionais (`colaborador` ➔ `médico/profissional`, `excluir` ➔ `exclusão/inativação`, `remédio` ➔ `medicamento`).
- **🤖 Copilot IA com Desambiguação:** Se o usuário buscar por termos genéricos como "excluir", o assistente apresenta uma árvore de opções detalhadas para exclusão de pacientes, médicos, agendamentos, leitos, medicamentos e títulos financeiros.
- **📌 Navegação Assistida & Floating Return Beacon (`Alt + M`):** Ao clicar em *"Ir para a Tela & Praticar"*, o sistema navega até a tela e fixa um beacon flutuante para retorno instantâneo com animação pulsante (*Smart Highlight Pulse*) no card consultado.  
- **✨ Modal de Conclusão Central com Resumo de Simulação:** Resumo visual de registros gerados com contadores em tempo real e redirecionamento assistido.
- **🗑️ Reset Seguro & Sincronizado do Banco de Dados:** O botão `🗑️ Limpar Banco de Dados` zera todas as tabelas hospitalares mantendo as contas de usuário e perfis, limpa os caches em memória, sincroniza o estado zerado com o Turso Cloud DB e recarrega a aplicação.

---

## 📋 Kanban de Internação — Metas por Setor

| Setor | Meta de Alta | Alerta Amarelo | Alerta Vermelho |
|---|---|---|---|
| 🔵 Pronto Socorro (Obs) | 24 horas | 18h+ | 24h+ |
| 🟡 Corredor de Internação | 1 dia | 18h+ | 24h+ |
| 🟣 Clínica Cirúrgica | 7 dias | 5d+ | 7d+ |
| 🟢 Clínica Médica (SUS) | 10 dias | 7d+ | 10d+ |
| 🔴 **UTI** | **5 dias** | **3d+** | **5d+** |

> 💡 As metas estimulam a equipe a buscar condutas que propiciem alta evolutiva, principalmente na UTI onde 5 dias é a meta de resultado clínico.

---

## 🎨 Cards KPI Interativos (v1.2.0+)

| Aba | Cards | Comportamento |
|-----|-------|--------------|
| **Agenda** | Total, Confirmados, Em Atendimento, Concluídos | Filtra lista de consultas |
| **Corpo Clínico** | Total, Ativos, Especialidades | Filtra tabela de médicos |
| **Farmácia** | Total, Baixo Estoque, Crítico | Filtra lista de medicamentos |
| **Estagnação** | Críticos, Alertas de Espera, Total | Filtra tabela de alertas |
| **Leitos** | Total, Vagos, Ocupados, Higienização | Filtra grade visual |
| **Kanban** | Distribuição Setor, Metas (SLA), Funil | Clicar em gráficos e métricas filtra o quadro ou abre modais de auditoria |

---

## 🎨 Design System — Glassmorphism

O Health Nexus implementa um design system completo baseado em **Glassmorphism** com tokens CSS (`--variáveis`) para dois temas:

- **Modo Escuro (padrão):** Fundo azul profundo (`#0f172a`), cards em vidro translúcido escuro com `backdrop-filter: blur`, acentos neon em índigo/ciano.
- **Modo Claro:** Fundo cinza slate suave (`#e2e8f0`), cards em vidro translúcido claro — todos os modais, colunas e componentes respeitam as variáveis de tema sem divergências.

### Paleta de Cores Semânticas

| Cor | Hex | Uso |
|---|---|---|
| Primário (Índigo) | `#6366f1` | Ações principais, KPIs neutros |
| Sucesso (Esmeralda) | `#10b981` | No Prazo, leito disponível |
| Atenção (Âmbar) | `#f59e0b` | Próximo do Limite, SLA em risco |
| Perigo Suavizado (Rosê) | `#be5a6e` | Ações destrutivas (Alta Hospitalar) |
| Urgência Clínica | `#ef4444` | Setor UTI, alertas críticos clínicos |

---

## 🔐 Papéis de Acesso (RBAC)

| Papel | Acesso |
|-------|--------|
| **Master** | Acesso total + Histórico de Sessões + Kanban + aprovações |
| **Médico** | Atendimentos, Agenda, PEP, Leitos, Kanban |
| **Enfermeiro** | Triagem, Atendimentos, Leitos, Farmácia, Kanban |
| **Recepcionista** | Pacientes, Agenda, Financeiro (básico) |

> **🛡️ Proteção de Segurança:** Perfis `Master` e `Administrador` são protegidos contra escalonamento não autorizado.

---

## 🔧 Automações Especiais

- **Auto-shutdown do servidor:** O processo Node se encerra automaticamente quando a aba do navegador é fechada
- **Criação automática do banco:** Todas as tabelas criadas via `CREATE TABLE IF NOT EXISTS` ao iniciar
- **Usuário admin padrão:** Criado automaticamente se não existir nenhum usuário

---

## 🗺️ Próximos Passos (Versão 2.0)

- Laboratório e Integração de Equipamentos (LIS)
- Integração de Imagens (DICOM/PACS)
- App Mobile para Médicos (React Native)
- Integração Telemedicina via WebRTC
- Notificações Push (PWA)
- Dashboard de Indicadores do Kanban (relatório de giro de leitos, tempo médio por setor)

---

## 🚀 Execução Local

```bash
# 1. Clonar o repositório
git clone https://github.com/Mazzarowysk/Health-Nexus.git "C:\Health Nexus"
cd "C:\Health Nexus"

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com TURSO_DATABASE_URL e TURSO_AUTH_TOKEN (opcional para uso local)

# 4. Iniciar em modo desenvolvimento (frontend + backend simultâneos)
npm run dev
```

Acesse: `http://localhost:5173` · Backend: `http://localhost:3001`  
Login padrão: **usuário** `admin` · **senha** `admin`

---

## 📅 Changelog

### v2.6.0 — Agosto 2026 (atual)
- ✅ **Notificações Visuais de Sequência de Fluxo Aprimoradas:** Cartão flutuante no topo direito com rastreador de próxima etapa (`📍 Sequência do Fluxo &bull; Próximo Passo`), destaque de setor de destino e botão esmeralda `IR PARA A ABA ➔`.
- ✅ **Navegação Inteligente & Rolagem Suave (`scrollIntoView`):** Ao clicar no botão de direcionamento, o sistema rola a tela suavemente até a coluna exata do paciente (ex: *Coluna Em Atendimento*).
- ✅ **Destaque Luminoso Pulsante (`Glow Animation`):** A coluna de destino pisca com moldura verde brilhante (`box-shadow: 0 0 45px #10b981`) por 3 segundos para identificação visual instantânea.
- ✅ **Cronômetro de 15 Minutos no Header Badge:** Exibição da contagem regressiva ao vivo (`🟢 Sincronizado &bull; 14:59`) no topo superior, realizando verificações automáticas com o Turso Cloud sem interromper a navegação a cada ação individual.

### v2.4.0 — Agosto 2026
- ✅ **Integração IA Copilot no Manual Interativo:** Pesquisa avançada em tempo real no manual usando inteligência artificial que entende as permissões do usuário (RBAC) e sugere ações automáticas ou bloqueia conteúdo sensível baseado no cargo do usuário logado.

### v2.3.0 — Agosto 2026
- ✅ **Glassmorphism completo no Kanban:** colunas, cabeçalhos e cards modernizados com `backdrop-filter: blur`, bordas translúcidas e sombras dinâmicas coloridas.
- ✅ **Seletor de setor reformulado:** cards do topo com cores destacadas, borda superior colorida por setor; "Visão Geral" exibe todos sem filtrar.
- ✅ **Modal Confirmar Alta redesenhado:** acento decorativo no topo, ícone temático, badge informativo e botões com espaçamento generoso (sem colapso nas margens).
- ✅ **Botão Alta Hospitalar suavizado:** cor vermelho puro substituída por vinho/rosê (`#be5a6e → #9e3a52`) para não conflitar com alertas clínicos.
- ✅ **Modais de Setor e SLA com suporte a Modo Claro:** todos os `rgba` hardcoded substituídos por variáveis CSS de tema (`var(--bg-secondary)`, `var(--glass-border)`, etc.).
- ✅ **Botão Prontuário corrigido** no Modal de Auditoria de SLAs (atributo `onclick` malformado corrigido).
- ✅ **Tab Leitos modernizada:** cards com Glassmorphism, borda superior por status, grid responsivo e botões de ação redesenhados.
- ✅ **Modo Claro acinzentado:** `--bg-primary: #e2e8f0` no `styles.css` para evitar interface totalmente branca.

### v2.2.0 — Agosto 2026
- ✅ **Kanban de Internação:** 5 setores, metas de tempo por setor, drag & drop, barra de progresso visual
- ✅ **Admissão Kanban completa:** leito, diagnóstico, médico responsável, data e observações iniciais
- ✅ **Cards interativos com alinhamento premium:** avatar colorido, diagnóstico, leito, médico e tempos
- ✅ **Botão 🩺 Prontuário:** acesso direto ao histórico clínico completo (PEP, consultas, receituários)
- ✅ **Painel 📝 Evolução Clínica:** registro de novas evoluções com timestamp + timeline de histórico
- ✅ **Migração automática:** notas legadas convertidas para o novo formato de array de evoluções
- ✅ **Indicador visual:** ponto vermelho no botão Evolução quando há anotações registradas
- ✅ **Histórico de Sessões:** relatório de login/logout com tempo de uso, layout moderno atualizado e correção de z-index (exclusivo Master)
- ✅ **Filtros por setor** no Kanban com cards KPI interativos e contagem em tempo real
- ✅ **Painel Financeiro Imersivo:** Janela dedicada com gráficos Donut & Bar modernos (estilo glassmorphism) e novos cards de KPI para filtro avançado.
- ✅ **Melhorias de UI/UX e Acessibilidade:** Scrollbar nativa no menu lateral, correção de contrastes no Light Mode, novo ícone para troca de temas, e correção de artefatos de codificação (mojibake) em relatórios.

### v1.2.1 — Julho 2026
- Cards KPI interativos em todas as abas principais
- Proteção de perfil Master contra escalonamento
- Melhorias de performance e UX

### v1.2.0 — Junho 2026
- Modo claro completo
- Sincronização Turso Cloud
- Exportação PDF/XLSX/CSV

---

*Desenvolvido por @mazzarowysk & @_coltri_*

**Status:** Em desenvolvimento ativo  
**Última atualização:** Agosto 2026

---

## 📘 Documentação & Manual do Usuário

- 🌐 **Portal Web Interativo:** [manual_do_usuario.html](file:///c:/Health%20Nexus/manual_do_usuario.html) *(acessível no botão `📖 Manual do Usuário` no topo do sistema)*
- 📕 **Documento PDF Oficial de Impressão:** [Manual_do_Usuario_Health_Nexus_v3.pdf](file:///c:/Health%20Nexus/Manual_do_Usuario_Health_Nexus_v3.pdf)
- 📄 **Manual Completo em Markdown:** [MANUAL_DO_USUARIO_HEALTH_NEXUS.md](file:///c:/Health%20Nexus/MANUAL_DO_USUARIO_HEALTH_NEXUS.md)

---

## 🏗️ Infraestrutura & Integrações

| Serviço | Status | Descrição |
|---|---|---|
| 🐙 **GitHub** | ✅ Ativo | Branch `main` · Commits disparam deploys automáticos |
| ▲ **Vercel** | ✅ Ativo | Hospeda Frontend (Vite) + Backend (Express API serverless) |
| 🗄️ **Turso (LibSQL)** | ✅ Ativo | Banco de dados edge distribuído — Pacientes, Atendimentos, PEP |

---

## 📦 Stack Tecnológica

- **Frontend:** HTML5 + JavaScript (Vanilla SPA) · Vite 5 · Chart.js · jsPDF · SheetJS
- **Backend:** Node.js + Express.js (API REST) · JWT · Bcrypt
- **Banco de dados:** SQLite local (`local.db`) + Turso cloud (LibSQL) via `@libsql/client`
- **CSS:** Design System próprio — Glassmorphism dark + Light mode completo
- **Tipografia:** Outfit (títulos) + Inter (corpo) via Google Fonts
- **Ícones:** Font Awesome 6

---

## 🧩 Módulos Implementados (Visão Geral 360º)

1. **Autenticação & Controle de Acesso (RBAC)**  
   Login com JWT e gestão de papéis: `Master`, `Médico`, `Enfermeiro`, `Recepcionista`.  
   - Aprovação de todos os novos usuários pelo Master via Painel de Estagnação.
   - Liberação automática de acesso através da Chave Master secreta.

2. **Dashboard (Health Nexus)**  
   KPIs e gráficos gerenciais em tempo real via Chart.js:  
   - Atendimentos por período, taxa de ocupação de leitos, receita mensal e evolução de pacientes.

3. **Agenda de Consultas**  
   - Agendamento inteligente com seleção de médico e consultório dinâmicos.  
   - **Cards KPI interativos** (Total, Confirmados, Em Atendimento, Concluídos): clique para filtrar a lista. Card ativo recebe destaque visual colorido. Clique duplo desfaz o filtro.
   - Filtros por data, médico, consultório e status.
   - Sincronização bidirecional dos tabs de status com os cards KPI.

4. **Pacientes (Admissão & Lixeira)**  
   - CRUD completo com autopreenchimento de endereço via API ViaCEP.  
   - Prevenção contra CPFs e nomes duplicados.  
   - Lixeira com soft-delete e restauração.

5. **Atendimentos (Kanban & Triagem Manchester)**  
   - Fluxo visual em colunas: Aguardando Triagem → Aguardando Atendimento → Em Atendimento → Finalizado.  
   - Priorização por cores de risco (Manchester).  
   - Prontuário eletrônico (PEP SOAP) integrado.  
   - Chamada de paciente integrada com Painel TV (Web Speech API).

6. **Painel TV (Chamador com Voz)**  
   - Tela cheia para sala de espera.  
   - Anuncia paciente com voz sintetizada (Web Speech API) e exibe nome em destaque.  
   - Operado via botão na aba Atendimentos.

7. **Prontuário Eletrônico (PEP SOAP)**  
   - Autosave, assinatura digital, prescrições médicas.  
   - Histórico completo por paciente.

8. **Alertas & Estagnação**  
   - Monitoramento proativo de gargalos (pacientes há muito tempo em triagem/atendimento).  
   - **Cards KPI clicáveis** (Críticos, Alertas de Espera, Total Estagnados) com filtro instantâneo da tabela.  
   - Painel exclusivo de aprovação de novos acessos e monitoramento de gargalos.  
   - Badge no menu lateral com contagem de alertas + aprovações pendentes.

9. **Leitos (Censo Hospitalar)**  
   - Mapa visual de leitos: Livre (verde) · Ocupado (vermelho) · Higienização (amarelo).  
   - Alocação e alta de pacientes com atualização em tempo real.

10. **Farmácia & Estoque**  
    - Gerenciamento de medicamentos e insumos com controle de quantidade.  
    - **Cards KPI interativos** para filtrar por status do estoque.  
    - Notificações automáticas de estoque baixo.  
    - Baixa de medicamentos vinculada ao atendimento.

11. **Financeiro**  
    - Faturamento, recebimentos (Pix/Cartão/Dinheiro) e contas a pagar.  
    - Lançamentos vinculados a atendimentos.

12. **Corpo Clínico & Consultórios**  
    - CRUD de médicos com CRM, especialidade, contato e status.  
    - **Cards KPI interativos**: Total (ver todos), Ativos (filtrar por status), Especialidades (abre painel flutuante com chips clicáveis por área médica).  
    - Painel de Atividades do Médico: agendamentos + prontuários SOAP em modal dedicado.  
    - Escala de Plantão diária com banner integrado.  
    - Lixeira com soft-delete.

13. **Relatórios & Exportação**  
    - Exportação inteligente para PDF, XLSX e CSV.  
    - Relatórios por período, médico, status e tipo.

14. **Configurações & Nuvem (Turso Cloud)**  
    - Sincronização avançada SQLite ↔ Turso com comparativos de data/hora.  
    - Upload e download seletivo por tabela.

---

## 🎨 Cards KPI Interativos (v1.2.0)

Todos os painéis com cards de KPI passaram a ser **filtros clicáveis**:

| Aba | Cards | Comportamento |
|-----|-------|--------------|
| **Agenda** | Total, Confirmados, Em Atendimento, Concluídos | Filtra lista de consultas; toggle ao clicar 2º |
| **Corpo Clínico** | Total, Ativos, Especialidades | Filtra tabela de médicos; Especialidades abre painel de chips |
| **Farmácia** | Total, Baixo Estoque, Crítico | Filtra lista de medicamentos |
| **Estagnação** | Críticos, Alertas de Espera, Total | Filtra tabela de alertas |
| **Leitos** | Total, Vagos, Ocupados, Higienização | Filtra a grade visual do mapa de leitos pelo status selecionado |

**Padrão visual:** card ativo recebe borda colorida + leve elevação + glow correspondente à sua cor de acento. Clicar novamente no mesmo card ativo volta para "Todos".

---

## 🎨 Design System

O Health Nexus implementa um design system completo com tokens CSS (`--variáveis`) para dois temas:

- **Modo Escuro (padrão):** Glassmorphism com fundo roxo profundo, acentos neon magenta/ciano
- **Modo Claro:** Branco clínico profissional (azul médico `#2563eb` + verde teal `#0d9488`), totalmente polido com overrides para todos os componentes: sidebar, header, cards, tabelas, modais, inputs, badges, etc.

---

## 🔐 Papéis de Acesso (RBAC)

| Papel | Acesso |
|-------|--------|
| **Master** | Acesso total + aprovação de usuários + configurações de nuvem |
| **Médico** | Atendimentos, Agenda, PEP, Leitos (leitura), Relatórios próprios |
| **Enfermeiro** | Triagem, Atendimentos, Leitos, Farmácia |
| **Recepcionista** | Pacientes, Agenda, Financeiro (básico) |

> **🛡️ Proteção de Segurança (v1.2.0):** Perfis `Master` e `Administrador` são protegidos. Apenas um usuário autenticado com status `Master` possui permissão para editar, excluir ou autorizar mudanças nessas contas. Desenvolvedores e perfis básicos não podem escalar ou alterar esses acessos.

---

## 🔧 Automações Especiais

- **Auto-shutdown do servidor:** O processo Node se encerra automaticamente quando a aba do navegador é fechada (heartbeat + `process.exit`)
- **Criação automática do banco:** Todas as tabelas são criadas via `CREATE TABLE IF NOT EXISTS` ao iniciar
- **Usuário admin padrão:** Criado automaticamente (`admin` / senha `admin`) se não existir nenhum usuário

---

## 🗺️ Próximos Passos (Versão 2.0)

- Laboratório e Integração de Equipamentos (LIS)
- Integração de Imagens (DICOM/PACS)
- App Mobile para Médicos (React Native)
- Integração Telemedicina via WebRTC
- Notificações Push (PWA)

---

## 🚀 Execução Local

```bash
# 1. Clonar o repositório
git clone https://github.com/Mazzarowysk/Health-Nexus.git "C:\Health Nexus"
cd "C:\Health Nexus"

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com TURSO_DATABASE_URL e TURSO_AUTH_TOKEN (opcional para uso local)

# 4. Iniciar em modo desenvolvimento (frontend + backend simultâneos)
npm run dev
```

Acesse: `http://localhost:5173` · Backend: `http://localhost:3001`  
Login padrão: **usuário** `admin` · **senha** `admin`

---

*Desenvolvido por @mazzarowysk & @_coltri_*


## Nova Atualização: v2.9.14 — Lupa & Expansão Inteligente no Hover & Padronização de Datas (DD/MM/AAAA)
- **Guia de Fluxo Hospitalar com Lupa & Expansão Dinâmica:** Ao aproximar o cursor do mouse sobre o Guia de Fluxo (tanto no modo painel lateral acoplado quanto no card flutuante), o componente expande suavemente (largura de `420px` para `560px` no modo acoplado e de `375px` para `500px` no modo flutuante), os textos e botões internos recebem zoom confortável de `1.25x` (25% maiores e mais nítidos) e o banner luminoso *"🔍 Lupa Ativa: Card & Textos Expandidos"* é exibido. Ao retirar o mouse de cima, o painel retrai suavemente para seu tamanho padrão.
- **Fixação Manual de Leitura Ampliada (`[ 🔍 ]`):** O botão de lupa no cabeçalho permite fixar o modo ampliado de forma definitiva caso o profissional queira manter a visualização expandida durante todo o turno.
- **Padronização Brasileira de Datas (`DD/MM/AAAA`):** Implementação da função `formatBirthDateBR` e revisão dos componentes para garantir que todas as exibições de data de nascimento de pacientes sigam o padrão nacional `DD/MM/AAAA`, eliminando discrepâncias no cabeçalho do prontuário (PEP).
- **Manual do Usuário e Manuais em PDF Recompilados:** Atualização dos manuais operacionais (`MANUAL_DO_USUARIO_HEALTH_NEXUS.md`, `manual_do_usuario.html` e `Manual_do_Usuario_Health_Nexus.pdf`).

## Versão Anterior: v2.8.1 — Gestão de Leitos, Foco Assistencial & Destaque Spotlight
- **Guia de Fluxo Hospitalar (Smart Flow Guide):** Preservação do foco clínico na internação ativa. Ao alocar ou transferir para leito, a recomendação primária passa a ser a Evolução Médica no PEP (`openPEPModal`), com ações secundárias para conceder alta, focar no leito e acompanhar no Kanban, evitando avanço precoce para Faturamento TISS antes da alta médica homologada.
- **Destaque Visual Pulsante nos Leitos:** Ao confirmar alocação/transferência, o leito e paciente são imediatamente carregados com o status "Ocupado", classe `patient-pulse-selected patient-spotlight-glow`, badge `⚡ Paciente em Foco` e scroll suave centralizado.
- **Invalidação Atômica de Cache de Leitos:** Invalidação sincronizada das chaves `'beds'`, `'encounters'` e rotas relacionadas no client-cache (`src/modules/api.js`).
- **Filtros Expandidos:** Novos filtros para leitos de Observação e Isolamento, com autocorreção caso o leito do paciente ativo pertença a setor diferente do filtro em exibição.
- **Manual e Documentações Sincronizados:** Manuais em PDF, Markdown, HTML e módulos interativos atualizados com as regras do fluxo hospitalar contínuo.


