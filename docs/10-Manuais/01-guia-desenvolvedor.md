# Health Nexus — Guia do Desenvolvedor (Completo)

Este manual orienta novos engenheiros na configuração do ambiente de desenvolvimento local, padrões de código, versionamento, arquitetura de UI e implantação do **Health Nexus**.

---

## 1. Quick Start (Configuração Rápida)

### Pré-requisitos
- **Node.js** 18.x LTS ou superior
- **Git** instalado
- (Opcional) Conta no **Turso** para sincronização cloud

### Passo a Passo

```bash
# 1. Clonar o repositório
git clone https://github.com/Mazzarowysk/Health-Nexus.git "C:\Health Nexus"
cd "C:\Health Nexus"

# 2. Instalar dependências (frontend + backend)
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env se quiser ativar a sincronização com Turso

# 4. Iniciar em modo desenvolvimento
npm run dev
```

| Serviço | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3001 |

**Login padrão criado automaticamente:** usuário `admin` · senha `admin`

---

## 2. Variáveis de Ambiente (.env)

```env
# Banco de dados Turso (deixe vazio para usar apenas o banco local SQLite)
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu-token-aqui

# JWT (substitua em produção)
JWT_SECRET=health-nexus-super-secret-key

# Porta do backend (padrão: 3001)
PORT=3001
```

> Sem as variáveis Turso, o sistema opera **100% offline** usando `local.db` (SQLite).

---

## 3. Arquitetura do Projeto

O sistema é um monólito moderno com Frontend Vanilla e Backend Express.

```
Health Nexus/
├── backend/
│   ├── app.js           # Toda a API REST (Express) — rotas, middlewares, lógica
│   ├── server.js        # Ponto de entrada do servidor Node
│   └── database/
│       └── client.js    # Configuração dos clientes DB (local + Turso cloud)
├── src/
│   ├── main.js          # SPA completa — toda a UI, roteamento, estado, chamadas API
│   └── styles.css       # Design system completo (dark + light theme tokens)
├── assets/
│   └── logo.png         # Logomarca do sistema
├── index.html           # Entry point HTML
├── vite.config.js       # Configuração do bundler Vite
├── vercel.json          # Configuração de deploy serverless no Vercel
├── scripts/             # Scripts utilitários (ex: gerador de PDF)
└── docs/                # Documentação técnica por módulo
```

### 3.1 Banco de Dados — Tabelas e Soft-Delete

A maioria das tabelas possui o campo `deleted_at` para permitir o fluxo de Lixeira.

| Tabela | Campos principais |
|---|---|
| `users` | id, name, username, password_hash, role, created_at, deleted_at |
| `patients` | id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue, created_at, deleted_at |
| `encounters` | id, patientId, type, status, admitted_at, completed_at |
| `triages` | id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at |
| `clinical_notes` | id, encounterId, noteType, subjectiveContent, objectiveContent, assessmentContent, planContent, signatureHash, isClosed, created_at |
| `tv_calls` | id, patientName, roomName, manchesterColor, doctorName, calledAt |

---

## 4. Módulos e Funcionalidades (O UI Router)

Toda a lógica visual está em `src/main.js`. O roteamento é feito injetando HTML no `<main id="app-content">` através do array de navegação `allNavItems` renderizado por `renderAppStructure()`.

### Abas Suportadas e Suas Funções:
1. **Dashboard:** Usa `Chart.js` para renderizar métricas financeiras e clínicas.
2. **Agenda:** CRUD de horários vinculados aos médicos (Corpo Clínico).
3. **Pacientes:** Formulário com API ViaCEP e prevenção `409 Conflict` contra CPFs/Nomes duplicados. Possui botão **Lixeira**.
4. **Atendimento:** Renderiza colunas estilo Kanban (`Aguardando Triagem`, `Aguardando Médico`, `Em Atendimento`). Dispara o Painel TV via botão "Chamar".
5. **Painel TV:** Faz auto-polling a cada 3 segundos em `/api/tv/calls` e usa `window.speechSynthesis` para ler os nomes em voz alta.
6. **Alertas & Estagnação:** Monitora tempo excedido para Triagem (Manchester).
7. **Leitos:** Exibe mapa de ocupação e gerencia limpeza (higienização pós-alta).
8. **Farmácia & Estoque:** Cadastros e níveis de alerta para reposição de insumos.
9. **Financeiro:** Telas para lançamento de guias e recebimentos de pacientes.
10. **Corpo Clínico & Consultórios:** Configurações base.
11. **Relatórios:** Permite puxar estatísticas gerais e exportar em PDF e CSV.
12. **Configurações:** Setup do sistema, sincronização Turso e gestão de usuários (RBAC).

---

## 5. Sincronização Local ↔ Turso (Cloud)

O sistema opera em **dual-database mode**:

- **Localmente:** banco principal é `local.db` (SQLite)
- **Vercel (produção):** banco principal é o Turso cloud

### Comportamento de Sync
1. **Ao iniciar o servidor:** compara contagens (`autoSyncFromCloud`).
2. **Ao logar:** exibe modal de comparativo com quantidade e **data/hora** do último registro.
3. **Após cada escrita** (POST/PUT/DELETE): modal pergunta se deseja enviar os dados para a nuvem.
4. **Auto-Shutdown Inteligente:** O servidor Node.js finaliza (process.exit) se o navegador for fechado (tolerância de 1.5s).

---

## 6. Padrões de Código

### Convenção de Commits (Conventional Commits)

```
feat:     Nova funcionalidade
fix:      Correção de bug
docs:     Documentação técnica
style:    Ajustes visuais / CSS (sem lógica)
refactor: Refatoração sem mudança de comportamento
perf:     Otimização de performance
chore:    Tarefas de manutenção (deps, scripts, config)
```

### Componentização Vanilla JS
Toda tela principal no `main.js` segue o padrão:
1. `renderNomeDaTela()`: Gera o layout HTML base (`innerHTML`).
2. `fetchDados()`: Faz as chamadas à API local `fetch('/api/...')`.
3. `updateDOM()`: Preenche os dados recebidos nas tabelas ou gráficos.
4. `setupListeners()`: Adiciona os `addEventListener` aos botões.

---

## 7. Deploy e Produção (Vercel)

O deploy é **automático** via integração Vercel e Github:

```bash
git add .
git commit -m "feat: modulo de farmácia adicionado"
git push origin main
```

O arquivo `vercel.json` garante:
- Rewrite de rotas `/api/*` para a API Express Node.js.
- Compilação estática do Vite para a interface.
- Geração automatizada de logs em tempo de execução.

---

*Saúde e código limpo caminham juntos. Bom trabalho!*
