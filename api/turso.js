import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // Configuração do Turso Client
  const url = process.env.TURSO_DATABASE_URL || 'libsql://health-nexus-mazzarowysk.aws-us-east-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';

  const client = createClient({ url, authToken });

  try {
    const { method } = req;
    
    // Assegura que a tabela ocz_sync existe
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ocz_sync (
        id TEXT PRIMARY KEY,
        dados_json TEXT,
        config_json TEXT,
        updated_at INTEGER
      );
    `);

    // Busca o registro único (ID fixo "main")
    const SYNC_ID = 'main';
    const result = await client.execute({
      sql: 'SELECT * FROM ocz_sync WHERE id = ?',
      args: [SYNC_ID]
    });
    const currentSync = result.rows[0];

    // GET /api/turso/sync-status (Heartbeat) - Na Vercel todas rotas em api/turso.js entram aqui, usaremos os query params ou um header, mas para simplificar, usarei req.url
    if (method === 'GET' && req.url.includes('status')) {
      return res.status(200).json({ 
        updated_at: currentSync ? currentSync.updated_at : 0 
      });
    }

    // GET /api/turso/sync (Download completo)
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

    // POST /api/turso/sync (Upload completo)
    if (method === 'POST') {
      const { dados_json, config_json } = req.body;
      const newUpdatedAt = Date.now();
      
      if (currentSync) {
        await client.execute({
          sql: 'UPDATE ocz_sync SET dados_json = ?, config_json = ?, updated_at = ? WHERE id = ?',
          args: [dados_json, config_json, newUpdatedAt, SYNC_ID]
        });
      } else {
        await client.execute({
          sql: 'INSERT INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES (?, ?, ?, ?)',
          args: [SYNC_ID, dados_json, config_json, newUpdatedAt]
        });
      }

      return res.status(200).json({ success: true, updated_at: newUpdatedAt });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error('Turso Sync API Error:', error);
    res.status(500).json({ error: 'Erro interno de sincronização' });
  }
}
