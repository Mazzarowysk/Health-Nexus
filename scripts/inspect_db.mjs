import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:local.db' });

(async () => {
  try {
    const res = await db.execute('SELECT id, username, name, created_at FROM users');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Erro ao consultar users:', e);
    process.exit(1);
  }
})();
