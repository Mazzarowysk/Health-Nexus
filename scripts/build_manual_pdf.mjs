import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

async function generateManual() {
  const mdPath = path.resolve('MANUAL_DO_USUARIO_HEALTH_NEXUS.md');
  const pdfPath = path.resolve('Manual_do_Usuario_Health_Nexus.pdf');
  const htmlPath = path.resolve('manual_do_usuario.html');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  // Parse do Markdown via marked
  let renderedBody = await marked.parse(mdContent);

  // 1. Converter blocos Mermaid
  renderedBody = renderedBody
    .replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
      const decoded = p1
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      return `<div class="mermaid">\n${decoded}\n</div>`;
    });

  // 2. Envelopar tabelas em containers com rolagem horizontal controlada (anti-overflow)
  renderedBody = renderedBody.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="table-container"><table class="manual-table">$1</table></div>');

  // 3. Envelopar imagens em figuras responsivas com suporte a ampliação e legenda
  renderedBody = renderedBody.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*?)>/gi, (match, before, src, after) => {
    const altMatch = (before + after).match(/alt="([^"]*)"/i);
    const alt = altMatch ? altMatch[1] : '';
    return `<figure class="manual-img-figure">
      <div class="img-wrapper">
        <img src="${src}" alt="${alt}" class="zoomable-manual-img" loading="lazy" />
        <span class="img-zoom-hint"><i class="fa-solid fa-magnifying-glass-plus"></i> Clique para ampliar</span>
      </div>
      ${alt ? `<figcaption class="manual-figcaption"><i class="fa-solid fa-camera"></i> ${alt}</figcaption>` : ''}
    </figure>`;
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Manual do Usuário — Health Nexus v2.9.43</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #3730a3;
      --secondary: #0ea5e9;
      --bg: #0b0f19;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --accent-danger: #ef4444;
      --accent-warning: #f59e0b;
      --accent-success: #10b981;
      --font-scale: 1;
      --container-max-w: 1440px;
    }

    body.light-theme {
      --bg: #f8fafc;
      --bg-card: #ffffff;
      --bg-hover: #f1f5f9;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      color: #0f172a;
    }

    * { box-sizing: border-box; }
    html {
      scroll-behavior: smooth;
      font-size: calc(15px * var(--font-scale, 1));
      overflow-x: hidden;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 0;
      line-height: 1.7;
      overflow-x: hidden;
      width: 100%;
      transition: background-color 0.25s ease, color 0.25s ease;
    }

    /* BARRA FIXA DE CONTROLE DE ZOOM & ACESSIBILIDADE */
    .manual-utility-bar {
      position: sticky;
      top: 0;
      z-index: 10000;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
      flex-wrap: wrap;
    }

    body.light-theme .manual-utility-bar {
      background: rgba(255, 255, 255, 0.94);
      border-bottom-color: #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }

    .manual-utility-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .util-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #cbd5e1;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      text-decoration: none;
      user-select: none;
    }
    body.light-theme .util-btn {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #334155;
    }

    .util-btn:hover {
      background: rgba(99, 102, 241, 0.25);
      border-color: #818cf8;
      color: #ffffff;
      transform: translateY(-1px);
    }
    body.light-theme .util-btn:hover {
      background: #e2e8f0;
      color: #1e1b4b;
    }

    .util-scale-display {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      font-weight: 700;
      color: #38bdf8;
      min-width: 48px;
      text-align: center;
      background: rgba(0,0,0,0.35);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    body.light-theme .util-scale-display {
      background: #e2e8f0;
      color: #0369a1;
      border-color: #cbd5e1;
    }

    /* CAPA EXECUTIVA */
    .cover-page {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%);
      padding: 50px 30px;
      border-bottom: 4px solid #6366f1;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(99,102,241,0.25);
      border: 1px solid rgba(165,180,252,0.4);
      padding: 7px 18px;
      border-radius: 999px;
      color: #c4b5fd;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 12px;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 1.05rem;
      color: #cbd5e1;
      max-width: 800px;
      margin: 0 auto 24px;
      font-weight: 400;
      line-height: 1.5;
    }

    .cover-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      font-size: 0.85rem;
      color: #a5b4fc;
      flex-wrap: wrap;
    }

    .cover-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* CONTAINER PRINCIPAL RESPONSIVO */
    .layout-container {
      display: flex;
      max-width: var(--container-max-w);
      width: 100%;
      margin: 0 auto;
      padding: 30px 20px;
      gap: 32px;
      box-sizing: border-box;
      transition: max-width 0.25s ease;
    }
    .layout-container.wide-mode {
      max-width: 98%;
    }

    /* SIDEBAR NAVEGAÇÃO */
    .sidebar {
      width: 320px;
      flex-shrink: 0;
      position: sticky;
      top: 70px;
      max-height: calc(100vh - 90px);
      overflow-y: auto;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px 14px;
      scrollbar-width: thin;
      box-sizing: border-box;
    }

    .sidebar-title {
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #818cf8;
      margin-bottom: 12px;
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
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.84rem;
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
      opacity: 0.85;
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

    /* CONTEÚDO PRINCIPAL (ÁREA DE TEXTO) */
    .content-area {
      flex: 1;
      min-width: 0; /* IMPEDE ESTOURO LATERAL */
      max-width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px 48px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      overflow-x: hidden;
      box-sizing: border-box;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.9rem;
      font-weight: 800;
      color: var(--text);
      border-bottom: 2px solid var(--border);
      padding-bottom: 12px;
      margin-top: 40px;
      scroll-margin-top: 80px;
    }
    h1:first-child { margin-top: 0; }

    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: #818cf8;
      margin-top: 36px;
      margin-bottom: 14px;
      scroll-margin-top: 80px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 6px;
    }

    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: #38bdf8;
      margin-top: 26px;
      scroll-margin-top: 80px;
    }

    p { margin-bottom: 16px; color: var(--text); }
    ul, ol { padding-left: 24px; margin-bottom: 20px; }
    li { margin-bottom: 8px; color: var(--text); }

    blockquote {
      background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(56,189,248,0.06));
      border: 1px solid rgba(99,102,241,0.3);
      border-left: 4px solid #6366f1;
      border-radius: 12px;
      padding: 18px 22px;
      margin: 24px 0;
      color: var(--text);
    }

    /* FIGURAS E IMAGENS COM ZOOM E PROTEÇÃO 100% */
    .manual-img-figure {
      margin: 32px 0;
      padding: 0;
      text-align: center;
      max-width: 100%;
      box-sizing: border-box;
    }

    .img-wrapper {
      position: relative;
      display: inline-block;
      max-width: 100%;
      border-radius: 12px;
      overflow: hidden;
    }

    .manual-img-figure img,
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block;
      margin: 0 auto;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      cursor: zoom-in;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
      box-sizing: border-box;
    }

    .manual-img-figure img:hover,
    img:hover {
      transform: scale(1.008);
      box-shadow: 0 16px 45px rgba(99, 102, 241, 0.35);
      border-color: rgba(99, 102, 241, 0.5);
    }

    .img-zoom-hint {
      position: absolute;
      bottom: 12px;
      right: 14px;
      background: rgba(15, 23, 42, 0.85);
      color: #cbd5e1;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.15);
      pointer-events: none;
      backdrop-filter: blur(6px);
      opacity: 0.9;
    }

    .manual-figcaption {
      font-size: 0.84rem;
      color: var(--text-muted);
      margin-top: 10px;
      display: block;
      font-style: italic;
    }

    /* TABELAS RESPONSIVAS DENTRO DE CONTAINER COM SCROLL */
    .table-container {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      margin: 24px 0;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #0f172a;
      scrollbar-width: thin;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
    }
    body.light-theme .table-container {
      background: #ffffff;
    }

    table, .manual-table {
      width: 100%;
      min-width: 600px;
      border-collapse: collapse;
      text-align: left;
      margin: 0;
      border: none;
    }

    th {
      background: #1e1b4b;
      color: #a5b4fc;
      font-family: 'Outfit', sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    body.light-theme th {
      background: #e0e7ff;
      color: #3730a3;
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
      font-size: 0.90rem;
    }

    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    body.light-theme tr:nth-child(even) { background: #f8fafc; }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.88em;
      border: 1px solid rgba(99,102,241,0.2);
    }
    body.light-theme code {
      background: #e0e7ff;
      color: #4338ca;
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
      border: 1px solid var(--border);
      margin: 24px 0;
      text-align: center;
      overflow-x: auto;
      max-width: 100%;
    }
    body.light-theme .mermaid {
      background: #f8fafc;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }

    /* MODAL LIGHTBOX PARA ZOOM DE IMAGEM */
    #manual-lightbox-modal {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(5, 7, 15, 0.95);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      cursor: zoom-out;
    }
    #manual-lightbox-modal.active {
      display: flex;
    }
    #manual-lightbox-img {
      max-width: 95vw;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.9);
      border: 2px solid rgba(255,255,255,0.2);
      object-fit: contain;
      cursor: default;
      transition: transform 0.2s ease;
    }

    /* MEDIA QUERIES RESPONSIVAS */
    @media (max-width: 1100px) {
      .layout-container { flex-direction: column; padding: 20px 14px; gap: 20px; }
      .sidebar { width: 100%; height: auto; position: static; max-height: 380px; }
      .content-area { padding: 30px 20px; border-radius: 16px; }
      .manual-utility-bar { padding: 10px 14px; }
    }
    @media (max-width: 640px) {
      .cover-title { font-size: 1.8rem; }
      .cover-page { padding: 36px 16px; }
      .content-area { padding: 20px 14px; }
      .util-btn span { display: none; }
    }
  </style>
</head>
<body>

  <!-- BARRA DE UTILITÁRIOS & CONTROLES DE ZOOM -->
  <div class="manual-utility-bar">
    <div class="manual-utility-group">
      <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-magnifying-glass"></i> Zoom:</span>
      <button class="util-btn" id="btn-zoom-out" title="Diminuir Zoom / Fonte"><i class="fa-solid fa-minus"></i></button>
      <span class="util-scale-display" id="zoom-scale-text">100%</span>
      <button class="util-btn" id="btn-zoom-in" title="Aumentar Zoom / Fonte"><i class="fa-solid fa-plus"></i></button>
      <button class="util-btn" id="btn-zoom-reset" title="Redefinir Zoom para 100%"><i class="fa-solid fa-rotate-left"></i> <span>100%</span></button>
    </div>

    <div class="manual-utility-group">
      <button class="util-btn" id="btn-toggle-width" title="Alternar Largura de Leitura"><i class="fa-solid fa-arrows-left-right-to-line"></i> <span id="width-btn-text">Leitura Focada</span></button>
      <button class="util-btn" id="btn-toggle-theme" title="Alternar Modo Escuro / Claro"><i class="fa-solid fa-circle-half-stroke"></i> <span>Tema</span></button>
      <a class="util-btn" href="Manual_do_Usuario_Health_Nexus.pdf" download title="Baixar Versão Oficial em PDF"><i class="fa-solid fa-file-pdf" style="color: #f87171;"></i> <span>PDF</span></a>
      <button class="util-btn" onclick="window.print()" title="Imprimir Manual"><i class="fa-solid fa-print"></i> <span>Imprimir</span></button>
    </div>
  </div>

  <div class="cover-page">
    <div class="brand-badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v2.9.43
    </div>
    <h1 class="cover-title">Manual do Usuário & Guia Operacional Definitivo</h1>
    <p class="cover-subtitle">Documentação técnica publicação-grade de todas as telas, botões, protocolos de emergência, IA preditiva, QR Code CFM, PACS DICOM, Consulta Dinâmica e etiquetas Pimaco/térmicas.</p>
    <div class="cover-meta">
      <span><i class="fa-solid fa-book-open"></i> Edição Oficial 2026</span>
      <span><i class="fa-solid fa-shield-halved"></i> Triagem Manchester & CDSS</span>
      <span><i class="fa-solid fa-tags"></i> Pimaco 6180 / 6281 & Térmica</span>
      <span><i class="fa-solid fa-file-invoice-dollar"></i> TISS v4.01.00 ANS</span>
    </div>
  </div>

  <div class="layout-container" id="main-layout-container">
    <aside class="sidebar">
      <div class="sidebar-title"><i class="fa-solid fa-list-ul"></i> Sumário do Manual</div>
      <div style="margin-bottom: 14px; position: relative;">
        <input type="text" id="sidebar-search-input" placeholder="🔍 Pesquisar no manual..." style="width: 100%; background: #0f172a; border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px 9px 34px; color: #f8fafc; font-size: 0.82rem; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='var(--border)'">
        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.78rem;"></i>
      </div>
      <nav>
        <ul id="sidebar-nav">
          <!-- Populated dynamically via JavaScript -->
        </ul>
      </nav>
    </aside>

    <main class="content-area" id="doc-main-content">
      ${renderedBody}
    </main>
  </div>

  <!-- LIGHTBOX PARA ZOOM DE IMAGEM -->
  <div id="manual-lightbox-modal">
    <img id="manual-lightbox-img" src="" alt="Imagem Ampliada" />
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // 1. Inicializar Mermaid
      if (window.mermaid) {
        mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
      }

      // 2. Controle Dinâmico de Zoom / Escala de Fonte
      let currentScale = 1;
      const zoomText = document.getElementById('zoom-scale-text');

      const setZoom = (scale) => {
        currentScale = Math.min(Math.max(scale, 0.75), 1.6);
        document.documentElement.style.setProperty('--font-scale', currentScale);
        if (zoomText) zoomText.textContent = Math.round(currentScale * 100) + '%';
        try { localStorage.setItem('hn_manual_zoom', currentScale); } catch(e) {}
      };

      try {
        const savedZoom = parseFloat(localStorage.getItem('hn_manual_zoom'));
        if (savedZoom && !isNaN(savedZoom)) setZoom(savedZoom);
      } catch(e) {}

      document.getElementById('btn-zoom-in')?.addEventListener('click', () => setZoom(currentScale + 0.1));
      document.getElementById('btn-zoom-out')?.addEventListener('click', () => setZoom(currentScale - 0.1));
      document.getElementById('btn-zoom-reset')?.addEventListener('click', () => setZoom(1));

      // 3. Alternar Largura de Leitura (Focada vs Ampla)
      const layoutContainer = document.getElementById('main-layout-container');
      const widthBtnText = document.getElementById('width-btn-text');
      document.getElementById('btn-toggle-width')?.addEventListener('click', () => {
        layoutContainer?.classList.toggle('wide-mode');
        const isWide = layoutContainer?.classList.contains('wide-mode');
        if (widthBtnText) widthBtnText.textContent = isWide ? 'Largura Ampla' : 'Leitura Focada';
      });

      // 4. Alternar Modo Escuro / Claro
      document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        try { localStorage.setItem('hn_manual_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark'); } catch(e) {}
      });
      try {
        if (localStorage.getItem('hn_manual_theme') === 'light') {
          document.body.classList.add('light-theme');
        }
      } catch(e) {}

      // 5. Lightbox Modal para Ampliar Prints / Imagens ao Clicar
      const lightboxModal = document.getElementById('manual-lightbox-modal');
      const lightboxImg = document.getElementById('manual-lightbox-img');

      document.querySelectorAll('.zoomable-manual-img, .manual-img-figure img, main.content-area img').forEach(img => {
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          if (lightboxModal && lightboxImg) {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt || 'Imagem do Manual';
            lightboxModal.classList.add('active');
          }
        });
      });

      lightboxModal?.addEventListener('click', () => {
        lightboxModal.classList.remove('active');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxModal?.classList.contains('active')) {
          lightboxModal.classList.remove('active');
        }
      });

      // 6. Popular Sumário Lateral Dinâmico
      const mainContent = document.getElementById('doc-main-content');
      const sidebarNav = document.getElementById('sidebar-nav');
      if (!mainContent || !sidebarNav) return;

      const headings = mainContent.querySelectorAll('h2, h3');
      let navHtml = '';

      headings.forEach((heading, idx) => {
        const text = heading.textContent.trim();
        const id = heading.id || ('sec-' + (idx + 1) + '-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
        heading.id = id;

        const isH2 = heading.tagName === 'H2';
        const levelClass = isH2 ? 'level-2' : 'level-3';

        navHtml += '<li><a href="#' + id + '" data-target="' + id + '" class="' + levelClass + '">' + text + '</a></li>';
      });

      sidebarNav.innerHTML = navHtml;

      // 7. Busca em Tempo Real no Sumário Lateral
      const searchInput = document.getElementById('sidebar-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          sidebarNav.querySelectorAll('li').forEach(li => {
            const txt = li.textContent.toLowerCase();
            li.style.display = (!q || txt.includes(q)) ? 'block' : 'none';
          });
        });
      }

      // 8. Rolagem Suave para Seções
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
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, fullHtml, 'utf8');
  console.log(`HTML gerado com sucesso em: ${htmlPath}`);

  // PDF HTML COM RENDERIZAÇÃO DE VETOR E EXCELÊNCIA VISUAL
  const pdfHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual do Usuário — Health Nexus v2.9.43</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    
    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* CAPA COMPLETA DO PDF */
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
      box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
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
      letter-spacing: 1px;
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
      border: none;
      padding: 0;
    }

    .pdf-cover p {
      font-size: 12pt;
      color: #cbd5e1;
      max-width: 600px;
      margin: 0 0 40px;
      line-height: 1.5;
    }

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

    /* TYPOGRAPHY DO PDF */
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 18pt;
      font-weight: 800;
      color: #1e1b4b;
      border-bottom: 2.5px solid #4338ca;
      padding-bottom: 6px;
      margin-top: 32px;
      margin-bottom: 14px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 14pt;
      font-weight: 700;
      color: #3730a3;
      margin-top: 26px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 12pt;
      font-weight: 600;
      color: #0284c7;
      margin-top: 18px;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p, li {
      color: #334155;
      font-size: 10.5pt;
      margin-bottom: 10px;
    }

    ul, ol {
      margin-top: 4px;
      margin-bottom: 14px;
      padding-left: 20px;
    }

    blockquote {
      background: #f8fafc;
      border-left: 4px solid #6366f1;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-left-color: #6366f1;
      padding: 12px 18px;
      margin: 18px 0;
      border-radius: 6px;
      color: #334155;
      font-style: italic;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* IMAGENS PERFEITAMENTE ENQUADRADAS NO PDF A4 */
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block;
      margin: 14px auto;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .manual-img-figure {
      margin: 14px 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .manual-figcaption {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 4px;
      font-style: italic;
    }

    .img-zoom-hint {
      display: none !important;
    }

    /* TABELAS EM PDF - RESISTENTES A QUEBRA E OVERFLOW */
    .table-container {
      width: 100%;
      margin: 18px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background: #1e1b4b;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }

    td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      color: #334155;
      vertical-align: top;
      word-break: break-word;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      color: #4338ca;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9pt;
      border: 1px solid #e2e8f0;
    }

    pre code {
      display: block;
      padding: 14px;
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      font-size: 8.5pt;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 16px;
      border-radius: 10px;
      margin: 18px 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>

  <div class="pdf-cover">
    <div class="badge">
      <i class="fa-solid fa-hospital-user"></i> Health Nexus v2.9.43
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

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });

    // Renderizar diagramas Mermaid antes da impressão para PDF
    await page.evaluate(async () => {
      if (window.mermaid) {
        await window.mermaid.run();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1200));

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <span>🏥 Health Nexus — Sistema de Gestão Hospitalar (v2.9.43)</span>
          <span>Manual do Usuário Oficial</span>
        </div>`,
      footerTemplate: `
        <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #64748b; width: 100%; padding: 0 15mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
          <span>Confidencial · Uso Hospitalar & Clínico</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>`
    });

    await browser.close();
    console.log(`PDF do Manual compilado com sucesso em: ${pdfPath}`);

    // Sincronização obrigatória de arquivos para public/ e src/manual.html
    const publicHtml = path.resolve('public/manual_do_usuario.html');
    const publicPdf = path.resolve('public/Manual_do_Usuario_Health_Nexus.pdf');
    const publicMd = path.resolve('public/MANUAL_DO_USUARIO_HEALTH_NEXUS.md');
    const srcManualHtml = path.resolve('src/manual.html');

    fs.copyFileSync(htmlPath, publicHtml);
    fs.copyFileSync(pdfPath, publicPdf);
    fs.copyFileSync(mdPath, publicMd);
    fs.copyFileSync(htmlPath, srcManualHtml);

    console.log('✓ Manuais sincronizados com sucesso em public/ e src/manual.html');
  } catch (err) {
    console.error('Erro ao compilar PDF:', err);
  }
}

generateManual();
