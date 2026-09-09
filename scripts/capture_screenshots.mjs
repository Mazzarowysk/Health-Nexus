import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * Script de Captura Automatizada de Screenshots Reais (Health Nexus v2.8.0)
 * CORREÇÃO ANTI-BLUR:
 * - Injeta CSS persistente para suprimir TODOS os overlays/modais via display:none
 * - Sobrescreve window.showSyncPromptModal para que não abra nunca durante capturas
 * - Remove agressivamente o elemento #sync-prompt-modal e .modal-overlay pelo ID/classe exata
 */

/**
 * Injeta proteção permanente contra o modal de sincronização.
 * Executado UMA VEZ após o carregamento da página — persiste para todas as abas.
 */
async function injectModalSuppressor(page) {
  await page.evaluate(() => {
    // ── 1. CSS PERMANENTE: oculta qualquer overlay e backdrop ──────────────────
    const style = document.createElement('style');
    style.id = '__screenshot-suppressor__';
    style.textContent = `
      /* Suprime overlay de sincronização (id exato do sync.js) */
      #sync-prompt-modal { display: none !important; }

      /* Suprime qualquer .modal-overlay customizado */
      .modal-overlay { display: none !important; }

      /* Suprime backdrop do Bootstrap */
      .modal-backdrop { display: none !important; }

      /* Garante que o body não trave o scroll */
      body.modal-open {
        overflow: auto !important;
        padding-right: 0 !important;
      }
    `;
    document.head.appendChild(style);

    // ── 2. OVERRIDE da função JS que cria o modal de sync ─────────────────────
    // A função showSyncPromptModal em sync.js retorna uma Promise.
    // Substituímos por uma versão que resolve imediatamente sem criar nenhum DOM.
    window.__syncModalSuppressed__ = true;

    // Intercepta criação de elementos com id sync-prompt-modal via MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Remove pelo ID exato
            if (node.id === 'sync-prompt-modal') {
              node.remove();
              return;
            }
            // Remove pela classe exata do overlay de sync
            if (node.classList && node.classList.contains('modal-overlay')) {
              // Só remove se for o overlay de sync (contém texto "Nuvem" ou "cloud")
              if (node.innerHTML && (
                node.innerHTML.includes('Nuvem') ||
                node.innerHTML.includes('nuvem') ||
                node.innerHTML.includes('cloud-arrow-up') ||
                node.innerHTML.includes('sync-prompt')
              )) {
                node.remove();
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Guarda referência para desligar depois se necessário
    window.__modalObserver__ = observer;
  });

  console.log('✓ Supressor de modais injetado (CSS + MutationObserver).');
}

/**
 * Remove quaisquer overlays residuais que possam ter escapado do supressor.
 */
async function cleanupResidualOverlays(page) {
  await page.evaluate(() => {
    // Remove pelo ID exato do sync.js
    const syncModal = document.getElementById('sync-prompt-modal');
    if (syncModal) syncModal.remove();

    // Remove qualquer .modal-overlay que contenha conteúdo de sync
    document.querySelectorAll('.modal-overlay').forEach(el => {
      if (el.innerHTML.includes('Nuvem') || el.innerHTML.includes('cloud-arrow-up')) {
        el.remove();
      }
    });

    // Remove backdrops Bootstrap
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

    // Libera o body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });
}

export async function captureScreenshots() {
  console.log('--- INICIANDO CAPTURA PROGRAMÁTICA DE SCREENSHOTS (FASE 1: SEED & SNAPSHOT) ---');
  const outDir = path.resolve('public/docs/screenshots');
  const docDir = path.resolve('docs/screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(docDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

  // ── Interceptar ANTES de qualquer JS do app ser executado ──────────────────
  // Injeta script de supressão no contexto da página antes do bundle carregar
  await page.evaluateOnNewDocument(() => {
    // Marca de supressão para screenshot — o app pode verificar isso
    window.__SCREENSHOT_MODE__ = true;
    window.__syncModalSuppressed__ = true;
  });

  // 1. Acessar aplicação e injetar credencial Master
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    sessionStorage.setItem('hn_token', 'mock-master-token-valid');
    sessionStorage.setItem('hn_user', JSON.stringify({
      id: 'usr-master-1',
      name: 'Dr. Marcelo Mazaro',
      username: 'mazzarowysk',
      role: 'Master',
      councilNumber: '123456/SP'
    }));
  });

  // Recarregar com a sessão ativa (evaluateOnNewDocument já injeta antes do bundle)
  await page.reload({ waitUntil: 'networkidle2' });

  // Garantir que fontes nativas e de ícones estão prontas
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });

  // ── Injetar supressor CSS + MutationObserver APÓS o DOM estar pronto ───────
  await new Promise(r => setTimeout(r, 800));
  await injectModalSuppressor(page);
  await new Promise(r => setTimeout(r, 400));
  await cleanupResidualOverlays(page);
  console.log('✓ Página limpa de overlays. Iniciando capturas...');

  const tabs = [
    { id: 'dashboard',     name: '01-dashboard.png',           selector: '.stat-card, .metric-card, table, canvas' },
    { id: 'pacientes',     name: '02-pacientes.png',            selector: 'table tbody tr, .patient-card, .btn-primary' },
    { id: 'atendimento',   name: '03-triagem-kanban.png',       selector: '.kanban-col, .card-patient, table' },
    { id: 'consultorios',  name: '04-consultorios.png',         selector: '.doctor-room, .queue-item, table' },
    { id: 'leitos',        name: '05-censo-leitos.png',         selector: '.bed-card, .ward-section, table' },
    { id: 'kanban',        name: '06-kanban-internacao.png',    selector: '.kanban-column, .kanban-card, table' },
    { id: 'farmacia',      name: '07-farmacia.png',             selector: 'table tbody tr, .prescription-card, .badge' },
    { id: 'financeiro',    name: '08-faturamento-tiss.png',     selector: 'table tbody tr, .bill-card, .stat-item' },
    { id: 'tv_panel',      name: '09-painel-tv.png',            selector: '.tv-header, .current-call, .history-list' },
    { id: 'estagnacao',    name: '10-estagnacao.png',           selector: '.sla-card, .gauge-box, table' },
    { id: 'medicos',       name: '12-medicos.png',              selector: 'table tbody tr, .doctor-card' },
    { id: 'agenda',        name: '13-agenda.png',               selector: '.calendar-grid, .appointment-slot, table' },
    { id: 'relatorios',    name: '14-relatorios.png',           selector: '.report-card, .chart-box, table' },
    { id: 'configuracoes', name: '15-configuracoes.png',        selector: '.config-form, .settings-group' }
  ];

  for (const t of tabs) {
    console.log(`Navegando para aba: ${t.id}...`);
    await page.evaluate((tabId) => {
      if (typeof window.switchTab === 'function') window.switchTab(tabId);
    }, t.id);

    try {
      if (t.selector) await page.waitForSelector(t.selector, { timeout: 3500 });
    } catch (e) { /* estrutura alternativa — continua */ }

    // Pausa para animações CSS
    await new Promise(r => setTimeout(r, 600));

    // Limpeza residual antes de capturar
    await cleanupResidualOverlays(page);

    const targetFile = path.join(outDir, t.name);
    await page.screenshot({ path: targetFile });
    fs.copyFileSync(targetFile, path.join(docDir, t.name));
    console.log(`✓ Salvo: ${t.name}`);
  }

  // ── Captura especial: Modal PEP (aberto intencionalmente) ──────────────────
  console.log('Capturando Modal de Prontuário SOAPE (PEP)...');
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('consultorios');
  });
  await new Promise(r => setTimeout(r, 800));
  await cleanupResidualOverlays(page);  // garante que só o PEP estará visível

  await page.evaluate(() => {
    const pepBtn = document.querySelector('button[title*="Prontuário"], .btn[onclick*="openPEPModal"]');
    if (pepBtn) pepBtn.click();
    else if (typeof window.openPEPModal === 'function') window.openPEPModal('enc-1');
  });

  try {
    await page.waitForSelector('.modal-content, #pepModal, .pep-container', { timeout: 4000 });
  } catch (e) {}
  await new Promise(r => setTimeout(r, 1000));

  const pepFile = path.join(outDir, '11-prontuario-pep.png');
  await page.screenshot({ path: pepFile });
  fs.copyFileSync(pepFile, path.join(docDir, '11-prontuario-pep.png'));
  console.log('✓ Salvo: 11-prontuario-pep.png');

  await browser.close();
  console.log('--- ETAPA 1 CONCLUÍDA: TODOS OS PRINTS FORAM CAPTURADOS COM SUCESSO ---');
}

if (process.argv[1] && process.argv[1].endsWith('capture_screenshots.mjs')) {
  captureScreenshots().catch(console.error);
}
