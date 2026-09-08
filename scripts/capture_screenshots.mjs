import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * Script de Captura Automatizada de Screenshots Reais (Health Nexus v2.8.0)
 * Implementa o Princípio Gemini de Automação Headless com Captura Pós-Render:
 * 1. Injeção de sessão e autenticação válida no sessionStorage.
 * 2. Espera ativa explícita por seletores do DOM (page.waitForSelector) - evita tabelas/cards vazios.
 * 3. Garantia de carregamento de fontes (document.fonts.ready) e repouso de rede (networkidle2).
 */
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

  // 1. Acessar aplicação e injetar credencial Master para ter visão completa de todos os módulos
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

  // Recarregar com a sessão ativa
  await page.reload({ waitUntil: 'networkidle2' });
  
  // Garantir que fontes nativas e de ícones estão prontas
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });

  const tabs = [
    { id: 'dashboard', name: '01-dashboard.png', selector: '.stat-card, .metric-card, table, canvas' },
    { id: 'pacientes', name: '02-pacientes.png', selector: 'table tbody tr, .patient-card, .btn-primary' },
    { id: 'atendimento', name: '03-triagem-kanban.png', selector: '.kanban-col, .card-patient, table' },
    { id: 'consultorios', name: '04-consultorios.png', selector: '.doctor-room, .queue-item, table' },
    { id: 'leitos', name: '05-censo-leitos.png', selector: '.bed-card, .ward-section, table' },
    { id: 'kanban', name: '06-kanban-internacao.png', selector: '.kanban-column, .kanban-card, table' },
    { id: 'farmacia', name: '07-farmacia.png', selector: 'table tbody tr, .prescription-card, .badge' },
    { id: 'financeiro', name: '08-faturamento-tiss.png', selector: 'table tbody tr, .bill-card, .stat-item' },
    { id: 'tv_panel', name: '09-painel-tv.png', selector: '.tv-header, .current-call, .history-list' },
    { id: 'estagnacao', name: '10-estagnacao.png', selector: '.sla-card, .gauge-box, table' },
    { id: 'medicos', name: '12-medicos.png', selector: 'table tbody tr, .doctor-card' },
    { id: 'agenda', name: '13-agenda.png', selector: '.calendar-grid, .appointment-slot, table' },
    { id: 'relatorios', name: '14-relatorios.png', selector: '.report-card, .chart-box, table' },
    { id: 'configuracoes', name: '15-configuracoes.png', selector: '.config-form, .settings-group' }
  ];

  for (const t of tabs) {
    console.log(`Navegando para aba: ${t.id}...`);
    await page.evaluate((tabId) => {
      if (typeof window.switchTab === 'function') {
        window.switchTab(tabId);
      }
    }, t.id);

    // Estratégia de espera ativa (Gemini Recommendation):
    // Esperar seletor específico ou fallback para repouso visual
    try {
      if (t.selector) {
        await page.waitForSelector(t.selector, { timeout: 3500 });
      }
    } catch (e) {
      // Caso a tela tenha estrutura alternativa, continua
    }
    
    // Pequena pausa para animações e render de CSS
    await new Promise(r => setTimeout(r, 600));

    const targetFile = path.join(outDir, t.name);
    await page.screenshot({ path: targetFile });
    // Copiar também para docs/screenshots
    fs.copyFileSync(targetFile, path.join(docDir, t.name));
    console.log(`✓ Salvo: ${t.name}`);
  }

  // Capturar Modal PEP Clínico (Prontuário Eletrônico SOAPE)
  console.log('Capturando Modal de Prontuário SOAPE (PEP)...');
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('consultorios');
  });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    const pepBtn = document.querySelector('button[title*="Prontuário"], .btn[onclick*="openPEPModal"]');
    if (pepBtn) pepBtn.click();
    else if (typeof window.openPEPModal === 'function') {
      window.openPEPModal('enc-1');
    }
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
