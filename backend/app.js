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

// Helper de timeout para evitar travamento e socket reset
const executeTursoWithTimeout = (promise, ms = 3500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Turso connection timeout')), ms))
  ]);
};

// Endpoint de sincronização (simula api/turso.js)
app.all('/api/turso', async (req, res) => {
  if (!tursoClient) {
    return res.status(200).json({ updated_at: 0, offline: true, error: 'Configuração do Turso ausente.' });
  }

  try {
    const { method } = req;

    await executeTursoWithTimeout(tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS ocz_sync (
        id TEXT PRIMARY KEY,
        dados_json TEXT,
        config_json TEXT,
        updated_at INTEGER
      );
    `));

    const SYNC_ID = 'main';
    const result = await executeTursoWithTimeout(tursoClient.execute({
      sql: 'SELECT * FROM ocz_sync WHERE id = ?',
      args: [SYNC_ID]
    }));
    const currentSync = result && result.rows ? result.rows[0] : null;

    // Status (Heartbeat)
    if (method === 'GET' && req.query.status === '1') {
      return res.status(200).json({ 
        updated_at: currentSync ? currentSync.updated_at : 0 
      });
    }

    // Download
    if (method === 'GET') {
      if (!currentSync) {
        return res.status(200).json({ updated_at: 0, dados_json: '{}', config_json: '{}' });
      }
      return res.status(200).json({
        updated_at: currentSync.updated_at,
        dados_json: currentSync.dados_json,
        config_json: currentSync.config_json
      });
    }

    // Upload
    if (method === 'POST') {
      const { dados_json, config_json } = req.body;
      const newUpdatedAt = Date.now();
      
      if (currentSync) {
        await executeTursoWithTimeout(tursoClient.execute({
          sql: 'UPDATE ocz_sync SET dados_json = ?, config_json = ?, updated_at = ? WHERE id = ?',
          args: [dados_json, config_json, newUpdatedAt, SYNC_ID]
        }));
      } else {
        await executeTursoWithTimeout(tursoClient.execute({
          sql: 'INSERT INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES (?, ?, ?, ?)',
          args: [SYNC_ID, dados_json, config_json, newUpdatedAt]
        }));
      }

      return res.status(200).json({ success: true, updated_at: newUpdatedAt });
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.warn('[Turso Sync] Conexão com Turso Cloud falhou ou expirou (operando offline):', error?.message || error);
    // Em caso de falha de conexão com a nuvem (timeout ou token offline), responde gracioso 200 para não quebrar a aplicação
    if (req.method === 'GET' && req.query.status === '1') {
      return res.status(200).json({ updated_at: 0, offline: true });
    }
    res.status(200).json({ updated_at: 0, offline: true, error: 'Turso Cloud indisponível.' });
  }
});

// Mock login (just in case Vite hits it, though main.js intercepts it)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'offline-token', user: { id: 'USR-ADMIN', role: 'Administrador' } });
});

// =========================================================
// 💊 ANVISA — Busca de Medicamentos via OpenFDA (gratuito)
// =========================================================

// Mock de medicamentos brasileiros comuns (fallback/autocomplete offline)
const mockBrazilianDrugs = [
  { nome: 'Dipirona Sódica', principioAtivo: 'Dipirona', fabricante: 'Medley / EMS', categoria: 'Analgésico e Antipirético', formaFarmaceutica: 'Comprimido / Gotas / Injetável', viaAdministracao: 'Oral / IV / IM' },
  { nome: 'Paracetamol', principioAtivo: 'Paracetamol', fabricante: 'Neo Química', categoria: 'Analgésico e Antipirético', formaFarmaceutica: 'Comprimido / Gotas', viaAdministracao: 'Oral' },
  { nome: 'Amoxicilina', principioAtivo: 'Amoxicilina', fabricante: 'Eurofarma', categoria: 'Antimicrobiano (Penicilina)', formaFarmaceutica: 'Cápsula / Suspensão', viaAdministracao: 'Oral' },
  { nome: 'Amoxicilina + Clavulanato de Potássio', principioAtivo: 'Amoxicilina + Clavulanato', fabricante: 'Aché', categoria: 'Antimicrobiano de Amplo Espectro', formaFarmaceutica: 'Comprimido Revestido / Suspensão', viaAdministracao: 'Oral' },
  { nome: 'Ibuprofeno', principioAtivo: 'Ibuprofeno', fabricante: 'Medley', categoria: 'AINEs (Anti-inflamatório Não Esteroide)', formaFarmaceutica: 'Comprimido / Gotas', viaAdministracao: 'Oral' },
  { nome: 'Omeprazol', principioAtivo: 'Omeprazol', fabricante: 'EMS', categoria: 'Inibidor de Bomba de Prótons', formaFarmaceutica: 'Cápsula', viaAdministracao: 'Oral' },
  { nome: 'Losartana Potássica', principioAtivo: 'Losartana', fabricante: 'Prati-Donaduzzi', categoria: 'Anti-hipertensivo (BRA)', formaFarmaceutica: 'Comprimido', viaAdministracao: 'Oral' },
  { nome: 'Simeticona', principioAtivo: 'Simeticona', fabricante: 'Bayer (Luftal)', categoria: 'Antiflatulento', formaFarmaceutica: 'Comprimido / Gotas', viaAdministracao: 'Oral' },
  { nome: 'Clonazepam', principioAtivo: 'Clonazepam', fabricante: 'Roche (Rivotril)', categoria: 'Benzodiazepínico', formaFarmaceutica: 'Comprimido / Gotas', viaAdministracao: 'Oral' },
  { nome: 'Azitromicina', principioAtivo: 'Azitromicina', fabricante: 'Eurofarma', categoria: 'Antimicrobiano (Macrolídeo)', formaFarmaceutica: 'Comprimido / Suspensão', viaAdministracao: 'Oral' },
  { nome: 'Metformina', principioAtivo: 'Cloridrato de Metformina', fabricante: 'Merck (Glifage)', categoria: 'Antidiabético Oral', formaFarmaceutica: 'Comprimido', viaAdministracao: 'Oral' },
  { nome: 'Loratadina', principioAtivo: 'Loratadina', fabricante: 'Cimed', categoria: 'Anti-histamínico (Antialérgico)', formaFarmaceutica: 'Comprimido / Xarope', viaAdministracao: 'Oral' }
];

app.get('/api/anvisa/buscar', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Termo de busca muito curto.' });
  }

  const term = q.trim().toLowerCase();

  try {
    let medications = [];

    // 1. Busca Local (Medicamentos Brasileiros)
    const localMatches = mockBrazilianDrugs.filter(d => 
      d.nome.toLowerCase().includes(term) || d.principioAtivo.toLowerCase().includes(term)
    );

    if (localMatches.length > 0) {
      medications = localMatches.map(m => ({ ...m, fonte: 'ANVISA (Mock Local)' }));
    } else {
      // 2. OpenFDA Drug Label search (fallback para busca internacional)
      const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
      const fetchFn = fetch || (await import('node:https').then(() => null));

      const makeRequest = (url) => {
        return new Promise((resolve) => {
          import('node:https').then(({ default: https }) => {
            const req = https.get(url, {
              headers: { 'User-Agent': 'HealthNexus/1.3.0 (hospital-system)' }
            }, (r) => {
              let data = '';
              r.on('data', c => data += c);
              r.on('end', () => {
                try { resolve({ ok: r.statusCode < 400, data: JSON.parse(data) }); }
                catch { resolve({ ok: false, data: null }); }
              });
            });
            req.on('error', () => resolve({ ok: false, data: null }));
            req.setTimeout(8000, () => { req.destroy(); resolve({ ok: false, data: null }); });
          });
        });
      };

      const encodedTerm = encodeURIComponent(term);
      // Search OpenFDA by generic name
      let result = await makeRequest(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodedTerm}"&limit=5`);

      if (!result.ok || !result.data?.results) {
        // Fallback to brand name
        result = await makeRequest(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodedTerm}"&limit=5`);
      }

      if (result.ok && result.data?.results) {
        medications = result.data.results.map(item => {
          const openfda = item.openfda || {};
          return {
            nome: openfda.brand_name?.[0] || openfda.generic_name?.[0] || 'N/D',
            principioAtivo: openfda.generic_name?.[0] || 'N/D',
            fabricante: openfda.manufacturer_name?.[0] || 'N/D',
            categoria: openfda.pharm_class_epc?.[0] || 'N/D',
            formaFarmaceutica: openfda.dosage_form?.[0] || 'N/D',
            viaAdministracao: openfda.route?.[0] || 'N/D',
            rxcui: openfda.rxcui?.[0] || null,
            fonte: 'OpenFDA'
          };
        });
      }
    }
    return res.json({ success: true, resultados: medications, total: medications.length });

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

// Catch-all

app.use((req, res) => {
  res.status(404).json({ error: 'Rota relacional legada não existe mais. Use offline-first architecture.' });
});

export const init = async () => {
  // Initialization se necessário (ex: garantir q tabelas locais legadas se foram, etc)
};

export default app;
