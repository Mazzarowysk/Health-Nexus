import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Dell New/.gemini/antigravity-ide/brain/87850651-557e-499d-98c0-2e7e8ed0dfd6';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1366, height: 768 }
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  console.log('Configurando sessão de Master no navegador...');
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('hn_token', 'mock-token-master');
    sessionStorage.setItem('hn_user', JSON.stringify({
      id: 'USR-MASTER',
      name: 'Marcelo Mazaro',
      username: 'admin',
      role: 'Master'
    }));
    localStorage.setItem('hn_flow_docked', 'true');
  });

  console.log('Navegando para http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Injetar pacientes mock se o banco estiver vazio
  await page.evaluate(async () => {
    const mockPatients = [
      { id: 'PAT-1789018608506-121', fullName: 'Carlos Alberto Silva', motherName: 'Maria Silva', cpf: '123.456.789-00', birthDate: '1975-05-15', city: 'São Paulo - SP', phone: '(11) 98765-4321', cellphone: '(11) 91234-5678', billingValue: 'R$ 0,00' },
      { id: 'PAT-1789017313969-753', fullName: 'Ana Paula Silva', motherName: 'Maria Silva', cpf: '999.888.777-66', birthDate: '1990-12-12', city: 'Campinas - SP', phone: '(19) 98888-7777', cellphone: '', billingValue: 'R$ 0,00' },
      { id: 'PAT-1789037246102-864', fullName: 'Breno Coltri', motherName: 'Elisangela Maria', cpf: '404.165.458-99', birthDate: '2005-04-21', city: 'Tupã - SP', phone: '(14) 99664-8049', cellphone: '', billingValue: 'R$ 0,00' },
      { id: 'PAT-1788971861974-944', fullName: 'Marcelo Mazaro', motherName: 'Maria Mazaro', cpf: '111.222.333-44', birthDate: '1980-05-05', city: 'São Paulo - SP', phone: '(11) 99999-8888', cellphone: '', billingValue: 'R$ 0,00' }
    ];

    try {
      const raw = localStorage.getItem('healthNexusDados');
      let db = raw ? JSON.parse(raw) : {};
      if (!db.patients || db.patients.length === 0) {
        db.patients = mockPatients;
        localStorage.setItem('healthNexusDados', JSON.stringify(db));
      }
    } catch (_) {}
  });

  // Acoplar o Painel de Governança se não estiver
  await page.evaluate(() => {
    document.body.classList.add('hn-flow-docked-right');
    const guide = document.getElementById('hn-flow-guide');
    if (guide) {
      guide.classList.add('hn-flow-docked');
      guide.style.cssText = 'position:fixed !important; top:0 !important; right:0 !important; bottom:0 !important; width:var(--hn-flow-panel-width, 380px) !important; height:100vh !important; z-index:999999 !important; display:flex !important; flex-direction:column !important;';
    }
  });

  // 1. Ir para a aba Pacientes
  console.log('Abrindo aba Pacientes...');
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') {
      window.switchTab('pacientes');
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'verify_patients_table_docked.png'),
    fullPage: false
  });
  console.log('Screenshot salva: verify_patients_table_docked.png');

  // 2. Ir para a aba Atendimentos
  console.log('Abrindo aba Atendimentos...');
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') {
      window.switchTab('atendimento');
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'verify_attendance_kanban_docked.png'),
    fullPage: false
  });
  console.log('Screenshot salva: verify_attendance_kanban_docked.png');

  // 3. Ir para a aba Farmácia
  console.log('Abrindo aba Farmácia...');
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') {
      window.switchTab('farmacia');
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'verify_pharmacy_table_docked.png'),
    fullPage: false
  });
  console.log('Screenshot salva: verify_pharmacy_table_docked.png');

  await browser.close();
  console.log('Concluído com sucesso!');
}

run().catch(console.error);
