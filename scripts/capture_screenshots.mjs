import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

async function captureScreenshots() {
  console.log('--- CAPTURING REAL HEALTH NEXUS SCREENSHOTS ---');
  const outDir = path.resolve('public/docs/screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

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

  // Recarregar com a sessão ativa
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const tabs = [
    { id: 'dashboard', name: '01-dashboard.png' },
    { id: 'pacientes', name: '02-pacientes.png' },
    { id: 'atendimento', name: '03-triagem-kanban.png' },
    { id: 'consultorios', name: '04-consultorios.png' },
    { id: 'leitos', name: '05-censo-leitos.png' },
    { id: 'kanban', name: '06-kanban-internacao.png' },
    { id: 'farmacia', name: '07-farmacia.png' },
    { id: 'financeiro', name: '08-faturamento-tiss.png' },
    { id: 'tv_panel', name: '09-painel-tv.png' },
    { id: 'estagnacao', name: '10-estagnacao.png' },
    { id: 'medicos', name: '12-medicos.png' },
    { id: 'agenda', name: '13-agenda.png' },
    { id: 'relatorios', name: '14-relatorios.png' },
    { id: 'configuracoes', name: '15-configuracoes.png' }
  ];

  for (const t of tabs) {
    console.log(`Navigating to tab: ${t.id}...`);
    await page.evaluate((tabId) => {
      if (typeof window.switchTab === 'function') {
        window.switchTab(tabId);
      }
    }, t.id);

    await new Promise(r => setTimeout(r, 2000));
    const targetFile = path.join(outDir, t.name);
    await page.screenshot({ path: targetFile });
    console.log(`✓ Saved ${t.name}`);
  }

  // Capturar também um modal aberto (ex: PEP Médico ou Triagem)
  console.log('Capturing PEP modal screenshot...');
  await page.evaluate(() => {
    window.switchTab('consultorios');
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const pepBtn = document.querySelector('button[title*="Prontuário"], .btn[onclick*="openPEPModal"]');
    if (pepBtn) pepBtn.click();
    else if (typeof window.openPEPModal === 'function') {
      window.openPEPModal('enc-1');
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outDir, '11-prontuario-pep.png') });
  console.log('✓ Saved 11-prontuario-pep.png');

  await browser.close();
  console.log('--- ALL SCREENSHOTS CAPTURED CLEANLY ---');
}

captureScreenshots().catch(console.error);
