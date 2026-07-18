# Health Nexus — Estrutura de Pastas e Padrões de Código

Este documento estabelece a organização física dos arquivos do **Health Nexus**, define as convenções de nomenclatura e descreve as diretrizes de desenvolvimento (Clean Code, SOLID, Acessibilidade WCAG).

---

## 1. Estrutura Física do Projeto

O repositório está centralizado na pasta `c:\Health Nexus` e é dividido em blocos claros correspondendo a responsabilidades de infraestrutura, backend, frontend e documentação.

```
C:\Health Nexus\
├── assets/                    # Imagens estáticas, logotipos e fontes globais
├── backend/                   # Código fonte da API Node.js/Express
│   ├── config/                # Parâmetros de ambiente, DB, CORS, chaves de criptografia
│   ├── controllers/           # Interpretadores HTTP e chamadores de serviços
│   ├── database/              # Migrações, seeds e conectores com PostgreSQL
│   ├── middlewares/           # Verificadores de Token JWT, RBAC, Validação de entrada
│   ├── models/                # Schemas de dados e definições de ORM/Tabelas
│   ├── routes/                # Definição dos endpoints REST
│   ├── services/              # Camada de lógica de negócio e integrações
│   ├── utils/                 # Funções auxiliares (criptografia, datas, formatações)
│   ├── tests/                 # Testes unitários e de integração (Jest)
│   ├── uploads/               # Armazenamento temporário de uploads (Multer)
│   └── storage/               # Armazenamento permanente (PDFs de exames, contratos)
├── docs/                      # Documentação técnica e de requisitos do sistema
├── frontend/                  # Aplicação web cliente (HTML, CSS e JavaScript Vanilla)
│   ├── components/            # Componentes reutilizáveis (modais, cards, tabelas, menus)
│   ├── css/                   # Estilos modulares do frontend
│   ├── js/                    # Scripts de controle de UI e consumo de APIs
│   ├── views/                 # Páginas da aplicação HTML organizadas por módulo
│   └── index.html             # Ponto de entrada da aplicação
└── database/                  # Scripts SQL de backup e configurações de instâncias DB
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
