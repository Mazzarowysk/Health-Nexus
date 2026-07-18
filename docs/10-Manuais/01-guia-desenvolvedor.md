# Health Nexus — Guia do Desenvolvedor

Este manual orienta novos engenheiros de software na configuração rápida do ambiente de desenvolvimento local, execução do sistema e padrões de versionamento do **Health Nexus**.

---

## 1. Instalação e Configuração Rápida (Quick Start)

### Pré-requisitos
Certifique-se de possuir instalado na máquina de desenvolvimento:
*   **Node.js** (Versão 18.x LTS ou superior).
*   **PostgreSQL** (Versão 15.x ou superior).
*   **Redis** (Versão 7.x ou superior).
*   **Git** instalado.

---

## 2. Passo a Passo de Configuração

### 1. Clonar o Repositório e Criar o Workspace
```bash
git clone https://github.com/instituicao/health-nexus.git "C:\Health Nexus"
cd "C:\Health Nexus"
```

### 2. Configurar o Ambiente de Variáveis (.env)
Copie o arquivo de exemplo de variáveis de ambiente e preencha as credenciais do seu banco de dados PostgreSQL local:
```bash
cp backend/.env.example backend/.env
```

### 3. Instalar Dependências do Backend
Navegue para a pasta backend e execute o instalador de dependências do npm:
```bash
cd backend
npm install
```

### 4. Executar Migrações do Banco de Dados
Rode o script Knex/Prisma (conforme ORM configurado) para criar as tabelas e relacionamentos iniciais no PostgreSQL, além de popular a base com registros padrões necessários (ex: CIDs, tabelas TUSS e perfis de usuários):
```bash
npm run db:migrate
npm run db:seed
```

### 5. Iniciar a Aplicação em Modo de Desenvolvimento
Rode o servidor em modo de escuta ativa (com recarregamento automático usando nodemon):
```bash
npm run dev
```
O servidor da API iniciará na porta `3000` (ex: `http://localhost:3000`).

---

## 3. Modelo de Versionamento de Código (Git Branch & Commits)

O projeto adota o fluxo de trabalho **GitFlow** adaptado para entregas contínuas rápidas.

### Branches Padronizadas
*   `main`: Contém exclusivamente o código em produção atualizado. Qualquer alteração aqui reflete no ambiente hospitalar ativo.
*   `develop`: Branch principal de integração de desenvolvimento. Todo código testado e pronto para homologação converge aqui.
*   `release`: Branches temporárias criadas a partir de `develop` para homologação de novas versões estáveis.
*   `hotfix`: Criadas direto da `main` para correção imediata de bugs críticos em produção.
*   `feature/*`: Criadas a partir de `develop` para desenvolvimento de novos requisitos ou módulos (ex: `feature/atendimento-triagem`).

### Padrão de Commits (Conventional Commits)
Todas as mensagens de commit devem seguir a sintaxe com escopo opcional, descrevendo de forma imperativa e curta a alteração:
*   `feat`: Nova funcionalidade (ex: `feat: add WhatsApp triage notification event`).
*   `fix`: Correção de bug (ex: `fix: solve race condition on bed allocation`).
*   `docs`: Documentação técnica (ex: `docs: update developer guide setup steps`).
*   `style`: Alterações de formatação visual ou espaçamento, sem alterar lógica de código.
*   `refactor`: Refatoração interna que não altera o comportamento externo do sistema.
*   `test`: Inclusão ou correção de testes unitários ou de integração.
