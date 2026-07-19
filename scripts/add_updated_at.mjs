import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:local.db' });

(async () => {
  try {
    try {
      await db.execute('ALTER TABLE patients ADD COLUMN updated_at TEXT');
      console.log('Coluna updated_at adicionada.');
    } catch (e) {
      console.log('ALTER TABLE falhou (provavelmente já existe):', e.message || e);
    }

    try {
      await db.execute("UPDATE patients SET updated_at = COALESCE(updated_at, created_at)");
      console.log('Campos updated_at atualizados onde estavam nulos.');
    } catch (e) {
      console.log('Erro ao atualizar valores de updated_at:', e.message || e);
    }

    process.exit(0);
  } catch (e) {
    console.error('Erro geral:', e);
    process.exit(1);
  }
})();
