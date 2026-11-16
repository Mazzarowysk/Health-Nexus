# Health Nexus — Autenticação, Autorização e Controle de Acesso

> **Versão:** 1.3.0 — Agosto/2026  
> Este documento descreve os mecanismos reais de autenticação, autorização e RBAC implementados no **Health Nexus**.

---

## 1. Fluxo de Autenticação (JWT + SessionStorage)

A autenticação é **stateless**, baseada em tokens JWT armazenados em `sessionStorage` (não em cookies — sem risco de CSRF).

### Processo de Login

1. **Entrada:** Usuário submete `username` + `password` via formulário de login.
2. **Criptografia:** Senhas armazenadas como hash **bcrypt** (fator de custo 10). O sistema nunca armazena senhas em texto puro.
3. **Validação:** Backend verifica hash e retorna payload JWT com `{ id, name, role, status }` + tempo de expiração 12h.
4. **Persistência de Sessão:** Token armazenado em `sessionStorage` (limpo ao fechar o navegador).
5. **Aprovação de Acesso:** Novos usuários ficam com `status: "Pendente"` até aprovação manual de um usuário **Master**.

### Renovação e Logout

- Ao carregar a aplicação, o frontend faz `GET /api/auth/me` com timeout de 2s via `AbortController`.
- Em caso de token expirado (401) ou timeout, o usuário é redirecionado para a tela de login.
- Logout: `sessionStorage.removeItem('authToken')` + redirect para `renderAuthScreen()`.

---

## 2. Perfis de Acesso (RBAC — Role-Based Access Control)

O controle de acesso é gerenciado pela função `getRolePermissions(role)` em `src/main.js`, que retorna um objeto de permissões por aba e funcionalidade.

### Matriz de Perfis

| Perfil | Descrição |
|--------|-----------|
| **Master** | Acesso total a todas as abas, configurações e operações destrutivas. Único que pode aprovar novos usuários. |
| **Desenvolvedor** | Acesso a todas as abas clínicas/operacionais + grupos técnicos de configurações. Sem acesso a operações financeiras destrutivas. |
| **Administrador** | Acesso às abas de gestão (pacientes, médicos, relatórios, agenda). Sem configurações do sistema. |
| **Médico** | PEP, Agenda, Prontuário, Kanban, Leitos. Sem acesso a módulo financeiro ou configurações. |
| **Enfermeiro** | Triagem, Checagem de prescrições, Leitos, Kanban. |
| **Recepcionista** | Admissão de pacientes, Agenda, Painel de Fila/TV. |
| **Farmacêutico** | Módulo Farmácia (estoque, dispensação). |
| **Financeiro** | Relatórios Financeiros, Faturamento, Conciliação. |
| **Pendente** | Apenas tela de espera — sem acesso a nenhuma funcionalidade. |

---

## 3. Aba de Configurações — Controle Granular

O acesso à aba **Configurações** é restrito a dois perfis:

- **Master:** Acesso a **todos** os grupos de configuração.
- **Desenvolvedor:** Acesso apenas aos grupos técnicos destacados abaixo.

### Grupos de Configurações

| Grupo | Master | Desenvolvedor | Outros |
|-------|--------|---------------|--------|
| Configurações Gerais do Sistema | ✅ | ✅ | ❌ |
| Identidade Visual & Aparência | ✅ | ❌ | ❌ |
| Gestão de Usuários & Permissões | ✅ | ✅ | ❌ |
| Módulos Clínicos (PEP, Protocolos) | ✅ | ❌ | ❌ |
| Integrações & APIs | ✅ | ✅ | ❌ |
| Banco de Dados & Sincronização | ✅ | ✅ | ❌ |
| Configurações Financeiras | ✅ | ❌ | ❌ |
| Segurança & Compliance | ✅ | ✅ | ❌ |
| Relatórios & BI | ✅ | ❌ | ❌ |
| Notificações & Alertas | ✅ | ❌ | ❌ |

---

## 4. Aprovação de Usuários

O fluxo de aprovação de acesso Master para novos usuários:

1. Novo usuário se cadastra → `status: "Pendente"`.
2. Um usuário **Master** acessa Configurações → Gestão de Usuários.
3. Clica em "Aprovar" → o sistema chama `PUT /api/users/:id/approve-master`.
4. O backend atualiza `status: "Ativo"` e preserva o `role` solicitado pelo usuário (não força "Master").
5. O usuário aprovado pode logar normalmente com as permissões do seu perfil.

---

## 5. Segurança de Dados (LGPD)

O Health Nexus processa dados de saúde — classificados como **dados pessoais sensíveis** pelo Art. 11 da LGPD (Lei 13.709/2018). As medidas implementadas:

- **Bcrypt:** Hashing de senhas com salt automático (nunca texto puro).
- **JWT com expiração:** Sessões de 12 horas — reduz janela de exposição.
- **sessionStorage (não localStorage):** Token limpo automaticamente ao fechar o navegador.
- **Soft Delete:** Dados de pacientes nunca são excluídos fisicamente — campo `deleted_at` permite rastreabilidade e recuperação.
- **CPF Anonimizado:** Na visualização de tabelas públicas, CPFs são exibidos como `***.XXX.XXX-**` via função `anonymizeCPF()`.
- **Dados de saúde em APIs externas:** A integração com OpenFDA (ANVISA) envia apenas o **nome do medicamento** (dado não pessoal). Nenhum dado de paciente é transmitido a APIs externas.

---

*Documentação mantida pela equipe de Engenharia — Health Nexus v1.3.0 — Agosto/2026*
