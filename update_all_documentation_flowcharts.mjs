import fs from 'fs';

const updatedFlowchartMermaid = '```mermaid\n' +
`flowchart TD
    subgraph MOD_AUTH ["🔒 1. Autenticação & Gestão de Acessos (RBAC)"]
        AUTH_LOGIN["Login JWT com 24 Contas (Médicos, Enfermeiros, Admin, Devs)"]
        AUTH_RBAC["Controle de Permissões (Master, Clínico, Dev)"]
        AUTH_PRESERVE["Preservação Inteligente de Usuários em Limpezas"]
        AUTH_AUDIT["Auditoria de Logins (Últimos 5 / Histórico 100)"]
    end

    subgraph MOD_DASH ["📊 2. Dashboard Executivo & KPIs"]
        DASH_KPI["KPIs Gerenciais em Tempo Real"]
        DASH_CHARTS["Gráficos Interativos Chart.js (Filtros Clicáveis)"]
    end

    subgraph MOD_ESCALAS ["🩺 11. Escalas de Trabalho & Plantões (Diferencial)"]
        ESC_TAB["Sub-abas: Escala de Médicos vs Escala de Enfermeiros"]
        ESC_SHIFT["Turnos: Manhã (6h), Tarde (6h), Noite (12h), 24h, 12x36"]
        ESC_SECTOR["Alocação de Setor / Consultório & CRM/COREN"]
        ESC_TODAY["Garantia de Cobertura de Plantão para HOJE"]
    end

    subgraph MOD_AGENDA ["🗓️ 3. Agenda de Consultas"]
        AG_BOOK["Agendamento de Consultas & Seleção de Médico/Consultório"]
        AG_KPI["KPI Cards de Status (Confirmado, Atendimento, Concluído)"]
    end

    subgraph MOD_PACIENTES ["👥 4. Admissão de Pacientes (SUS)"]
        PAC_FORM["Admissão 11 Campos SUS + Validação Responsável Legal"]
        PAC_CEP["Autopreenchimento de Endereço via API ViaCEP"]
        PAC_SEARCH["Busca Unificada por Nome e CPF"]
        PAC_TRASH["Lixeira de Pacientes (Soft-Delete & Restauração)"]
    end

    subgraph MOD_ATEND ["🚨 5. Atendimentos & Triagem Manchester"]
        TRI_MANCHESTER["Enfermagem: Triagem Manchester (5 Níveis de Risco)"]
        TRI_QUEUE["Fila PS: Sorting por Prioridade Clínica Automática"]
    end

    subgraph MOD_TV ["📺 6. Painel TV (Chamador Inteligente)"]
        TV_SPEECH["Web Speech API: Anúncio de Paciente por Voz Sintetizada"]
        TV_DISPLAY["Exibição em Tela Cheia para Sala de Espera"]
    end

    subgraph MOD_PEP ["🩺 7. Prontuário Eletrônico (PEP SOAP & Planilha)"]
        PEP_SOAPE["Atendimento Médico: Método SOAPE & CID-10 Offline"]
        PEP_PRESCR["Prescrição Médica em Planilha + Dose/Via/Frequência"]
        PEP_ENF["Matriz da Enfermagem: Checagem de Aplicação de Doses"]
        PEP_PDF["Emissão de PDF A4 Oficial (Receituário & Histórico)"]
    end

    subgraph MOD_FARMACIA ["💊 10. Farmácia & Estoque"]
        FARM_SEARCH["Pesquisa Global de Fármacos (OpenFDA & ANVISA)"]
        FARM_STOCK["Controle de Lote, Validade e Estoque Mínimo"]
    end

    subgraph MOD_ESTAG ["⏱️ 8. Alertas de Estagnação & Timer PS 12h"]
        EST_TIMER["Timer PS 12h (Azul <10h / Amarelo 10-12h / Vermelho >12h)"]
        EST_ALERT["Alerta Pulsante de Permanência Máxima Excedida"]
    end

    subgraph MOD_LEITOS ["🛏️ 9. Censo Hospitalar & Mapa de Leitos"]
        BED_MAP["Grid de Leitos Tricolor (Verde=Vago, Vermelho=Ocupado, Amarelo=Higienização)"]
        BED_CLEAN["Troca Automática do Leito para Higienização pós-alta"]
    end

    subgraph MOD_KANBAN ["📊 10. Kanban de Internação & SLAs (5 Setores)"]
        KANB_COLS["5 Setores: PS (24h), Corredor (1d), Cirúrgica (7d), Médica (10d), UTI (5d)"]
        KANB_SLA["Indicadores Visuais de SLA (Progresso Verde -> Âmbar -> Rosê)"]
        KANB_EVOL["Timeline de Evolução Clínica com Timestamp"]
        KANB_AUDIT["Modal de Auditoria de SLAs & Detalhamento por Ala"]
    end

    subgraph MOD_REPORTS ["📈 12. Relatórios & Exportação (5 Cards)"]
        REP_CARDS["5 Cards: Finanças, Atendimentos, PEP, Leitos e ESCALAS"]
        REP_EXP["Exportação Relatorial Multiformato: PDF, Excel (XLSX) e CSV"]
    end

    %% CORRELAÇÕES E FLUXO OPERACIONAL INTEGRADO
    AUTH_LOGIN --> AUTH_RBAC
    AUTH_RBAC -->|Médicos & Enfermeiros| ESC_TAB
    ESC_TAB -->|Profissionais Alocados| ESC_TODAY
    
    PAC_FORM -->|Validação OK| TRI_MANCHESTER
    AG_BOOK -->|Chegada do Paciente| TRI_MANCHESTER
    
    TRI_MANCHESTER -->|Sorting de Risco| TRI_QUEUE
    TRI_QUEUE -->|Chamada de Paciente| TV_SPEECH
    TV_SPEECH -->|Encaminhado para Consultório| PEP_SOAPE
    
    ESC_TODAY -.->|Atendimento Médico/Enf| PEP_SOAPE
    PEP_SOAPE --> PEP_PRESCR
    PEP_PRESCR --> PEP_ENF
    PEP_ENF -->|Baixa de Insumos| FARM_STOCK
    
    PEP_SOAPE -->|Decisão Clínica| DECISION{Decisão Assistencial}
    
    DECISION -->|1. Alta Médica| PEP_PDF
    PEP_PDF --> REP_CARDS
    
    DECISION -->|2. Permanência PS| EST_TIMER
    EST_TIMER -->|Aproximação 12h| EST_ALERT
    EST_ALERT -->|Necessidade de Internação| BED_MAP
    
    DECISION -->|3. Internação Direta| BED_MAP
    BED_MAP -->|Alocação em Leito Vago| KANB_COLS
    
    KANB_COLS --> KANB_SLA
    KANB_SLA --> KANB_EVOL
    KANB_EVOL -->|Alta Hospitalar| BED_CLEAN
    BED_CLEAN -->|Liberação do Leito| BED_MAP
    
    %% CONEXÕES DE AUDITORIA E RELATÓRIOS
    PEP_SOAPE -.-> DASH_KPI
    KANB_AUDIT -.-> DASH_CHARTS
    ESC_TAB -.-> REP_CARDS
    BED_MAP -.-> REP_CARDS
    REP_CARDS --> REP_EXP
` + '\n```';

console.log("Replacing flowcharts in documentation files...");

const doc02FlowchartSection = `## 🔄 2. Fluxograma Geral Integrado de Todas as Abas e Correlações (v2.4.0)

O fluxograma abaixo mapeia a correlação completa entre todas as 12 abas do sistema, destacando os diferenciais operacionais e particularidades de cada módulo:

${updatedFlowchartMermaid}

### 🌟 Particularidades e Diferenciais das Abas do Health Nexus

| # | Aba / Módulo | Funcionalidades Principais | Diferencial & Particularidades |
|---|---|---|---|
| **1** | **🔒 Autenticação & RBAC** | Login JWT, 24 contas clínicas/devs, perfis de acesso | Preservação de usuários em limpezas, lixeira com confirmação, auditoria de acessos (5/100). |
| **2** | **📊 Dashboard Executivo** | KPIs em tempo real, receita, volume de atendimentos | Gráficos Chart.js clicáveis como botões de filtro ativo que direcionam para as abas. |
| **3** | **🗓️ Agenda de Consultas** | Marcação de consultas, seleção de médico e sala | KPI cards clicáveis por status (Confirmado, Atendimento, Concluído). |
| **4** | **👥 Pacientes (SUS)** | Admissão 11 campos SUS, CEP automático ViaCEP | Validação rigorosa de responsável legal (<18/>65), busca por Nome/CPF, Lixeira soft-delete. |
| **5** | **🚨 Atendimentos & Triagem** | Fila visual Kanban, classificação de risco Manchester | Sorting de prioridade por cor de risco automático + chamada no Painel TV. |
| **6** | **📺 Painel TV (Chamador)** | Anúncio para sala de espera em tela cheia | **Web Speech API**: chamada em viva voz sintetizada em português. |
| **7** | **🩺 Prontuário PEP (SOAPE)** | Atendimento médico, CID-10, prescrições e evoluções | Busca CID-10 offline, prescrição em planilha, Matriz da Enfermagem para checagem, PDF A4. |
| **8** | **⏱️ Alertas & Estagnação** | Monitoramento de gargalos e permanência PS | Timer PS 12h (Azul <10h / Amarelo 10-12h / Vermelho >12h pulsante). |
| **9** | **🛏️ Censo de Leitos** | Mapa visual de leitos hospitalares | Cards tricolores (Verde=Vago, Vermelho=Ocupado, Amarelo=Higienização automática pós-alta). |
| **10** | **📊 Kanban de Internação** | Gestão de internados por 5 setores | Metas de permanência (SLA) dinâmicas, timeline de evolução clínica, auditoria de atrasos. |
| **11** | **🩺 Escalas de Trabalho** | Gestão de plantões de Médicos e Enfermeiros | Orelhas/sub-abas dedicadas, turnos (6h, 12h, 24h, 12x36), garantia de plantão ativado para HOJE. |
| **12** | **💊 Farmácia & Estoque** | Controle de estoque de medicamentos e insumos | Pesquisa global de fármacos em tempo real via OpenFDA / ANVISA por princípio ativo. |
| **13** | **📈 Relatórios & Exportação**| 5 cards especializados de emissão relatorial | Exportação multiformato (**PDF**, **Excel XLSX**, **CSV**) para Finanças, Atendimentos, PEP, Leitos e Escalas. |
`;

// 1. Update docs/10-Manuais/02-manual-operacional-do-usuario.md
let doc02 = fs.readFileSync('docs/10-Manuais/02-manual-operacional-do-usuario.md', 'utf8');
doc02 = doc02.replace(/## 🔄 2\. Fluxograma da Jornada Completa do Paciente no PS[\s\S]*?---/m, doc02FlowchartSection + '\n\n---');
fs.writeFileSync('docs/10-Manuais/02-manual-operacional-do-usuario.md', doc02, 'utf8');

// 2. Update MANUAL_DO_USUARIO_HEALTH_NEXUS.md
let manualMd = fs.readFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'utf8');
if (!manualMd.includes('Fluxograma Geral Integrado de Todas as Abas')) {
  manualMd = manualMd.replace(/---/, '---\n\n' + doc02FlowchartSection + '\n\n---');
  fs.writeFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', manualMd, 'utf8');
}

console.log("✅ All documentation flowcharts updated!");
