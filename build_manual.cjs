const fs = require('fs');
const { marked } = require('marked');

// 1. Read Markdown file (handle encoding)
let mdContent = '';
try {
  mdContent = fs.readFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'utf8');
} catch (e) {
  console.error("Error reading MD file", e);
  process.exit(1);
}

// Fix broken encoding characters if they exist in the MD file
const fixes = {
  '': 'ç', '': 'ã', '': 'á', '': 'é', '': 'í', '': 'ó', '': 'ú',
  '': 'ç', '': 'ã', '': 'õ', '': 'â', '': 'ê', '': 'ô',
  'ǭ': 'á', '?"': '-'
};
for (const [bad, good] of Object.entries(fixes)) {
  mdContent = mdContent.split(bad).join(good);
}

// 2. Append the new updates if not already there
const updateSection = `
---

<h2 id="sec-22">22. 🆕 Atualizações Recentes (Agosto/2026)</h2>

O Health Nexus recebeu uma série de melhorias para otimizar o fluxo de trabalho e garantir a segurança das informações operacionais:

### 22.1. Controle de Acesso e Permissões (Roles)
A aba de **Configurações Globais** agora conta com um controle de acesso rigoroso:
- **MASTER:** Possui acesso integral a todos os painéis, incluindo "Gerenciamento de Usuários", "Simulação de Dados" e demais configurações avançadas (identificadas em vermelho).
- **Desenvolvedor:** Recebe acesso apenas aos agrupamentos técnicos essenciais (destacados em vermelho), permitindo realizar sincronização de banco de dados (Turso) e operações técnicas, mantendo restrições de gerenciamento de equipe.
- **Demais perfis:** Acesso bloqueado à aba de Configurações para garantir a segurança dos dados.

### 22.2. Botões de Limpeza de Filtros ("Limpar Filtros")
Visando aumentar a agilidade operacional, foram incluídos botões dedicados com o ícone <i class="fa-solid fa-filter-circle-xmark"></i> (Limpar Filtros) em **todas as abas principais**:
- **Pacientes, Médicos, Agenda, Farmácia e Relatórios.**
- Um único clique zera instantaneamente todas as buscas de texto e recoloca os *checkboxes* de filtro em seus estados padrão, permitindo buscas fluídas.

### 22.3. Busca de Pacientes Aprimorada (Nome e CPF)
O componente unificado de busca de pacientes (Dropdown dinâmico utilizado em modais de admissão, prescrição e financeiro) foi reescrito. Agora:
- A pesquisa procura não apenas pelo Nome do Paciente, mas também verifica ocorrências do **CPF**.
- O **CPF** é exibido diretamente na lista de opções (formato reduzido), facilitando a identificação de homônimos na hora do atendimento.

### 22.4. Ícones Visuais de Forma de Pagamento 💵💳
A interface da seção de Relatórios Financeiros foi enriquecida com representações gráficas (Emojis):
- Pix (💠)
- Dinheiro (💵)
- Cartão de Crédito (💳)
- Cartão de Débito (💳)
- Boleto (📄)
Isso reduz o tempo de reconhecimento visual do atendente durante o fechamento de caixa.

### 22.5. Validação Estrita de Senhas no Login 🔒
A tela de autenticação foi atualizada para exigir a validação exata da senha cadastrada de cada usuário:
- Tentativas com senhas incorretas são imediatamente rejeitadas (HTTP 401).
- Garantia de que contas individuais (ex: \`ljordao\`, \`bcoltri\`, \`admin\`) só possuem acesso liberado mediante a apresentação da senha cadastrada correspondente.

---
`;

if (!mdContent.includes('22. 🆕 Atualizações Recentes')) {
  mdContent += updateSection;
  fs.writeFileSync('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', mdContent, 'utf8');
}

// 3. Convert Markdown to HTML
const htmlContent = marked.parse(mdContent);

// 4. Build a beautiful Premium HTML wrapper
const htmlTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual do Usuário - Health Nexus</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <style>
    :root {
      --bg-base: #06040f;
      --bg-card: rgba(20, 16, 36, 0.6);
      --border-soft: rgba(99, 102, 241, 0.15);
      --border-glow: rgba(99, 102, 241, 0.4);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #8b5cf6;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }

    body {
      margin: 0; padding: 0;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-base);
      color: var(--text-main);
      line-height: 1.7;
      font-size: 16px;
      display: flex;
    }

    /* Animated background blobs */
    .bg-blob-1, .bg-blob-2 {
      position: fixed; border-radius: 50%; filter: blur(120px); z-index: -1; opacity: 0.15;
    }
    .bg-blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: var(--primary); }
    .bg-blob-2 { bottom: -10%; right: -10%; width: 40vw; height: 40vw; background: var(--accent); }

    /* Layout */
    .sidebar {
      width: 320px;
      height: 100vh;
      position: fixed;
      top: 0; left: 0;
      background: rgba(12, 9, 23, 0.7);
      backdrop-filter: blur(20px);
      border-right: 1px solid var(--border-soft);
      overflow-y: auto;
      padding: 24px;
    }

    .main-content {
      margin-left: 320px;
      flex: 1;
      padding: 60px 80px;
      max-width: 1100px;
    }

    /* Typography & Markdown styling */
    h1, h2, h3, h4 { font-family: 'Outfit', sans-serif; color: #fff; margin-top: 2.5em; margin-bottom: 0.8em; font-weight: 700; }
    h1 { font-size: 2.5rem; margin-top: 0; background: linear-gradient(135deg, #fff, #a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 1.8rem; border-bottom: 1px solid var(--border-soft); padding-bottom: 0.3em; }
    h3 { font-size: 1.3rem; color: #c7d2fe; }
    
    p { margin-bottom: 1.2em; color: var(--text-muted); }
    ul, ol { margin-bottom: 1.2em; padding-left: 1.5em; color: var(--text-muted); }
    li { margin-bottom: 0.4em; }
    
    a { color: var(--primary); text-decoration: none; transition: 0.2s ease; }
    a:hover { color: #818cf8; text-decoration: underline; }

    strong { color: #e2e8f0; font-weight: 600; }

    hr { border: 0; height: 1px; background: var(--border-soft); margin: 3em 0; }

    /* Code blocks */
    pre, code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 6px;
      border: 1px solid var(--border-soft);
      color: #38bdf8;
    }
    code { padding: 0.2em 0.4em; font-size: 0.85em; }
    pre { padding: 16px; overflow-x: auto; margin-bottom: 1.5em; }
    pre code { background: none; border: none; padding: 0; color: #e2e8f0; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 2em; background: var(--bg-card); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-soft); }
    th, td { padding: 14px 20px; text-align: left; border-bottom: 1px solid var(--border-soft); }
    th { background: rgba(99, 102, 241, 0.1); color: #fff; font-weight: 600; font-family: 'Outfit', sans-serif; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: rgba(0, 0, 0, 0.2); }

    /* Blockquotes (Alerts) */
      padding: 40px 60px;
      width: calc(100% - 320px);
      max-width: 1200px;
      box-sizing: border-box;
    }

    .sidebar-logo {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 32px; padding-bottom: 16px;
      border-bottom: 1px solid var(--border-soft);
      font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: #fff;
    }
    .sidebar-logo i { color: var(--primary); font-size: 1.6rem; }
    
    .toc { list-style: none; padding: 0; }
    .toc li { margin-bottom: 8px; }
    .toc a {
      display: block; padding: 10px 14px; border-radius: 8px;
      color: var(--text-muted); font-size: 0.9rem; font-weight: 500;
      transition: all 0.2s ease;
    }
    .toc a:hover { background: rgba(99, 102, 241, 0.15); color: #fff; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-soft);
    }
    th, td {
      padding: 14px 18px;
      text-align: left;
      border-bottom: 1px solid var(--border-soft);
    }
    th {
      background: rgba(99, 102, 241, 0.15);
      color: #fff;
      font-weight: 700;
    }
    
    @media (max-width: 900px) {
      .sidebar { display: none; }
      .main-content { margin-left: 0; padding: 30px 20px; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="bg-blob-1"></div>
  <div class="bg-blob-2"></div>

  <nav class="sidebar">
    <div class="sidebar-logo">
      <i class="fa-solid fa-hospital"></i> Health Nexus
    </div>
    <ul class="toc">
      <li><a href="#sec-1"><i class="fa-solid fa-network-wired"></i> 1. Visão Geral & Fluxograma 12 Abas</a></li>
      <li><a href="#sec-2"><i class="fa-solid fa-users"></i> 2. Central de Atendimentos</a></li>
      <li><a href="#sec-3"><i class="fa-solid fa-notes-medical"></i> 3. Prontuário Eletrônico (PEP)</a></li>
      <li><a href="#sec-4"><i class="fa-solid fa-window-restore"></i> 4. Guia de Modais</a></li>
      <li><a href="#sec-5"><i class="fa-solid fa-user-injured"></i> 5. Gestão de Pacientes</a></li>
      <li><a href="#sec-9"><i class="fa-regular fa-calendar-check"></i> 9. Agenda Médica</a></li>
      <li><a href="#sec-10"><i class="fa-solid fa-pills"></i> 10. Farmácia & OpenFDA</a></li>
      <li><a href="#sec-11"><i class="fa-solid fa-file-invoice-dollar"></i> 11. Faturamento & Financeiro</a></li>
      <li><a href="#sec-13"><i class="fa-solid fa-user-clock"></i> 13. Escalas de Trabalho (Médicos/Enf)</a></li>
      <li><a href="#sec-14"><i class="fa-solid fa-shield-halved"></i> 14. Gestão de Acessos & Auditoria</a></li>
      <li><a href="#sec-15"><i class="fa-solid fa-gear"></i> 15. Configurações Globais</a></li>
      <li><a href="#sec-23"><i class="fa-solid fa-bolt"></i> 23. Atualizações Recentes v2.4.0</a></li>
    </ul>
  </nav>

  <main class="main-content">
    ${htmlContent}
  </main>
  
</body>
</html>`;

fs.writeFileSync('manual_do_usuario.html', htmlTemplate, 'utf8');
console.log('manual_do_usuario.html successfully generated!');
