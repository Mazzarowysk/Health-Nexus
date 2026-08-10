# Health Nexus — Sistema de Gestão Hospitalar

**Versão:** `1.3.0`  
**Status:** Em desenvolvimento ativo  
**Última atualização:** Agosto 2026

---

## 📘 Documentação & Manual do Usuário

- 🌐 **Portal Web Interativo (Redesenhado):** [manual_do_usuario.html](file:///c:/Health%20Nexus/manual_do_usuario.html) *(acessível no botão `📖 Manual do Usuário` no topo do sistema)*
- 📕 **Documento PDF Oficial de Impressão:** [Manual_do_Usuario_Health_Nexus_v3.pdf](file:///c:/Health%20Nexus/Manual_do_Usuario_Health_Nexus_v3.pdf)
- 📄 **Manual Completo em Markdown (Com Fluxograma):** [MANUAL_DO_USUARIO_HEALTH_NEXUS.md](file:///c:/Health%20Nexus/MANUAL_DO_USUARIO_HEALTH_NEXUS.md)

---

## 🏗️ Infraestrutura & Integrações

| Serviço | Status | Descrição |
|---|---|---|
| 🐙 **GitHub** | ✅ Ativo | Branch `main` · Commits disparam deploys automáticos |
| ▲ **Vercel** | ✅ Ativo | Hospeda Frontend (Vite) + Backend (Express API serverless) |
| 🗄️ **Turso (LibSQL)** | ✅ Ativo | Banco de dados edge distribuído — Pacientes, Atendimentos, PEP |
| 📊 **OpenFDA / ANVISA** | ✅ Ativo | Busca de medicamentos por nome genérico ou comercial — gratuito |
| 🧠 **CFM Portal** | ✅ Ativo | Verificação de CRM médico via portal oficial CFM |
| 📍 **ViaCEP** | ✅ Ativo | Autopreenchimento de endereço por CEP |
| 🏥 **CID-10** | ✅ Ativo | Base completa embarcada localmente (offline-first) |

---

## 📦 Stack Tecnológica

- **Frontend:** HTML5 + JavaScript (Vanilla SPA) · Vite 5 · Chart.js · jsPDF · SheetJS
- **Backend:** Node.js + Express.js (API REST) · JWT · Bcrypt
- **Banco de dados:** SQLite local (`local.db`) + Turso cloud (LibSQL) via `@libsql/client`
- **CSS:** Design System próprio — Glassmorphism dark + Light mode completo
- **Tipografia:** Outfit (títulos) + Inter (corpo) via Google Fonts
- **Ícones:** Font Awesome 6

---

## 🧩 Módulos Implementados (Visão Geral 360º)

1. **Autenticação & Controle de Acesso (RBAC)**  
   Login com JWT e gestão de papéis: `Master`, `Médico`, `Enfermeiro`, `Recepcionista`.  
   - Aprovação de todos os novos usuários pelo Master via Painel de Estagnação.
   - Liberação automática de acesso através da Chave Master secreta.

2. **Dashboard (Health Nexus)**  
   KPIs e gráficos gerenciais em tempo real via Chart.js:  
   - Atendimentos por período, taxa de ocupação de leitos, receita mensal e evolução de pacientes.
   - **Gráficos e Funis Interativos:** Gráficos funcionam como botões e filtros dinâmicos que redirecionam para as listas com os dados já filtrados.

3. **Agenda de Consultas**  
   - Agendamento inteligente com seleção de médico e consultório dinâmicos.  
   - **Cards KPI interativos** (Total, Confirmados, Em Atendimento, Concluídos): clique para filtrar a lista.
   - Filtros por data, médico, consultório e status.

4. **Pacientes (Admissão & Lixeira)**  
   - CRUD completo com autopreenchimento de endereço via API ViaCEP.  
   - Prevenção contra CPFs e nomes duplicados.  
   - Lixeira com soft-delete e restauração.

5. **Atendimentos (Kanban & Triagem Manchester)**  
   - Fluxo visual em colunas: Aguardando Triagem → Aguardando Atendimento → Em Atendimento → Finalizado.  
   - Priorização por cores de risco (Manchester).  
   - Prontuário eletrônico (PEP SOAP) integrado.  
   - Chamada de paciente integrada com Painel TV (Web Speech API).

6. **Painel TV (Chamador com Voz)**  
   - Tela cheia para sala de espera.  
   - Anuncia paciente com voz sintetizada (Web Speech API) e exibe nome em destaque.

7. **Prontuário Eletrônico (PEP SOAP)**  
   - Autosave, assinatura digital, prescrições médicas.  
   - Histórico completo por paciente.

8. **Alertas & Estagnação**  
   - Monitoramento proativo de gargalos.  
   - **Cards KPI clicáveis** com filtro instantâneo da tabela.  
   - Painel exclusivo de aprovação de novos acessos e monitoramento de gargalos.

9. **Leitos (Censo Hospitalar)**  
   - Mapa visual de leitos: Livre (verde) · Ocupado (vermelho) · Higienização (amarelo).  
   - Alocação e alta de pacientes com atualização em tempo real.

10. **🆕 Kanban de Internação Interativo** *(v2.3.0)*  
    Gestão visual Kanban do fluxo de internação hospitalar com metas evolutivas e alta interatividade:  
    - **5 colunas de setor:** Pronto Socorro (PS), Corredor de Internação, Clínica Cirúrgica, Clínica Médica (SUS) e UTI.  
    - **Metas de tempo por setor:** PS: 24h · Corredor: 1d · Cirúrgica: 7d · Médica: 10d · UTI: 5d.  
    - **Cards com Glassmorphism:** borda superior colorida (indicador de SLA), avatar com iniciais, barra de progresso dinâmica verde→âmbar→rosê.  
    - **Seletores de setor no topo:** "Visão Geral" exibe todos os setores em grid; clique em um setor expande sua coluna em largura total.  
    - **🩺 Prontuário direto do card:** acesso ao histórico clínico completo do paciente.  
    - **📝 Evolução Clínica:** registro de novas evoluções com timestamp + timeline de histórico.  
    - **Ações de gerenciamento por card:** ✏️ Editar, 🔄 Mover setor, 🚶 Alta hospitalar.  
    - **Gráficos KPI interativos:** clique nas fatias do Donut (Distribuição por Setor) para filtrar o Kanban instantaneamente; clique nas fatias do gráfico SLA para filtrar por status de permanência.  
    - **Modal de Auditoria de SLAs:** lista completa de pacientes por grupo (Meta Excedida / Atenção / No Prazo) com botão **Prontuário** funcional e filtro "Filtrar Atrasados".  
    - **Modal de Detalhamento por Setor:** lista pacientes por setor com leito e acesso rápido ao card.

11. **Farmácia & Estoque**  
     - Gerenciamento de medicamentos e insumos com **pesquisa em tempo real via APIs globais (RxNav, NLM, OpenFDA)**.  
     - Preenchimento automático de dados (fabricante, tarja, dosagem).
     - Notificações automáticas de estoque baixo.

12. **Financeiro (Títulos & Parcelas)**  
    - Faturamento, recebimentos (Pix/Cartão/Dinheiro) e contas a pagar.
    - **Janela Dedicada:** Dashboard de relatórios financeiros expandido em tela cheia.
    - **Cards KPI Interativos:** Filtro instantâneo de contas a vencer, vencidas, pagas e visão geral.
    - **Gráficos Glassmorphism:** Distribuição por status (Donut) e volume por métodos de pagamento (Bar) com Chart.js.

13. **Corpo Clínico & Consultórios**  
    - CRUD de médicos com CRM, especialidade e escala de plantão.

14. **Relatórios & Exportação**  
    - Exportação para PDF, XLSX e CSV (padronizados e estabilizados).

15. **Configurações, Simulador & Nuvem (Turso Cloud)**  
    - Sincronização SQLite ↔ Turso.
    - **Gerador de Dados de Teste:** O sistema conta com um algoritmo inteligente de simulação de dados que gera centenas de registros fictícios de uma vez (pacientes, agendas, PEPs, internações) para testes locais.

16. **🆕 Histórico de Sessões** *(v1.3.0 · Exclusivo Master)*  
    - Registro automático de login e logout de cada usuário.  
    - Relatório com gráfico de tempo de uso (exclusivo para o perfil Master).  
    - Disponível na aba **Gestão de Usuários** → botão "Histórico de Sessões".

---

## 📋 Kanban de Internação — Metas por Setor

| Setor | Meta de Alta | Alerta Amarelo | Alerta Vermelho |
|---|---|---|---|
| 🔵 Pronto Socorro (Obs) | 24 horas | 18h+ | 24h+ |
| 🟡 Corredor de Internação | 1 dia | 18h+ | 24h+ |
| 🟣 Clínica Cirúrgica | 7 dias | 5d+ | 7d+ |
| 🟢 Clínica Médica (SUS) | 10 dias | 7d+ | 10d+ |
| 🔴 **UTI** | **5 dias** | **3d+** | **5d+** |

> 💡 As metas estimulam a equipe a buscar condutas que propiciem alta evolutiva, principalmente na UTI onde 5 dias é a meta de resultado clínico.

---

## 🎨 Cards KPI Interativos (v1.2.0+)

| Aba | Cards | Comportamento |
|-----|-------|--------------|
| **Agenda** | Total, Confirmados, Em Atendimento, Concluídos | Filtra lista de consultas |
| **Corpo Clínico** | Total, Ativos, Especialidades | Filtra tabela de médicos |
| **Farmácia** | Total, Baixo Estoque, Crítico | Filtra lista de medicamentos |
| **Estagnação** | Críticos, Alertas de Espera, Total | Filtra tabela de alertas |
| **Leitos** | Total, Vagos, Ocupados, Higienização | Filtra grade visual |
| **Kanban** | Distribuição Setor, Metas (SLA), Funil | Clicar em gráficos e métricas filtra o quadro ou abre modais de auditoria |

---

## 🎨 Design System — Glassmorphism

O Health Nexus implementa um design system completo baseado em **Glassmorphism** com tokens CSS (`--variáveis`) para dois temas:

- **Modo Escuro (padrão):** Fundo azul profundo (`#0f172a`), cards em vidro translúcido escuro com `backdrop-filter: blur`, acentos neon em índigo/ciano.
- **Modo Claro:** Fundo cinza slate suave (`#e2e8f0`), cards em vidro translúcido claro — todos os modais, colunas e componentes respeitam as variáveis de tema sem divergências.

### Paleta de Cores Semânticas

| Cor | Hex | Uso |
|---|---|---|
| Primário (Índigo) | `#6366f1` | Ações principais, KPIs neutros |
| Sucesso (Esmeralda) | `#10b981` | No Prazo, leito disponível |
| Atenção (Âmbar) | `#f59e0b` | Próximo do Limite, SLA em risco |
| Perigo Suavizado (Rosê) | `#be5a6e` | Ações destrutivas (Alta Hospitalar) |
| Urgência Clínica | `#ef4444` | Setor UTI, alertas críticos clínicos |

---

## 🔐 Papéis de Acesso (RBAC)

| Papel | Acesso |
|-------|--------|
| **Master** | Acesso total + Histórico de Sessões + Kanban + aprovações |
| **Médico** | Atendimentos, Agenda, PEP, Leitos, Kanban |
| **Enfermeiro** | Triagem, Atendimentos, Leitos, Farmácia, Kanban |
| **Recepcionista** | Pacientes, Agenda, Financeiro (básico) |

> **🛡️ Proteção de Segurança:** Perfis `Master` e `Administrador` são protegidos contra escalonamento não autorizado.

---

## 🔧 Automações Especiais

- **Auto-shutdown do servidor:** O processo Node se encerra automaticamente quando a aba do navegador é fechada
- **Criação automática do banco:** Todas as tabelas criadas via `CREATE TABLE IF NOT EXISTS` ao iniciar
- **Usuário admin padrão:** Criado automaticamente se não existir nenhum usuário

---

## 🗺️ Próximos Passos (Versão 2.0)

- Laboratório e Integração de Equipamentos (LIS)
- Integração de Imagens (DICOM/PACS)
- App Mobile para Médicos (React Native)
- Integração Telemedicina via WebRTC
- Notificações Push (PWA)
- Dashboard de Indicadores do Kanban (relatório de giro de leitos, tempo médio por setor)

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

## 📅 Changelog

### v2.3.0 — Agosto 2026 (atual)
- ✅ **Glassmorphism completo no Kanban:** colunas, cabeçalhos e cards modernizados com `backdrop-filter: blur`, bordas translúcidas e sombras dinâmicas coloridas.
- ✅ **Seletor de setor reformulado:** cards do topo com cores destacadas, borda superior colorida por setor; "Visão Geral" exibe todos sem filtrar.
- ✅ **Modal Confirmar Alta redesenhado:** acento decorativo no topo, ícone temático, badge informativo e botões com espaçamento generoso (sem colapso nas margens).
- ✅ **Botão Alta Hospitalar suavizado:** cor vermelho puro substituída por vinho/rosê (`#be5a6e → #9e3a52`) para não conflitar com alertas clínicos.
- ✅ **Modais de Setor e SLA com suporte a Modo Claro:** todos os `rgba` hardcoded substituídos por variáveis CSS de tema (`var(--bg-secondary)`, `var(--glass-border)`, etc.).
- ✅ **Botão Prontuário corrigido** no Modal de Auditoria de SLAs (atributo `onclick` malformado corrigido).
- ✅ **Tab Leitos modernizada:** cards com Glassmorphism, borda superior por status, grid responsivo e botões de ação redesenhados.
- ✅ **Modo Claro acinzentado:** `--bg-primary: #e2e8f0` no `styles.css` para evitar interface totalmente branca.

### v2.2.0 — Agosto 2026
- ✅ **Kanban de Internação:** 5 setores, metas de tempo por setor, drag & drop, barra de progresso visual
- ✅ **Admissão Kanban completa:** leito, diagnóstico, médico responsável, data e observações iniciais
- ✅ **Cards interativos com alinhamento premium:** avatar colorido, diagnóstico, leito, médico e tempos
- ✅ **Botão 🩺 Prontuário:** acesso direto ao histórico clínico completo (PEP, consultas, receituários)
- ✅ **Painel 📝 Evolução Clínica:** registro de novas evoluções com timestamp + timeline de histórico
- ✅ **Migração automática:** notas legadas convertidas para o novo formato de array de evoluções
- ✅ **Indicador visual:** ponto vermelho no botão Evolução quando há anotações registradas
- ✅ **Histórico de Sessões:** relatório de login/logout com tempo de uso, layout moderno atualizado e correção de z-index (exclusivo Master)
- ✅ **Filtros por setor** no Kanban com cards KPI interativos e contagem em tempo real
- ✅ **Painel Financeiro Imersivo:** Janela dedicada com gráficos Donut & Bar modernos (estilo glassmorphism) e novos cards de KPI para filtro avançado.
- ✅ **Melhorias de UI/UX e Acessibilidade:** Scrollbar nativa no menu lateral, correção de contrastes no Light Mode, novo ícone para troca de temas, e correção de artefatos de codificação (mojibake) em relatórios.

### v1.2.1 — Julho 2026
- Cards KPI interativos em todas as abas principais
- Proteção de perfil Master contra escalonamento
- Melhorias de performance e UX

### v1.2.0 — Junho 2026
- Modo claro completo
- Sincronização Turso Cloud
- Exportação PDF/XLSX/CSV

---

*Desenvolvido por @mazzarowysk & @_coltri_*

**Status:** Em desenvolvimento ativo  
**Última atualização:** Agosto 2026

---

## 📘 Documentação & Manual do Usuário

- 🌐 **Portal Web Interativo:** [manual_do_usuario.html](file:///c:/Health%20Nexus/manual_do_usuario.html) *(acessível no botão `📖 Manual do Usuário` no topo do sistema)*
- 📕 **Documento PDF Oficial de Impressão:** [Manual_do_Usuario_Health_Nexus_v3.pdf](file:///c:/Health%20Nexus/Manual_do_Usuario_Health_Nexus_v3.pdf)
- 📄 **Manual Completo em Markdown:** [MANUAL_DO_USUARIO_HEALTH_NEXUS.md](file:///c:/Health%20Nexus/MANUAL_DO_USUARIO_HEALTH_NEXUS.md)

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

## 🧩 Módulos Implementados (Visão Geral 360º)

1. **Autenticação & Controle de Acesso (RBAC)**  
   Login com JWT e gestão de papéis: `Master`, `Médico`, `Enfermeiro`, `Recepcionista`.  
   - Aprovação de todos os novos usuários pelo Master via Painel de Estagnação.
   - Liberação automática de acesso através da Chave Master secreta.

2. **Dashboard (Health Nexus)**  
   KPIs e gráficos gerenciais em tempo real via Chart.js:  
   - Atendimentos por período, taxa de ocupação de leitos, receita mensal e evolução de pacientes.

3. **Agenda de Consultas**  
   - Agendamento inteligente com seleção de médico e consultório dinâmicos.  
   - **Cards KPI interativos** (Total, Confirmados, Em Atendimento, Concluídos): clique para filtrar a lista. Card ativo recebe destaque visual colorido. Clique duplo desfaz o filtro.
   - Filtros por data, médico, consultório e status.
   - Sincronização bidirecional dos tabs de status com os cards KPI.

4. **Pacientes (Admissão & Lixeira)**  
   - CRUD completo com autopreenchimento de endereço via API ViaCEP.  
   - Prevenção contra CPFs e nomes duplicados.  
   - Lixeira com soft-delete e restauração.

5. **Atendimentos (Kanban & Triagem Manchester)**  
   - Fluxo visual em colunas: Aguardando Triagem → Aguardando Atendimento → Em Atendimento → Finalizado.  
   - Priorização por cores de risco (Manchester).  
   - Prontuário eletrônico (PEP SOAP) integrado.  
   - Chamada de paciente integrada com Painel TV (Web Speech API).

6. **Painel TV (Chamador com Voz)**  
   - Tela cheia para sala de espera.  
   - Anuncia paciente com voz sintetizada (Web Speech API) e exibe nome em destaque.  
   - Operado via botão na aba Atendimentos.

7. **Prontuário Eletrônico (PEP SOAP)**  
   - Autosave, assinatura digital, prescrições médicas.  
   - Histórico completo por paciente.

8. **Alertas & Estagnação**  
   - Monitoramento proativo de gargalos (pacientes há muito tempo em triagem/atendimento).  
   - **Cards KPI clicáveis** (Críticos, Alertas de Espera, Total Estagnados) com filtro instantâneo da tabela.  
   - Painel exclusivo de aprovação de novos acessos e monitoramento de gargalos.  
   - Badge no menu lateral com contagem de alertas + aprovações pendentes.

9. **Leitos (Censo Hospitalar)**  
   - Mapa visual de leitos: Livre (verde) · Ocupado (vermelho) · Higienização (amarelo).  
   - Alocação e alta de pacientes com atualização em tempo real.

10. **Farmácia & Estoque**  
    - Gerenciamento de medicamentos e insumos com controle de quantidade.  
    - **Cards KPI interativos** para filtrar por status do estoque.  
    - Notificações automáticas de estoque baixo.  
    - Baixa de medicamentos vinculada ao atendimento.

11. **Financeiro**  
    - Faturamento, recebimentos (Pix/Cartão/Dinheiro) e contas a pagar.  
    - Lançamentos vinculados a atendimentos.

12. **Corpo Clínico & Consultórios**  
    - CRUD de médicos com CRM, especialidade, contato e status.  
    - **Cards KPI interativos**: Total (ver todos), Ativos (filtrar por status), Especialidades (abre painel flutuante com chips clicáveis por área médica).  
    - Painel de Atividades do Médico: agendamentos + prontuários SOAP em modal dedicado.  
    - Escala de Plantão diária com banner integrado.  
    - Lixeira com soft-delete.

13. **Relatórios & Exportação**  
    - Exportação inteligente para PDF, XLSX e CSV.  
    - Relatórios por período, médico, status e tipo.

14. **Configurações & Nuvem (Turso Cloud)**  
    - Sincronização avançada SQLite ↔ Turso com comparativos de data/hora.  
    - Upload e download seletivo por tabela.

---

## 🎨 Cards KPI Interativos (v1.2.0)

Todos os painéis com cards de KPI passaram a ser **filtros clicáveis**:

| Aba | Cards | Comportamento |
|-----|-------|--------------|
| **Agenda** | Total, Confirmados, Em Atendimento, Concluídos | Filtra lista de consultas; toggle ao clicar 2º |
| **Corpo Clínico** | Total, Ativos, Especialidades | Filtra tabela de médicos; Especialidades abre painel de chips |
| **Farmácia** | Total, Baixo Estoque, Crítico | Filtra lista de medicamentos |
| **Estagnação** | Críticos, Alertas de Espera, Total | Filtra tabela de alertas |
| **Leitos** | Total, Vagos, Ocupados, Higienização | Filtra a grade visual do mapa de leitos pelo status selecionado |

**Padrão visual:** card ativo recebe borda colorida + leve elevação + glow correspondente à sua cor de acento. Clicar novamente no mesmo card ativo volta para "Todos".

---

## 🎨 Design System

O Health Nexus implementa um design system completo com tokens CSS (`--variáveis`) para dois temas:

- **Modo Escuro (padrão):** Glassmorphism com fundo roxo profundo, acentos neon magenta/ciano
- **Modo Claro:** Branco clínico profissional (azul médico `#2563eb` + verde teal `#0d9488`), totalmente polido com overrides para todos os componentes: sidebar, header, cards, tabelas, modais, inputs, badges, etc.

---

## 🔐 Papéis de Acesso (RBAC)

| Papel | Acesso |
|-------|--------|
| **Master** | Acesso total + aprovação de usuários + configurações de nuvem |
| **Médico** | Atendimentos, Agenda, PEP, Leitos (leitura), Relatórios próprios |
| **Enfermeiro** | Triagem, Atendimentos, Leitos, Farmácia |
| **Recepcionista** | Pacientes, Agenda, Financeiro (básico) |

> **🛡️ Proteção de Segurança (v1.2.0):** Perfis `Master` e `Administrador` são protegidos. Apenas um usuário autenticado com status `Master` possui permissão para editar, excluir ou autorizar mudanças nessas contas. Desenvolvedores e perfis básicos não podem escalar ou alterar esses acessos.

---

## 🔧 Automações Especiais

- **Auto-shutdown do servidor:** O processo Node se encerra automaticamente quando a aba do navegador é fechada (heartbeat + `process.exit`)
- **Criação automática do banco:** Todas as tabelas são criadas via `CREATE TABLE IF NOT EXISTS` ao iniciar
- **Usuário admin padrão:** Criado automaticamente (`admin` / senha `admin`) se não existir nenhum usuário

---

## 🗺️ Próximos Passos (Versão 2.0)

- Laboratório e Integração de Equipamentos (LIS)
- Integração de Imagens (DICOM/PACS)
- App Mobile para Médicos (React Native)
- Integração Telemedicina via WebRTC
- Notificações Push (PWA)

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


## Nova Atualização: Gráficos e Interatividade
- **Dashboard Principal**: Agora conta com visualização completa de ocupação através de gráficos interativos.
- **Kanban Interativo**: 
  - Gráfico 'Distribuição Geral' para análise em tempo real dos pacientes por setor.
  - Cartões de pacientes agora são **clicáveis**, exibindo o histórico detalhado do paciente.
  - Áreas vazias de colunas permitem o rápido cadastro de admissão no setor.
- **Relatórios**: A sessão de Relatórios e Exportação foi refinada e padronizada.
