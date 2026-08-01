require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function migrate() {
  console.log('Iniciando migração de tabelas relacionais para ocz_sync...');
  const tables = [
    'users', 'patients', 'appointments', 'consulting_rooms', 
    'beds', 'triages', 'clinical_notes', 'encounters', 
    'prescriptions', 'pharmacy_items', 'tv_calls', 'financial_installments', 
    'duty_schedules', 'prescription_administrations'
  ];

  const dbData = {};

  for (const table of tables) {
    try {
      const res = await client.execute(`SELECT * FROM ${table}`);
      dbData[table] = res.rows;
      console.log(`Lidos ${res.rows.length} registros da tabela ${table}`);
    } catch (e) {
      console.log(`Tabela ${table} não encontrada ou erro:`, e.message);
      dbData[table] = [];
    }
  }

  // A estrutura Offline-First do localDB espera chaves específicas
  const finalJson = JSON.stringify(dbData);

  console.log('Tamanho do JSON:', finalJson.length, 'bytes');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ocz_sync (
      id TEXT PRIMARY KEY,
      dados_json TEXT,
      config_json TEXT,
      updated_at INTEGER
    );
  `);

  const updated_at = Date.now();
  
  const existing = await client.execute("SELECT id FROM ocz_sync WHERE id = 'main'");
  if (existing.rows.length > 0) {
    await client.execute({
      sql: 'UPDATE ocz_sync SET dados_json = ?, updated_at = ? WHERE id = ?',
      args: [finalJson, updated_at, 'main']
    });
    console.log('ocz_sync atualizado com sucesso.');
  } else {
    await client.execute({
      sql: 'INSERT INTO ocz_sync (id, dados_json, config_json, updated_at) VALUES (?, ?, ?, ?)',
      args: ['main', finalJson, '{}', updated_at]
    });
    console.log('ocz_sync criado com sucesso.');
  }

  console.log('Migração concluída!');
}

migrate().catch(console.error);
