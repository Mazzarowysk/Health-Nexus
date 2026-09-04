import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: false
});

function cleanMojibake(text) {
  return text
    // Specific emoji mojibake fixes
    .replace(/â\s*±\s*ï\s*¸/g, '⏱️')
    .replace(/âœ…/g, '✅')
    .replace(/ï\s*¸/g, '')
    .replace(/Ãicone/g, 'Ícone')
    .replace(/Ã\s*¡/g, 'á')
    .replace(/Ã\s*©/g, 'é')
    .replace(/Ã\s*­/g, 'í')
    .replace(/Ã\s*³/g, 'ó')
    .replace(/Ã\s*º/g, 'ú')
    .replace(/Ã\s*£/g, 'ã')
    .replace(/Ã\s*µ/g, 'õ')
    .replace(/Ã\s*¢/g, 'â')
    .replace(/Ã\s*ª/g, 'ê')
    .replace(/Ã\s*´/g, 'ô')
    .replace(/Ã\s*§/g, 'ç')
    .replace(/Ã\s* /g, 'Á')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€œ/g, '“')
    .replace(/â€/g, '”')
    .replace(/â€¢/g, '•')
    .replace(/Â°/g, '°')
    .replace(/Âª/g, 'ª')
    .replace(/Âº/g, 'º');
}

// Ensure markdown tables are formatted properly without blank lines
function fixMarkdownTableSyntax(mdText) {
  let cleaned = cleanMojibake(mdText);
  
  // Fix cases where table rows are separated by empty lines or have broken pipe syntax
  const lines = cleaned.split('\n');
  const resultLines = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check if line looks like a table row: starts and ends with |
    const isTableRow = /^\s*\|.*\|\s*$/.test(line);
    const isTableSeparator = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line);

    if (isTableRow) {
      if (!inTable) {
        inTable = true;
      }
      resultLines.push(line.trim());
    } else if (inTable && line.trim() === '') {
      // Look ahead to see if table continues after blank line
      let nextRowIdx = i + 1;
      while (nextRowIdx < lines.length && lines[nextRowIdx].trim() === '') {
        nextRowIdx++;
      }
      if (nextRowIdx < lines.length && /^\s*\|.*\|\s*$/.test(lines[nextRowIdx])) {
        // Skip empty line inside table!
        continue;
      } else {
        inTable = false;
        resultLines.push(line);
      }
    } else {
      inTable = false;
      resultLines.push(line);
    }
  }

  return resultLines.join('\n');
}

async function rebuildAllManuals() {
  console.log('--- REBUILDING ALL MANUALS IN HEALTH NEXUS ---');

  // 1. Fix docs/10-Manuais/02-manual-operacional-do-usuario.md
  const doc2Path = path.resolve('docs/10-Manuais/02-manual-operacional-do-usuario.md');
  if (fs.existsSync(doc2Path)) {
    const rawDoc2 = fs.readFileSync(doc2Path, 'utf8');
    const fixedDoc2 = fixMarkdownTableSyntax(rawDoc2);
    fs.writeFileSync(doc2Path, fixedDoc2, 'utf8');
    console.log('✓ docs/10-Manuais/02-manual-operacional-do-usuario.md cleaned and saved.');

    // Also convert doc2 to src/manual.html
    const renderedDoc2Html = await marked.parse(fixedDoc2);
    const fullSrcManualHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual Operacional do Usuário — Health Nexus</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.6; color: #1e293b; max-width: 1200px; margin: 0 auto; padding: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th { background: #1e1b4b; color: #fff; text-align: left; padding: 10px 14px; border: 1px solid #cbd5e1; }
    td { padding: 10px 14px; border: 1px solid #cbd5e1; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    code { background: #f1f5f9; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    pre { background: #0f172a; color: #fff; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  ${renderedDoc2Html}
</body>
</html>`;
    fs.writeFileSync(path.resolve('src/manual.html'), fullSrcManualHtml, 'utf8');
    console.log('✓ src/manual.html generated cleanly from markdown.');
  }

  // 2. Fix MANUAL_DO_USUARIO_HEALTH_NEXUS.md
  const mainMdPath = path.resolve('MANUAL_DO_USUARIO_HEALTH_NEXUS.md');
  const rawMainMd = fs.readFileSync(mainMdPath, 'utf8');
  const fixedMainMd = fixMarkdownTableSyntax(rawMainMd);
  fs.writeFileSync(mainMdPath, fixedMainMd, 'utf8');
  console.log('✓ MANUAL_DO_USUARIO_HEALTH_NEXUS.md cleaned and saved.');

  // 3. Rebuild PDF and HTML using build_manual_pdf.mjs logic
  let renderedBody = await marked.parse(fixedMainMd);
  renderedBody = renderedBody.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
    const decoded = p1
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    return `<div class="mermaid">\n${decoded}\n</div>`;
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual do Usuário — Health Nexus v2.8.0</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --primary: #4f46e5;
      --bg-card: #1e293b;
      --text: #f8fafc;
      --border: #334155;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      line-height: 1.7;
      font-size: 15px;
    }
    .cover-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%);
      padding: 65px 40px;
      border-bottom: 4px solid #6366f1;
      text-align: center;
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
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.8rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 16px;
    }
    .cover-subtitle {
      font-size: 1.1rem;
      color: #cbd5e1;
      max-width: 760px;
      margin: 0 auto 30px;
    }
    .cover-meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .layout-container {
      display: flex;
      max-width: 1440px;
      margin: 0 auto;
      padding: 40px 20px;
      gap: 40px;
    }
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
      color: #6366f1;
      margin-bottom: 14px;
    }
    .sidebar nav ul { list-style: none; padding: 0; margin: 0; }
    .sidebar nav li { margin-bottom: 4px; }
    .sidebar nav a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.85rem;
      display: block;
      padding: 8px 12px;
      border-radius: 8px;
    }
    .sidebar nav a.level-3 { padding-left: 24px; font-size: 0.78rem; color: #64748b; }
    .sidebar nav a:hover { background: rgba(99,102,241,0.15); color: #818cf8; }
    .content-area {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 50px 60px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      min-width: 0;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      border-bottom: 2px solid #334155;
      padding-bottom: 12px;
      margin-top: 50px;
    }
    h1:first-child { margin-top: 0; }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.45rem;
      font-weight: 700;
      color: #818cf8;
      margin-top: 40px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 6px;
    }
    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: #38bdf8;
      margin-top: 28px;
    }
    p, li { color: #cbd5e1; }
    blockquote {
      background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(56,189,248,0.05));
      border: 1px solid rgba(99,102,241,0.3);
      border-left: 4px solid #6366f1;
      border-radius: 12px;
      padding: 18px 22px;
      margin: 24px 0;
      color: #e2e8f0;
    }
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
    }
    .mermaid {
      background: #0f172a;
      padding: 20px;
      border-radius: 16px;
      border: 1px solid #334155;
      margin: 24px 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <div class="brand-badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v2.8.0
    </div>
    <h1 class="cover-title">Manual do Usuário & Guia Operacional Definitivo</h1>
    <p class="cover-subtitle">Documentação técnica publicação-grade de todas as telas, botões, protocolos de emergência, IA preditiva, QR Code CFM, PACS DICOM e faturamento TISS 4.01.</p>
    <div class="cover-meta">
      <span><i class="fa-solid fa-book-open"></i> Edição Oficial 2026</span>
      <span><i class="fa-solid fa-shield-halved"></i> Triagem Manchester & CDSS</span>
      <span><i class="fa-solid fa-file-invoice-dollar"></i> TISS v4.01.00 ANS</span>
    </div>
  </div>

  <div class="layout-container">
    <aside class="sidebar">
      <div class="sidebar-title"><i class="fa-solid fa-list-ul"></i> Sumário Rápido</div>
      <div style="margin-bottom: 14px; position: relative;">
        <input type="text" id="sidebar-search-input" placeholder="🔍 Pesquisar no manual..." style="width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 9px 12px 9px 34px; color: #f8fafc; font-size: 0.82rem; outline: none;">
        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.78rem;"></i>
      </div>
      <nav><ul id="sidebar-nav"></ul></nav>
    </aside>

    <main class="content-area" id="doc-main-content">
      ${renderedBody}
    </main>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
      const mainContent = document.getElementById('doc-main-content');
      const sidebarNav = document.getElementById('sidebar-nav');
      if (!mainContent || !sidebarNav) return;
      const headings = mainContent.querySelectorAll('h2, h3');
      let navHtml = '';
      headings.forEach((heading, idx) => {
        const text = heading.textContent.trim();
        const id = 'sec-' + (idx + 1) + '-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        heading.id = id;
        const levelClass = heading.tagName === 'H2' ? 'level-2' : 'level-3';
        navHtml += '<li><a href="#' + id + '" data-target="' + id + '" class="' + levelClass + '">' + text + '</a></li>';
      });
      sidebarNav.innerHTML = navHtml;

      const searchInput = document.getElementById('sidebar-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          sidebarNav.querySelectorAll('li').forEach(li => {
            li.style.display = (!q || li.textContent.toLowerCase().includes(q)) ? 'block' : 'none';
          });
        });
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.resolve('manual_do_usuario.html'), fullHtml, 'utf8');
  fs.writeFileSync(path.resolve('public/manual_do_usuario.html'), fullHtml, 'utf8');
  console.log('✓ manual_do_usuario.html and public/manual_do_usuario.html generated cleanly.');

  // PDF Generation with Puppeteer
  const pdfHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário — Health Nexus v2.8.0</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .pdf-cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%);
      color: #ffffff;
      padding: 60px 40px;
      border-radius: 16px;
      page-break-after: always;
      min-height: 800px;
    }
    .pdf-cover .badge {
      display: inline-block;
      background: rgba(99,102,241,0.25);
      border: 1px solid rgba(165,180,252,0.4);
      color: #c4b5fd;
      padding: 8px 22px;
      border-radius: 30px;
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 30px;
    }
    .pdf-cover h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 28pt;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 16px;
      line-height: 1.2;
    }
    .pdf-cover p { font-size: 12pt; color: #cbd5e1; max-width: 600px; margin: 0 0 40px; }
    .pdf-cover .meta-box {
      display: flex;
      gap: 20px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 9.5pt;
      color: #a5b4fc;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 18pt;
      font-weight: 800;
      color: #1e1b4b;
      border-bottom: 2.5px solid #4338ca;
      padding-bottom: 6px;
      margin-top: 32px;
      page-break-after: avoid;
    }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 14pt;
      font-weight: 700;
      color: #3730a3;
      margin-top: 26px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      page-break-after: avoid;
    }
    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 12pt;
      font-weight: 600;
      color: #0284c7;
      margin-top: 18px;
      page-break-after: avoid;
    }
    p, li { color: #334155; font-size: 10pt; margin-bottom: 10px; }
    ul, ol { margin-top: 4px; margin-bottom: 14px; padding-left: 20px; }
    blockquote {
      background: #f8fafc;
      border-left: 4px solid #6366f1;
      border: 1px solid #e2e8f0;
      padding: 12px 18px;
      margin: 18px 0;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      background: #1e1b4b;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      color: #334155;
      vertical-align: top;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      color: #4338ca;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
      border: 1px solid #e2e8f0;
    }
    pre code {
      display: block;
      padding: 14px;
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      font-size: 8pt;
      white-space: pre-wrap;
      page-break-inside: avoid;
    }
    .mermaid {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 16px;
      border-radius: 10px;
      margin: 18px 0;
      text-align: center;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="pdf-cover">
    <div class="badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v2.8.0
    </div>
    <h1>Manual do Usuário & Guia Operacional Definitivo</h1>
    <p>Documentação técnica e manual oficial de operações da plataforma hospitalar Health Nexus.</p>
    <div class="meta-box">
      <span><b>Edição:</b> Oficial 2026</span>
      <span><b>Padrão:</b> Triagem Manchester & CDSS</span>
      <span><b>Faturamento:</b> TISS 4.01 ANS</span>
    </div>
  </div>

  ${renderedBody}

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
      }
    });
  </script>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    if (window.mermaid) await window.mermaid.run();
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const pdfPath = path.resolve('Manual_do_Usuario_Health_Nexus.pdf');
  const publicPdfPath = path.resolve('public/Manual_do_Usuario_Health_Nexus.pdf');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        <span>🏥 Health Nexus — Sistema de Gestão Hospitalar (v2.8.0)</span>
        <span>Manual do Usuário Oficial</span>
      </div>`,
    footerTemplate: `
      <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <span>Confidencial · Uso Hospitalar & Clínico</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`
  });

  await browser.close();
  fs.copyFileSync(pdfPath, publicPdfPath);
  console.log('✓ Manual_do_Usuario_Health_Nexus.pdf and public PDF compiled cleanly.');
  console.log('--- ALL MANUALS REBUILT SUCCESSFULLY ---');
}

rebuildAllManuals();
