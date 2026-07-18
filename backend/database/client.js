import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

console.log('[DEBUG] Conectando ao Turso URL:', url ? url.substring(0, 30) + '...' : 'null');

export const db = createClient({
  url,
  authToken
});
