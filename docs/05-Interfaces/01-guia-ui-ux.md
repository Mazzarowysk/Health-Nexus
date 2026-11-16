# Health Nexus — Guia de UI/UX e Interfaces

> **Versão:** 1.3.0 — Agosto/2026  
> Documento de referência para padrões de experiência do usuário (UX) e especificações de interface visual (UI) do **Health Nexus**.

---

## 1. Padrões de Layout e Responsividade

Para atender aos diferentes dispositivos da instituição (monitores de mesa na recepção, laptops na enfermagem e tablets móveis nas visitas clínicas), o frontend utiliza um sistema de grid fluido nativo (CSS Grid) e layouts baseados em Flexbox.

### Breakpoints Responsivos
*   **Desktop / Monitores Grandes (>= 1200px)**: Exibição completa de duas colunas (Ex: Menu lateral fixo com 260px de largura e área de trabalho de conteúdo com grid em 3 colunas para os widgets).
*   **Laptops / Telas Médias (992px a 1199px)**: O menu lateral é recolhido para uma barra de ícones compacta (70px) sob hover, maximizando o espaço horizontal para tabelas clínicas.
*   **Tablets (768px a 991px)**: O menu lateral torna-se uma gaveta deslizante (*drawer*) acionada por um botão de hambúrguer no header. Os cards de estatísticas passam para grid de 2 colunas.
*   **Smartphones (< 768px)**: Layout de coluna único. Tabelas de dados longas habilitam rolagem horizontal interna (`overflow-x: auto`) com cabeçalho fixo para evitar a quebra do layout visual.

---

## 2. Design System — Glassmorphism & Temas

O sistema utiliza um **Design System** duplo (dark/light) baseado em **Glassmorphism** como linguagem visual principal.

### Variáveis CSS de Tema

| Variável | Dark Mode | Light Mode |
|---|---|---|
| `--bg-primary` | `#0f172a` | `#e2e8f0` |
| `--bg-secondary` | `#1e293b` | `#f1f5f9` |
| `--bg-tertiary` | `#334155` | `#e2e8f0` |
| `--glass-bg` | `rgba(30,41,59,0.7)` | `rgba(248,250,252,0.85)` |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(203,213,225,0.8)` |
| `--glass-blur` | `blur(16px)` | `blur(16px)` |
| `--shadow-sm` | `0 4px 16px rgba(0,0,0,0.3)` | `0 2px 8px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.5)` | `0 8px 24px rgba(0,0,0,0.12)` |

### Princípios de Aplicação Glassmorphism

- Todo **card de conteúdo** (Leitos, Kanban, KPIs) deve usar `background: var(--glass-bg)` + `backdrop-filter: var(--glass-blur)` + `border: 1px solid var(--glass-border)`.
- A **borda superior colorida** (`border-top: 4-6px solid <cor-do-setor>`) é o elemento de identidade visual de cada card.
- **Nunca** usar valores `rgba` hardcoded de escuro em componentes dinâmicos — sempre usar variáveis CSS para garantir compatibilidade com o modo claro.

---

## 3. Paleta de Cores Semânticas

| Cor | Hex | Uso |
|---|---|---|
| **Primário (Índigo)** | `#6366f1` | Ações principais, links ativos, KPIs neutros |
| **Sucesso (Esmeralda)** | `#10b981` | "No Prazo", alta de leito livre, sucesso |
| **Atenção (Âmbar)** | `#f59e0b` | "Próximo do Limite", avisos de SLA |
| **Perigo Suavizado (Rosê)** | `#be5a6e / #9e3a52` | Alta Hospitalar, Meta Excedida, ações destrutivas |
| **UTI / Urgência** | `#ef4444` | Exclusivo para setor UTI e alertas críticos clínicos |
| **Cirúrgica (Roxo)** | `#a855f7` | Setor Clínica Cirúrgica |
| **Clínica Médica (Verde)** | `#22c55e` | Setor Clínica Médica |

> **Nota:** A cor vermelha `#ef4444` é reservada para indicadores clínicos de urgência (UTI, SLA excedido no gráfico). Para botões destrutivos administrativos (ex: "Alta Hospitalar"), usa-se o rosê suavizado `#be5a6e → #9e3a52`.

---

## 4. Comportamento de Componentes Críticos

### Modais e Overlays

As janelas modais seguem o padrão **Glassmorphism Temático** — obrigatoriamente respeitam as variáveis de tema:

1. **Container do Modal:** `background: var(--bg-secondary)` + `border: 1px solid var(--glass-border)` + `border-radius: 24px`.
2. **Cabeçalho e Rodapé:** `background: var(--bg-tertiary)` + `border: 1px solid var(--border-color)`.
3. **Itens de Lista:** `background: var(--bg-tertiary)` + `border: 1px solid var(--border-color)`.
4. **Overlay de Fundo:** `background: rgba(0,0,0,0.45)` + `backdrop-filter: blur(8px)`.
5. **Acento Decorativo:** Faixa colorida de 4px no topo do modal via `div` com `position: absolute; top: 0`.
6. **Ícone Central:** Formato quadrado arredondado (`border-radius: 16-20px`) com background levemente colorido.
7. **Fechamento Acessível:** "X" no canto, backdrop, ou tecla `ESC`.
8. **Animação de Entrada:** `200ms` com `transform: scale(0.95 → 1)` + `opacity: 0 → 1`.

### Notificações Flutuantes (Toast)
*   **Localização:** Canto superior direito, sem bloquear navegação.
*   **Sucesso (Esmeralda):** Auto-dismiss após 4s.
*   **Atenção (Âmbar):** Auto-dismiss após 6s.
*   **Erro (Rosê/Coral):** Requer clique do usuário para fechar.

---

## 5. Elementos Gráficos e Gráficos de BI

- **Gráficos de Linha/Área:** Curvas *monotone spline* com preenchimento de gradiente decrescente.
- **Gráficos Donut:** Anel fino com legenda centralizada; as fatias são **interativas** — clique em uma fatia filtra o Kanban pelo setor correspondente.
- **Gráfico de Funil (Kanban):** Barras horizontais por setor com percentual relativo ao total de internações.
- **Skeleton Loaders:** Durante carregamento assíncrono, replica o layout final com animação de pulsação cinza suave.

---

## 6. Diretrizes de Micro-Interações

1. **Hover em Cards:** `transform: translateY(-2px)` + expansão de sombra. Nos cards do Kanban e Leitos, `translateY(-4px)` com `box-shadow: var(--shadow-lg)`.
2. **Hover em Botões de Ação:** Aumento de luminosidade e mudança de `box-shadow` em `0.2s ease`.
3. **Botões Destrutivos (Alta, Excluir):** `transform: translateY(-1px)` no hover.
4. **Inputs Interativos:** Label flutua ao focar, borda ilumina em `--color-primary` em `150ms`.
5. **Kanban Card Selecionado:** Card ativo ganha `translateY(-4px)`, `box-shadow` intensa colorida e `border-top` reforçado.

---

## 7. Kanban de Internação — Padrões Visuais

### Colunas
- **Fundo:** `background: var(--glass-bg)` com `backdrop-filter: var(--glass-blur)`.
- **Borda Superior:** `border-top: 5px solid <cor-do-setor>` como identificador visual primário.
- **Cabeçalho da Coluna:** Fundo `rgba(<rgb-setor>, 0.06)`, separado por `border-bottom: 1px solid var(--glass-border)`.
- **Badge de Contagem:** Pílula com `background: <cor-do-setor>` + sombra colorida.
- **Badge de Meta:** Pílula outline (`border-radius: 100px`) com `background: rgba(<rgb>, 0.15)`.

### Cards de Paciente
- **Borda Superior Colorida:** `border-top: 6px solid <statusColor>` comunica o SLA de relance.
- **Avatar Inicial:** Círculo com gradiente suave na cor do setor, exibe as iniciais do nome.
- **Barra de Progresso SLA:** Cor dinâmica: verde → âmbar → rosê conforme proximidade do limite.
- **Botões de Ação:** Grid 2 colunas para "Prontuário" e "Evolução"; linha de rodapé para ações de gestão (Editar, Mover, Alta).

---

## 8. Padrões de UX — Funcionalidades Recentes (Agosto/2026)

### 8.1 Botões Limpar Filtros

Todas as abas com campos de filtro ou busca possuem botão **"Limpar Filtros"** padronizado:

- **Ícone:** `fa-solid fa-filter-circle-xmark` (Font Awesome)
- **Label:** `Limpar` ou `Limpar Filtros`
- **Posicionamento:** Ao lado do campo de busca principal, alinhado à direita
- **Comportamento:** Reseta todos os inputs de filtro da aba para o estado inicial + recarrega a listagem
- **Estilo:** `background: var(--bg-tertiary)` + `border: 1px solid var(--border-color)` + hover com `rgba(99,102,241,0.15)`

**Abas cobertas:** Médicos · Agenda · Farmácia · Leitos · Estagnação · Relatórios Financeiro/Atendimentos/Pacientes · Kanban

### 8.2 Elementos Gráficos de Métodos de Pagamento

O módulo Financeiro utiliza emojis como elementos gráficos nos seletores e badges de método de pagamento:

| Método | Emoji | Cor de identificação |
|--------|-------|---------------------|
| Dinheiro | 💵 | `#10b981` (esmeralda) |
| Cartão de Crédito/Débito | 💳 | `#6366f1` (índigo) |
| PIX | 📱 | `#0ea5e9` (céu) |
| Convênio/Plano de Saúde | 🏦 | `#8b5cf6` (violeta) |
| Boleto Bancário | 📋 | `#f59e0b` (âmbar) |
| Transferência Bancária | 🔄 | `#64748b` (slate) |

### 8.3 Badges de Validação de APIs Externas

Quando dados são preenchidos via integração com API externa, um badge visual confirma a origem:

- **ANVISA Verificado** `🛡` — verde `#10b981` — aparece no campo Nome do Medicamento ao selecionar resultado da busca OpenFDA.
- **CRM Verificado** `✅` — verde `#10b981` — aparece abaixo do campo CRM ao verificar via CFM Portal.
- **Formato Válido** `⚠️` — âmbar `#f59e0b` — quando o CRM tem formato correto mas não foi localizado no CFM Portal.
- **CRM Inválido** `❌` — vermelho `#ef4444` — formato não reconhecido.

Os badges de CRM também aparecem na **tabela do Corpo Clínico** como ícone 🛡 clicável que abre o portal do CFM com busca pré-preenchida.
