import { createClient } from '@libsql/client';

async function run() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://health-nexus-mazzarowysk.aws-us-east-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';

  const client = createClient({ url, authToken });

  console.log("Fetching from Turso...");
  const result = await client.execute({
    sql: 'SELECT * FROM ocz_sync WHERE id = ?',
    args: ['main']
  });

  if (result.rows.length === 0) {
    console.log("No sync data found.");
    return;
  }

  const currentSync = result.rows[0];
  if (!currentSync.dados_json) {
    console.log("dados_json is empty.");
    return;
  }

  const db = JSON.parse(currentSync.dados_json);
  if (!db.users) {
    console.log("No users table in db.");
    return;
  }

  console.log(`Found ${db.users.length} users.`);
  
  // Filter users
  const newUsers = db.users.filter(u => u.username === 'mazzarowysk');
  
  console.log(`Filtered down to ${newUsers.length} user(s).`);
  db.users = newUsers;

  const newDadosJson = JSON.stringify(db);
  const newUpdatedAt = Date.now();

  console.log("Updating Turso...");
  await client.execute({
    sql: 'UPDATE ocz_sync SET dados_json = ?, updated_at = ? WHERE id = ?',
    args: [newDadosJson, newUpdatedAt, 'main']
  });

  console.log("Done!");
}

run().catch(console.error);
