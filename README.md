# Health Nexus — Sistema de Gestão Hospitalar

**Versão:** `1.0.1`  
**Status:** Em desenvolvimento ativo  
**Última atualização:** Julho 2026

---

## 🏗️ Infraestrutura & Integrações

| Serviço | Status | Descrição |
|---|---|---|
| 🐙 **GitHub** | ✅ Ativo | Branch `main` · Commits disparam deploys automáticos |
| ▲ **Vercel** | ✅ Ativo | Hospeda Frontend (Vite) + Backend (Express API serverless) |
| 🗄️ **Turso (LibSQL)** | ✅ Ativo | Banco de dados edge distribuído — Pacientes, Atendimentos, PEP |

---

## 📦 Stack Tecnológica

- **Frontend:** HTML5 + JavaScript (Vanilla SPA) · Vite 5 · Chart.js · jsPDF · SheetJS
- **Backend:** Node.js + Express.js (API REST) · JWT · Bcrypt
- **Banco de dados:** SQLite local (`local.db`) + Turso cloud (LibSQL) via `@libsql/client`
- **CSS:** Design System próprio — Glassmorphism dark + Light mode completo
- **Tipografia:** Outfit (títulos) + Inter (corpo) via Google Fonts
- **Ícones:** Font Awesome 6

---

## 🧩 Módulos Implementados

### 1. Autenticação & Controle de Acesso
- Tela de login/cadastro com design Glassmorphism
- Autenticação via **JWT** (token salvo em `sessionStorage`, expira em 24h)
- Controle de roles: `Administrador`, `Médico`
- Módulo de Gerenciamento de Usuários visível apenas para o usuário master (`mazzarowysk`)
- Feedback de erros específicos por caso (usuário não encontrado, senha incorreta)

### 2. Dashboard
- KPIs em tempo real: Total de Pacientes, Atendimentos no Dia, Tempo Médio de Espera, Taxa de Ocupação
- Gráficos interativos (Chart.js): Ocupação por ala, Histórico semanal de atendimentos
- Dados integrados ao banco via API REST

### 3. Gestão de Pacientes (CRUD Completo & Prevenção de Duplicidades)
- Listagem com busca em tempo real (filtragem client-side)
- Formulário de cadastro com validações: máscara de CPF, campos obrigatórios
- **Bloqueio Estrito de Duplicidades:** Validação de unicidade por **Nome Completo** (case-insensitive) e **CPF** em `POST /api/patients` e `PUT /api/patients/:id`
- Reutilização automática do cadastro de pacientes existentes na rota de admissão/atendimento
- Campos completos: Nome, CPF, Data Nascimento, Endereço, Cidade, Telefone, Celular, Valor de Cobrança
- Edição e exclusão com confirmação

### 4. Triagem & Fila de Atendimento (Protocolo Manchester)
- Classificação de risco em **5 cores**: Vermelho (Emergência), Laranja, Amarelo, Verde, Azul (Não Urgente)
- Fluxo completo: Admissão → Triagem → Atendimento → Finalização
- Status rastreados: `Aguardando_Triagem`, `Aguardando_Médico`, `Em_Atendimento`, `Finalizado`
- Campos clínicos: Peso, Pressão Arterial, Temperatura, FC, Queixas

### 5. Painel TV (Chamador Eletrônico de Pacientes)
- Exibição de chamadas em tela cheia para sala de espera com relógio digital e histórico em tempo real
- **Chamada Audível com Voz:** Anúncio por síntese de voz (*Web Speech API* em `pt-BR`) informando nome do paciente e consultório
- **Modal Dinâmico de Chamada:** Permite selecionar pacientes da fila em tempo real ou digitar nomes/consultórios manualmente
- **Integração com Central de Atendimentos:** Disparo automático de chamadas de voz e atualização da TV ao clicar em "Chamar para Consulta" no Kanban
- **Atualização Automática (Polling):** Sincronização da tela da TV a cada 3 segundos com o servidor

### 5. PEP — Prontuário Eletrônico do Paciente
- Estrutura **SOAP**: Subjetivo, Objetivo, Avaliação, Plano
- Abas: Evolução, Prescrição, Solicitação de Exames, Atestados
- Autosave de rascunho + Assinatura digital (hash SHA)
- Prontuário bloqueado após assinatura (read-only)

### 6. Relatórios & Exportação
- Exportação de Pacientes e Fila nos formatos:
  - 📄 **PDF** — Layout elegante com autoTable (jsPDF)
  - 📊 **XLSX** — Exportação rica para Excel (SheetJS)
  - 📝 **CSV** — Universal com cabeçalhos UTF-8 BOM (suporte a acentos)
- Filtros por período, status e cor de triagem

### 7. Configurações do Sistema
- Toggle **Tema Claro / Escuro** (modo claro totalmente implementado com design system próprio)
- Gerenciamento de dados: Exportar backup JSON, Importar, Limpar banco
- Seções em acordeões expansíveis

### 8. Sincronização Local ↔ Nuvem (Turso)
- **Modal após cada operação de escrita** (cadastro, edição, exclusão): pergunta se deseja enviar para a nuvem
- **Modal de comparativo ao logar**: sempre exibido quando a nuvem estiver configurada, mostrando:
  - Quantidade de registros por tabela (Profissionais, Pacientes, Atendimentos, Triagens, Prontuários)
  - **Data e hora** do registro mais recente em cada tabela (local vs. nuvem)
  - Badge **"DIFF"** destacado em tabelas com quantidades divergentes
  - Ações: Baixar da Nuvem ou Enviar para Nuvem
- Sincronização automática ao iniciar (baixa da nuvem se ela tiver mais registros)
- Dual-mode: banco local SQLite (desenvolvimento) + Turso cloud (produção/Vercel)

### Atualizações (Julho 2026)

- Unificação do fluxo de sincronização: o sistema agora apresenta um único comportamento consistente entre ambientes local e Vercel.
  - Após qualquer `POST` / `PUT` / `DELETE` em rotas de negócio, o frontend solicita explicitamente ao usuário se deseja enviar as alterações para o Turso (modal de confirmação).
  - Ao efetuar login, o sistema compara automaticamente o estado local (ou o último snapshot no caso do Vercel) com o estado atual do Turso e mostra o modal comparativo quando a nuvem estiver configurada.
  - A aplicação exibe uma **badge** no cabeçalho (`sync-status-badge`) com o estado atual da sincronização: "Verificando Turso...", "Conectado ao Turso (Vercel)", "Local sincronizado com Turso", "Dados fora de sincronia com Turso" ou "Modo Local (Turso não configurado)".
  - A badge é clicável e abre manualmente o modal comparativo.
  - Depois de enviar/baixar dados (upload/download), o sistema atualiza automaticamente a badge e sugere recarregar a interface para refletir o novo estado.

Essas mudanças alinham o comportamento do app em ambos os ambientes e tornam as decisões de sincronização explícitas ao usuário.

---

## 🎨 Design System

O Health Nexus implementa um design system completo com tokens CSS (`--variáveis`) para dois temas:

- **Modo Escuro (padrão):** Glassmorphism com fundo roxo profundo, acentos neon magenta/ciano
- **Modo Claro:** Branco clínico profissional (azul médico `#2563eb` + verde teal `#0d9488`), totalmente polido com overrides para todos os componentes: sidebar, header, cards, tabelas, modais, inputs, badges, etc.

---

## 🔧 Automações Especiais

- **Auto-shutdown do servidor:** O processo Node se encerra automaticamente quando a aba do navegador é fechada (heartbeat + `process.exit`)
- **Criação automática do banco:** Todas as tabelas são criadas via `CREATE TABLE IF NOT EXISTS` ao iniciar
- **Usuário admin padrão:** Criado automaticamente (`admin` / senha `admin`) se não existir nenhum usuário

---

## 🗺️ Próximos Passos

Conforme especificado em `docs/`, módulos ainda a implementar:
- Laboratório e Resultados de Exames (`09-laboratorio.md`)
- Integração de Imagens (DICOM/PACS)
- Faturamento e TISS (ANS)
- Notificações e Alertas em tempo real (WebSocket)

---

## 🚀 Execução Local

```bash
# 1. Clonar o repositório
git clone https://github.com/Mazzarowysk/Health-Nexus.git "C:\Health Nexus"
cd "C:\Health Nexus"

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com TURSO_DATABASE_URL e TURSO_AUTH_TOKEN (opcional para uso local)

# 4. Iniciar em modo desenvolvimento (frontend + backend simultâneos)
npm run dev
```

Acesse: `http://localhost:5173` · Backend: `http://localhost:3001`  
Login padrão: **usuário** `admin` · **senha** `admin`

---

*Desenvolvido por @mazzarowysk & @_coltri_*
