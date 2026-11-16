# Health Nexus — Design System

Este documento define o guia de estilos visuais, tokens e componentes do **Design System** do **Health Nexus**, visando garantir uma interface moderna, consistente e visualmente premium para todas as telas do sistema.

---

## 1. Tipografia e Fontes

O Health Nexus utiliza fontes modernas do Google Fonts para otimizar a legibilidade em ambientes clínicos e administrativos sob diferentes condições de iluminação.

*   **Fonte de Títulos e Headers**: **Outfit** (Ideal para interfaces digitais, com geometria moderna e excelente leitura em alta densidade de dados).
*   **Fonte de Corpo e Leitura**: **Inter** (Fonte sem serifa otimizada para telas de computador e dispositivos móveis, garantindo legibilidade para textos pequenos e dados tabulares).

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');
```

---

## 2. Paleta de Cores (Tokens HSL)

A paleta de cores adota uma abordagem moderna e sofisticada. Cores padrão (puras) são evitadas em favor de tons dessaturados harmoniosos e um tema escuro (Dark Mode) nativo premium, com suporte a chaveamento para tema claro (Light Mode) via variáveis CSS.

```css
:root {
  /* HSL Color System - Theme: Sleek Dark (Default) */
  --bg-primary-h: 224;
  --bg-primary-s: 18%;
  --bg-primary-l: 10%; /* Fundo principal escuro */
  --bg-primary: hsl(var(--bg-primary-h), var(--bg-primary-s), var(--bg-primary-l));

  --bg-secondary-l: 14%; /* Cards, modais e containers */
  --bg-secondary: hsl(var(--bg-primary-h), var(--bg-primary-s), var(--bg-secondary-l));

  --bg-tertiary-l: 18%; /* Inputs, inputs em foco, linhas */
  --bg-tertiary: hsl(var(--bg-primary-h), var(--bg-primary-s), var(--bg-tertiary-l));

  /* Cores de Destaque (Brand & Accent Colors) */
  --primary-h: 210;
  --primary-s: 90%;
  --primary-l: 50%; /* Azul Clínico modernizado */
  --color-primary: hsl(var(--primary-h), var(--primary-s), var(--primary-l));
  --color-primary-hover: hsl(var(--primary-h), var(--primary-s), calc(var(--primary-l) + 10%));

  --accent-h: 170;
  --accent-s: 85%;
  --accent-l: 45%; /* Verde Esmeralda para fluxos de sucesso e saúde */
  --color-accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));

  --danger-h: 350;
  --danger-s: 80%;
  --danger-l: 55%; /* Vermelho Coral para alertas e emergência */
  --color-danger: hsl(var(--danger-h), var(--danger-s), var(--danger-l));

  --warning-h: 40;
  --warning-s: 90%;
  --warning-l: 60%; /* Âmbar para atenções e pendências */
  --color-warning: hsl(var(--warning-h), var(--warning-s), var(--warning-l));

  /* Cores de Texto */
  --text-primary: hsl(var(--bg-primary-h), 10%, 94%);   /* Branco suave */
  --text-secondary: hsl(var(--bg-primary-h), 8%, 70%);   /* Cinza médio */
  --text-muted: hsl(var(--bg-primary-h), 6%, 50%);       /* Cinza escuro/desativado */

  /* Bordas e Sombras */
  --border-color: hsl(var(--bg-primary-h), var(--bg-primary-s), 20%);
  --border-focus: hsl(var(--primary-h), var(--primary-s), 40%);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.4);

  /* Bordas Arredondadas */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  
  /* Transições e Animações */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. Elementos de Layout (Grid e Flexbox)

A interface é construída com um layout de grade flexível e responsivo, adaptável desde resoluções de notebooks de recepção até monitores de centros cirúrgicos.

### Layout da Dashboard Principal
```css
.app-container {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 70px 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar content";
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}
```

---

## 4. Componentes Base de UI e Micro-Animações

### Botões Clínicos (Buttons)
Os botões possuem interações suaves e bordas levemente arredondadas, utilizando gradientes sutis e efeitos hover.

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), hsl(var(--primary-h), var(--primary-s), 40%));
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 80, 255, 0.15);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--color-primary-hover), var(--color-primary));
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 80, 255, 0.25);
}

.btn-primary:active {
  transform: translateY(1px);
}
```

### Cards de Informação (Cards / Glassmorphism)
Os painéis utilizam um efeito sutil de desfoque de fundo (glassmorphism) sobre tons escuros para criar profundidade visual (hierarquia no z-index).

```css
.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  transition: border-color var(--transition-normal), transform var(--transition-normal);
}

.card:hover {
  border-color: var(--border-focus);
  transform: translateY(-2px);
}
```

### Inputs Clínicos (Form Controls)
Campos de texto com placeholders discretos, mudança de cor de borda fluida ao focar e rótulos flutuantes.

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-label {
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.form-input {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  padding: 12px 16px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(0, 100, 255, 0.15);
}
```

### Status Badges (Indicadores de Triagem e Estados)
Utilizados para classificar criticidade ou status do fluxo de atendimento sem poluir a tela.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-manchester-red { background-color: rgba(255, 50, 80, 0.15); color: var(--color-danger); border: 1px solid var(--color-danger); }
.badge-manchester-orange { background-color: rgba(255, 120, 0, 0.15); color: var(--color-warning); border: 1px solid var(--color-warning); }
.badge-manchester-yellow { background-color: rgba(255, 200, 0, 0.1); color: #ffd600; border: 1px solid #ffd600; }
.badge-manchester-green { background-color: rgba(0, 200, 100, 0.15); color: var(--color-accent); border: 1px solid var(--color-accent); }
.badge-manchester-blue { background-color: rgba(0, 120, 255, 0.15); color: var(--color-primary); border: 1px solid var(--color-primary); }
```
`
*   As micro-animações do Health Nexus não adicionam atraso operacional, usando `cubic-bezier(0.4, 0, 0.2, 1)` com duração máxima de `300ms` para transições de hover e carregamentos de dados assíncronos.
*   Esquemas de cores de acessibilidade e testes de contraste são integrados diretamente ao workflow de QA da interface.
