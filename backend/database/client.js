import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const cloudUrl = process.env.TURSO_DATABASE_URL || '';
const cloudToken = process.env.TURSO_AUTH_TOKEN || '';
const isVercel = !!process.env.VERCEL;

// Cloud DB (Turso) — usado no Vercel e para sincronização local
export const cloudDb = cloudUrl ? createClient({ url: cloudUrl, authToken: cloudToken }) : null;

// Local DB — criado apenas fora do Vercel (Vercel tem filesystem somente-leitura)
export const localDb = isVercel ? null : createClient({ url: 'file:local.db' });

// Banco ativo: no Vercel usa cloudDb obrigatoriamente; localmente usa localDb
export const db = (isVercel && cloudDb) ? cloudDb : localDb;

if (isVercel && !cloudDb) {
  console.error('[FATAL] Vercel detectado mas TURSO_DATABASE_URL não está configurado!');
}

console.log('[DEBUG] Ambiente Vercel:', isVercel);
console.log('[DEBUG] Banco ativo:', isVercel ? 'Cloud Turso' : 'Local SQLite (local.db)');
console.log('[DEBUG] TURSO_DATABASE_URL:', cloudUrl ? cloudUrl.substring(0, 40) + '...' : 'NÃO CONFIGURADO');
