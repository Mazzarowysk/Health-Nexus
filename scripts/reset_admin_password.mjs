import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

const db = createClient({ url: 'file:local.db' });

(async () => {
  try {
    const hash = await bcrypt.hash('admin', 10);
    await db.execute({ sql: 'UPDATE users SET password_hash = ? WHERE username = ?', args: [hash, 'admin'] });
    console.log('Senha de admin redefinida para: admin');
    process.exit(0);
  } catch (e) {
    console.error('Erro ao redefinir senha do admin:', e);
    process.exit(1);
  }
})();
