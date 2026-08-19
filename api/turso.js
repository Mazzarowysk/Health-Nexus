import { createClient } from '@libsql/client';

const executeWithRetry = async (fn, retries = 2, delayMs = 600) => {
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

export default async function handler(req, res) {
  // Configuração do Turso Client
  const url = process.env.TURSO_DATABASE_URL || 'libsql://health-nexus-mazzarowysk.aws-us-east-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';

  const client = createClient({ url, authToken });

  try {
    const { method } = req;
    
    // Assegura que a tabela ocz_sync existe
    await executeWithRetry(() => client.execute(`
      CREATE TABLE IF NOT EXISTS ocz_sync (
        id TEXT PRIMARY KEY,
        dados_json TEXT,
        config_json TEXT,
        updated_at INTEGER
      );
    `));

    // ID fixo para sincronização global "main"
    const SYNC_ID = 'main';
    const result = await executeWithRetry(() => client.execute({
      sql: 'SELECT id, updated_at, dados_json, config_json FROM ocz_sync WHERE id = ?',
      args: [SYNC_ID]
    }));
    const currentSync = result && result.rows ? result.rows[0] : null;

    // GET /api/turso?status=1 (Heartbeat rápido)
    if (method === 'GET' && (req.url.includes('status') || req.query?.status === '1')) {
      return res.status(200).json({ 
        success: true,
        offline: false,
        updated_at: currentSync ? Number(currentSync.updated_at) : 0 
      });
    }

    // GET /api/turso (Download completo da nuvem)
    if (method === 'GET') {
      if (!currentSync) {
        return res.status(200).json({ 
          success: true,
          updated_at: 0, 
          dados_json: '{}', 
          config_json: '{}' 
        });
      }
      return res.status(200).json({
        success: true,
        offline: false,
        updated_at: Number(currentSync.updated_at),
        dados_json: currentSync.dados_json,
        config_json: currentSync.config_json
      });
    }

    // POST /api/turso (Upload completo para a nuvem)
    if (method === 'POST') {
      const { dados_json, config_json } = req.body || {};
      
      if (!dados_json) {
        return res.status(400).json({ success: false, error: 'dados_json ausente no corpo da requisição.' });
      }

      const newUpdatedAt = Date.now();
      
      if (currentSync) {
        await executeWithRetry(() => client.execute({
          sql: 'UPDATE ocz_sync SET dados_json = ?, config_json = ?, updated_at = ? WHERE id = ?',
          args: [dados_json, config_json || '{}', newUpdatedAt, SYNC_ID]
        }));
      } else {
        await executeWithRetry(() => client.execute({
          sql: 'INSERT INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES (?, ?, ?, ?)',
          args: [SYNC_ID, dados_json, config_json || '{}', newUpdatedAt]
        }));
      }

      return res.status(200).json({ 
        success: true, 
        offline: false,
        updated_at: newUpdatedAt,
        bytes_synced: (dados_json || '').length
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  } catch (error) {
    console.error('[Turso Vercel Handler] Erro ao conectar no Turso Cloud:', error?.message || error);
    
    if (req.method === 'GET' && (req.url.includes('status') || req.query?.status === '1')) {
      return res.status(200).json({ updated_at: 0, offline: true, error: error?.message });
    }
    
    // Para GET/POST de sincronização, retornar erro explícito (503 Service Unavailable) para o cliente não achar que salvou
    return res.status(503).json({ 
      success: false, 
      offline: true, 
      error: `Falha na comunicação com o Turso Cloud: ${error?.message || 'Timeout'}` 
    });
  }
}
