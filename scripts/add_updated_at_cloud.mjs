import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

const cloudUrl = process.env.TURSO_DATABASE_URL;
const cloudToken = process.env.TURSO_AUTH_TOKEN;

if (!cloudUrl || !cloudToken) {
  console.error('TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN não configurados no .env');
  process.exit(1);
}

const cloudDb = createClient({ url: cloudUrl, authToken: cloudToken });

(async () => {
  try {
    try {
      await cloudDb.execute('ALTER TABLE patients ADD COLUMN updated_at TEXT');
      console.log('Coluna updated_at adicionada na nuvem.');
    } catch (e) {
      console.log('ALTER TABLE na nuvem falhou (provavelmente já existe):', e.message || e);
    }

    try {
      await cloudDb.execute("UPDATE patients SET updated_at = COALESCE(updated_at, created_at)");
      console.log('Campos updated_at atualizados na nuvem onde estavam nulos.');
    } catch (e) {
      console.log('Erro ao atualizar valores de updated_at na nuvem:', e.message || e);
    }

    process.exit(0);
  } catch (e) {
    console.error('Erro geral na nuvem:', e);
    process.exit(1);
  }
})();
