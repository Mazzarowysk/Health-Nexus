import { createClient } from '@libsql/client';

async function run() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://health-nexus-mazzarowysk.aws-us-east-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxNDU1NTgsImlkIjoiMDE5Zjc1YmYtMTUwMS03YmMyLTlkYTQtZTA1ZGIxMzdiYjEyIiwia2lkIjoiU0RZWEtINkIzZWg1b3JtRDBPRXpUbmhUaGpFMllXRXJxbjhCNVFnSmVLZyIsInJpZCI6Ijg4YTY2NjM0LTM3YWQtNGEyZC04ZmUxLTFmYjM3ZDAxNGE4YiJ9.teLr9MEIIXvjkOJh_nUWWaGwJuF0vnFwaMdUsyQLQba1kLOP30ziYQJkCWDDbADYl74zhYLujOwdr0Gg5EWoAg';

  const client = createClient({ url, authToken });

  console.log("Connecting to Turso cloud DB...");
  const result = await client.execute({
    sql: 'SELECT * FROM ocz_sync WHERE id = ?',
    args: ['main']
  });

  if (result.rows.length === 0) {
    console.log("No sync data found.");
    return;
  }

  const currentSync = result.rows[0];
  const db = currentSync.dados_json ? JSON.parse(currentSync.dados_json) : {};
  db.users = db.users || [];

  const requiredUsers = [
    { id: 'USR-MAZZAROWYSK', name: 'Marcelo Mazaro', username: 'mazzarowysk', role: 'Master', status: 'Ativo' },
    { id: 'USR-BCOLTRI', name: 'Breno Coltri', username: 'bcoltri', role: 'Desenvolvedor', status: 'Ativo' },
    { id: 'USR-ADMIN', name: 'Administrador Hospitalar', username: 'admin', role: 'Administrador', status: 'Ativo' },
    { id: 'USR-FFACCO', name: 'Franciele Facco de Carvalho', username: 'ffacco', role: 'Desenvolvedor', status: 'Ativo' },
    { id: 'USR-PFORTE', name: 'Dra. Paula Forte', username: 'pforte', role: 'Médico', status: 'Ativo' },
    
    // Médicos
    { id: 'USR-DOC-001', name: 'Dr. Carlos Eduardo Silva', username: 'dr.carloseduard', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-002', name: 'Dra. Ana Maria Costa', username: 'dra.anamaria', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-003', name: 'Dr. João Pedro Santos', username: 'dr.joaopedro', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-004', name: 'Dra. Beatriz Oliveira', username: 'dra.beatriz', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-005', name: 'Dr. Roberto Fernandes', username: 'dr.roberto', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-006', name: 'Dra. Mariana Lima', username: 'dra.mariana', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-007', name: 'Dr. Fábio Rodrigues', username: 'dr.fabio', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-008', name: 'Dr. André Mendes', username: 'dr.andre', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-009', name: 'Dra. Cristina Souza', username: 'dra.cristina', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-010', name: 'Dr. Marcelo Andrade', username: 'dr.marcelo', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-011', name: 'Dra. Renata Carvalho', username: 'dra.renata', role: 'Médico', status: 'Ativo' },
    { id: 'USR-DOC-012', name: 'Dr. Thiago Martins', username: 'dr.thiago', role: 'Médico', status: 'Ativo' },

    // Enfermeiros
    { id: 'USR-NUR-001', name: 'Enf. Sílvia Regina Santos', username: 'silviacwb', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-002', name: 'Enf. Patrícia Oliveira Lima', username: 'enf.patricia', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-003', name: 'Enf. Marcos Vinícius Souza', username: 'enf.marcos', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-004', name: 'Enf. Juliana Ferreira Costa', username: 'enf.juliana', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-005', name: 'Enf. Rodrigo Alves Ribeiro', username: 'enf.rodrigo', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-006', name: 'Enf. Camila Rocha Silva', username: 'enf.camila', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-007', name: 'Enf. Lucas Mendes Freitas', username: 'enf.lucas', role: 'Enfermeiro', status: 'Ativo' },
    { id: 'USR-NUR-008', name: 'Enf. Tatiane Barbosa Cruz', username: 'enf.tatiane', role: 'Enfermeiro', status: 'Ativo' }
  ];

  requiredUsers.forEach(reqUser => {
    const exists = db.users.some(u => u.username === reqUser.username);
    if (!exists) {
      db.users.push({
        ...reqUser,
        created_at: new Date().toISOString()
      });
    }
  });

  console.log(`Updated user table to ${db.users.length} users.`);

  const newDadosJson = JSON.stringify(db);
  const newUpdatedAt = Date.now();

  console.log("Updating Turso sync record...");
  await client.execute({
    sql: 'UPDATE ocz_sync SET dados_json = ?, updated_at = ? WHERE id = ?',
    args: [newDadosJson, newUpdatedAt, 'main']
  });

  console.log("✅ Turso Cloud Database successfully updated with all 24 users!");
}

run().catch(console.error);
