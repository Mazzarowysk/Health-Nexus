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

// Local DB — criado apenas quando Turso NÃO está disponível
export const localDb = hasTurso ? null : createClient({ url: 'file:local.db' });

// Objeto DB dinâmico: aponta dinamicamente para o cliente ativo (cloudDb ou localDb)
// Permite que reconexões (reconnectCloud) atualizem o cliente sem quebrar as referências existentes
export const db = {
  execute: (...args) => {
    const active = hasTurso ? cloudDb : localDb;
    if (!active) throw new Error('[DB Error] Nenhum cliente de banco de dados disponível.');
    return active.execute(...args);
  },
  batch: (...args) => {
    const active = hasTurso ? cloudDb : localDb;
    if (!active) throw new Error('[DB Error] Nenhum cliente de banco de dados disponível.');
    return active.batch(...args);
  },
  transaction: (...args) => {
    const active = hasTurso ? cloudDb : localDb;
    if (!active) throw new Error('[DB Error] Nenhum cliente de banco de dados disponível.');
    return active.transaction(...args);
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
