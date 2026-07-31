# 📘 Health Nexus — Manual Operacional do Usuário (Completo & Ilustrado)

> **Versão:** 2.0.0 (Fase 2 Concluída)  
> **Público-Alvo:** Recepcionistas, Enfermeiros, Médicos, Farmacêuticos, Gestores Financeiros e Administradores Hospitalares  
> **Sistema:** Health Nexus — Gestão Hospitalar & Pronto-Socorro  

---

## 🏛️ 1. Organograma da Estrutura Hospitalar & Perfis de Acesso (RBAC)

O **Health Nexus** utiliza Controle de Acesso Baseado em Perfis (RBAC — Role-Based Access Control) para garantir a segurança dos dados clínicos e sigilo financeiro.

```
                    ┌─────────────────────────────────────────┐
                    │      👑 MASTER / ADMINISTRADOR           │
                    │   Gestão Total · Aprovação · Auditoria  │
                    └────────────────────┬────────────────────┘
                                         │
        ┌───────────────────┬────────────┴───────┬───────────────────┐
        │                   │                    │                   │
┌───────┴──────┐   ┌────────┴───────┐   ┌────────┴──────┐   ┌────────┴──────┐
│ 💻 DESENVOLV.│   │ 🩺 MÉDICO /    │   │ 🩺 ENFERMAGEM │   │ 📋 RECEPÇÃO   │
│ Acesso Total │   │  CORPO CLÍNICO │   │ Triagem/Obs/  │   │ Admissão/TV/  │
│  + Sync DB   │   │ PEP & Planilha │   │ Leitos/Meds   │   │ Caixa Entrada │
└──────────────┘   └────────────────┘   └───────────────┘   └───────────────┘
                                                 │
                                        ┌────────┴──────┐
                                        │ 💊 FARMÁCIA / │
                                        │  ESTOQUE      │
                                        └───────────────┘
```

### Matriz Geral de Permissões RBAC

| Perfil | Acesso Visual às Abas | Prontuário (PEP) | Triagem Manchester | Prescrição Planilha | Gestão de Leitos | Financeiro | Lixeira / Sync |
|---|---|---|---|---|---|---|---|
| **👑 Master / Admin** | Todas as 13 Abas | Total | Total | Total | Total | Total | Exclusivo |
| **🩺 Médico** | Dashboard, Pacientes, Atendimento, Leitos, Farmácia, Relatórios | Assinatura SOAPE | Consulta | Criação de Planilha | Solicitação | Bloqueado | Bloqueado |
| **🩺 Enfermeiro(a)** | Dashboard, Pacientes, Atendimento, Leitos, Farmácia | Leitura | Execução Manchester | Checagem de Doses | Gestão / Transferência | Bloqueado | Bloqueado |
| **📋 Recepcionista** | Dashboard, Pacientes, Agenda, Atendimento, Painel TV, Caixa | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Apenas Entradas | Bloqueado |
| **💊 Farmacêutico(a)**| Dashboard, Pacientes, Farmácia, Relatórios | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Bloqueado |

---

## 🔄 2. Fluxograma da Jornada Completa do Paciente no PS

```mermaid
flowchart TD
    A[Recepção: Admissão 11 Campos SUS] -->|Validação de Responsável se <18 ou >65| B[Coluna 1: Aguardando Triagem]
    B --> C[Enfermagem: Triagem Manchester & Vitais]
    C --> D[Coluna 2: Aguardando Médico - Sorting Gravidade]
    D --> E[Chamada com Voz Sintetizada no Painel TV]
    E --> F[Coluna 3: Em Atendimento - Médico PEP SOAPE]
    F --> G[Médico: Prescrição Médica em Planilha]
    G --> H[Enfermagem: Checagem & Aplicação de Doses]
    H --> I{Decisão Clínica}
    I -->|Alta| J[Emissão de Receituário A4 PDF]
    I -->|Observação| K[Atendimento: Em Observação PS]
    K --> L[Timer PS 12h: Azul <10h | Amarelo 10-12h | Vermelho >12h]
    L --> M[Ação: Subir para Internação]
    M --> N[Seleção de Leito Vago: UTI / Enfermaria]
```

---

## 📋 3. Admissão SUS com Validação de Responsável Legal

Na aba **Pacientes**, a Recepção realiza a admissão cadastral com **11 Campos SUS**.

### Tabela de Campos e Regras de Segurança

| Campo | Preenchimento | Regra de Validação do Sistema |
|---|---|---|
| **Nome Completo** | Nome oficial | Trava contra nomes duplicados (409 Conflict) |
| **CPF** | 11 dígitos | Validação matemática de CPF real + trava contra duplicidades |
| **Data de Nascimento** | DD/MM/AAAA | Calcula a **Idade** automaticamente em tempo real |
| **Cartão SUS** | 15 dígitos | Validação de formato SUS |
| **Telefone / Celular** | DDD + Número | Aplicação de máscara automática |
| **CEP (ViaCEP)** | 8 dígitos | Consulta automática e preenchimento de Rua, Bairro e Cidade |
| **Responsável Legal** | Obrigatório se &lt; 18 ou &gt; 65 anos | Exige **Nome, CPF, Telefone e Parentesco** do responsável legal |

---

## 🚦 4. Triagem Manchester & Fila de Espera por Gravidade

A Enfermagem classifica os pacientes em 5 níveis de gravidade.

```mermaid
gantt
    title Prazos Limite do Protocolo de Manchester
    dateFormat  X
    axisFormat %s min

    section 🔴 Emergência
    Atendimento Imediato (0 min) : active, 0, 1
    section 🟠 Muito Urgente
    Atendimento em até 10 min    : critical, 0, 10
    section 🟡 Urgente
    Atendimento em até 60 min    : 0, 60
    section 🟢 Pouco Urgente
    Atendimento em até 120 min   : 0, 120
    section 🔵 Não Urgente
    Atendimento em até 240 min   : 0, 240
```

---

## 💊 5. Prescrição em Planilha & Matriz da Enfermagem (Fase 2)

O médico monta a prescrição em formato de tabela. A equipe de enfermagem visualiza a matriz de horários e clica em **"Checar/Administrar"** para gravar o profissional e o horário exato da aplicação.

### Vias de Administração & Frequências Suportadas

| Via de Administração | Frequência Padrão | Descrição Operacional |
|---|---|---|
| **VO** (Via Oral) | `6/6h`, `8/8h`, `12/12h` | Comprimidos, xaropes e gotas |
| **EV / IV** (Endovenosa) | `Contínua`, `12/12h`, `8/8h` | Injeções e soros em veia |
| **IM** (Intramuscular) | `Dose Única`, `24/24h` | Injeções em músculo |
| **SC** (Subcutânea) | `12/12h`, `1x/dia` | Insulinas e anticoagulantes |
| **Tópica / Inalatória** | `Se dor`, `8/8h` | Pomadas, nebulizações |

---

## ⏱️ 6. Timer de Observação PS (12h) & Transferência de Leitos

O sistema monitora a permanência do paciente em observação no Pronto-Socorro:

- **🟢/🔵 < 10 Horas:** Estágio normal de observação (`⏱️ Obs PS: Xh Ym / 12h max`).
- **🟡 10h a 12h:** Alerta de aproximação do limite legal (`⚠️ Atenção: Xh Ym`).
- **🔴 > 12 Horas:** Alerta crítico pulsante (`🚨 EXCEDEU 12H PS: TRANSFERIR`).

### Passo a Passo para Subir para Internação:
1. Clique no botão **"🛌 Subir para Internação"** no card do paciente.
2. Selecione um **Leito Vago** na gaveta lateral (UTI, Enfermaria, Pediatria).
3. Confirme a transferência. O atendimento muda para `Internado` e o leito vira `Ocupado`.

---

## 🛠️ 7. Guia de Solução de Problemas & Dúvidas Frequentes (FAQ)

| Problema | Causa Provável | Solução Recomendada |
|---|---|---|
| **Tela de login demorando a carregar** | Inicialização do servidor ou backend ocupado | Atualize com `Ctrl + F5`. O sistema possui timeout automático de 2 segundos. |
| **TV sem som na chamada de paciente** | Permissão de áudio silenciada no Chrome | Clique em qualquer área da tela da TV para ativar a Web Speech API. |
| **Erro de CPF duplicado na admissão** | Paciente já cadastrado anteriormente | Use a busca de pacientes para re-admitir sem criar duplicidade. |
| **Alerta de leito bloqueado** | Leito em higienização pós-alta | A equipe de enfermagem deve alterar o status do leito para "Livre" na aba Leitos. |

---

*Manual produzido e homologado pela equipe Health Nexus.*
