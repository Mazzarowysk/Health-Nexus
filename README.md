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

## 🧩 Módulos Implementados (Visão Geral 360º)

1. **Autenticação & Controle de Acesso (RBAC):** Telas de login com JWT e gestão de papéis (`Master`, `Médico`, `Enfermeiro`, `Recepcionista`).
2. **Dashboard (Health Nexus):** KPIs e gráficos gerenciais (Chart.js) em tempo real.
3. **Agenda de Consultas:** Agendamento inteligente e controle de status de horários médicos.
4. **Pacientes (Admissão & Lixeira):** CRUD completo com API ViaCEP, prevenção contra CPFs e Nomes duplicados e Lixeira (Soft-delete).
5. **Atendimento (Kanban & Triagem Manchester):** Fluxo de colunas visuais com priorização de risco por cores.
6. **Painel TV (Chamador com Voz):** Tela cheia para sala de espera que anuncia pacientes através da *Web Speech API*.
7. **Prontuário Eletrônico (PEP SOAPE):** Autosave, assinatura digital, prescrições e histórico de pacientes.
8. **Alertas & Estagnação:** Monitoramento de gargalos (pacientes há muito tempo aguardando triagem).
9. **Leitos (Censo Hospitalar):** Mapa de leitos e status (Ocupado, Livre, Higienização).
10. **Farmácia & Estoque:** Gerenciamento de insumos e notificações de estoque baixo.
11. **Financeiro:** Faturamento, recebimentos (Pix/Cartão) e contas a pagar.
12. **Corpo Clínico & Consultórios:** Cadastros base da infraestrutura hospitalar com Lixeira.
13. **Relatórios & Exportação:** Exportação inteligente para PDF, XLSX e CSV.
14. **Configurações & Nuvem (Turso Cloud):** Sincronização avançada SQLite ↔ Turso com comparativos de data/hora.

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

## 🗺️ Próximos Passos (Versão 2.0)

- Laboratório e Integração de Equipamentos (LIS)
- Integração de Imagens (DICOM/PACS)
- App Mobile para Médicos (React Native)
- Integração Telemedicina via WebRTC

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
