import dns from 'dns';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const cloudUrl = process.env.TURSO_DATABASE_URL || '';
const cloudToken = process.env.TURSO_AUTH_TOKEN || '';
const isVercel = !!process.env.VERCEL;
const hasTurso = !!cloudUrl;

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
  console.log('[DB] Turso: nova conexão criada após falha.');
  return cloudDb;
};

// Local DB — criado sempre no ambiente local para garantir fallback
export const localDb = isVercel ? null : createClient({ url: 'file:local.db' });

let tursoOffline = false;

// Objeto DB dinâmico com fallback automático (Graceful Degradation)
export const db = {
  execute: async (...args) => {
    if (hasTurso && !tursoOffline) {
      try {
        return await cloudDb.execute(...args);
      } catch (err) {
        if (err.message?.includes('fetch failed') || err.message?.includes('timeout') || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
          console.warn('[DB Fallback] Turso indisponível (timeout). Alternando para banco local temporariamente...');
          tursoOffline = true; // Desativa Turso para as próximas chamadas rápidas
          if (localDb) return await localDb.execute(...args);
        }
        throw err;
      }
    }
    if (!localDb) throw new Error('[DB Error] Nenhum cliente de banco de dados disponível.');
    return await localDb.execute(...args);
  },
  batch: async (...args) => {
    if (hasTurso && !tursoOffline) {
      try {
        return await cloudDb.batch(...args);
      } catch (err) {
        if (err.message?.includes('fetch failed') || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
          tursoOffline = true;
          if (localDb) return await localDb.batch(...args);
        }
        throw err;
      }
    }
    if (!localDb) throw new Error('[DB Error] Nenhum banco disponível.');
    return await localDb.batch(...args);
  },
  transaction: async (...args) => {
    if (hasTurso && !tursoOffline) {
      try {
        return await cloudDb.transaction(...args);
      } catch (err) {
        if (err.message?.includes('fetch failed') || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
          tursoOffline = true;
          if (localDb) return await localDb.transaction(...args);
        }
        throw err;
      }
    }
    if (!localDb) throw new Error('[DB Error] Nenhum banco disponível.');
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
