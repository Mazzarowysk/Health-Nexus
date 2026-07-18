# Health Nexus — Guia do Desenvolvedor

Este manual orienta novos engenheiros de software na configuração rápida do ambiente de desenvolvimento local, execução do sistema e padrões de versionamento do **Health Nexus**.

---

## 1. Instalação e Configuração Rápida (Quick Start)

### Pré-requisitos
Certifique-se de possuir instalado na máquina de desenvolvimento:
*   **Node.js** (Versão 18.x LTS ou superior).
*   **Git** instalado.

---

## 2. Passo a Passo de Configuração

### 1. Clonar o Repositório e Criar o Workspace
```bash
git clone https://github.com/Mazzarowysk/Health-Nexus.git "C:\Health Nexus"
cd "C:\Health Nexus"
```

### 2. Configurar o Ambiente de Variáveis (.env)
Copie o arquivo de exemplo de variáveis de ambiente:
```bash
cp .env.example .env
```
*(Por padrão, o arquivo já vem configurado para usar o banco local SQLite em `file:local.db`, o que dispensa qualquer instalação local de banco de dados).*

### 3. Instalar Dependências do Projeto
Execute o comando na raiz para instalar as dependências do frontend e backend:
```bash
npm install
```

### 4. Iniciar a Aplicação em Modo de Desenvolvimento
Rode o comando na raiz para rodar simultaneamente o frontend (Vite) e o backend (Express):
```bash
npm run dev
```
*   O frontend iniciará na porta `5173` (ex: `http://localhost:5173`).
*   O backend iniciará na porta `3001` (ex: `http://localhost:3001`).
*   O banco de dados local será criado automaticamente na raiz como `local.db`.

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
