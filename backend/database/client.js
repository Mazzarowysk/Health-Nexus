import dns from 'dns';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dns.setDefaultResultOrder('ipv4first');

dotenv.config();

// 🛡️ v10.5: Vault de Credenciais Protegidas
export const _VAULT = {
    u: 'bGlic3FsOi8vaGVhbHRoLW5leHVzLW1henphcm93eXNrLmF3cy11cy1lYXN0LTEudHVyc28uaW8=',
    t: 'ZXlKaGJHY2lPaUpGWkVSVFFTSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmhJam9pY25jaUxDSnBZWFFpT2pFM09EVXlPVEUzTnpjc0ltbGtJam9pTURFNVpqYzFZbVl0TVRVd01TMDNZbU15TFRsa1lUUXRaVEExWkdJeE16ZGlZakV5SWl3aWEybGtJam9pVTBSWldFdElOa0l6WldnMWIzSnRSREJQUlhwVWJtaFVhR3BGTWxsWFJYSnhiamhDTlZGblNtVkxaeUlzSW5KcFpDSTZJamc0WVRZMk5qTTBMVE0zWVdRdE5HRXlaQzA0Wm1VeExURm1Zak0zWkRBeE5HRTRZaUo5LkN0NzN1TjJvc005SUxBd3REeEZGeDFnQVVlN01wTVFuMmh2d1NVQ1l4VjUwTXl6SWtHT3hlLWp0ODR5eTNmamJkb29ZYjVQaW9OQ3Bmd2kzeWttLURn'
};

export const _restaurarCredenciaisProtegidas = () => {
    try {
        const url = Buffer.from(_VAULT.u, 'base64').toString('utf-8');
        const token = Buffer.from(_VAULT.t.replace(/\s+/g, ''), 'base64').toString('utf-8');
        return { url, token };
    } catch (e) {
        return { url: '', token: '' };
    }
};

const vaultCreds = _restaurarCredenciaisProtegidas();

let cloudUrl = process.env.TURSO_DATABASE_URL || vaultCreds.url;
let cloudToken = process.env.TURSO_AUTH_TOKEN || vaultCreds.token;
const isVercel = !!process.env.VERCEL;
let hasTurso = !!cloudUrl;

// Factory: sempre cria um novo cliente Turso
export const createCloudClient = () => {
  if (!cloudUrl) return null;
  return createClient({ url: cloudUrl, authToken: cloudToken });
};

// Cloud DB (Turso) — instância inicial
export let cloudDb = createCloudClient();

// Reconectar: descarta o cliente atual e cria um novo
export const reconnectCloud = () => {
  try { cloudDb?.close?.(); } catch (_) {}
  cloudDb = createCloudClient();
  tursoOffline = false;
  hasTurso = !!cloudUrl;
  console.log('[DB] Turso: nova conexão criada (ou resetada).');
  return cloudDb;
};

export const getCloudDb = () => tursoOffline ? null : cloudDb;

// Local DB — criado sempre no ambiente local para garantir fallback
export const localDb = isVercel ? null : createClient({ url: 'file:local.db' });

export const updateCloudCredentials = async (url, token) => {
  cloudUrl = url || '';
  cloudToken = token || '';
  hasTurso = !!cloudUrl;
  
  if (localDb) {
    await localDb.execute(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)`);
    await localDb.execute({ sql: `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('turso_url', ?)`, args: [cloudUrl] });
    await localDb.execute({ sql: `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('turso_token', ?)`, args: [cloudToken] });
  }
  reconnectCloud();
  console.log('[DB] Turso credentials updated dynamically.');
};

export const loadCloudCredentials = async () => {
  if (isVercel || !localDb) return;
  try {
    await localDb.execute(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)`);
    const resUrl = await localDb.execute(`SELECT value FROM app_settings WHERE key = 'turso_url'`);
    const resToken = await localDb.execute(`SELECT value FROM app_settings WHERE key = 'turso_token'`);
    if (resUrl.rows.length > 0 && resUrl.rows[0].value) {
      cloudUrl = resUrl.rows[0].value;
      cloudToken = resToken.rows.length > 0 ? resToken.rows[0].value : '';
      if (!cloudToken || cloudToken.includes('***') || cloudToken.includes('...')) {
         const vaultCreds = _restaurarCredenciaisProtegidas();
         cloudToken = process.env.TURSO_AUTH_TOKEN || vaultCreds.token;
      }
    } else {
      // Se não houver nada no app_settings, tenta do env ou vault
      const vaultCreds = _restaurarCredenciaisProtegidas();
      cloudUrl = process.env.TURSO_DATABASE_URL || vaultCreds.url;
      cloudToken = process.env.TURSO_AUTH_TOKEN || vaultCreds.token;
    }
    
    if (cloudUrl) {
      hasTurso = true;
      reconnectCloud();
      console.log('[DB] Turso credentials loaded (app_settings or vault).');
    }
  } catch (err) {
    console.error('[DB] Erro ao carregar app_settings:', err.message);
  }
};

let tursoOffline = false;

// Objeto DB dinâmico com fallback automático (Graceful Degradation)
// Helper to extract table and operation for sync queue
function getMutationInfo(args) {
  if (!args || args.length === 0) return null;
  const sql = (typeof args[0] === 'string' ? args[0] : args[0].sql).trim().toUpperCase();
  let operation = null;
  let table = 'unknown';
  let record_id = 'unknown';

  if (sql.startsWith('INSERT INTO') || sql.startsWith('INSERT OR REPLACE INTO')) {
    operation = 'INSERT';
    table = sql.split(' ')[sql.startsWith('INSERT OR REPLACE') ? 4 : 2];
  } else if (sql.startsWith('UPDATE')) {
    operation = 'UPDATE';
    table = sql.split(' ')[1];
  } else if (sql.startsWith('DELETE FROM')) {
    operation = 'DELETE';
    table = sql.split(' ')[2];
  } else {
    return null;
  }

  const params = typeof args[0] === 'string' ? args[1] : args[0].args;
  if (params && params.length > 0) {
    if (operation === 'INSERT') record_id = params[0];
    else if (operation === 'UPDATE' || operation === 'DELETE') record_id = params[params.length - 1];
  }

  return { operation, table, record_id };
}

// Objeto DB dinâmico com modo Híbrido (Local offline-first vs Vercel cloud-first)
export const db = {
  execute: async (...args) => {
    // Modo Vercel: Roda direto no Turso
    if (isVercel) {
      if (!cloudDb) throw new Error('[DB Error] Turso não configurado no Vercel.');
      const result = await cloudDb.execute(...args);

      // Intercepta mutações no Vercel para atualizar a versão da nuvem
      const mut = getMutationInfo(args);
      if (mut && !['sync_queue', 'sync_metadata', 'sync_logs', 'sync_logs_detailed', 'health_sync'].includes(mut.table)) {
        try {
          const now = Date.now();
          await cloudDb.execute({
            sql: `INSERT INTO sync_metadata (id, last_update_time) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_update_time = ?`,
            args: [now, now]
          });
        } catch (e) {
          console.error('[Sync Vercel] Falha ao atualizar metadata na nuvem:', e.message);
        }
      }
      return result;
    }

    // Modo Local: Roda no localDb (SQLite)
    if (!localDb) throw new Error('[DB Error] Banco local não disponível.');
    const result = await localDb.execute(...args);

    // Intercepta mutações para a Fila de Sincronização
    const mut = getMutationInfo(args);
    if (mut && !['sync_queue', 'sync_metadata', 'sync_logs', 'sync_logs_detailed', 'health_sync'].includes(mut.table)) {
      try {
        const queueSql = `INSERT INTO sync_queue (table_name, row_id, operation, status) VALUES (?, ?, ?, 'pending')`;
        await localDb.execute({ sql: queueSql, args: [mut.table, String(mut.record_id), mut.operation] });
        
        const metaSql = `INSERT INTO sync_metadata (id, last_update_time) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_update_time = ?`;
        const now = Date.now();
        await localDb.execute({ sql: metaSql, args: [now, now] });
      } catch (e) {
        console.error('[Sync] Falha ao registrar na fila de sincronização:', e.message);
      }
    }

    return result;
  },
  batch: async (...args) => {
    if (isVercel) {
      if (!cloudDb) throw new Error('[DB Error] Turso não configurado no Vercel.');
      const result = await cloudDb.batch(...args);
      try {
        const now = Date.now();
        await cloudDb.execute({
          sql: `INSERT INTO sync_metadata (id, last_update_time) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_update_time = ?`,
          args: [now, now]
        });
      } catch (e) {}
      return result;
    }
    return await localDb.batch(...args);
  },
  transaction: async (...args) => {
    if (isVercel) {
      if (!cloudDb) throw new Error('[DB Error] Turso não configurado no Vercel.');
      const result = await cloudDb.transaction(...args);
      try {
        const now = Date.now();
        await cloudDb.execute({
          sql: `INSERT INTO sync_metadata (id, last_update_time) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_update_time = ?`,
          args: [now, now]
        });
      } catch (e) {}
      return result;
    }
    return await localDb.transaction(...args);
  }
};

if (!hasTurso) {
  console.warn('[AVISO] TURSO_DATABASE_URL nao configurado. Usando banco LOCAL (dados nao persistidos na nuvem!)');
} else if (!cloudDb) {
  console.error('[FATAL] Turso configurado mas falhou ao conectar!');
}

console.log('[DEBUG] Ambiente Vercel:', isVercel);
console.log('[DEBUG] Banco ativo:', hasTurso ? 'Cloud Turso (persistencia garantida com reconexão dinâmica)' : 'Local SQLite (local.db)');
console.log('[DEBUG] TURSO_DATABASE_URL:', cloudUrl ? cloudUrl.substring(0, 40) + '...' : 'NAO CONFIGURADO');

// --- HEALTH CHECK PERIODICO: reconecta Turso quando voltar online ---
const HEALTH_CHECK_MS = 5 * 60 * 1000; // 5 minutos
if (hasTurso && !isVercel) {
  setInterval(async () => {
    if (!tursoOffline) return; // só verifica quando está offline
    try {
      const client = createCloudClient();
      if (!client) return;
      await client.execute('SELECT 1');
      client.close?.();
      reconnectCloud(); // reseta cloudDb + tursoOffline
      console.log('[DB Health] Turso reconectado com sucesso via health check.');
    } catch (_) {
      // continua offline, tenta novamente no próximo ciclo
    }
  }, HEALTH_CHECK_MS);
}
