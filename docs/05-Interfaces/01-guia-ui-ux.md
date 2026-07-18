# Health Nexus — Guia de UI/UX e Interfaces

Este documento define os padrões de experiência do usuário (UX) e as especificações de interface visual (UI) para o desenvolvimento do frontend do **Health Nexus**.

---

## 1. Padrões de Layout e Responsividade

Para atender aos diferentes dispositivos da instituição (monitores de mesa na recepção, laptops na enfermagem e tablets móveis nas visitas clínicas), o frontend utiliza um sistema de grid fluido nativo (CSS Grid) e layouts baseados em Flexbox.

### Breakpoints Responsivos
*   **Desktop / Monitores Grandes (>= 1200px)**: Exibição completa de duas colunas (Ex: Menu lateral fixo com 260px de largura e área de trabalho de conteúdo com grid em 3 colunas para os widgets).
*   **Laptops / Telas Médias (992px a 1199px)**: O menu lateral é recolhido para uma barra de ícones compacta (70px) sob hover, maximizando o espaço horizontal para tabelas clínicas.
*   **Tablets (768px a 991px)**: O menu lateral torna-se uma gaveta deslizante (*drawer*) acionada por um botão de hambúrguer no header. Os cards de estatísticas passam para grid de 2 colunas.
*   **Smartphones (< 768px)**: Layout de coluna única. Tabelas de dados longas habilitam rolagem horizontal interna (`overflow-x: auto`) com cabeçalho fixo para evitar a quebra do layout visual.

---

## 2. Comportamento de Componentes Críticos

### Modais e Overlays
As janelas modais (utilizadas para abertura de receitas rápidas, confirmação de triagem e buscas de pacientes) devem seguir as diretrizes:
1.  **Bloqueio de Foco (Focus Trap)**: Ao abrir o modal, o foco do teclado (`Tab`) deve ser mantido estritamente dentro dos inputs e botões do próprio modal, impedindo o usuário de navegar por elementos do fundo invisível.
2.  **Fechamento Acessível**: Um modal deve fechar ao clicar no botão de fechar (ícone "X" no canto superior direito), ao clicar na área escura de fundo (backdrop) ou ao pressionar a tecla `ESC` no teclado.
3.  **Animação de Entrada**: Abertura suave em `200ms` usando transição de opacidade e escala (`transform: scale(0.95)` para `scale(1)`).

### Notificações Flutuantes (Toast Notifications)
Utilizadas para feedbacks imediatos de sucesso, erro ou alertas de tempo real:
*   **Localização**: Exibidas sempre no canto superior direito da tela, sem bloquear a navegação central.
*   **Codificação por Cor**:
    *   *Sucesso (Esmeralda)*: Ex: "Prescrição assinada com sucesso!". Desaparece automaticamente após 4 segundos.
    *   *Atenção (Âmbar)*: Ex: "Medicamento com validade próxima". Desaparece após 6 segundos.
    *   *Erro (Coral)*: Ex: "Falha na comunicação com o banco de dados". Exige clique do usuário para fechar (não possui auto-dismiss).
*   **Micro-Animações**: Transição de entrada da direita para a esquerda (`translate-x`) e saída suave.

---

## 3. Elementos Gráficos e Gráficos de BI

Para a representação dos dados da Dashboard e Relatórios, as bibliotecas utilizadas devem ser leves e estilizadas no padrão de cores do design system:
*   **Gráficos de Linha/Área (Fluxo de pacientes, evolução de faturamento)**: Utilização de curvas com suavização (*monotone spline*), preenchimento com gradiente de opacidade decrescente sob a linha.
*   **Gráficos de Pizza/Rosca (Distribuição de atendimentos por convênio)**: Uso de anel fino (donut) em vez de pizza cheia, com legenda centralizada exibindo o valor total em fonte de destaque.
*   **Estado de Carregamento (Skeleton Loaders)**: Durante a busca de dados assíncrona, as tabelas e cards não devem exibir um spinner simples. Em vez disso, exibe-se uma réplica esmaecida do layout final com animação de pulsação de opacidade cinza suave (gradiente brilhante simulando carregamento ativo).

---

## 4. Diretrizes de Micro-Interações

1.  **Feedback Visual de Botão**: Ao passar o mouse sobre botões principais, o fundo deve receber um acréscimo de 10% de luminosidade no HSL, a borda deve acentuar-se levemente e o cursor deve mudar para `pointer`. Ao clicar, o botão reduz em `scale(0.98)` para simular clique físico.
2.  **Inputs Interativos**: Ao focar em um campo de texto, o label correspondente deve flutuar para o topo em fonte reduzida e a borda do input deve iluminar-se em azul (`--border-focus`) em uma transição linear de `150ms`.
3.  **Efeito de Hover em Cards**: Cards da dashboard e censo hospitalar devem se elevar levemente no eixo Y (`transform: translateY(-2px)`) e a sombra projetada deve expandir-se suavemente para criar uma ilusão de flutuação tridimensional.
