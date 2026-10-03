import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@libsql/client';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Permitir grandes payloads

// Inicializa Turso Cliente
let tursoClient = null;
const initTurso = () => {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://health-nexus-mazzarowysk.aws-us-east-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';
  if (url && authToken) {
    tursoClient = createClient({ url, authToken });
    console.log('[Backend] Conectado ao Turso.');
  }
};
initTurso();

// Helper de timeout com retentativas para garantir estabilidade com grandes volumes de dados
const executeTursoWithRetry = async (fn, retries = 2, delayMs = 600) => {
  let lastError = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const promise = fn();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Turso connection timeout (15s)')), 15000)
      );
      return await Promise.race([promise, timeoutPromise]);
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise(res => setTimeout(res, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
};

// =========================================================
// ⚡ REAL-TIME PUSH: SERVER-SENT EVENTS (SSE)
// =========================================================
const sseClients = new Set();

export const broadcastEvent = (type, payload) => {
  const data = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
};

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  const client = { id: Date.now() + Math.random(), res };
  sseClients.add(client);

  // Heartbeat a cada 25 segundos para manter o canal aberto
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {
      clearInterval(heartbeat);
      sseClients.delete(client);
    }
  }, 25000);

  // Enviar evento de conexão estabelecida
  res.write(`data: ${JSON.stringify({ type: 'connected', payload: { clientsCount: sseClients.size } })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
});

app.post('/api/tv/call', (req, res) => {
  const { patientName, roomName, manchesterColor, doctorName } = req.body || {};
  const callPayload = {
    patientName: patientName || 'Paciente',
    roomName: roomName || 'Consultório 01',
    manchesterColor: manchesterColor || 'Verde',
    doctorName: doctorName || 'Dr(a). Plantonista',
    calledAt: new Date().toISOString()
  };
  broadcastEvent('tv_call', callPayload);
  return res.json({ success: true, message: 'Chamada transmitida via SSE.', data: callPayload });
});

app.post('/api/broadcast', (req, res) => {
  const { type, payload } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Tipo de evento é obrigatório.' });
  broadcastEvent(type, payload);
  return res.json({ success: true, message: `Evento ${type} transmitido.` });
});

// Endpoint de sincronização (simula api/turso.js)
app.all('/api/turso', async (req, res) => {
  if (!tursoClient) {
    return res.status(503).json({ success: false, updated_at: 0, offline: true, error: 'Configuração do Turso ausente.' });
  }

  try {
    const { method } = req;

    await executeTursoWithRetry(() => tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS ocz_sync (
        id TEXT PRIMARY KEY,
        dados_json TEXT,
        config_json TEXT,
        updated_at INTEGER
      );
    `));

    const SYNC_ID = 'main';
    const result = await executeTursoWithRetry(() => tursoClient.execute({
      sql: 'SELECT id, updated_at, dados_json, config_json FROM ocz_sync WHERE id = ?',
      args: [SYNC_ID]
    }));
    const currentSync = result && result.rows ? result.rows[0] : null;

    // Status (Heartbeat)
    if (method === 'GET' && (req.url.includes('status') || req.query.status === '1')) {
      return res.status(200).json({ 
        success: true,
        offline: false,
        updated_at: currentSync ? Number(currentSync.updated_at) : 0 
      });
    }

    // Download
    if (method === 'GET') {
      if (!currentSync) {
        return res.status(200).json({ success: true, updated_at: 0, dados_json: '{}', config_json: '{}' });
      }
      return res.status(200).json({
        success: true,
        offline: false,
        updated_at: Number(currentSync.updated_at),
        dados_json: currentSync.dados_json,
        config_json: currentSync.config_json
      });
    }

    // Upload
    if (method === 'POST') {
      const { dados_json, config_json } = req.body || {};
      if (!dados_json) {
        return res.status(400).json({ success: false, error: 'dados_json ausente' });
      }
      const newUpdatedAt = Date.now();
      
      if (currentSync) {
        await executeTursoWithRetry(() => tursoClient.execute({
          sql: 'UPDATE ocz_sync SET dados_json = ?, config_json = ?, updated_at = ? WHERE id = ?',
          args: [dados_json, config_json || '{}', newUpdatedAt, SYNC_ID]
        }));
      } else {
        await executeTursoWithRetry(() => tursoClient.execute({
          sql: 'INSERT INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES (?, ?, ?, ?)',
          args: [SYNC_ID, dados_json, config_json || '{}', newUpdatedAt]
        }));
      }

      return res.status(200).json({ success: true, offline: false, updated_at: newUpdatedAt });
    }

    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error) {
    console.error('[Turso Sync] Conexão com Turso Cloud falhou:', error?.message || error);
    if (req.method === 'GET' && (req.url.includes('status') || req.query.status === '1')) {
      return res.status(200).json({ updated_at: 0, offline: true, error: error?.message });
    }
    res.status(503).json({ success: false, updated_at: 0, offline: true, error: `Turso Cloud indisponível: ${error?.message || 'Timeout'}` });
  }
});

// Mock login (just in case Vite hits it, though main.js intercepts it)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'offline-token', user: { id: 'USR-ADMIN', role: 'Administrador' } });
});

// =========================================================
// 💊 ANVISA — Busca de Medicamentos via OpenFDA (gratuito)
// =========================================================

// Mock e catálogo de medicamentos brasileiros (ANVISA / RENAME / Farmacopeia)
const mockBrazilianDrugs = [
  // Hidratação & Eletrólitos
  { nome: 'Ringer Lactato', principioAtivo: 'Cloreto de Sódio + Lactato de Sódio + Cloreto de Potássio + Cloreto de Cálcio', fabricante: 'Baxter / Fresenius / Equiplex', categoria: 'Solução Hidroeletrolítica (Cristaloide)', formaFarmaceutica: 'Solução Injetável 500mL / 1000mL', viaAdministracao: 'EV' },
  { nome: 'Cloreto de Sódio 0,9% (Soro Fisiológico)', principioAtivo: 'Cloreto de Sódio', fabricante: 'Baxter / Eurofarma / Halex Istar', categoria: 'Solução Fisiológica Cristaloide', formaFarmaceutica: 'Solução Injetável 100mL / 250mL / 500mL / 1000mL', viaAdministracao: 'EV' },
  { nome: 'Glicose 5%', principioAtivo: 'Glicose Monoidratada', fabricante: 'Baxter / Fresenius', categoria: 'Solução Glicosada', formaFarmaceutica: 'Solução Injetável 250mL / 500mL', viaAdministracao: 'EV' },
  { nome: 'Glicose 50%', principioAtivo: 'Glicose Hipertônica', fabricante: 'Isofarma / Farmace', categoria: 'Glicose Hipertônica', formaFarmaceutica: 'Ampola 10mL / 20mL', viaAdministracao: 'EV' },
  { nome: 'Cloreto de Potássio 19,1%', principioAtivo: 'Cloreto de Potássio', fabricante: 'Isofarma', categoria: 'Reposição Eletrolítica', formaFarmaceutica: 'Ampola 10mL', viaAdministracao: 'EV' },
  { nome: 'Gluconato de Cálcio 10%', principioAtivo: 'Gluconato de Cálcio', fabricante: 'Isofarma', categoria: 'Reposição Eletrolítica', formaFarmaceutica: 'Ampola 10mL', viaAdministracao: 'EV' },

  // Drogas Vasoativas & Emergência / UTI
  { nome: 'Noradrenalina (Hemitartarato de Norepinefrina)', principioAtivo: 'Hemitartarato de Norepinefrina', fabricante: 'Hypofarma / Cristália', categoria: 'Vasopressor / Droga Vasoativa', formaFarmaceutica: 'Ampola 2mg/mL (4mL)', viaAdministracao: 'EV' },
  { nome: 'Adrenalina (Epinefrina)', principioAtivo: 'Epinefrina', fabricante: 'Cristália', categoria: 'Simpaticomimético / Vasopressor', formaFarmaceutica: 'Ampola 1mg/mL (1mL)', viaAdministracao: 'EV / IM / SC' },
  { nome: 'Dobutamina', principioAtivo: 'Cloridrato de Dobutamina', fabricante: 'União Química', categoria: 'Inotrópico Cardíaco', formaFarmaceutica: 'Ampola 12,5mg/mL (20mL)', viaAdministracao: 'EV' },
  { nome: 'Dopamina', principioAtivo: 'Cloridrato de Dopamina', fabricante: 'Cristália', categoria: 'Inotrópico / Vasopressor', formaFarmaceutica: 'Ampola 5mg/mL (10mL)', viaAdministracao: 'EV' },
  { nome: 'Amiodarona', principioAtivo: 'Cloridrato de Amiodarona', fabricante: 'Sanofi (Ancoron)', categoria: 'Antiarrítmico Classe III', formaFarmaceutica: 'Ampola 50mg/mL (3mL) / Comprimido 200mg', viaAdministracao: 'EV / Oral' },
  { nome: 'Atropina', principioAtivo: 'Sulfato de Atropina', fabricante: 'Isofarma', categoria: 'Anticolinérgico / Parassimpatolítico', formaFarmaceutica: 'Ampola 0,25mg / 0,5mg (1mL)', viaAdministracao: 'EV / IM' },
  { nome: 'Furosemida (Lasix)', principioAtivo: 'Furosemida', fabricante: 'Sanofi / Teuto', categoria: 'Diurético de Alça', formaFarmaceutica: 'Ampola 20mg/2mL / Comprimido 40mg', viaAdministracao: 'EV / Oral' },

  // Analgésicos, Sedativos & AINEs
  { nome: 'Dipirona Sódica', principioAtivo: 'Dipirona', fabricante: 'Medley / EMS / Farmace', categoria: 'Analgésico e Antipirético', formaFarmaceutica: 'Comprimido 500mg / Gotas 500mg/mL / Ampola 500mg/mL', viaAdministracao: 'Oral / EV / IM' },
  { nome: 'Paracetamol', principioAtivo: 'Paracetamol', fabricante: 'Neo Química / EMS', categoria: 'Analgésico e Antipirético', formaFarmaceutica: 'Comprimido 500mg / 750mg / Gotas 200mg/mL', viaAdministracao: 'Oral' },
  { nome: 'Morfina (Dimorf)', principioAtivo: 'Sulfato de Morfina', fabricante: 'Cristália', categoria: 'Analgésico Opioide Forte', formaFarmaceutica: 'Ampola 1mg/mL ou 10mg/mL / Comprimido', viaAdministracao: 'EV / SC / Oral' },
  { nome: 'Fentanil (Fentanest)', principioAtivo: 'Citrato de Fentanila', fabricante: 'Cristália', categoria: 'Analgésico Opioide / Anestésico', formaFarmaceutica: 'Ampola 50mcg/mL (2mL / 5mL / 10mL)', viaAdministracao: 'EV' },
  { nome: 'Tramadol (Tramal)', principioAtivo: 'Cloridrato de Tramadol', fabricante: 'Pfizer / Teuto', categoria: 'Analgésico Opioide', formaFarmaceutica: 'Ampola 50mg/mL ou 100mg/2mL / Cápsula 50mg', viaAdministracao: 'EV / IM / Oral' },
  { nome: 'Cetoprofeno (Profenid)', principioAtivo: 'Cetoprofeno', fabricante: 'Sanofi / Eurofarma', categoria: 'Anti-inflamatório Não Esteroide (AINE)', formaFarmaceutica: 'Frasco-ampola 100mg / Cápsula 50mg', viaAdministracao: 'EV / IM / Oral' },
  { nome: 'Midazolam (Dormonid)', principioAtivo: 'Midazolam', fabricante: 'Roche / União Química', categoria: 'Sedativo / Benzodiazepínico', formaFarmaceutica: 'Ampola 5mg/5mL ou 15mg/3mL', viaAdministracao: 'EV / IM' },
  { nome: 'Propofol (Diprivan)', principioAtivo: 'Propofol', fabricante: 'AstraZeneca / Cristália', categoria: 'Anestésico Geral Intravenoso', formaFarmaceutica: 'Emulsão Injetável 10mg/mL (20mL)', viaAdministracao: 'EV' },
  { nome: 'Diazepam', principioAtivo: 'Diazepam', fabricante: 'União Química / Teuto', categoria: 'Benzodiazepínico / Anticonvulsivante', formaFarmaceutica: 'Ampola 10mg/2mL / Comprimido 10mg', viaAdministracao: 'EV / Oral' },
  { nome: 'Clonazepam (Rivotril)', principioAtivo: 'Clonazepam', fabricante: 'Roche', categoria: 'Benzodiazepínico', formaFarmaceutica: 'Comprimido 0,5mg / 2mg / Gotas 2,5mg/mL', viaAdministracao: 'Oral' },

  // Antimicrobianos
  { nome: 'Amoxicilina', principioAtivo: 'Amoxicilina', fabricante: 'Eurofarma / EMS', categoria: 'Antimicrobiano (Penicilina)', formaFarmaceutica: 'Cápsula 500mg / Suspensão', viaAdministracao: 'Oral' },
  { nome: 'Amoxicilina + Clavulanato de Potássio', principioAtivo: 'Amoxicilina + Clavulanato', fabricante: 'Aché / GlaxoSmithKline', categoria: 'Antimicrobiano Amplo Espectro', formaFarmaceutica: 'Comprimido 875mg+125mg / Frasco-ampola 1g', viaAdministracao: 'Oral / EV' },
  { nome: 'Ceftriaxona (Rocefin)', principioAtivo: 'Ceftriaxona Sódica', fabricante: 'Roche / Eurofarma', categoria: 'Cefalosporina de 3ª Geração', formaFarmaceutica: 'Frasco-ampola 1g', viaAdministracao: 'EV / IM' },
  { nome: 'Ciprofloxacino', principioAtivo: 'Cloridrato de Ciprofloxacino', fabricante: 'Bayer / Medley', categoria: 'Quinolona', formaFarmaceutica: 'Bolsa 200mg/100mL / Comprimido 500mg', viaAdministracao: 'EV / Oral' },
  { nome: 'Azitromicina', principioAtivo: 'Azitromicina', fabricante: 'Eurofarma / EMS', categoria: 'Macrolídeo', formaFarmaceutica: 'Comprimido 500mg / Frasco-ampola 500mg', viaAdministracao: 'Oral / EV' },
  { nome: 'Vancomicina', principioAtivo: 'Cloridrato de Vancomicina', fabricante: 'Teuto / Eurofarma', categoria: 'Glicopeptídeo', formaFarmaceutica: 'Frasco-ampola 500mg', viaAdministracao: 'EV' },
  { nome: 'Meropenem', principioAtivo: 'Meropenem Tri-hidratado', fabricante: 'AstraZeneca / Eurofarma', categoria: 'Carbapenêmico', formaFarmaceutica: 'Frasco-ampola 1g', viaAdministracao: 'EV' },
  { nome: 'Piperacilina + Tazobactam (Tazocin)', principioAtivo: 'Piperacilina + Tazobactam', fabricante: 'Pfizer / Eurofarma', categoria: 'Penicilina de Amplo Espectro', formaFarmaceutica: 'Frasco-ampola 4g + 0,5g', viaAdministracao: 'EV' },

  // Gastrointestinais, Corticoides & Outros
  { nome: 'Ondansetrona (Vonau Flash)', principioAtivo: 'Cloridrato de Ondansetrona', fabricante: 'Biolab / Eurofarma', categoria: 'Antiemético', formaFarmaceutica: 'Ampola 4mg/2mL ou 8mg/4mL / Comprimido 4mg', viaAdministracao: 'EV / Oral' },
  { nome: 'Metoclopramida (Plasil)', principioAtivo: 'Cloridrato de Metoclopramida', fabricante: 'Sanofi', categoria: 'Procinético e Antiemético', formaFarmaceutica: 'Ampola 10mg/2mL / Comprimido 10mg', viaAdministracao: 'EV / IM / Oral' },
  { nome: 'Omeprazol', principioAtivo: 'Omeprazol', fabricante: 'EMS / Medley / Eurofarma', categoria: 'Inibidor de Bomba de Prótons', formaFarmaceutica: 'Cápsula 20mg / Frasco-ampola 40mg', viaAdministracao: 'Oral / EV' },
  { nome: 'Hidrocortisona (Flebocortid)', principioAtivo: 'Succinato Sódico de Hidrocortisona', fabricante: 'Sanofi / União Química', categoria: 'Glicocorticoide Injetável', formaFarmaceutica: 'Frasco-ampola 100mg / 500mg', viaAdministracao: 'EV / IM' },
  { nome: 'Dexametasona (Decadron)', principioAtivo: 'Fosfato Dissódico de Dexametasona', fabricante: 'Aché', categoria: 'Glicocorticoide Potente', formaFarmaceutica: 'Ampola 4mg/mL ou 10mg/mL / Comprimido 4mg', viaAdministracao: 'EV / IM / Oral' },
  { nome: 'Enoxaparina (Clexane)', principioAtivo: 'Enoxaparina Sódica', fabricante: 'Sanofi / Eurofarma', categoria: 'Anticoagulante (HBPM)', formaFarmaceutica: 'Seringa Pré-enchida 20mg / 40mg / 60mg / 80mg', viaAdministracao: 'SC' },
  { nome: 'Insulina Regular Humana', principioAtivo: 'Insulina Humana', fabricante: 'Novo Nordisk / Lilly', categoria: 'Hipoglicemiante de Ação Rápida', formaFarmaceutica: 'Frasco 100 UI/mL', viaAdministracao: 'SC / EV' },
  { nome: 'Insulina NPH Humana', principioAtivo: 'Insulina Humana NPH', fabricante: 'Novo Nordisk / Lilly', categoria: 'Hipoglicemiante de Ação Intermediária', formaFarmaceutica: 'Frasco 100 UI/mL', viaAdministracao: 'SC' },
  { nome: 'Losartana Potássica', principioAtivo: 'Losartana', fabricante: 'Prati-Donaduzzi / Medley', categoria: 'Anti-hipertensivo (BRA)', formaFarmaceutica: 'Comprimido 50mg', viaAdministracao: 'Oral' },
  { nome: 'Metformina', principioAtivo: 'Cloridrato de Metformina', fabricante: 'Merck (Glifage) / EMS', categoria: 'Antidiabético Oral', formaFarmaceutica: 'Comprimido 500mg / 850mg', viaAdministracao: 'Oral' }
];

app.get('/api/anvisa/buscar', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Termo de busca muito curto.' });
  }

  const rawTerm = q.trim();
  const term = rawTerm.toLowerCase();
  const cleanTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  try {
    let medications = [];

    // 1. Busca no Catálogo Brasileiro (ANVISA / RENAME / Hospitalar)
    const localMatches = mockBrazilianDrugs.filter(d => {
      const nomeNorm = d.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const princNorm = (d.principioAtivo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nomeNorm.includes(cleanTerm) || princNorm.includes(cleanTerm);
    });

    if (localMatches.length > 0) {
      medications.push(...localMatches.map(m => ({ ...m, fonte: 'ANVISA / Catálogo Hospitalar' })));
    }

    // 2. Consulta à base farmacêutica OpenFDA
    const ptToEnMap = {
      'ringer': 'ringer',
      'soro': 'sodium chloride',
      'adrenalina': 'epinephrine',
      'noradrenalina': 'norepinephrine',
      'paracetamol': 'acetaminophen',
      'dipirona': 'metamizole',
      'morfina': 'morphine',
      'fentanil': 'fentanyl',
      'propofol': 'propofol',
      'insulina': 'insulin',
      'dexametasona': 'dexamethasone',
      'hidrocortisona': 'hydrocortisone',
      'ondansetrona': 'ondansetron',
      'furosemida': 'furosemide',
      'ceftriaxona': 'ceftriaxone',
      'ciprofloxacino': 'ciprofloxacin',
      'amoxicilina': 'amoxicillin',
      'azitromicina': 'azithromycin',
      'losartana': 'losartan',
      'metformina': 'metformin',
      'ibuprofeno': 'ibuprofen',
      'clonazepam': 'clonazepam',
      'diazepam': 'diazepam'
    };

    const searchKeyword = (ptToEnMap[cleanTerm] || cleanTerm).replace(/[^a-zA-Z0-9]/g, '');

    if (searchKeyword.length >= 2) {
      const makeRequest = (url) => {
        return new Promise((resolve) => {
          import('node:https').then(({ default: https }) => {
            const request = https.get(url, {
              headers: { 'User-Agent': 'HealthNexus/1.3.0 (hospital-system)' }
            }, (r) => {
              let data = '';
              r.on('data', c => data += c);
              r.on('end', () => {
                try { resolve({ ok: r.statusCode < 400, data: JSON.parse(data) }); }
                catch { resolve({ ok: false, data: null }); }
              });
            });
            request.on('error', () => resolve({ ok: false, data: null }));
            request.setTimeout(6000, () => { request.destroy(); resolve({ ok: false, data: null }); });
          });
        });
      };

      // Busca no OpenFDA com sintaxe Lucene compatível
      let result = await makeRequest(`https://api.fda.gov/drug/label.json?search=(openfda.generic_name:*${searchKeyword}*+OR+openfda.brand_name:*${searchKeyword}*+OR+openfda.substance_name:*${searchKeyword}*)&limit=6`);

      if (!result.ok || !result.data?.results) {
        result = await makeRequest(`https://api.fda.gov/drug/label.json?search=${searchKeyword}&limit=6`);
      }

      if (result.ok && result.data?.results) {
        const apiDrugs = result.data.results.map(item => {
          const openfda = item.openfda || {};
          const brand = openfda.brand_name?.[0];
          const generic = openfda.generic_name?.[0];
          const substance = openfda.substance_name?.[0];
          const nomeFinal = brand || generic || substance || item.package_label_principal_display_panel?.[0]?.slice(0, 45) || 'Medicamento';

          return {
            nome: nomeFinal,
            principioAtivo: generic || substance || 'N/D',
            fabricante: openfda.manufacturer_name?.[0] || 'Fabricante Internacional',
            categoria: openfda.pharm_class_epc?.[0] || 'Uso Farmacêutico',
            formaFarmaceutica: openfda.dosage_form?.[0] || 'N/D',
            viaAdministracao: openfda.route?.[0] || 'Oral / EV',
            rxcui: openfda.rxcui?.[0] || null,
            fonte: 'OpenFDA'
          };
        }).filter(m => m.nome && m.nome !== 'N/D');

        // Adiciona medicamentos da API sem duplicar os já existentes no catálogo
        apiDrugs.forEach(ad => {
          const adNorm = ad.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!medications.some(m => m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(adNorm))) {
            medications.push(ad);
          }
        });
      }
    }

    return res.json({ success: true, resultados: medications.slice(0, 25), total: medications.length });

  } catch (err) {
    console.error('[ANVISA] Erro:', err);
    return res.status(500).json({ error: 'Erro ao consultar base de medicamentos.' });
  }
});

// =========================================================
// 🩺 CFM — Verificação de CRM Médico
// =========================================================
app.get('/api/cfm/verificar', async (req, res) => {
  const { crm, uf } = req.query;

  if (!crm) return res.status(400).json({ error: 'CRM é obrigatório.' });

  // Parse CRM: accept formats like "123456-SP", "SP123456", "123456/SP", "123456"
  let crmNum = crm.replace(/[^0-9]/g, '').trim();
  let crmUF = uf || crm.replace(/[^a-zA-Z]/g, '').toUpperCase().trim() || 'SP';

  if (!crmNum || crmNum.length < 3) {
    return res.status(400).json({ error: 'Número de CRM inválido.' });
  }

  const ESTADOS_VALIDOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  if (crmUF && !ESTADOS_VALIDOS.includes(crmUF)) {
    return res.status(400).json({ error: `UF "${crmUF}" inválida.` });
  }

  try {
    const makeRequest = (url) => {
      return new Promise((resolve) => {
        import('node:https').then(({ default: https }) => {
          const req = https.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept': 'text/html,application/xhtml+xml,*/*',
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'Referer': 'https://portal.cfm.org.br/'
            }
          }, (r) => {
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => resolve({ status: r.statusCode, body: data }));
          });
          req.on('error', e => resolve({ status: 0, error: e.message }));
          req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
        });
      });
    };

    // Try CFM search portal
    const searchUrl = `https://portal.cfm.org.br/busca-medicos/?q=${crmNum}&uf=${crmUF}`;
    const result = await makeRequest(searchUrl);

    let dadosMedico = null;

    if (result.status === 200 && result.body) {
      // Parse HTML for doctor data
      const body = result.body;

      // Look for CRM match in the page
      const crmPattern = new RegExp(`CRM[\\s/]*${crmNum}`, 'i');
      const found = crmPattern.test(body);

      if (found) {
        // Try to extract name from common patterns
        const nameMatch = body.match(/class="[^"]*nome[^"]*"[^>]*>([^<]+)</i) ||
                          body.match(/<h[23][^>]*>([A-ZÁÉÍÓÚÂÊÔÃÕÀÇ][^<]{5,60})<\/h/);
        const specMatch = body.match(/class="[^"]*especialidade[^"]*"[^>]*>([^<]+)</i) ||
                          body.match(/Especialidade[^:]*:\s*([A-Za-záéíóúç\s]+)/i);

        dadosMedico = {
          crm: `${crmNum}/${crmUF}`,
          status: 'ATIVO',
          nome: nameMatch ? nameMatch[1].trim() : null,
          especialidade: specMatch ? specMatch[1].trim() : null,
          uf: crmUF,
          fonte: 'CFM Portal'
        };
      }
    }

    // Fallback: return format validation result
    if (!dadosMedico) {
      // CRM is considered valid by format if it follows: 1-6 digits + valid UF
      const isValidFormat = crmNum.length >= 4 && crmNum.length <= 7 && ESTADOS_VALIDOS.includes(crmUF);

      return res.json({
        success: true,
        validoFormato: isValidFormat,
        crm: `${crmNum}/${crmUF}`,
        uf: crmUF,
        numero: crmNum,
        status: isValidFormat ? 'FORMATO_VALIDO' : 'FORMATO_INVALIDO',
        mensagem: isValidFormat
          ? `CRM ${crmNum}/${crmUF} possui formato válido. Verifique no portal do CFM para confirmação completa.`
          : 'Formato de CRM inválido.',
        portalCfm: `https://portal.cfm.org.br/busca-medicos/?q=${crmNum}&uf=${crmUF}`,
        fonte: 'Validação de Formato'
      });
    }

    return res.json({ success: true, validoFormato: true, ...dadosMedico });

  } catch (err) {
    console.error('[CFM] Erro:', err);
    return res.status(500).json({ error: 'Erro ao verificar CRM.' });
  }
});

// --- CONFIGURAÇÕES DO BANCO E SISTEMA ---
app.get('/api/settings/turso/test', async (req, res) => {
  if (!tursoClient) {
    return res.status(400).json({ message: 'Banco Turso não configurado no backend.' });
  }
  try {
    await executeTursoWithTimeout(tursoClient.execute('SELECT 1'));
    res.status(200).json({ message: 'Conexão com Turso Cloud bem sucedida!' });
  } catch (error) {
    res.status(500).json({ message: 'Falha ao conectar no Turso Cloud: ' + (error?.message || error) });
  }
});

app.get('/api/settings/turso', (req, res) => {
  res.status(200).json({ url: process.env.TURSO_DATABASE_URL || 'Configurado' });
});

app.post('/api/settings/turso', async (req, res) => {
  const { url, token } = req.body;
  try {
    tursoClient = createClient({ url, authToken: token });
    res.status(200).json({ message: 'Credenciais atualizadas (apenas em memória no Vercel).' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar credenciais: ' + err.message });
  }
});

app.post('/api/settings/reset', async (req, res) => {
  try {
    if (tursoClient) {
      const now = Date.now();
      const emptyDB = req.body?.emptyDB || {
        patients: [],
        encounters: [],
        appointments: [],
        triages: [],
        prescriptions: [],
        clinical_notes: [],
        hospitalizations: [],
        financial_installments: [],
        financial_transactions: [],
        tv_calls: [],
        duty_schedules: [],
        stagnation_alerts: [],
        beds: []
      };
      await executeTursoWithRetry(() => tursoClient.execute({
        sql: `INSERT OR REPLACE INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES ('main', ?, '{}', ?)`,
        args: [typeof emptyDB === 'string' ? emptyDB : JSON.stringify(emptyDB), now]
      }));
      return res.status(200).json({ success: true, updated_at: now, message: 'Banco de dados plenamente zerado na nuvem e no servidor.' });
    }
    res.status(200).json({ success: true, message: 'Banco de dados zerado com sucesso.' });
  } catch (err) {
    console.warn('[Backend Reset] Aviso ao zerar no backend:', err.message);
    res.status(200).json({ success: true, message: 'Reset local concluído (aviso nuvem: ' + err.message + ')' });
  }
});

app.get('/api/settings/export', (req, res) => {
  res.status(200).json({ message: 'Export não implementado no Vercel.' });
});

app.post('/api/settings/import', (req, res) => {
  res.status(200).json({ message: 'Import não implementado no Vercel.' });
});

app.get('/api/dashboard/summary', (req, res) => {
  res.status(200).json({
    activePatients: 0,
    occupancyRate: 0,
    averageWaitTimeMinutes: 12,
    dailyAppointmentsCount: 0,
    billingSummary: { totalRevenue: 0, pendingClaims: 0 },
    occupancyData: [],
    appointmentsHistory: [],
    manchesterData: [0, 0, 0, 0, 0],
    funnelData: { recepcao: 0, triagem: 0, consultorio: 0, exames: 0, alta: 0 }
  });
});

// Catch-all

app.use((req, res) => {
  res.status(404).json({ error: 'Rota relacional legada não existe mais. Use offline-first architecture.' });
});

export const init = async () => {
  // Initialization se necessário (ex: garantir q tabelas locais legadas se foram, etc)
};

export default app;
