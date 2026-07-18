# Health Nexus — Introdução e Visão Geral

O **Health Nexus** é um sistema integrado de gestão hospitalar (ERP de Saúde) projetado para otimizar fluxos administrativos, assistenciais, clínicos e financeiros de instituições de saúde de diferentes portes.

## 1. Missão e Visão

*   **Missão**: Fornecer uma plataforma única para gerenciamento hospitalar, integrando processos administrativos, clínicos, assistenciais e financeiros em um ambiente seguro, moderno e escalável.
*   **Visão**: Ser uma plataforma de referência em gestão hospitalar, construída sobre tecnologias web modernas, arquitetura modular e padrões internacionais de interoperabilidade.

---

## 2. Escopo de Atuação

O Health Nexus foi projetado para operar nos seguintes ambientes:

| Tipo de Unidade | Escopo de Utilização |
| :--- | :--- |
| **Hospitais** | Internações, Centro Cirúrgico, PEP completo, Controle de Leitos, Farmácia Central e Faturamento complexo. |
| **Clínicas & Consultórios** | Agenda médica unificada, Prontuário simplificado e Faturamento de convênios. |
| **Laboratórios** | Recepção de exames, digitação de laudos, controle de reagentes e integração LIS. |
| **Centros de Diagnóstico** | Agendamento de exames de imagem, gerenciamento PACS e entrega de laudos. |
| **UPAs & Ambulatórios** | Classificação de Risco (Manchester), atendimento rápido de urgência e encaminhamento. |

---

## 3. Público-Alvo e Atores

O sistema disponibiliza interfaces e fluxos customizados para diferentes perfis profissionais:

*   **Diretores e Gestores**: Painéis gerenciais, faturamento, BI e relatórios de desempenho operacional.
*   **Médicos**: Prontuário Eletrônico do Paciente (PEP), prescrições, solicitação de exames, telemedicina e agenda.
*   **Enfermeiros & Técnicos**: Triagem, evolução de enfermagem, checagem à beira do leito, administração de medicamentos.
*   **Recepcionistas**: Admissão, agendamento de consultas, cadastro de pacientes e elegibilidade de convênios.
*   **Farmacêuticos**: Controle de estoque central/satélite, dispensação de receitas e fracionamento de insumos.
*   **Financeiro & Faturamento**: Contas a pagar/receber, conciliação bancária, faturamento TISS/SUS e guias de convênio.
*   **Recursos Humanos**: Escalas de trabalho de plantonistas, controle de especialidades e cadastros de prestadores.
*   **Tecnologia da Informação**: Auditoria de acessos, logs de segurança, parametrizações e integrações externas.

---

## 4. Objetivos Técnicos

O Health Nexus adere aos seguintes requisitos não funcionais e arquiteturais:

1.  **Interface Moderna**: UI intuitiva, focada na usabilidade clínica para reduzir o tempo de cliques e evitar a fadiga do usuário.
2.  **Arquitetura Modular**: Possibilidade de habilitar ou desabilitar módulos sob demanda (ex: uma clínica pode desabilitar o Centro Cirúrgico).
3.  **Atualizações em Tempo Real**: Websockets para alertas de triagem, painéis de chamada e mensagens instantâneas.
4.  **Alta Disponibilidade**: Arquitetura tolerante a falhas, com capacidade de operar offline localmente ou em redundância multi-cloud.
5.  **Segurança Rigorosa**: Criptografia de dados de saúde sensíveis e trilhas de auditoria imutáveis.
6.  **Escalabilidade**: Deploy em microsserviços ou containers Docker com facilidade de auto-scaling horizontal.
7.  **Interoperabilidade**: APIs REST prontas para integração de mercado e compatibilidade com padrões internacionais.

---

## 5. Tecnologias Adotadas

### Frontend
*   **HTML5 Semântico**: Estruturação acessível.
*   **CSS3 Moderno**: Utilização de *CSS Variables*, *CSS Grid* e *Flexbox* para design responsivo nativo, sem dependências desnecessárias de frameworks pesados.
*   **JavaScript (ES6+)**: SPA dinâmico e consumo assíncrono de APIs.
*   **Tipografia & Ícones**: Fontes *Outfit* (títulos) e *Inter* (leitura/corpo); ícones via *Font Awesome 6.4*.

### Backend
*   **Node.js**: Runtime Javascript assíncrono direcionado a eventos.
*   **Express**: Framework web minimalista para construção de rotas e controllers.
*   **WebSockets**: Protocolo bidirecional via `Socket.io` para comunicação real-time.

### Banco de Dados
*   **Turso (LibSQL/SQLite)**: Banco de dados relacional e distribuído na borda, com suporte nativo a dados semiestruturados (funções JSON) e integridade referencial forte para faturamento financeiro.

### APIs e Integrações Planejadas
*   **ViaCEP**: Autocomplete de endereço do paciente pelo CEP.
*   **IBGE**: Validação de códigos de município de nascimento e residência para faturamento SUS.
*   **CNES (Cadastro Nacional de Estabelecimentos de Saúde)**: Sincronização de dados cadastrais do hospital/profissionais.
*   **SIGTAP / TUSS**: Listagem e valores atualizados de procedimentos para faturamento SUS e convênios privados.
*   **CID-10 / CID-11**: Catálogo internacional de doenças integrado ao prontuário médico.
*   **FHIR (Fast Healthcare Interoperability Resources)**: Padrão XML/JSON para intercâmbio de dados clínicos.
*   **OpenAI API**: Auxílio na sumarização de prontuários extensos e preenchimento inteligente.
*   **WhatsApp Business API / SMTP**: Envio de confirmação de consultas, lembretes de exames e receitas digitais.
*   **Google Calendar**: Sincronização bidirecional de agendas médicas com as agendas pessoais dos profissionais.

---

## 6. Princípios de Engenharia de Software

O desenvolvimento do Health Nexus baseia-se em:

*   **Clean Code (Código Limpo)**: Nomes autoexplicativos, funções pequenas com responsabilidade única e DRY (*Don't Repeat Yourself*).
*   **Separação de Responsabilidades**: Divisão explícita em camadas (*Controllers*, *Services*, *Repositories*).
*   **Acessibilidade (WCAG)**: Contraste adequado, navegação por teclado e semântica acessível para leitores de tela.
*   **Segurança por Padrão (Secure by Design)**: Sanitização de dados contra SQL Injection e XSS, e princípio do menor privilégio.
