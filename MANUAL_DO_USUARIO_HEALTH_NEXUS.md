# ï¿½ï¿½ Manual do UsuÃ¡rio Completo & Guia Operacional Definitivo â€” Health Nexus (v1.0)

> **Health Nexus â€” Sistema de GestÃ£o Hospitalar & ProntuÃ¡rio Eletrnico**  
> Guia completo, exaustivo e publicaÃ§Ã£o-grade de navegaÃ§Ã£o, modais, formulÃ¡rios, botÃµes, mÃ¡scaras de entrada, fluxos operacionais e protocolos clÃ­nicos.

---

## ï¿½ï¿½ 2. Fluxograma Geral Integrado de Todas as Abas e CorrelaÃ§Ãµes (v2.4.0)

O fluxograma abaixo mapeia a correlaÃ§Ã£o completa entre todas as 12 abas do sistema, destacando os diferenciais operacionais e particularidades de cada mÃ³dulo:

```mermaid
flowchart TD
    subgraph MOD_AUTH ["ï¿½ï¿½ 1. AutenticaÃ§Ã£o & GestÃ£o de Acessos (RBAC)"]
        AUTH_LOGIN["Login JWT com 24 Contas (MÃ©dicos, Enfermeiros, Admin, Devs)"]
        AUTH_RBAC["Controle de PermissÃµes (Master, ClÃ­nico, Dev)"]
        AUTH_PRESERVE["PreservaÃ§Ã£o Inteligente de UsuÃ¡rios em Limpezas"]
        AUTH_AUDIT["Auditoria de Logins (Ãšltimos 5 / HistÃ³rico 100)"]
    end

    subgraph MOD_DASH ["ï¿½ï¿½ 2. Dashboard Executivo & KPIs"]
        DASH_KPI["KPIs Gerenciais em Tempo Real"]
        DASH_CHARTS["GrÃ¡ficos Interativos Chart.js (Filtros ClicÃ¡veis)"]
    end

    subgraph MOD_ESCALAS ["ï¿½ï¿½ 11. Escalas de Trabalho & PlantÃµes (Diferencial)"]
        ESC_TAB["Sub-abas: Escala de MÃ©dicos vs Escala de Enfermeiros"]
        ESC_SHIFT["Turnos: ManhÃ£ (6h), Tarde (6h), Noite (12h), 24h, 12x36"]
        ESC_SECTOR["AlocaÃ§Ã£o de Setor / ConsultÃ³rio & CRM/COREN"]
        ESC_TODAY["Garantia de Cobertura de PlantÃ£o para HOJE"]
    end

    subgraph MOD_AGENDA ["ï¿½ï¿½ï¸ 3. Agenda de Consultas"]
        AG_BOOK["Agendamento de Consultas & SeleÃ§Ã£o de MÃ©dico/ConsultÃ³rio"]
        AG_KPI["KPI Cards de Status (Confirmado, Atendimento, ConcluÃ­do)"]
    end

    subgraph MOD_PACIENTES ["ï¿½ï¿½ 4. AdmissÃ£o de Pacientes (SUS)"]
        PAC_FORM["AdmissÃ£o 11 Campos SUS + ValidaÃ§Ã£o ResponsÃ¡vel Legal"]
        PAC_CEP["Autopreenchimento de EndereÃ§o via API ViaCEP"]
        PAC_SEARCH["Busca Unificada por Nome e CPF"]
        PAC_TRASH["Lixeira de Pacientes (Soft-Delete & RestauraÃ§Ã£o)"]
    end

    subgraph MOD_ATEND ["ï¿½ï¿½ 5. Atendimentos & Triagem Manchester"]
        TRI_MANCHESTER["Enfermagem: Triagem Manchester (5 NÃ­veis de Risco)"]
        TRI_QUEUE["Fila PS: Sorting por Prioridade ClÃ­nica AutomÃ¡tica"]
    end

    subgraph MOD_TV ["ï¿½ï¿½ 6. Painel TV (Chamador Inteligente)"]
        TV_SPEECH["Web Speech API: AnÃºncio de Paciente por Voz Sintetizada"]
        TV_DISPLAY["ExibiÃ§Ã£o em Tela Cheia para Sala de Espera"]
    end

    subgraph MOD_PEP ["ï¿½ï¿½ 7. ProntuÃ¡rio Eletrnico (PEP SOAP & Planilha)"]
        PEP_SOAPE["Atendimento MÃ©dico: MÃ©todo SOAPE & CID-10 Offline"]
        PEP_PRESCR["PrescriÃ§Ã£o MÃ©dica em Planilha + Dose/Via/FrequÃªncia"]
        PEP_ENF["Matriz da Enfermagem: Checagem de AplicaÃ§Ã£o de Doses"]
        PEP_PDF["EmissÃ£o de PDF A4 Oficial (ReceituÃ¡rio & HistÃ³rico)"]
    end

    subgraph MOD_FARMACIA ["ï¿½ï¿½ 10. FarmÃ¡cia & Estoque"]
        FARM_SEARCH["Pesquisa Global de FÃ¡rmacos (OpenFDA & ANVISA)"]
        FARM_STOCK["Controle de Lote, Validade e Estoque MÃ­nimo"]
    end

    subgraph MOD_ESTAG ["â±ï¸ 8. Alertas de EstagnaÃ§Ã£o & Timer PS 12h"]
        EST_TIMER["Timer PS 12h (Azul <10h / Amarelo 10-12h / Vermelho >12h)"]
        EST_ALERT["Alerta Pulsante de PermanÃªncia MÃ¡xima Excedida"]
    end

    subgraph MOD_LEITOS ["ï¿½ï¿½ï¸ 9. Censo Hospitalar & Mapa de Leitos"]
        BED_MAP["Grid de Leitos Tricolor (Verde=Vago, Vermelho=Ocupado, Amarelo=HigienizaÃ§Ã£o)"]
        BED_CLEAN["Troca AutomÃ¡tica do Leito para HigienizaÃ§Ã£o pÃ³s-alta"]
    end

    subgraph MOD_KANBAN ["ï¿½ï¿½ 10. Kanban de InternaÃ§Ã£o & SLAs (5 Setores)"]
        KANB_COLS["5 Setores: PS (24h), Corredor (1d), CirÃºrgica (7d), MÃ©dica (10d), UTI (5d)"]
        KANB_SLA["Indicadores Visuais de SLA (Progresso Verde -> Ã‚mbar -> RosÃª)"]
        KANB_EVOL["Timeline de EvoluÃ§Ã£o ClÃ­nica com Timestamp"]
        KANB_AUDIT["Modal de Auditoria de SLAs & Detalhamento por Ala"]
    end

    subgraph MOD_REPORTS ["ï¿½ï¿½ 12. RelatÃ³rios & ExportaÃ§Ã£o (5 Cards)"]
        REP_CARDS["5 Cards: FinanÃ§as, Atendimentos, PEP, Leitos e ESCALAS"]
        REP_EXP["ExportaÃ§Ã£o Relatorial Multiformato: PDF, Excel (XLSX) e CSV"]
    end

    %% CORRELAÃ‡Ã•ES E FLUXO OPERACIONAL INTEGRADO
    AUTH_LOGIN --> AUTH_RBAC
    AUTH_RBAC -->|MÃ©dicos & Enfermeiros| ESC_TAB
    ESC_TAB -->|Profissionais Alocados| ESC_TODAY
    
    PAC_FORM -->|ValidaÃ§Ã£o OK| TRI_MANCHESTER
    AG_BOOK -->|Chegada do Paciente| TRI_MANCHESTER
    
    TRI_MANCHESTER -->|Sorting de Risco| TRI_QUEUE
    TRI_QUEUE -->|Chamada de Paciente| TV_SPEECH
    TV_SPEECH -->|Encaminhado para ConsultÃ³rio| PEP_SOAPE
    
    ESC_TODAY -.->|Atendimento MÃ©dico/Enf| PEP_SOAPE
    PEP_SOAPE --> PEP_PRESCR
    PEP_PRESCR --> PEP_ENF
    PEP_ENF -->|Baixa de Insumos| FARM_STOCK
    
    PEP_SOAPE -->|DecisÃ£o ClÃ­nica| DECISION{DecisÃ£o Assistencial}
    
    DECISION -->|1. Alta MÃ©dica| PEP_PDF
    PEP_PDF --> REP_CARDS
    
    DECISION -->|2. PermanÃªncia PS| EST_TIMER
    EST_TIMER -->|AproximaÃ§Ã£o 12h| EST_ALERT
    EST_ALERT -->|Necessidade de InternaÃ§Ã£o| BED_MAP
    
    DECISION -->|3. InternaÃ§Ã£o Direta| BED_MAP
    BED_MAP -->|AlocaÃ§Ã£o em Leito Vago| KANB_COLS
    
    KANB_COLS --> KANB_SLA
    KANB_SLA --> KANB_EVOL
    KANB_EVOL -->|Alta Hospitalar| BED_CLEAN
    BED_CLEAN -->|LiberaÃ§Ã£o do Leito| BED_MAP
    
    %% CONEXÃ•ES DE AUDITORIA E RELATÃ“RIOS
    PEP_SOAPE -.-> DASH_KPI
    KANB_AUDIT -.-> DASH_CHARTS
    ESC_TAB -.-> REP_CARDS
    BED_MAP -.-> REP_CARDS
    REP_CARDS --> REP_EXP

```

### ï¿½ï¿½ Particularidades e Diferenciais das Abas do Health Nexus

| # | Aba / MÃ³dulo | Funcionalidades Principais | Diferencial & Particularidades |
|---|---|---|---|
| **1** | **ï¿½ï¿½ AutenticaÃ§Ã£o & RBAC** | Login JWT, 24 contas clÃ­nicas/devs, perfis de acesso | PreservaÃ§Ã£o de usuÃ¡rios em limpezas, lixeira com confirmaÃ§Ã£o, auditoria de acessos (5/100). |
| **2** | **ï¿½ï¿½ Dashboard Executivo** | KPIs em tempo real, receita, volume de atendimentos | GrÃ¡ficos Chart.js clicÃ¡veis como botÃµes de filtro ativo que direcionam para as abas. |
| **3** | **ï¿½ï¿½ï¸ Agenda de Consultas** | MarcaÃ§Ã£o de consultas, seleÃ§Ã£o de mÃ©dico e sala | KPI cards clicÃ¡veis por status (Confirmado, Atendimento, ConcluÃ­do). |
| **4** | **ï¿½ï¿½ Pacientes (SUS)** | AdmissÃ£o 11 campos SUS, CEP automÃ¡tico ViaCEP | ValidaÃ§Ã£o rigorosa de responsÃ¡vel legal (<18/>65), busca por Nome/CPF, Lixeira soft-delete. |
| **5** | **ï¿½ï¿½ Atendimentos & Triagem** | Fila visual Kanban, classificaÃ§Ã£o de risco Manchester | Sorting de prioridade por cor de risco automÃ¡tico + chamada no Painel TV. |
| **6** | **ï¿½ï¿½ Painel TV (Chamador)** | AnÃºncio para sala de espera em tela cheia | **Web Speech API**: chamada em viva voz sintetizada em portuguÃªs. |
| **7** | **ï¿½ï¿½ ProntuÃ¡rio PEP (SOAPE)** | Atendimento mÃ©dico, CID-10, prescriÃ§Ãµes e evoluÃ§Ãµes | Busca CID-10 offline, prescriÃ§Ã£o em planilha, Matriz da Enfermagem para checagem, PDF A4. |
| **8** | **â±ï¸ Alertas & EstagnaÃ§Ã£o** | Monitoramento de gargalos e permanÃªncia PS | Timer PS 12h (Azul <10h / Amarelo 10-12h / Vermelho >12h pulsante). |
| **9** | **ï¿½ï¿½ï¸ Censo de Leitos** | Mapa visual de leitos hospitalares | Cards tricolores (Verde=Vago, Vermelho=Ocupado, Amarelo=HigienizaÃ§Ã£o automÃ¡tica pÃ³s-alta). |
| **10** | **ï¿½ï¿½ Kanban de InternaÃ§Ã£o** | GestÃ£o de internados por 5 setores | Metas de permanÃªncia (SLA) dinÃ¢micas, timeline de evoluÃ§Ã£o clÃ­nica, auditoria de atrasos. |
| **11** | **ï¿½ï¿½ Escalas de Trabalho** | GestÃ£o de plantÃµes de MÃ©dicos e Enfermeiros | Orelhas/sub-abas dedicadas, turnos (6h, 12h, 24h, 12x36), garantia de plantÃ£o ativado para HOJE. |
| **12** | **ï¿½ï¿½ FarmÃ¡cia & Estoque** | Controle de estoque de medicamentos e insumos | Pesquisa global de fÃ¡rmacos em tempo real via OpenFDA / ANVISA por princÃ­pio ativo. |
| **13** | **ï¿½ï¿½ RelatÃ³rios & ExportaÃ§Ã£o**| 5 cards especializados de emissÃ£o relatorial | ExportaÃ§Ã£o multiformato (**PDF**, **Excel XLSX**, **CSV**) para FinanÃ§as, Atendimentos, PEP, Leitos e Escalas. |


---

## ï¿½ï¿½ SumÃ¡rio Executivo
- 1. [VisÃ£o Geral & Arquitetura do Fluxo Hospitalar](#sec-1)
- 2. [Central de Atendimentos & Painel Kanban](#sec-2)
  - 2.1. [Cards MÃ©tricos e Filtros de Fila](#sec-2-1)
  - 2.2. [Fila 1: Aguardando Triagem (Protocolo de Manchester)](#sec-2-2)
  - 2.3. [Fila 2: Aguardando MÃ©dico (Chamada de ConsultÃ³rio)](#sec-2-3)
  - 2.4. [Fila 3: Em Atendimento (AÃ§Ãµes do MÃ©dico)](#sec-2-4)
- 3. [ProntuÃ¡rio Eletrnico do Paciente (PEP â€” MÃ©todo SOAP)](#sec-3)
  - 3.1. [Estrutura SOAP](#sec-3-1)
  - 3.2. [Autocomplete CID-10](#sec-3-2)
  - 3.3. [Assinatura Eletrnica e ExportaÃ§Ã£o PDF](#sec-3-3)
- 4. [Guia Completo de Todos os Modais do Sistema](#sec-4)
  - 4.1. [Modal de Triagem de Manchester](#sec-4-1)
  - 4.2. [Modal de PrescriÃ§Ã£o & ReceituÃ¡rio MÃ©dico](#sec-4-2)
  - 4.3. [Modal de TransferÃªncia & AlocaÃ§Ã£o de Leito](#sec-4-3)
  - 4.4. [Modal de Nova AdmissÃ£o & Entrada de Paciente](#sec-4-4)
  - 4.5. [Modal de Direcionamento & ReatribuiÃ§Ã£o de Fila](#sec-4-5)
  - 4.6. [Modal de HistÃ³rico PÃ³s-Alta & ProntuÃ¡rio Consolidado](#sec-4-6)
  - 4.7. [Modal de AprovaÃ§Ã£o de Acesso de UsuÃ¡rios](#sec-4-7)
  - 4.8. [Modal de GestÃ£o de UsuÃ¡rios & Troca de Perfil](#sec-4-8)
- 5. [GestÃ£o de Pacientes & HistÃ³rico ClÃ­nico](#sec-5)
- 6. [GestÃ£o da Equipe MÃ©dica & Corpo ClÃ­nico](#sec-6)
- 7. [GestÃ£o de ConsultÃ³rios & Salas de Atendimento](#sec-7)
- 8. [GestÃ£o de Leitos & HospitalizaÃ§Ã£o](#sec-8)
- 9. [Agenda, Escala MÃ©dica & Consultas Eletivas](#sec-9)
- 10. [FarmÃ¡cia & DispensaÃ§Ã£o de Medicamentos](#sec-10)
- 11. [Faturamento, Guias TISS & GestÃ£o Financeira](#sec-11)
- 12. [RelatÃ³rios Analytics & Indicadores Hospitalares](#sec-12)
- 13. [Painel de Chamada TV (RecepÃ§Ã£o)](#sec-13)
- 14. [Central de EstagnaÃ§Ã£o & AprovaÃ§Ãµes de Acesso](#sec-14)
- 15. [ConfiguraÃ§Ãµes, Backup e SincronizaÃ§Ã£o em Nuvem](#sec-15)
- 16. [Sistema de Avisos, NotificaÃ§Ãµes & Toasts](#sec-16)
- 17. [Tabela de MÃ¡scaras, Atalhos & Teclas de Atalho](#sec-17)
- 18. [SoluÃ§Ã£o de DÃºvidas Frequentes & Erros Comuns (FAQ)](#sec-18)

---

<h2 id="sec-1">1. VisÃ£o Geral & Arquitetura do Fluxo Hospitalar</h2>

O **Health Nexus** organiza a jornada assistencial do paciente desde a recepÃ§Ã£o atÃ© a alta definitiva ou internaÃ§Ã£o em UTI/Enfermaria.

### ï¿½ï¿½ Diagrama de Fluxo da Jornada Assistencial
```mermaid
graph TD
    A["ï¿½ï¿½ RecepÃ§Ã£o / AdmissÃ£o"] --> B["ï¿½ï¿½ Triagem de Manchester"]
    B --> C{"ClassificaÃ§Ã£o de Risco"}
    C -->|"ï¿½ï¿½ Vermelho (0m)"| D1["ï¿½ï¿½ Sala Vermelha (EmergÃªncia)"]
    C -->|"ï¿½ï¿½ Laranja (10m)"| D2["âš¡ Atendimento Imediato"]
    C -->|"ï¿½ï¿½ Amarelo (60m)"| D3["â³ Fila Urgente"]
    C -->|"ï¿½ï¿½ Verde (120m)"| D4["â³ Fila Pouco Urgente"]
    C -->|"ï¿½ï¿½ Azul (240m)"| D5["â³ Fila NÃ£o Urgente"]
    D1 & D2 & D3 & D4 & D5 --> E["ï¿½ï¿½ Chamada Painel TV / ConsultÃ³rio"]
    E --> F["ï¿½ï¿½ Atendimento MÃ©dico (PEP SOAP)"]
    F --> G{"Conduta Final"}
    G -->|"Alta MÃ©dica"| H["âœ… ConclusÃ£o & Receita"]
    G -->|"ObservaÃ§Ã£o PS (12h max)"| I["ï¿½ï¿½ Card de ObservaÃ§Ã£o com Cronmetro"]
    G -->|"Necessidade de Leito"| J["ï¿½ï¿½ï¸ TransferÃªncia para Enfermaria / UTI"]
```

### 🔐 Perfis de Acesso & Matriz de Permissões
| Perfil | Acesso Visual às Abas | Prontuário (PEP) | Triagem Manchester | Prescrição Planilha | Gestão de Leitos | Financeiro | Lixeira / Sync |
|---|---|---|---|---|---|---|---|
| **👑 Master / Admin** | Todas as abas | Total | Total | Total | Total | Total | Exclusivo |
| **🩺 Médico** | Dashboard, Pacientes, Atendimento, Leitos, Farmácia, Relatórios | Assinatura SOAPE | Consulta | Criação de Planilha | Solicitação | Bloqueado | Bloqueado |
| **🩺 Enfermeiro(a)** | Dashboard, Pacientes, Atendimento, Leitos, Farmácia | Leitura | Execução Manchester | Checagem de Doses | Gestão / Transferência | Bloqueado | Bloqueado |
| **📋 Recepcionista** | Dashboard, Pacientes, Agenda, Atendimento, Painel TV, Caixa | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Apenas Entradas | Bloqueado |
| **💊 Farmacêutico(a)**| Dashboard, Pacientes, Farmácia, Relatórios | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Bloqueado |

### 🤖 Assistente de IA Local (Manual Interativo)

O sistema possui um **Assistente IA Integrado** na busca do Manual. Ao fazer perguntas em linguagem natural (ex: "como incluir um paciente?"), a IA correlaciona a intenção com os botões e módulos do sistema.

**Segurança RBAC na IA:** A IA tem plena consciência do perfil de acesso do usuário. Se um usuário pesquisar por uma funcionalidade restrita a um perfil superior (ex: um Médico pesquisando sobre "Controle de Perfis"), a IA não instruirá sobre o módulo; em vez disso, informará claramente que o usuário logado não possui permissão para executar a ação solicitada, citando os perfis autorizados.

---

<h2 id="sec-2">2. Central de Atendimentos & Painel Kanban</h2>

<h3 id="sec-2-1">2.1. Cards MÃ©tricos e Filtros de Fila</h3>
No topo da aba **Atendimentos**, encontram-se os 4 **Cards MÃ©tricos ClicÃ¡veis** para controle imediato do fluxo:

| Card | Ãcone | Cor Tema | AÃ§Ã£o ao Clicar | DescriÃ§Ã£o / Objetivo |
| :--- | :---: | :---: | :--- | :--- |
| **Triagem** | ï¿½ï¿½ | Roxo (`#8b5cf6`) | `filterKanbanColumn('triage')` | Filtra a tela para exibir exclusivamente a coluna de pacientes aguardando triagem da enfermagem. |
| **Ag. MÃ©dico** | âŒ› | Amarelo (`#f59e0b`) | `filterKanbanColumn('waiting')` | Filtra a tela para exibir apenas os pacientes triados aguardando chamada do mÃ©dico. |
| **Em Consulta** | ï¿½ï¿½ | Verde (`#10b981`) | `filterKanbanColumn('active')` | Filtra a tela para focar nos atendimentos em andamento e em observaÃ§Ã£o no PS. |
| **Ver Todos** | ï¿½ï¿½ | Neutro (`#94a3b8`) | `filterKanbanColumn('all')` | Reseta os filtros e exibe as 3 colunas lado a lado no painel Kanban. |

---

<h3 id="sec-2-2">2.2. Fila 1: Aguardando Triagem (Protocolo de Manchester)</h3>
Pacientes admitidos na recepÃ§Ã£o dÃ£o entrada nesta fila para classificaÃ§Ã£o de risco pela enfermagem.

#### ï¿½ï¿½ Tabela de Campos do Modal de Triagem
| Campo do FormulÃ¡rio | Tipo de Entrada | Valores de ReferÃªncia / ValidaÃ§Ã£o | FunÃ§Ã£o ClÃ­nica |
| :--- | :--- | :--- | :--- |
| **PressÃ£o Arterial (PA)** | Texto (ex: `120/80`) | NORMOTENSO: 120/80 mmHg | AvaliaÃ§Ã£o hemodinÃ¢mica inicial (mÃ¡scara autocompletÃ¡vel). |
| **FrequÃªncia CardÃ­aca (FC)** | NÃºmero (bpm) | NORMOFAGIA: 60 - 100 bpm | DetecÃ§Ã£o de taquicardia ou bradicardia. |
| **Temperatura (Â°C)** | NÃºmero (Â°C) | AFEBRIL: 36.1Â°C - 37.2Â°C (Febre: >= 37.8Â°C) | IdentificaÃ§Ã£o de febre ou hipotermia. |
| **Peso (kg)** | NÃºmero (kg) | Exemplo: 70.5 kg | CÃ¡lculo de dosagem de medicamentos e anestÃ©sicos. |
| **SaturaÃ§Ã£o de O2 (SpO2)** | NÃºmero (%) | NORMAL: >= 95% (HipÃ³xia: < 92%) | AvaliaÃ§Ã£o de insuficiÃªncia respiratÃ³ria. |
| **Escala de Dor** | Seletor (0 a 10) | 0: Sem dor / 10: Pior dor imaginÃ¡vel | Escala analÃ³gica visual de dor. |
| **Queixa Principal** | Ãrea de Texto | MÃ­nimo 5 caracteres | Registro narrativo dos sintomas do paciente. |

#### ï¿½ï¿½ Tabela de ClassificaÃ§Ã£o de Risco (Manchester)
| Cor de Risco | NÃ­vel de Gravidade | Tempo MÃ¡ximo de Espera | SinalizaÃ§Ã£o Visual | AÃ§Ã£o Recomendada |
| :---: | :--- | :---: | :---: | :--- |
| ï¿½ï¿½ **Vermelho** | EmergÃªncia Absoluta | **0 minutos** (Imediato) | Card Vermelho Piscando | Paciente em risco iminente de morte. Sala Vermelha imediata. |
| ï¿½ï¿½ **Laranja** | Muito Urgente | **10 minutos** | Border Laranja | Risco significativo de perda de funÃ§Ã£o/vida. Atendimento rÃ¡pido. |
| ï¿½ï¿½ **Amarelo** | Urgente | **60 minutos** | Border Amarelo | CondiÃ§Ã£o estÃ¡vel com necessidade de avaliaÃ§Ã£o mÃ©dica em atÃ© 1h. |
| ï¿½ï¿½ **Verde** | Pouco Urgente | **120 minutos** | Border Verde | Quadro leve sem risco de agravamento rÃ¡pido. Fila regular. |
| ï¿½ï¿½ **Azul** | NÃ£o Urgente | **240 minutos** | Border Azul | Queixa crnica ou consulta simples. Atendimento eletivo. |

---

<h3 id="sec-2-3">2.3. Fila 2: Aguardando MÃ©dico (Chamada de ConsultÃ³rio)</h3>
Nesta coluna, os pacientes sÃ£o ordenados por **Gravidade Manchester** e **Tempo de Espera**.

#### ï¿½ï¿½ Tabela de AÃ§Ãµes do Card de Espera MÃ©dica
| AÃ§Ã£o no Card | Ãcone | FunÃ§Ã£o TÃ©cnica | Resultado no Sistema |
| :--- | :---: | :--- | :--- |
| **Chamar para Consulta** | ï¿½ï¿½ | Dispara websockets/eventos locais para a recepÃ§Ã£o. | 1. Toca sinal sonoro no Painel TV.<br>2. Exibe o nome do paciente no painel central.<br>3. Move o atendimento para a coluna *Em Atendimento*. |

---

<h3 id="sec-2-4">2.4. Fila 3: Em Atendimento (AÃ§Ãµes do MÃ©dico)</h3>
Coluna onde o mÃ©dico realiza o atendimento ativo. Cada card contÃ©m 5 botÃµes de aÃ§Ã£o:

#### ï¿½ï¿½ Tabela Completa de BotÃµes do MÃ©dico
| BotÃ£o | Ãcone | FunÃ§Ã£o do BotÃ£o | Resultado ao Clicar |
| :--- | :---: | :--- | :--- |
| **PEP** | ï¿½ï¿½ | ProntuÃ¡rio Eletrnico | Abre a janela modal do ProntuÃ¡rio (SOAP, sinais vitais, CID-10, histÃ³rico e assinatura). |
| **PrescriÃ§Ã£o** | ï¿½ï¿½ | ReceituÃ¡rio MÃ©dico | Abre a tela para prescrever medicamentos, posologias, via de administraÃ§Ã£o e orientaÃ§Ãµes. |
| **ObservaÃ§Ã£o** | ï¿½ï¿½ | ObservaÃ§Ã£o no PS (12h max) | Inicia a contagem do cronmetro de permanÃªncia contÃ­nua e exibe badge de tempo no card. |
| **Transferir Leito** | ï¿½ï¿½ï¸ | InternaÃ§Ã£o / Leito | Abre o modal para selecionar e alocar o paciente em um leito livre da Enfermaria ou UTI. |
| **Finalizar** | âœ… | Alta MÃ©dica / ConclusÃ£o | Encerra a consulta, grava a alta no sistema e move o atendimento para o HistÃ³rico PÃ³s-Alta. |

---

<h2 id="sec-3">3. ProntuÃ¡rio Eletrnico do Paciente (PEP â€” MÃ©todo SOAP)</h2>

<h3 id="sec-3-1">3.1. Estrutura SOAP</h3>
| Bloco SOAP | Elemento | DescriÃ§Ã£o do Preenchimento | Exemplo de Preenchimento |
| :---: | :--- | :--- | :--- |
| **S** | **Subjetivo** | Anamnese, queixa principal, tempo de evoluÃ§Ã£o dos sintomas e histÃ³rico. | *"Paciente relata dor torÃ¡cica hÃ¡ 2 horas com irradiaÃ§Ã£o para braÃ§o esquerdo."* |
| **O** | **Objetivo** | Exame fÃ­sico, ausculta cardÃ­aca/pulmonar, sinais vitais e exames complementares. | *"PA: 140/90, FC: 98bpm, ausculta cardÃ­aca sem sopros. ECG com elevaÃ§Ã£o ST."* |
| **A** | **AvaliaÃ§Ã£o** | HipÃ³tese diagnÃ³stica principal e busca do cÃ³digo **CID-10**. | *"I21.9 â€” Infarto agudo do miocÃ¡rdio nÃ£o especificado."* |
| **P** | **Plano** | Conduta terapÃªutica, prescriÃ§Ã£o farmacolÃ³gica, solicitaÃ§Ãµes de exames e recomendaÃ§Ãµes de alta/retorno. | *"Administrado AAS 300mg + Clopidogrel 300mg. Solicitada Vaga na UTI Coronariana."* |

<h3 id="sec-3-2">3.2. Autocomplete CID-10</h3>
No campo **AvaliaÃ§Ã£o**, ao digitar o cÃ³digo ou nome da doenÃ§a, o sistema lista sugestÃµes oficiais.

<h3 id="sec-3-3">3.3. Assinatura Eletrnica e ExportaÃ§Ã£o PDF</h3>
Recursos de rascunho, assinatura mÃ©dica com senha e geraÃ§Ã£o de laudo PDF.

---

<h2 id="sec-4">4. Guia Completo de Todos os Modais do Sistema</h2>

Abaixo encontra-se o detalhamento tÃ©cnico de cada janela modal presente no sistema, seus botÃµes, validaÃ§Ãµes e comportamentos.

<h3 id="sec-4-1">4.1. Modal de Triagem de Manchester</h3>
- **Como Acessar:** Clique no botÃ£o `ï¿½ï¿½ Realizar Triagem` na primeira coluna do Kanban.
- **Campos de Entrada:** `triage-pa`, `triage-fc`, `triage-temp`, `triage-peso`, `triage-spo2`, `triage-dor`, `manchesterColor`, `triage-queixa`.

| BotÃ£o do Modal | Classe / ID | Comportamento ao Clicar |
| :--- | :--- | :--- |
| **Confirmar Triagem** | `button[type="submit"]` | Valida cor obrigatÃ³ria e queixa. Altera status para `Aguardando_Atendimento` e fecha modal. |
| **Cancelar** | `#btn-cancel-triage` | Cancela a operaÃ§Ã£o, limpa o formulÃ¡rio e fecha a janela sem alterar o paciente. |
| **Fechar (X)** | `#close-triage-modal` | Fecha a janela modal imediatamente. |

<h3 id="sec-4-2">4.2. Modal de PrescriÃ§Ã£o & ReceituÃ¡rio MÃ©dico</h3>
- **Como Acessar:** Clique no botÃ£o `ï¿½ï¿½ PrescriÃ§Ã£o` na 3Âª coluna do Kanban (*Em Atendimento*).
- **Campos de Entrada:** `rx-med-name`, `rx-dosage`, `rx-route`, `rx-frequency`, `rx-notes`.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **âž• Adicionar Item** | Insere o medicamento na lista temporÃ¡ria da receita | Atualiza a tabela interna do receituÃ¡rio. |
| **ï¿½ï¿½ï¸ Remover Item** | Exclui o item selecionado da lista da receita | Remove o fÃ¡rmaco da lista atual. |
| **ï¿½ï¿½ Salvar & Dispensar**| Registra a receita e conecta com a farmÃ¡cia | Envia pedido de baixa para o estoque da farmÃ¡cia. |
| **ï¿½ï¿½ï¸ Imprimir PDF** | Gera a receita mÃ©dica formatada em PDF | Baixa o arquivo de receita com cabeÃ§alho mÃ©dico. |

<h3 id="sec-4-3">4.3. Modal de TransferÃªncia & AlocaÃ§Ã£o de Leito</h3>
- **Como Acessar:** Clique no botÃ£o `ï¿½ï¿½ï¸ Transferir Leito` no card do paciente em consulta.
- **Campos de Entrada:** `bed-sector`, `bed-target`, `bed-notes`.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **Confirmar TransferÃªncia**| Associa o paciente ao leito escolhido | Altera o status do leito para `Ocupado` e atualiza a aba *Leitos*. |
| **Solicitar HigienizaÃ§Ã£o** | Marca o leito de origem para limpeza | Altera o leito anterior para status `HigienizaÃ§Ã£o`. |
| **Cancelar** | Cancela o procedimento | Fecha o modal sem alterar o local do paciente. |

<h3 id="sec-4-4">4.4. Modal de Nova AdmissÃ£o & Entrada de Paciente</h3>
- **Como Acessar:** Clique no botÃ£o `+ Nova AdmissÃ£o` no topo da Central de Atendimentos.
- **Campos de Entrada:** `admission-patient-id`, `admission-type`, `admission-specialty`, `admission-priority`.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **Confirmar AdmissÃ£o** | Cria o novo atendimento | Insere o paciente na 1Âª coluna do Kanban (*Aguardando Triagem*). |
| **+ Cadastrar Novo Paciente**| Abre embutido o cadastro rÃ¡pido | Permite criar o cadastro caso o paciente nunca tenha vindo ao hospital. |

<h3 id="sec-4-5">4.5. Modal de Direcionamento & ReatribuiÃ§Ã£o de Fila</h3>
- **Como Acessar:** Na aba **EstagnaÃ§Ã£o**, clique no botÃ£o `Direcionar` ao lado de um paciente com atraso.
- **Campos de Entrada:** `reassign-room`, `reassign-status`.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **Confirmar Direcionamento**| Atualiza consultÃ³rio e status | Move o paciente imediatamente no Kanban desobstruindo o gargalo. |
| **ï¿½ï¿½ï¸ Solicitar InternaÃ§Ã£o** | SolicitaÃ§Ã£o direta de leito | Define o status para `Aguardando_Leito` e envia alerta para a Central de Leitos. |

<h3 id="sec-4-6">4.6. Modal de HistÃ³rico PÃ³s-Alta & ProntuÃ¡rio Consolidado</h3>
- **Como Acessar:** Clique no botÃ£o `HistÃ³rico` no topo da Central de Atendimentos ou na aba *Pacientes*.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **ï¿½ï¿½ï¸ Imprimir PDF Consolidado**| Gera o prontuÃ¡rio impresso em PDF | Baixa o relatÃ³rio PDF completo com todas as consultas do histÃ³rico. |
| **Fechar** | Fecha a exibiÃ§Ã£o do histÃ³rico | Retorna Ã  navegaÃ§Ã£o normal. |

<h3 id="sec-4-7">4.7. Modal de AprovaÃ§Ã£o de Acesso de UsuÃ¡rios</h3>
- **Como Acessar:** Exclusivo para o perfil **Administrador Master** na aba *EstagnaÃ§Ã£o*.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **ï¿½ï¿½ï¸ Aprovar Acesso** | Concede o perfil solicitado | Libera as permissÃµes de acordo com o cargo cadastrado. |
| **âŒ Recusar SolicitaÃ§Ã£o** | Define o perfil como `MÃ©dico` padrÃ£o | Nega privilÃ©gios de administrador mantendo acesso de mÃ©dico. |

<h3 id="sec-4-8">4.8. Modal de GestÃ£o de UsuÃ¡rios & Troca de Perfil</h3>
- **Como Acessar:** Clique no nome do usuÃ¡rio logado no canto superior direito do menu.

| BotÃ£o do Modal | AÃ§Ã£o | Resultado |
| :--- | :--- | :--- |
| **Salvar AlteraÃ§Ãµes** | Atualiza a senha e dados do operador | Grava no banco e emite toast de confirmaÃ§Ã£o. |
| **Sair / Logout** | Encerra a sessÃ£o atual | Redireciona para a tela de Login. |

---

<h2 id="sec-5">5. GestÃ£o de Pacientes & HistÃ³rico ClÃ­nico</h2>

Na aba **Pacientes**, o hospital mantÃ©m o cadastro centralizado.

### ï¿½ï¿½ Tabela de Campos Cadastrais do Paciente
| Campo | Tipo de Dado | Regra de ValidaÃ§Ã£o | Exemplo de Preenchimento |
| :--- | :--- | :--- | :--- |
| **Nome Completo** | Texto | MÃ­nimo de 3 caracteres | `Renato Ramos Machado` |
| **CPF** | NÃºmero / Texto | ValidaÃ§Ã£o de algoritmo de 11 dÃ­gitos | `123.456.789-00` |
| **Data de Nascimento** | Data (AAAA-MM-DD) | NÃ£o pode ser data futura | `1985-04-12` |
| **Telefone / WhatsApp**| Texto | DDD + NÃºmero | `(11) 98765-4321` |
| **EndereÃ§o Completo** | Texto | Logradouro, NÃºmero, Bairro, Cidade | `Av. Paulista, 1000 â€” SÃ£o Paulo/SP` |
| **ConvÃªnio / Plano** | Seletor | SUS, Particular ou Nome do ConvÃªnio | `Bradesco SaÃºde` |

---

<h2 id="sec-6">6. GestÃ£o da Equipe MÃ©dica & Corpo ClÃ­nico</h2>

Na aba **MÃ©dicos**, gerencia-se o corpo clÃ­nico do hospital.

### ï¿½ï¿½â€âš•ï¸ Tabela de Campos e AÃ§Ãµes dos MÃ©dicos
| Campo / AÃ§Ã£o | Tipo | DescriÃ§Ã£o / Exemplo | FunÃ§Ã£o no Sistema |
| :--- | :--- | :--- | :--- |
| **Nome do MÃ©dico** | Texto | `Dr. Carlos Eduardo Silva` | Exibido nos laudos, receitas e chamadas de TV. |
| **CRM / UF** | Texto | `123456/SP` | Registro profissional de classe no conselho mÃ©dico. |
| **Especialidade** | Seletor | `Cardiologia`, `Pediatria`, `Ortopedia` | Vincula a fila de atendimento da especialidade. |
| **ConsultÃ³rio Alocado**| Seletor | `ConsultÃ³rio 03` | Define em qual sala o mÃ©dico atende no dia. |
| **Status da Escala** | Badge | ï¿½ï¿½ `Em PlantÃ£o` / âšª `Folga` | Controla se o mÃ©dico estÃ¡ disponÃ­vel para chamadas. |

---

<h2 id="sec-7">7. GestÃ£o de ConsultÃ³rios & Salas de Atendimento</h2>

Na aba **ConsultÃ³rios**, controla-se a ocupaÃ§Ã£o das salas mÃ©dicas.

### ï¿½ï¿½ Tabela de Status e GestÃ£o das Salas
| Sala / ConsultÃ³rio | Ala | Especialidade Vinculada | MÃ©dico Alocado | Status Atual | AÃ§Ãµes RÃ¡pidas |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **ConsultÃ³rio 01** | TÃ©rreo | Clinica Geral | Dr. Carlos Silva | ï¿½ï¿½ `DisponÃ­vel` | `Alocar MÃ©dico`, `Chamar PrÃ³ximo` |
| **ConsultÃ³rio 02** | TÃ©rreo | Pediatria | Dra. Mariana Costa | ï¿½ï¿½ `Em Consulta` | `Ver Atendimento` |
| **ConsultÃ³rio 03** | 1Âº Andar | Ortopedia | Dr. Roberto Alves | ï¿½ï¿½ `HigienizaÃ§Ã£o` | `Liberar Sala` |
| **Sala Amarela** | UrgÃªncia | EmergÃªncia / PS | Dra. Fernanda Lima | ï¿½ï¿½ `Em Consulta` | `Transferir Paciente` |

---

<h2 id="sec-8">8. GestÃ£o de Leitos & HospitalizaÃ§Ã£o</h2>

Na aba **Leitos**, a equipe gerencia a ocupaÃ§Ã£o das alas hospitalares.

### ï¿½ï¿½ï¸ Tabela de GestÃ£o de Leitos
| Leito ID | Ala / Setor | Paciente Internado | Tempo de InternaÃ§Ã£o | Status do Leito | AÃ§Ãµes Permitidas |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Enfermaria 101-A**| Enfermaria Geral | Maria Eduarda Souza | 3 dias | ï¿½ï¿½ `Ocupado` | `Transferir Leito`, `Dar Alta` |
| **Enfermaria 101-B**| Enfermaria Geral | â€” | â€” | ï¿½ï¿½ `DisponÃ­vel` | `Internar Paciente` |
| **UTI-01** | UTI Adulto | JosÃ© Ramos Ferreira | 7 dias | ï¿½ï¿½ `Ocupado` | `Transferir Leito`, `EvoluÃ§Ã£o UTI` |
| **Isolamento-02** | Isolamento | â€” | â€” | ï¿½ï¿½ `HigienizaÃ§Ã£o` | `Liberar para Uso` |

---

<h2 id="sec-9">9. Agenda, Escala MÃ©dica & Consultas Eletivas</h2>

Na aba **Agenda**, realiza-se a marcaÃ§Ã£o e controle de horÃ¡rios.

### ï¿½ï¿½ Tabela de OperaÃ§Ãµes da Agenda
| OperaÃ§Ã£o | ParÃ¢metros NecessÃ¡rios | AÃ§Ã£o do Sistema | Resultado Gerado |
| :--- | :--- | :--- | :--- |
| **Novo Agendamento** | Paciente, MÃ©dico, Data, HorÃ¡rio | Grava a consulta na grade. | Insere na agenda e habilita emissÃ£o de PDF. |
| **Imprimir Comprovante**| ID do Agendamento | Gera documento PDF formatado. | Baixa o ticket impresso para entrega ao paciente. |
| **Cancelar HorÃ¡rio** | Motivo do cancelamento | Altera status para `Cancelado`. | Libera a vaga no horÃ¡rio para nova marcaÃ§Ã£o. |

---

<h2 id="sec-10">10. FarmÃ¡cia & DispensaÃ§Ã£o de Medicamentos</h2>

Na aba **FarmÃ¡cia**, faz-se a gestÃ£o de estoque e rastreabilidade de medicamentos.

### ï¿½ï¿½ Tabela de Controle de FarmÃ¡cia e Estoque
| Medicamento | ApresentaÃ§Ã£o / Via | Lote | Data Validade | Estoque Atual | Estoque MÃ­n. | Status Estoque |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Dipirona SÃ³dica** | Ampola 500mg/ml (EV/IM)| `L-9821` | 2027-12-31 | 450 un | 100 un | ï¿½ï¿½ OK |
| **Amoxicilina 500mg** | Comprimido (VO) | `L-4410` | 2026-09-15 | 85 un | 100 un | ï¿½ï¿½ Abaixo MÃ­nimo |
| **Fentanil 0.05mg/ml**| Ampola (EV) | `L-1102` | 2026-08-20 | 12 un | 20 un | ï¿½ï¿½ Alerta Validade/Estoque |

---

<h2 id="sec-11">11. Faturamento, Guias TISS & GestÃ£o Financeira</h2>

Na aba **Faturamento**, acompanha-se a receita e os repasses dos convÃªnios.

### ï¿½ï¿½ Tabela de LanÃ§amentos Financeiros
| CÃ³digo Atendimento | Paciente | ConvÃªnio / Plano | Valor dos ServiÃ§os | Valor Taxas/Exames | Status Financeiro | AÃ§Ãµes DisponÃ­veis |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `#ATD-2026-081` | Renato Ramos | Unimed SaÃºde | R$ 350,00 | R$ 120,00 | ï¿½ï¿½ `Pendente` | `Dar Baixa`, `Editar` |
| `#ATD-2026-082` | Camila Ferreira | SUS / PÃºblico | R$ 180,00 | R$ 0,00 | ï¿½ï¿½ `Faturado` | `Ver Detalhes` |
| `#ATD-2026-083` | Lucas Mendes | Particular | R$ 450,00 | R$ 200,00 | ï¿½ï¿½ `Pago` | `Imprimir Recibo` |

---

<h2 id="sec-12">12. RelatÃ³rios Analytics & Indicadores Hospitalares</h2>

Na aba **RelatÃ³rios**, o gestor visualiza os grÃ¡ficos e indicadores de desempenho.

### ï¿½ï¿½ Tabela de Indicadores Gerenciais
| RelatÃ³rio / MÃ©trica | Indicador Analisado | PerÃ­odo SelecionÃ¡vel | Formato de ExportaÃ§Ã£o |
| :--- | :--- | :---: | :---: |
| **Taxa de OcupaÃ§Ã£o de Leitos** | % de leitos ocupados vs leitos totais | Hoje / 7 dias / 30 dias | PDF / Excel |
| **Tempo MÃ©dio de Espera (SLA)** | Minutos mÃ©dios de espera por Manchester | Hoje / Mensal | PDF / Excel |
| **Volume de Atendimentos** | Quantidade de pacientes atendidos por especialidade | Mensal / Anual | Excel / CSV |
| **Faturamento Por ConvÃªnio** | Total arrecadado discriminado por plano de saÃºde | Mensal | Excel / PDF |

---

<h2 id="sec-13">13. Painel de Chamada TV (RecepÃ§Ã£o)</h2>

Na aba **Painel TV**, a recepÃ§Ã£o gerencia as chamadas na televisÃ£o da sala de espera.

### ï¿½ï¿½ Tabela de Recursos do Painel TV
| Recurso | DescriÃ§Ã£o TÃ©cnica | Resultado Visual / Sonoro |
| :--- | :--- | :--- |
| **Chamada Sonora (Chime)** | Reproduz o sinal de Ã¡udio sintetizado em alto-falante. | Atrai a atenÃ§Ã£o dos pacientes na recepÃ§Ã£o. |
| **Placa Visual Principal** | Exibe o Nome do Paciente e o ConsultÃ³rio em fonte gigante. | Pisca em cor de alto contraste na tela da TV. |
| **Lista de Chamadas Recentes** | HistÃ³rico das Ãºltimas 5 chamadas no canto da tela. | Permite ao paciente verificar se seu nome foi chamado. |

---

<h2 id="sec-14">14. Central de EstagnaÃ§Ã£o & AprovaÃ§Ãµes de Acesso</h2>

Na aba **EstagnaÃ§Ã£o**, o sistema monitora gargalos e pendÃªncias de acesso de novos usuÃ¡rios. Todo novo usuÃ¡rio cadastrado sem a chave master precisarÃ¡ de aprovaÃ§Ã£o.

### ï¿½ï¿½ Tabela de Alertas de EstagnaÃ§Ã£o & AprovaÃ§Ãµes
| Tipo de Alerta | CritÃ©rio de Disparo | Cor do Badge | AÃ§Ã£o Recomendada |
| :--- | :---: | :---: | :--- |
| **Alerta de Espera** | Tempo de espera > **15 min** | ï¿½ï¿½ Amarelo | Acionar o mÃ©dico da sala ou agilizar a triagem. |
| **Alerta CrÃ­tico** | Tempo de espera > **30 min** | ï¿½ï¿½ Vermelho | Remanejar paciente para consultÃ³rio vago. |
| **ObservaÃ§Ã£o Excedida** | Permaneceu > **12h em Obs no PS** | ï¿½ï¿½ Piscando | Solicitar internaÃ§Ã£o imediata em leito de enfermaria. |
| **SolicitaÃ§Ã£o de Acesso** | UsuÃ¡rio realizou cadastro pendente | ï¿½ï¿½ Laranja | BotÃ£o `Aprovar Acesso` exclusivo do Administrador Master. |

---

<h2 id="sec-15">15. ConfiguraÃ§Ãµes, Backup e SincronizaÃ§Ã£o em Nuvem</h2>

Na aba **ConfiguraÃ§Ãµes**, realiza-se a manutenÃ§Ã£o do banco de dados local e nuvem.

### âš™ï¸ Tabela de OperaÃ§Ãµes de ConfiguraÃ§Ã£o
| OperaÃ§Ã£o | BotÃ£o | AÃ§Ã£o / Quando Utilizar |
| :--- | :---: | :--- |
| **SincronizaÃ§Ã£o Nuvem** | `Sincronizar` | Conecta ao banco de dados Turso/SQLite na nuvem para sincronizaÃ§Ã£o em tempo real. |
| **Exportar Backup JSON** | `Exportar JSON` | Baixa o arquivo completo de backup do banco de dados para seguranÃ§a externa. |
| **Importar Backup JSON** | `Importar JSON` | Restaura a base de dados a partir de um arquivo de backup previamente salvo. |
| **Popular Banco (Seed)** | `Gerar Dados Teste` | Cria pacientes e atendimentos fictÃ­cios para treinamentos ou testes. |
| **Resetar Banco** | `Limpar Dados` | Apaga os dados locais (requer confirmaÃ§Ã£o da senha Master). |

---

<h2 id="sec-16">16. Sistema de Avisos, NotificaÃ§Ãµes & Toasts</h2>

| Tipo de NotificaÃ§Ã£o | Cor do Toast | DuraÃ§Ã£o na Tela | Exemplo de Mensagem |
| :--- | :---: | :---: | :--- |
| **Sucesso** | ï¿½ï¿½ Verde | 3 segundos | `âœ… ProntuÃ¡rio assinado com sucesso!` |
| **Alerta / Aviso** | ï¿½ï¿½ Amarelo | 4 segundos | `â±ï¸ Paciente colocado em ObservaÃ§Ã£o MÃ©dica (Cronmetro 12h iniciado)` |
| **Erro / Falha** | ï¿½ï¿½ Vermelho | 5 segundos | `âŒ Selecione a classificaÃ§Ã£o de risco obrigatÃ³ria.` |

---

<h2 id="sec-17">17. Tabela de MÃ¡scaras, Atalhos & Teclas de Atalho</h2>

| Atalho / Clique | FunÃ§Ã£o | Onde Funciona |
| :--- | :--- | :--- |
| `Mascara PA (120/80)` | Formata nÃºmeros em formato sistÃ³lica/diastÃ³lica | Campo PressÃ£o Arterial na Triagem |
| `Mascara CPF (000.000.000-00)` | Formata 11 dÃ­gitos com pontos e hÃ­fen | Cadastro de Paciente |
| `Clique no Card Triagem` | Filtra para ver apenas a fila de Triagem | Aba Atendimentos |
| `Clique no Card Ag. MÃ©dico`| Filtra para ver apenas os pacientes aguardando mÃ©dico | Aba Atendimentos |
| `Clique no Card Em Consulta`| Filtra para ver os atendimentos ativos | Aba Atendimentos |
| `Clique em Ver Todos` | Exibe as 3 colunas do Kanban lado a lado | Aba Atendimentos |
| `BotÃ£o Imprimir / PDF` | Imprime laudo oficial em PDF do PEP | Modal do PEP |

---

<h2 id="sec-18">18. SoluÃ§Ã£o de DÃºvidas Frequentes & Erros Comuns (FAQ)</h2>

| Problema Encontrado | Causa ProvÃ¡vel | SoluÃ§Ã£o Passo a Passo |
| :--- | :--- | :--- |
| **Ao clicar no PEP exibe erro no console** | O atendimento nÃ£o foi inicializado | Verifique se o atendimento estÃ¡ na coluna *Em Consulta* antes de abrir o PEP. |
| **ProntuÃ¡rio gerado em PDF com campos vazios** | Paciente sem CPF/dados cadastrais | Acesse a aba *Pacientes*, complete o cadastro do paciente e tente gerar novamente. |
| **HistÃ³rico exibe "Nenhum atendimento registrado"** | Consulta recÃ©m-criada sem triagem | Certifique-se de realizar a Triagem de Manchester antes de buscar o histÃ³rico. |
| **O cronmetro do card nÃ£o estÃ¡ atualizando** | Intervalo de atualizaÃ§Ã£o pausado | Clique no botÃ£o `Atualizar` na barra superior ou recarregue a aba *Atendimentos*. |

---
*Health Nexus â€” Manual do UsuÃ¡rio v1.0 | Sistema de GestÃ£o Hospitalar de Alta Performance*

---

<h2 id="sec-22">22. ï¿½ï¿½ AtualizaÃ§Ãµes Recentes (Agosto/2026)</h2>

O Health Nexus recebeu uma sÃ©rie de melhorias para otimizar o fluxo de trabalho e garantir a seguranÃ§a das informaÃ§Ãµes operacionais:

### 22.1. Controle de Acesso e PermissÃµes (Roles)
A aba de **ConfiguraÃ§Ãµes Globais** agora conta com um controle de acesso rigoroso:
- **MASTER:** Possui acesso integral a todos os painÃ©is, incluindo "Gerenciamento de UsuÃ¡rios", "SimulaÃ§Ã£o de Dados" e demais configuraÃ§Ãµes avanÃ§adas (identificadas em vermelho).
- **Desenvolvedor:** Recebe acesso apenas aos agrupamentos tÃ©cnicos essenciais (destacados em vermelho), permitindo realizar sincronizaÃ§Ã£o de banco de dados (Turso) e operaÃ§Ãµes tÃ©cnicas, mantendo restriÃ§Ãµes de gerenciamento de equipe.
- **Demais perfis:** Acesso bloqueado Ã  aba de ConfiguraÃ§Ãµes para garantir a seguranÃ§a dos dados.

### 22.2. BotÃµes de Limpeza de Filtros ("Limpar Filtros")
Visando aumentar a agilidade operacional, foram incluÃ­dos botÃµes dedicados com o Ã­cone <i class="fa-solid fa-filter-circle-xmark"></i> (Limpar Filtros) em **todas as abas principais**:
- **Pacientes, MÃ©dicos, Agenda, FarmÃ¡cia e RelatÃ³rios.**
- Um Ãºnico clique zera instantaneamente todas as buscas de texto e recoloca os *checkboxes* de filtro em seus estados padrÃ£o, permitindo buscas fluÃ­das.

### 22.3. Busca de Pacientes Aprimorada (Nome e CPF)
O componente unificado de busca de pacientes (Dropdown dinÃ¢mico utilizado em modais de admissÃ£o, prescriÃ§Ã£o e financeiro) foi reescrito. Agora:
- A pesquisa procura nÃ£o apenas pelo Nome do Paciente, mas tambÃ©m verifica ocorrÃªncias do **CPF**.
- O **CPF** Ã© exibido diretamente na lista de opÃ§Ãµes (formato reduzido), facilitando a identificaÃ§Ã£o de homnimos na hora do atendimento.

### 22.4. Ãcones Visuais de Forma de Pagamento ï¿½ï¿½ï¿½ï¿½
A interface da seÃ§Ã£o de RelatÃ³rios Financeiros foi enriquecida com representaÃ§Ãµes grÃ¡ficas (Emojis):
- Pix (ï¿½ï¿½)
- Dinheiro (ï¿½ï¿½)
- CartÃ£o de CrÃ©dito (ï¿½ï¿½)
- CartÃ£o de DÃ©bito (ï¿½ï¿½)
- Boleto (ï¿½ï¿½)
Isso reduz o tempo de reconhecimento visual do atendente durante o fechamento de caixa.

---

---

<h2 id="sec-22">22. ï¿½ï¿½ AtualizaÃ§Ãµes Recentes (Agosto/2026)</h2>

O Health Nexus recebeu uma sÃ©rie de melhorias para otimizar o fluxo de trabalho e garantir a seguranÃ§a das informaÃ§Ãµes operacionais:

### 22.1. Controle de Acesso e PermissÃµes (Roles)
A aba de **ConfiguraÃ§Ãµes Globais** agora conta com um controle de acesso rigoroso:
- **MASTER:** Possui acesso integral a todos os painÃ©is, incluindo "Gerenciamento de UsuÃ¡rios", "SimulaÃ§Ã£o de Dados" e demais configuraÃ§Ãµes avanÃ§adas (identificadas em vermelho).
- **Desenvolvedor:** Recebe acesso apenas aos agrupamentos tÃ©cnicos essenciais (destacados em vermelho), permitindo realizar sincronizaÃ§Ã£o de banco de dados (Turso) e operaÃ§Ãµes tÃ©cnicas, mantendo restriÃ§Ãµes de gerenciamento de equipe.
- **Demais perfis:** Acesso bloqueado Ã  aba de ConfiguraÃ§Ãµes para garantir a seguranÃ§a dos dados.

### 22.2. BotÃµes de Limpeza de Filtros ("Limpar Filtros")
Visando aumentar a agilidade operacional, foram incluÃ­dos botÃµes dedicados com o Ã­cone <i class="fa-solid fa-filter-circle-xmark"></i> (Limpar Filtros) em **todas as abas principais**:
- **Pacientes, MÃ©dicos, Agenda, FarmÃ¡cia e RelatÃ³rios.**
- Um Ãºnico clique zera instantaneamente todas as buscas de texto e recoloca os *checkboxes* de filtro em seus estados padrÃ£o, permitindo buscas fluÃ­das.

### 22.3. Busca de Pacientes Aprimorada (Nome e CPF)
O componente unificado de busca de pacientes (Dropdown dinÃ¢mico utilizado em modais de admissÃ£o, prescriÃ§Ã£o e financeiro) foi reescrito. Agora:
- A pesquisa procura nÃ£o apenas pelo Nome do Paciente, mas tambÃ©m verifica ocorrÃªncias do **CPF**.
- O **CPF** Ã© exibido diretamente na lista de opÃ§Ãµes (formato reduzido), facilitando a identificaÃ§Ã£o de homnimos na hora do atendimento.

### 22.4. Ãcones Visuais de Forma de Pagamento ï¿½ï¿½ï¿½ï¿½
A interface da seÃ§Ã£o de RelatÃ³rios Financeiros foi enriquecida com representaÃ§Ãµes grÃ¡ficas (Emojis):
- Pix (ï¿½ï¿½)
- Dinheiro (ï¿½ï¿½)
- CartÃ£o de CrÃ©dito (ï¿½ï¿½)
- CartÃ£o de DÃ©bito (ï¿½ï¿½)
- Boleto (ï¿½ï¿½)
Isso reduz o tempo de reconhecimento visual do atendente durante o fechamento de caixa.

### 22.5. ValidaÃ§Ã£o Estrita de Senhas no Login ï¿½ï¿½
A tela de autenticaÃ§Ã£o foi atualizada para exigir a validaÃ§Ã£o exata da senha cadastrada de cada usuÃ¡rio:
- Tentativas com senhas incorretas sÃ£o imediatamente rejeitadas (HTTP 401).
- Garantia de que contas individuais (ex: `ljordao`, `bcoltri`, `admin`) sÃ³ possuem acesso liberado mediante a apresentaÃ§Ã£o da senha cadastrada correspondente.

---

---

<h2 id="sec-22">22. ðŸ†• AtualizaÃ§Ãµes Recentes (Agosto/2026)</h2>

O Health Nexus recebeu uma sÃ©rie de melhorias para otimizar o fluxo de trabalho e garantir a seguranÃ§a das informaÃ§Ãµes operacionais:

### 22.1. Controle de Acesso e PermissÃµes (Roles)
A aba de **ConfiguraÃ§Ãµes Globais** agora conta com um controle de acesso rigoroso:
- **MASTER:** Possui acesso integral a todos os painÃ©is, incluindo "Gerenciamento de UsuÃ¡rios", "SimulaÃ§Ã£o de Dados" e demais configuraÃ§Ãµes avanÃ§adas (identificadas em vermelho).
- **Desenvolvedor:** Recebe acesso apenas aos agrupamentos tÃ©cnicos essenciais (destacados em vermelho), permitindo realizar sincronizaÃ§Ã£o de banco de dados (Turso) e operaÃ§Ãµes tÃ©cnicas, mantendo restriÃ§Ãµes de gerenciamento de equipe.
- **Demais perfis:** Acesso bloqueado Ã  aba de ConfiguraÃ§Ãµes para garantir a seguranÃ§a dos dados.

### 22.2. BotÃµes de Limpeza de Filtros ("Limpar Filtros")
Visando aumentar a agilidade operacional, foram incluÃ­dos botÃµes dedicados com o Ã­cone <i class="fa-solid fa-filter-circle-xmark"></i> (Limpar Filtros) em **todas as abas principais**:
- **Pacientes, MÃ©dicos, Agenda, FarmÃ¡cia e RelatÃ³rios.**
- Um Ãºnico clique zera instantaneamente todas as buscas de texto e recoloca os *checkboxes* de filtro em seus estados padrÃ£o, permitindo buscas fluÃ­das.

### 22.3. Busca de Pacientes Aprimorada (Nome e CPF)
O componente unificado de busca de pacientes (Dropdown dinÃ¢mico utilizado em modais de admissÃ£o, prescriÃ§Ã£o e financeiro) foi reescrito. Agora:
- A pesquisa procura nÃ£o apenas pelo Nome do Paciente, mas tambÃ©m verifica ocorrÃªncias do **CPF**.
- O **CPF** Ã© exibido diretamente na lista de opÃ§Ãµes (formato reduzido), facilitando a identificaÃ§Ã£o de homnimos na hora do atendimento.

### 22.4. Ãcones Visuais de Forma de Pagamento ðŸ’µðŸ’³
A interface da seÃ§Ã£o de RelatÃ³rios Financeiros foi enriquecida com representaÃ§Ãµes grÃ¡ficas (Emojis):
- Pix (ðŸ’ )
- Dinheiro (ðŸ’µ)
- CartÃ£o de CrÃ©dito (ðŸ’³)
- CartÃ£o de DÃ©bito (ðŸ’³)
- Boleto (ðŸ“„)
Isso reduz o tempo de reconhecimento visual do atendente durante o fechamento de caixa.

### 22.5. ValidaÃ§Ã£o Estrita de Senhas no Login ðŸ”’
A tela de autenticaÃ§Ã£o foi atualizada para exigir a validaÃ§Ã£o exata da senha cadastrada de cada usuÃ¡rio:
- Tentativas com senhas incorretas sÃ£o imediatamente rejeitadas (HTTP 401).
- Garantia de que contas individuais (ex: `ljordao`, `bcoltri`, `admin`) sÃ³ possuem acesso liberado mediante a apresentaÃ§Ã£o da senha cadastrada correspondente.

---
