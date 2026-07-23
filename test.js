const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:local.db' });
db.execute('SELECT * FROM users').then(r => console.log(r.rows));
