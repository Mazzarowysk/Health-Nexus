# Health Nexus — Integrações Externas

> **Versão:** 1.3.0 — Agosto/2026  
> Este documento detalha as APIs externas **ativas e em produção** no sistema Health Nexus.

---

## 1. APIs Governamentais Brasileiras

### ViaCEP (Consulta de Endereço por CEP)
- **Status:** ✅ **Ativo em produção**
- **Finalidade**: Autopreenchimento de logradouro, bairro, cidade e UF no cadastro de pacientes digitando apenas o CEP.
- **Rota proxy interna:** `GET /api/cep/:cep` (backend Express faz a requisição server-side)
- **Endpoint externo:** `https://viacep.com.br/ws/{cep}/json/`
- **Fallback:** Em caso de falha de conexão, todos os campos de endereço habilitam edição manual sem interromper o cadastro.

### CID-10 (Código Internacional de Doenças — 10ª revisão)
- **Status:** ✅ **Ativo em produção (modo offline/local)**
- **Finalidade**: Autocomplete de diagnósticos no Prontuário Eletrônico do Paciente (PEP / aba SOAP).
- **Estratégia:** Base CID-10 completa embarcada localmente via pacote npm `br-cid10-csv` + `cid10-br-mcp`. Os dados são carregados em memória na inicialização, sem dependência de rede.
- **Busca:** Indexação por código (ex: `J18.0`) e por descrição em português (ex: `Pneumonia`).

---

## 2. APIs de Validação e Medicamentos

### ANVISA / OpenFDA — Busca de Medicamentos
- **Status:** ✅ **Ativo em produção** (integrado em Agosto/2026)
- **Finalidade**: No modal de cadastro/edição de medicamentos da Farmácia, o farmacêutico pode pesquisar um fármaco por nome e importar automaticamente princípio ativo, forma farmacêutica, fabricante e categoria.
- **Rota interna:** `GET /api/anvisa/buscar?q={nome}`
- **API externa utilizada:** [OpenFDA Drug Labels API](https://open.fda.gov/apis/drug/label/) — gratuita, sem autenticação.
  - Busca primária: `openfda.generic_name` (nome genérico / princípio ativo)
  - Busca secundária fallback: `openfda.brand_name` (nome comercial)
- **Dados retornados:** `nome`, `principioAtivo`, `fabricante`, `formaFarmaceutica`, `viaAdministracao`, `categoria` (classe farmacológica)
- **Badge UX:** Campo "Nome do Medicamento" exibe badge verde **"🛡 ANVISA Verificado"** quando preenchido via busca.

### CFM — Verificação de CRM Médico
- **Status:** ✅ **Ativo em produção** (integrado em Agosto/2026)
- **Finalidade**: No modal de cadastro/edição de médicos, valida o número de CRM com consulta ao portal do CFM, informando status e exibindo link direto de verificação.
- **Rota interna:** `GET /api/cfm/verificar?crm={crm}&uf={uf}`
- **Formatos aceitos:** `123456-SP`, `123456/SP`, `SP123456`, `123456` (com `uf` separado)
- **Comportamento:**
  1. Consulta o portal `https://portal.cfm.org.br/busca-medicos/` via scraping server-side
  2. Se encontrado: badge verde ✅ **"CRM Verificado no CFM"** + link ao portal
  3. Se formato válido mas não encontrado: badge amarelo ⚠️ com link para verificação manual
  4. Se formato inválido: badge vermelho ❌ com orientação de formato
- **Tabela do Corpo Clínico:** Ícone 🛡 clicável ao lado de cada CRM abre o portal CFM com busca pré-preenchida.

---

## 3. APIs de Infraestrutura e Persistência

### Turso LibSQL (Sincronização Cloud)
- **Status:** ✅ **Ativo em produção**
- **Finalidade**: Sincronização bidirecional do banco de dados SQLite local com a nuvem (Turso Edge DB), permitindo operação offline-first.
- **Rota interna:** `ALL /api/turso`
- **Operações:** `GET` (download/heartbeat) e `POST` (upload de dados)
- **Credenciais:** Configuradas via `.env` (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)

### Vercel Analytics
- **Status:** ✅ **Ativo em produção**
- **Finalidade**: Métricas de uso em tempo real (page views, performance, web vitals) sem necessidade de cookies.
- **Integração:** `@vercel/analytics` injetado no HTML de produção via `dist/index.html`.

---

## 4. APIs Planejadas para Implementação Futura

| API | Finalidade | Prioridade |
|-----|-----------|-----------|
| **WhatsApp Business (Z-API / Twilio)** | Lembretes automáticos de consulta por WhatsApp | 🔴 Alta |
| **Asaas / PagarMe** | Geração real de PIX e Boleto no módulo financeiro | 🔴 Alta |
| **OpenAI GPT-4o** | Sugestão de diagnóstico diferencial no PEP | 🟠 Média |
| **OpenAI Whisper** | Ditado de voz para preenchimento do prontuário | 🟠 Média |
| **Daily.co** | Telemedicina integrada à agenda | 🟡 Futura |
| **TISS / ANS** | Faturamento eletrônico de convênios (XML TISS v3.05) | 🔴 Crítica |
| **HL7 FHIR R4** | Interoperabilidade com RNDS e sistemas externos | 🟡 Estratégica |
| **Auth0 / Clerk** | SSO empresarial + MFA + Active Directory | 🟠 Média |
| **Resend** | E-mail transacional (laudos PDF, notificações) | 🟢 Imediata |

---

*Documentação mantida pela equipe de Engenharia — Health Nexus v1.3.0 — Agosto/2026*
