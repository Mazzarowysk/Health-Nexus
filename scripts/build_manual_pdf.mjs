import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

async function generateManual() {
  const mdPath = path.resolve('MANUAL_DO_USUARIO_HEALTH_NEXUS.md');
  const pdfPath = path.resolve('Manual_do_Usuario_Health_Nexus.pdf');
  const htmlPath = path.resolve('manual_do_usuario.html');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  // Standard clean markdown parsing
  const renderedBody = await marked.parse(mdContent);

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual do Usuário — Health Nexus</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #3730a3;
      --secondary: #0ea5e9;
      --bg: #0f172a;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --accent-danger: #ef4444;
      --accent-warning: #f59e0b;
      --accent-success: #10b981;
    }

    * { box-sizing: border-box; }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      line-height: 1.7;
      font-size: 15px;
    }

    /* CAPA EXECUTIVA */
    .cover-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%);
      padding: 60px 40px;
      border-bottom: 4px solid #6366f1;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%);
      pointer-events: none;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(99,102,241,0.2);
      border: 1px solid rgba(99,102,241,0.4);
      padding: 8px 20px;
      border-radius: 999px;
      color: #a5b4fc;
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.8rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 16px;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 1.15rem;
      color: #cbd5e1;
      max-width: 700px;
      margin: 0 auto 30px;
      font-weight: 400;
    }

    .cover-meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .cover-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* CONTAINER PRINCIPAL COM SIDEBAR */
    .layout-container {
      display: flex;
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
      gap: 40px;
    }

    /* SIDEBAR NAVEGAÇÃO */
    .sidebar {
      width: 320px;
      flex-shrink: 0;
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px 16px;
    }

    .sidebar-title {
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6366f1;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sidebar nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar nav li {
      margin-bottom: 4px;
    }

    .sidebar nav a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      display: block;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.2s;
      line-height: 1.4;
    }

    .sidebar nav a.level-3 {
      padding-left: 24px;
      font-size: 0.78rem;
      color: #64748b;
    }

    .sidebar nav a:hover {
      background: rgba(99,102,241,0.15);
      color: #818cf8;
      transform: translateX(4px);
    }

    .sidebar nav a.active {
      background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(14,165,233,0.2));
      color: #ffffff;
      font-weight: 700;
      border-left: 3px solid #6366f1;
    }

    /* CONTEÚDO DA DOCUMENTAÇÃO */
    .content-area {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 50px 60px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      min-width: 0;
    }

    /* TYPOGRAPHY MD */
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      border-bottom: 2px solid #334155;
      padding-bottom: 12px;
      margin-top: 50px;
      scroll-margin-top: 30px;
    }

    h1:first-child { margin-top: 0; }

    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.45rem;
      font-weight: 700;
      color: #818cf8;
      margin-top: 40px;
      margin-bottom: 16px;
      scroll-margin-top: 30px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 6px;
    }

    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: #38bdf8;
      margin-top: 28px;
      scroll-margin-top: 30px;
    }

    p { margin-bottom: 16px; color: #cbd5e1; }

    ul, ol { padding-left: 24px; margin-bottom: 20px; }
    li { margin-bottom: 8px; color: #cbd5e1; }

    /* CALLOUT BOXES */
    blockquote {
      background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(56,189,248,0.05));
      border: 1px solid rgba(99,102,241,0.3);
      border-left: 4px solid #6366f1;
      border-radius: 12px;
      padding: 18px 22px;
      margin: 24px 0;
      color: #e2e8f0;
    }

    /* TABELAS ELEGANTES */
    table {
      width: 100%;
      border-collapse: collapse;
      background: #0f172a;
      text-align: left;
      margin: 24px 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #334155;
    }

    th {
      background: #1e1b4b;
      color: #a5b4fc;
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 14px 18px;
      border-bottom: 1px solid #334155;
    }

    td {
      padding: 14px 18px;
      border-bottom: 1px solid #1e293b;
      color: #cbd5e1;
      font-size: 0.92rem;
    }

    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: rgba(255,255,255,0.02); }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.88em;
      border: 1px solid rgba(99,102,241,0.2);
    }

    pre code {
      display: block;
      padding: 16px;
      background: #0f172a;
      overflow-x: auto;
      border-radius: 12px;
      line-height: 1.5;
    }

    .mermaid {
      background: #0f172a;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid #334155;
      margin: 24px 0;
      text-align: center;
    }

    @media (max-width: 900px) {
      .layout-container { flex-direction: column; }
      .sidebar { width: 100%; height: auto; position: static; max-height: 350px; }
      .content-area { padding: 30px 20px; }
    }
  </style>
</head>
<body>

  <div class="cover-page">
    <div class="brand-badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v1.2.1
    </div>
    <h1 class="cover-title">Manual do Usuário & Guia Operacional</h1>
    <p class="cover-subtitle">Documentação técnica e passo a passo detalhado de todas as telas, botões, protocolos médicos e fluxos da plataforma hospitalar.</p>
    <div class="cover-meta">
      <span><i class="fa-solid fa-book-open"></i> Edição Oficial 2026</span>
      <span><i class="fa-solid fa-shield-halved"></i> Compatível com Protocolo Manchester</span>
      <span><i class="fa-solid fa-file-pdf"></i> Exportação Prontuário PDF</span>
    </div>
  </div>

  <div class="layout-container">
    <aside class="sidebar">
      <div class="sidebar-title"><i class="fa-solid fa-list-ul"></i> Sumário Rápido</div>
      <div style="margin-bottom: 14px; position: relative;">
        <input type="text" id="sidebar-search-input" placeholder="🔍 Pesquisar no manual..." style="width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 9px 12px 9px 34px; color: #f8fafc; font-size: 0.82rem; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#334155'">
        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.78rem;"></i>
      </div>
      <nav>
        <ul id="sidebar-nav">
          <!-- Populated dynamically via JavaScript for 100% accurate heading targets -->
        </ul>
      </nav>
    </aside>

    <main class="content-area" id="doc-main-content">
      ${renderedBody}
    </main>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      mermaid.initialize({ startOnLoad: true, theme: 'dark' });

      const mainContent = document.getElementById('doc-main-content');
      const sidebarNav = document.getElementById('sidebar-nav');
      if (!mainContent || !sidebarNav) return;

      const headings = mainContent.querySelectorAll('h2, h3');
      let navHtml = '';
      const headingElements = [];

      headings.forEach((heading, idx) => {
        const text = heading.textContent.trim();
        const id = 'sec-' + (idx + 1) + '-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        heading.id = id;

        const isH2 = heading.tagName === 'H2';
        const levelClass = isH2 ? 'level-2' : 'level-3';

        navHtml += '<li><a href="#' + id + '" data-target="' + id + '" class="' + levelClass + '">' + text + '</a></li>';
        headingElements.push({ id, el: heading });
      });

      sidebarNav.innerHTML = navHtml;

      // Live search input filtering
      const searchInput = document.getElementById('sidebar-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          sidebarNav.querySelectorAll('li').forEach(li => {
            const txt = li.textContent.toLowerCase();
            if (!q || txt.includes(q)) {
              li.style.display = 'block';
            } else {
              li.style.display = 'none';
            }
          });
        });
      }

      // Smooth click handling
      sidebarNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('data-target');
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, '', '#' + targetId);
          }
        });
      });

      // Highlight active section on scroll (ScrollSpy)
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            sidebarNav.querySelectorAll('a').forEach(a => {
              if (a.getAttribute('data-target') === id) {
                a.classList.add('active');
                a.scrollIntoView({ block: 'nearest' });
              } else {
                a.classList.remove('active');
              }
            });
          }
        });
      }, { rootMargin: '-10% 0px -70% 0px' });

      headingElements.forEach(item => {
        observer.observe(item.el);
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, fullHtml, 'utf8');
  console.log(`HTML gerado com sucesso em: ${htmlPath}`);

  // PDF RENDERING VIA PUPPETEER WITH STUNNING LIGHT/PRINT STYLES
  const pdfHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário — Health Nexus</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .pdf-header {
      background: linear-gradient(135deg, #1e1b4b, #311b92);
      color: #fff;
      padding: 40px 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .pdf-header h1 {
      font-family: 'Outfit', sans-serif;
      margin: 0 0 8px;
      font-size: 2.2rem;
      color: #fff;
    }
    .pdf-header p {
      color: #c4b5fd;
      margin: 0;
      font-size: 1rem;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
      color: #1e1b4b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-top: 30px;
      page-break-after: avoid;
    }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #4338ca;
      margin-top: 24px;
      page-break-after: avoid;
    }
    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: #0284c7;
      margin-top: 18px;
      page-break-after: avoid;
    }
    p, li { color: #334155; }
    blockquote {
      background: #f1f5f9;
      border-left: 4px solid #6366f1;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th {
      background: #1e1b4b;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      font-size: 0.85rem;
      color: #334155;
    }
    tr:nth-child(even) { background: #f8fafc; }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: #e2e8f0;
      color: #4338ca;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88em;
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1>🏥 Health Nexus — Manual do Usuário</h1>
    <p>Manual Operacional Oficial & Guia de Uso do Sistema</p>
  </div>
  ${renderedBody}
</body>
</html>`;

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true
    });
    await browser.close();
    console.log(`PDF do Manual compilado com sucesso em: ${pdfPath}`);
  } catch (err) {
    console.error('Erro ao compilar PDF:', err);
  }
}

generateManual();
