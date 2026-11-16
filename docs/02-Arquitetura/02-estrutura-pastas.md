# Health Nexus — Estrutura de Pastas e Padrões de Código

Este documento estabelece a organização física dos arquivos do **Health Nexus** (v2.7.2), define as convenções de nomenclatura e descreve as diretrizes de desenvolvimento (Clean Code, SOLID, Acessibilidade WCAG).

---

## 1. Estrutura Física do Projeto

O repositório está centralizado na pasta `c:\Health Nexus` e organizado com arquitetura SPA modular no frontend (Vite), backend proxy no Express/Vercel e documentações técnicas em `docs/`.

```
C:\Health Nexus\
├── api/                       # Funções Serverless Edge Vercel
│   ├── events.js              # Server-Sent Events (SSE) push hub
│   └── index.js               # Handler API principal Vercel
├── backend/                   # Servidor Express API & Proxy Turso Serverless
│   ├── app.js                 # Definição de rotas, SSE stream /api/events, /api/tv/call e proxy
│   └── server.js              # Ponto de entrada do servidor Node.js local
├── dist/                      # Bundle de produção gerado pelo Vite 5
├── docs/                      # Documentação técnica, requisitos, arquitetura e segurança
│   ├── 01-Visao-Geral/        # Introdução, objetivos e escopo do hospital
│   ├── 02-Arquitetura/        # Arquitetura geral, estrutura de pastas e design system
│   ├── 03-Requisitos/         # Especificações de requisitos funcionais por módulo
│   ├── 04-Banco-de-Dados/     # Dicionário de dados, modelo e schemas Turso/LibSQL
│   ├── 05-Interfaces/         # Telas, fluxos e especificações de UI/UX
│   ├── 06-APIs/               # Catálogo de endpoints REST e integrações externas
│   ├── 07-Seguranca/          # Políticas de autenticação, JWT, RBAC e LGPD
│   ├── 08-Testes/             # Cenários de teste e homologação clínica
│   ├── 09-Implantacao/        # Procedimentos de deploy Vercel e rollback
│   └── 10-Manuais/            # Guias de uso para médicos, enfermagem e recepção
├── src/                       # Código-fonte do Frontend Modular
│   ├── modules/               # Submódulos desacoplados de responsabilidade única
│   │   ├── api.js             # apiFetch, cache em memória, strings e agregação de KPIs
│   │   ├── auth.js            # RBAC hospitalar, auditoria de logins e gestão de usuários
│   │   ├── realtime.js        # RealtimeHub SSE com barramento BroadcastChannel multi-aba
│   │   ├── sync.js            # SyncManager Dual-Pipeline (Vercel + Direct HTTP Turso)
│   │   └── ui.js              # Temas, modais de alerta/confirmação, toasts e helpers UI
│   ├── tabs/                  # Módulos especializados de cada aba hospitalar
│   │   ├── agenda.js          # Agendamento ambulatorial e consultórios
│   │   ├── attendance.js      # Fila de atendimento, triagem Manchester e permanência 12h PS
│   │   ├── consultingRooms.js # Gestão e status de consultórios médicos
│   │   ├── dashboard.js       # Dashboard executivo, funil dinâmico e gráficos Chart.js
│   │   ├── doctors.js         # Corpo clínico e credenciamento CRM
│   │   ├── escalas.js         # Escalas de plantão médico e enfermagem
│   │   ├── kanban.js          # Kanban de internação por setor e leitos
│   │   ├── leitos.js          # Mapa de leitos e censo hospitalar
│   │   ├── patients.js        # CRUD de pacientes, validação SUS e busca inteligente
│   │   ├── pharmacy.js        # Farmácia, lote, validade e dispensação
│   │   ├── reports.js         # Relatórios gerenciais e exportação PDF/Excel
│   │   ├── settings.js        # Configurações Turso, simulação e backups redundantes
│   │   ├── stagnation.js      # Alertas de estagnação e tempo de permanência
│   │   └── tv.js              # Painel de chamada com voz sintetizada
│   ├── aiCopilot.js           # Assistente de IA para dúvidas e navegação
│   ├── localDB.js             # Camada de persistência local (localStorage)
│   ├── main.js                # Orquestrador enxuto da SPA, roteamento e hubs
│   ├── manualTabbed.js        # Manual interativo integrado por abas com busca spotlight
│   ├── mockDataGenerator.js   # Gerador de simulação hospitalar (5 a 300+ registros)
│   ├── state.js               # Gerenciador de estado reativo global
│   └── styles.css             # Design System Glassmorphism Dark/Light Mode
├── index.html                 # Ponto de entrada HTML5 da aplicação web
├── package.json               # Dependências, scripts npm e metadados v2.7.2
├── README.md                  # Documento principal do projeto e badges
└── vercel.json                # Configurações de rotas e build serverless Vercel
```

---

## 2. Padrões de Nomenclatura

A padronização dos nomes de arquivos, tabelas e elementos visuais é fundamental para manter a consistência do código em escala.

### Páginas Frontend (HTML)
*   Formato: **kebab-case** (letras minúsculas separadas por hífen).
*   Exemplos:
    *   `patient-registration.html`
    *   `medical-record-detail.html`
    *   `appointment-scheduler.html`

### Código JavaScript (Backend e Frontend)
*   Arquivos e Módulos: **camelCase** (primeira letra minúscula, palavras seguintes com maiúscula) com sufixo descritivo de sua função arquitetural.
*   Exemplos:
    *   `patientController.js`
    *   `prescriptionService.js`
    *   `authMiddleware.js`
    *   `patientRepository.js`

### Folhas de Estilo (CSS)
*   Formato: **kebab-case** focado no módulo ou no componente que estiliza.
*   Exemplos:
    *   `patient.css`
    *   `dashboard-layout.css`
    *   `modal-component.css`

### Classes CSS (BEM - Block Element Modifier recomendado)
*   Formato: **kebab-case** com separadores explícitos.
*   Exemplos:
    *   `.patient-card` (Bloco)
    *   `.patient-card__name` (Elemento dentro do bloco)
    *   `.patient-card--highlighted` (Modificador de estado)

### Banco de Dados (PostgreSQL)
*   Nomes de Tabelas: **Plural**, minúsculo, palavras separadas por underline (**snake_case**).
    *   `patients`
    *   `medical_records`
    *   `billing_items`
*   Nomes de Colunas / IDs: **camelCase** para as colunas no código Javascript, mas gravados como **snake_case** no banco PostgreSQL (convertidos automaticamente pelo mapeador ORM/Repository). O ID primário de cada tabela deve carregar o sufixo *Id*.
    *   `patientId` / `patient_id` (PK)
    *   `firstName` / `first_name`
    *   `appointmentDate` / `appointment_date`

---

## 3. Diretrizes e Princípios de Desenvolvimento

### Código Limpo (Clean Code)
1.  **Funções Pequenas**: Funções não devem exceder 30 linhas de código. Se excederem, devem ser refatoradas.
2.  **Responsabilidade Única**: Cada função ou classe resolve um único problema de forma focada.
3.  **Evitar Efeitos Colaterais**: Funções devem preferencialmente ser puras, não alterando estados globais.
4.  **Autodocumentação**: Preferir nomes descritivos para variáveis e métodos em vez de adicionar comentários óbvios no código.
    *   *Evitar*: `let d = new Date(); // d é a data de admissão`
    *   *Preferir*: `const admissionDate = new Date();`

### Princípios SOLID
*   **Single Responsibility Principle (SRP)**: Uma classe tem apenas um motivo para mudar. (Ex: O `PatientRepository` apenas lê e grava pacientes no banco, não contendo regras sobre elegibilidade de planos).
*   **Open/Closed Principle (OCP)**: Entidades de software devem ser abertas para extensão, mas fechadas para modificação. (Ex: Adicionar um novo convênio estende a regra sem alterar o motor de faturamento principal).
*   **Liskov Substitution Principle (LSP)**: Subclasses devem ser substituíveis por suas superclasses sem corromper a aplicação.
*   **Interface Segregação Principle (ISP)**: Clientes não devem ser forçados a depender de métodos que não usam.
*   **Dependency Inversion Principle (DIP)**: Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações. (Ex: Injetar o cliente do banco de dados no repositório).

### Acessibilidade (WCAG 2.1)
O frontend do Health Nexus deve ser acessível de ponta a ponta:
*   **Semântica**: Uso estrito de tags `<main>`, `<nav>`, `<header>`, `<footer>`, `<section>` e `<article>`.
*   **Leitores de Tela**: Uso de atributos `aria-label`, `aria-describedby` e `role` em componentes personalizados (ex: modais, tabs).
*   **Teclado**: Todo elemento interativo (botão, input, link) deve ser alcançável e ativável usando apenas a tecla `Tab` e `Enter/Espaço`, mantendo um anel de foco visível (`:focus-visible`).
*   **Contraste**: A relação de contraste de cores do texto com o fundo deve atender ao nível AA da WCAG (mínimo de 4.5:1 para texto normal e 3.0:1 para texto grande).
*   **Inputs**: Todo input deve possuir um elemento `<label>` explicitamente associado através do atributo `for`.
