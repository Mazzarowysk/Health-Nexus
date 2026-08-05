# Health Nexus — Sistema de Gestão Hospitalar

**Versão:** `1.2.1`  
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
   - Aprovação de novos usuários pelo Master via Painel de Estagnação.
   - Solicitação de acesso Master via chave secreta.

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
   - Painel exclusivo de aprovação de usuários Master.  
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
