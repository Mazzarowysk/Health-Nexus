import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import { buildCompleteManualMarkdown } from './generate_complete_manual.mjs';
import { buildFluxoOperacionalManual } from './generate_fluxo_operacional.mjs';

marked.setOptions({
  gfm: true,
  breaks: false
});

function cleanMojibake(text) {
  return text
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

function embedScreenshotsAsBase64(html) {
  return html.replace(/(?:<p>\s*)?<img\s+([^>]*?)src="([^"]+)"([^>]*?)>(?:\s*<\/p>)?/gi, (match, before, src, after) => {
    const altMatch = (before + after).match(/alt="([^"]*)"/i);
    const alt = altMatch ? altMatch[1] : '';

    let localPath = null;
    if (src.includes('screenshots/')) {
      const filename = path.basename(src);
      const candidates = [
        path.resolve('public/docs/screenshots', filename),
        path.resolve('docs/screenshots', filename)
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          localPath = cand;
          break;
        }
      }
    }

    if (localPath) {
      try {
        const fileBuffer = fs.readFileSync(localPath);
        const b64 = fileBuffer.toString('base64');
        const mime = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const dataUri = `data:${mime};base64,${b64}`;
        return `
        <figure class="screenshot-figure">
          <img src="${dataUri}" alt="${alt}" class="manual-screenshot" />
          ${alt ? `<figcaption><i class="fa-solid fa-camera"></i> ${alt}</figcaption>` : ''}
        </figure>`;
      } catch (err) {
        console.warn('Failed to embed screenshot:', localPath, err.message);
      }
    }
    return match;
  });
}

function formatContentForPdf(html) {
  let res = html;

  // 1. Convert status color circles to crisp CSS badges
  res = res.replace(/🟢\s*`?([^`<]+)`?/g, '<span class="status-badge status-green">$1</span>');
  res = res.replace(/🔴\s*`?([^`<]+)`?/g, '<span class="status-badge status-red">$1</span>');
  res = res.replace(/🟠\s*`?([^`<]+)`?/g, '<span class="status-badge status-orange">$1</span>');
  res = res.replace(/🟡\s*`?([^`<]+)`?/g, '<span class="status-badge status-yellow">$1</span>');
  res = res.replace(/🔵\s*`?([^`<]+)`?/g, '<span class="status-badge status-blue">$1</span>');
  res = res.replace(/⚪\s*`?([^`<]+)`?/g, '<span class="status-badge status-gray">$1</span>');

  // 2. Convert standalone status circles
  res = res.replace(/🟢/g, '<span class="status-dot dot-green"></span>');
  res = res.replace(/🔴/g, '<span class="status-dot dot-red"></span>');
  res = res.replace(/🟠/g, '<span class="status-dot dot-orange"></span>');
  res = res.replace(/🟡/g, '<span class="status-dot dot-yellow"></span>');
  res = res.replace(/🔵/g, '<span class="status-dot dot-blue"></span>');
  res = res.replace(/⚪/g, '<span class="status-dot dot-gray"></span>');

  // 3. Convert action emojis in table cells or text
  const iconReplacements = {
    '📢': '[TV]',
    '🩺': '[PEP]',
    '🔄': '[Retorno]',
    '💉': '[Medicação]',
    '🏃': '[Evasão]',
    '📜': '[Prescrição]',
    '⏱️': '[Tempo]',
    '🛏️': '[Leito]',
    '✅': '[OK]',
    '🚨': '[Urgência]',
    '✨': '[Limpeza]',
    '🛡️': '[Segurança]',
    '🚪': '[Alta]',
    '📋': '[Lista]',
    '🔍': '[Buscar]',
    '✏️': '[Editar]',
    '🗑️': '[Lixeira]',
    '♻️': '[Restaurar]',
    '📦': '[XML TISS]',
    '📄': '[Guia]',
    '🧾': '[Recibo]',
    '⚠️': '[Atenção]',
    '☀️': '[Contraste]',
    '📏': '[Régua]',
    '🔔': '[Aviso]',
    '⌨️': '[Atalho]',
    '❓': '[FAQ]',
    '🚀': '',
    '👑': '[Master]',
    '💻': '[Dev]',
    '🛠️': '[Admin]',
    '👨‍⚕️': '[Médico]',
    '💊': '[Farmácia]',
    '💰': '[Financeiro]',
    '📊': '[Relatório]',
    '📈': '[Analytics]',
    '📺': '[TV]',
    '⏳': '[Espera]',
    '🗺️': '',
    '📌': '',
    '🔒': '',
    '📅': '',
    '🎛️': '',
    '☁️': '',
    '📝': '',
    '🩻': '',
    '🏥': ''
  };

  for (const [emoji, text] of Object.entries(iconReplacements)) {
    res = res.replaceAll(emoji, text);
  }

  // 4. Strip any other remaining Unicode emoji sequences
  const remainingEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;
  res = res.replace(remainingEmojis, '');

  return res;
}

export async function rebuildAllManuals() {
  console.log('--- REBUILDING ALL MANUALS IN HEALTH NEXUS (v2.8.0) ---');

  // 1. Generate master markdown content
  const fullMd = buildCompleteManualMarkdown();

  // Save to all relevant markdown paths
  const mdPaths = [
    path.resolve('MANUAL_DO_USUARIO_HEALTH_NEXUS.md'),
    path.resolve('public/MANUAL_DO_USUARIO_HEALTH_NEXUS.md'),
    path.resolve('public/manual.md'),
    path.resolve('docs/10-Manuais/02-manual-operacional-do-usuario.md')
  ];

  for (const p of mdPaths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, fullMd, 'utf8');
    console.log(`✓ Saved ${path.relative('.', p)}`);
  }

  // 2. Generate src/manual.html
  const rawDocHtml = await marked.parse(fullMd);
  const renderedDocHtml = embedScreenshotsAsBase64(rawDocHtml);
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
    .screenshot-figure { margin: 24px 0; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; text-align: center; }
    .manual-screenshot { max-width: 100%; max-height: 460px; height: auto; border-radius: 8px; border: 1px solid #cbd5e1; }
    .screenshot-figure figcaption { margin-top: 8px; font-size: 13px; color: #64748b; font-style: italic; }
  </style>
</head>
<body>
  ${renderedDocHtml}
</body>
</html>`;
  fs.writeFileSync(path.resolve('src/manual.html'), fullSrcManualHtml, 'utf8');
  console.log('✓ src/manual.html generated cleanly from markdown.');

  // 3. Render body with Mermaid replacement
  let renderedBody = await marked.parse(fullMd);
  renderedBody = renderedBody.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
    const decoded = p1
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    return `<div class="mermaid">\n${decoded}\n</div>`;
  });
  renderedBody = embedScreenshotsAsBase64(renderedBody);

  // 4. Generate Interactive Web Manual HTML
  const webHtml = `<!DOCTYPE html>
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
      max-width: 820px;
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
      padding: 12px 16px;
      border-bottom: 1px solid #1e293b;
      color: #cbd5e1;
      font-size: 0.90rem;
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
    .screenshot-figure {
      margin: 32px 0;
      padding: 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .manual-screenshot {
      max-width: 100%;
      max-height: 480px;
      width: auto;
      height: auto;
      border-radius: 10px;
      border: 1px solid #1e293b;
      display: block;
      margin: 0 auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .screenshot-figure figcaption {
      margin-top: 14px;
      font-size: 0.88rem;
      color: #94a3b8;
      font-style: italic;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <div class="brand-badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v2.8.0
    </div>
    <h1 class="cover-title">Manual do Usuário & Guia Operacional Definitivo</h1>
    <p class="cover-subtitle">Documentação técnica publicação-grade de todas as telas, modais, botões, protocolos de emergência, IA preditiva, QR Code CFM, PACS DICOM e faturamento TISS 4.01.</p>
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

  fs.writeFileSync(path.resolve('manual_do_usuario.html'), webHtml, 'utf8');
  fs.writeFileSync(path.resolve('public/manual_do_usuario.html'), webHtml, 'utf8');
  console.log('✓ manual_do_usuario.html and public/manual_do_usuario.html generated cleanly.');

  // 5. PDF Generation with Puppeteer
  const pdfBody = formatContentForPdf(renderedBody);
  const pdfHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário — Health Nexus v2.8.0</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: A4;
      margin: 16mm 12mm 16mm 12mm;
    }
    body {
      font-family: 'Segoe UI', Arial, -apple-system, sans-serif;
      color: #0f172a;
      line-height: 1.45;
      font-size: 8.8pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%) !important;
      color: #ffffff;
      padding: 50px 30px;
      border-radius: 12px;
      page-break-after: always;
      break-after: page;
      min-height: 750px;
    }
    .pdf-cover .badge {
      display: inline-block;
      background: rgba(99,102,241,0.25) !important;
      border: 1px solid rgba(165,180,252,0.4) !important;
      color: #c4b5fd;
      padding: 8px 22px;
      border-radius: 30px;
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .pdf-cover h1 {
      font-size: 26pt;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 14px;
      line-height: 1.2;
    }
    .pdf-cover p { font-size: 11pt; color: #cbd5e1; max-width: 620px; margin: 0 0 35px; }
    .pdf-cover .meta-box {
      display: flex;
      gap: 20px;
      background: rgba(255,255,255,0.08) !important;
      border: 1px solid rgba(255,255,255,0.2) !important;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 9pt;
      color: #c7d2fe;
    }
    h1 {
      font-size: 15pt;
      font-weight: 800;
      color: #1e1b4b;
      border-bottom: 2px solid #4338ca;
      padding-bottom: 4px;
      margin-top: 22px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h2 {
      font-size: 12.5pt;
      font-weight: 700;
      color: #3730a3;
      margin-top: 22px;
      margin-bottom: 8px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h1 + p, h2 + p, h3 + p, h4 + p {
      page-break-after: avoid;
      break-after: avoid;
    }
    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0284c7;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h4 {
      font-size: 9pt;
      font-weight: 700;
      color: #475569;
      margin-top: 10px;
      margin-bottom: 4px;
      page-break-after: avoid;
      break-after: avoid;
    }
    p, li {
      color: #1e293b;
      font-size: 8.8pt;
      margin-bottom: 6px;
    }
    ul, ol {
      margin-top: 4px;
      margin-bottom: 10px;
      padding-left: 18px;
    }
    blockquote {
      background: #f8fafc !important;
      border-left: 4px solid #6366f1 !important;
      border: 1px solid #e2e8f0 !important;
      padding: 8px 12px;
      margin: 12px 0;
      border-radius: 6px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .screenshot-figure {
      margin: 12px 0 16px 0;
      padding: 8px;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .manual-screenshot {
      max-width: 95%;
      max-height: 250px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      display: block;
      margin: 0 auto;
    }
    .screenshot-figure figcaption {
      margin-top: 6px;
      font-size: 7.8pt;
      color: #475569;
      font-style: italic;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px 0;
      font-size: 7.8pt;
      page-break-inside: auto;
      break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #1e1b4b !important;
      color: #ffffff !important;
      font-size: 7.8pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      border: 1px solid #475569 !important;
      text-align: left;
    }
    td {
      border: 1px solid #cbd5e1 !important;
      padding: 5px 7px;
      color: #0f172a !important;
      vertical-align: middle;
      word-break: break-word;
    }
    tr:nth-child(even) td {
      background: #f1f5f9 !important;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      background: #ede9fe !important;
      color: #4338ca !important;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 7.5pt;
      border: 1px solid #c7d2fe !important;
    }
    pre code {
      display: block;
      padding: 10px;
      background: #0f172a !important;
      color: #f8fafc !important;
      border-radius: 8px;
      font-size: 7.4pt;
      white-space: pre-wrap;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7.2pt;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .status-green {
      background: #dcfce7 !important;
      color: #15803d !important;
      border: 1px solid #86efac !important;
    }
    .status-red {
      background: #fee2e2 !important;
      color: #b91c1c !important;
      border: 1px solid #fca5a5 !important;
    }
    .status-orange {
      background: #ffedd5 !important;
      color: #c2410c !important;
      border: 1px solid #fdba74 !important;
    }
    .status-yellow {
      background: #fef9c3 !important;
      color: #a16207 !important;
      border: 1px solid #fde047 !important;
    }
    .status-blue {
      background: #e0f2fe !important;
      color: #0369a1 !important;
      border: 1px solid #7dd3fc !important;
    }
    .status-gray {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border: 1px solid #cbd5e1 !important;
    }
    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
    .dot-green { background: #22c55e !important; }
    .dot-red { background: #ef4444 !important; }
    .dot-orange { background: #ea580c !important; }
    .dot-yellow { background: #eab308 !important; }
    .dot-blue { background: #3b82f6 !important; }
    .dot-gray { background: #94a3b8 !important; }
    .mermaid {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      padding: 10px;
      border-radius: 8px;
      margin: 12px 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
      max-width: 100%;
      overflow: hidden;
    }
    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
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

  ${pdfBody}

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.mermaid) {
        mermaid.initialize({
          startOnLoad: true,
          theme: 'neutral',
          themeVariables: {
            fontSize: '13px',
            fontFamily: 'Segoe UI, sans-serif'
          },
          securityLevel: 'loose'
        });
      }
    });
  </script>
</body>
</html>`;

  console.log('Launching Puppeteer to compile PDF...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  await page.setContent(pdfHtml, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    if (window.mermaid) await window.mermaid.run();
  });
  await new Promise(resolve => setTimeout(resolve, 2500));

  const pdfPath = path.resolve('Manual_do_Usuario_Health_Nexus.pdf');
  const publicPdfPath = path.resolve('public/Manual_do_Usuario_Health_Nexus.pdf');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        <span>Health Nexus — Sistema de Gestão Hospitalar (v2.8.0)</span>
        <span>Manual do Usuário Oficial</span>
      </div>`,
    footerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <span>Confidencial · Uso Hospitalar & Clínico</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`
  });

  await browser.close();
  fs.copyFileSync(pdfPath, publicPdfPath);
  console.log('✓ Manual_do_Usuario_Health_Nexus.pdf and public PDF compiled cleanly.');

  // Compilar também o Manual de Fluxo Operacional
  console.log('--- AGORA COMPILANDO MANUAL DE FLUXO OPERACIONAL ---');
  await buildFluxoOperacionalManual();

  console.log('--- ALL MANUALS REBUILT SUCCESSFULLY ---');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('rebuild_all_manuals.mjs')) {
  rebuildAllManuals();
}
