import dns from 'dns';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const cloudUrl = process.env.TURSO_DATABASE_URL || '';
const cloudToken = process.env.TURSO_AUTH_TOKEN || '';
const isVercel = !!process.env.VERCEL;

// Factory: sempre cria um novo cliente Turso (necessário para reconectar sockets expirados)
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

// Local DB — criado apenas fora do Vercel
export const localDb = isVercel ? null : createClient({ url: 'file:local.db' });

// Banco ativo: no Vercel usa cloudDb; localmente usa localDb
export const db = (isVercel && cloudDb) ? cloudDb : localDb;

if (isVercel && !cloudDb) {
  console.error('[FATAL] Vercel detectado mas TURSO_DATABASE_URL não está configurado!');
}

console.log('[DEBUG] Ambiente Vercel:', isVercel);
console.log('[DEBUG] Banco ativo:', isVercel ? 'Cloud Turso' : 'Local SQLite (local.db)');
console.log('[DEBUG] TURSO_DATABASE_URL:', cloudUrl ? cloudUrl.substring(0, 40) + '...' : 'NÃO CONFIGURADO');
