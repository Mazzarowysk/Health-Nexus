# Health Nexus — Guia do Desenvolvedor

Este manual orienta novos engenheiros na configuração do ambiente de desenvolvimento local, padrões de código, versionamento e implantação do **Health Nexus**.

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
└── docs/                # Documentação técnica por módulo
```

### Banco de Dados — Tabelas

| Tabela | Campos principais |
|---|---|
| `users` | id, name, username, password_hash, role, created_at |
| `patients` | id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue, created_at |
| `encounters` | id, patientId, type, status, admitted_at, completed_at |
| `triages` | id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at |
| `clinical_notes` | id, encounterId, noteType, subjectiveContent, objectiveContent, assessmentContent, planContent, signatureHash, isClosed, created_at |
| `tv_calls` | id, patientName, roomName, manchesterColor, doctorName, calledAt |

---

### 3.1 APIs Especiais (Painel TV & Validação de Pacientes)

- **`GET /api/tv/calls`**: Retorna as últimas 15 chamadas de TV ordenadas por data descrescente.
- **`POST /api/tv/call`**: Registra uma nova chamada de TV no banco de dados. O Painel TV sincroniza a cada 3s via auto-polling.
- **`POST /api/patients` & `PUT /api/patients/:id`**: Valida duplicidade de Nome Completo *(case-insensitive)* e CPF. Retorna `409 Conflict` se houver colisão.

---

## 4. Sincronização Local ↔ Turso (Cloud)

O sistema opera em **dual-database mode**:

- **Localmente:** banco principal é `local.db` (SQLite)
- **Vercel (produção):** banco principal é o Turso cloud

### Comportamento de Sync

1. **Ao iniciar o servidor:** o sistema compara contagens e, se o Turso tiver mais registros, baixa automaticamente (`autoSyncFromCloud`)
2. **Ao logar:** exibe modal de comparativo com quantidade e **data/hora** do último registro por tabela
3. **Após cada escrita** (POST/PUT/DELETE): modal pergunta se deseja enviar os dados para a nuvem
4. **Manual:** botões na aba Configurações para Enviar / Baixar a qualquer momento

### Endpoint `/api/sync/status`

Retorna:
```json
{
  "cloudConfigured": true,
  "isVercel": false,
  "synchronized": false,
  "local": { "users": 2, "patients": 5, ... },
  "cloud": { "users": 2, "patients": 3, ... },
  "localTimestamps": { "patients": "2026-07-19T13:10:00Z", ... },
  "cloudTimestamps": { "patients": "2026-07-18T22:00:00Z", ... }
}
```

---

## 5. Padrões de Código

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

**Exemplos:**
```
feat: modal de sync com data/hora por tabela ao logar
fix: light mode — select com fundo escuro no modo claro
docs: atualizar README com módulos implementados
style: melhorar contraste de botões no tema claro
```

### Branches

| Branch | Uso |
|---|---|
| `main` | Produção — qualquer push dispara deploy no Vercel |
| `develop` | Integração de features em desenvolvimento |
| `feature/*` | Nova funcionalidade ou módulo |
| `hotfix/*` | Correção urgente direto da `main` |

---

## 6. Deploy (Vercel)

O deploy é **automático** via GitHub Actions / Vercel integration:

```bash
# Qualquer push para main → build + deploy automático no Vercel
git add .
git commit -m "feat: descrição da mudança"
git push origin main
```

O arquivo `vercel.json` configura:
- Rewrite de todas as rotas `/api/*` para o backend Express
- Build com Vite para o frontend SPA

---

## 7. Status Atual de Desenvolvimento — BETA 1.0.0

### ✅ Implementado e Funcional
- Autenticação JWT + roles (Administrador / Médico)
- Dashboard com KPIs reais e gráficos (Chart.js)
- CRUD completo de Pacientes
- Triagem Manchester (5 cores) + Fila de Atendimento
- PEP — Prontuário Eletrônico com SOAP + Assinatura digital
- Relatórios e exportação PDF / XLSX / CSV
- Tema Claro / Escuro (design system completo com tokens CSS)
- Sincronização Local ↔ Turso com modal comparativo (qtd + data/hora)
- Modal de confirmação após cada operação de escrita

### 🔜 Próximos Módulos
- Laboratório e resultados de exames
- Integração DICOM/PACS (imagens médicas)
- Faturamento e TISS (ANS)
- Notificações em tempo real (WebSocket)

---

*Desenvolvido por @mazzarowysk & @_coltri_*
