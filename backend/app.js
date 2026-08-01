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
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && authToken) {
    tursoClient = createClient({ url, authToken });
    console.log('[Backend] Conectado ao Turso.');
  } else {
    console.warn('[Backend] Aviso: TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN não configurado. Sincronização em nuvem não funcionará localmente.');
  }
};
initTurso();

// Endpoint de sincronização (simula api/turso.js)
app.all('/api/turso', async (req, res) => {
  if (!tursoClient) {
    return res.status(500).json({ error: 'Configuração do Turso ausente no servidor local.' });
  }

  try {
    const { method } = req;

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS ocz_sync (
        id TEXT PRIMARY KEY,
        dados_json TEXT,
        config_json TEXT,
        updated_at INTEGER
      );
    `);

    const SYNC_ID = 'main';
    const result = await tursoClient.execute({
      sql: 'SELECT * FROM ocz_sync WHERE id = ?',
      args: [SYNC_ID]
    });
    const currentSync = result.rows[0];

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
        await tursoClient.execute({
          sql: 'UPDATE ocz_sync SET dados_json = ?, config_json = ?, updated_at = ? WHERE id = ?',
          args: [dados_json, config_json, newUpdatedAt, SYNC_ID]
        });
      } else {
        await tursoClient.execute({
          sql: 'INSERT INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES (?, ?, ?, ?)',
          args: [SYNC_ID, dados_json, config_json, newUpdatedAt]
        });
      }

      return res.status(200).json({ success: true, updated_at: newUpdatedAt });
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Turso Sync API Error:', error);
    res.status(500).json({ error: 'Erro interno de sincronização' });
  }
});

// Mock login (just in case Vite hits it, though main.js intercepts it)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'offline-token', user: { id: 'USR-ADMIN', role: 'Administrador' } });
});

// Catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Rota relacional legada não existe mais. Use offline-first architecture.' });
});

export const init = async () => {
  // Initialization se necessário (ex: garantir q tabelas locais legadas se foram, etc)
};

export default app;
