import re

# Read the original file
with open(r'backend\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The new DB initialization block
new_block = """// --- INICIALIZACAO DO BANCO LOCAL ---
const initLocalDb = async () => {
  const SQL_USERS = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'Medico', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_PATIENTS = `CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, birthDate TEXT NOT NULL, address TEXT, city TEXT, phone TEXT, cellphone TEXT, billingValue TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_ENCOUNTERS = `CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, admitted_at TEXT NOT NULL, completed_at TEXT)`;
  const SQL_TRIAGES = `CREATE TABLE IF NOT EXISTS triages (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, manchesterColor TEXT NOT NULL, weightKg REAL, bloodPressure TEXT NOT NULL, temperatureCelsius REAL NOT NULL, heartRateBpm INTEGER, complaints TEXT NOT NULL, triaged_at TEXT NOT NULL)`;
  const SQL_NOTES = `CREATE TABLE IF NOT EXISTS clinical_notes (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, noteType TEXT NOT NULL, subjectiveContent TEXT, objectiveContent TEXT, assessmentContent TEXT, planContent TEXT, signatureHash TEXT, isClosed INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  await db.execute(SQL_USERS);
  try { await db.execute('ALTER TABLE users RENAME COLUMN email TO username'); } catch (e) {}
  await db.execute(SQL_PATIENTS);
  for (const col of ['address','city','phone','cellphone','billingValue']) {
    try { await db.execute(`ALTER TABLE patients ADD COLUMN ${col} TEXT`); } catch (e) {}
  }
  await db.execute(SQL_ENCOUNTERS);
  await db.execute(SQL_TRIAGES);
  await db.execute(SQL_NOTES);
  console.log('[DB] Banco local OK.');
};

// --- SYNC CLOUD -> LOCAL ao iniciar ---
const autoSyncFromCloud = async () => {
  if (!cloudDb) return;
  console.log('[SYNC] Conectando ao Turso...');
  const SQL_USERS = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'Medico', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_PATIENTS = `CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, birthDate TEXT NOT NULL, address TEXT, city TEXT, phone TEXT, cellphone TEXT, billingValue TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_ENCOUNTERS = `CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, admitted_at TEXT NOT NULL, completed_at TEXT)`;
  const SQL_TRIAGES = `CREATE TABLE IF NOT EXISTS triages (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, manchesterColor TEXT NOT NULL, weightKg REAL, bloodPressure TEXT NOT NULL, temperatureCelsius REAL NOT NULL, heartRateBpm INTEGER, complaints TEXT NOT NULL, triaged_at TEXT NOT NULL)`;
  const SQL_NOTES = `CREATE TABLE IF NOT EXISTS clinical_notes (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, noteType TEXT NOT NULL, subjectiveContent TEXT, objectiveContent TEXT, assessmentContent TEXT, planContent TEXT, signatureHash TEXT, isClosed INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  await cloudDb.execute(SQL_USERS);
  try { await cloudDb.execute('ALTER TABLE users RENAME COLUMN email TO username'); } catch (e) {}
  await cloudDb.execute(SQL_PATIENTS);
  for (const col of ['address','city','phone','cellphone','billingValue']) {
    try { await cloudDb.execute(`ALTER TABLE patients ADD COLUMN ${col} TEXT`); } catch (e) {}
  }
  await cloudDb.execute(SQL_ENCOUNTERS);
  await cloudDb.execute(SQL_TRIAGES);
  await cloudDb.execute(SQL_NOTES);

  const localU = Number((await db.execute('SELECT COUNT(*) as c FROM users')).rows[0].c);
  const cloudU = Number((await cloudDb.execute('SELECT COUNT(*) as c FROM users')).rows[0].c);
  if (cloudU > localU) {
    console.log(`[SYNC] Nuvem (${cloudU}) > Local (${localU}). Baixando...`);
    const tbls = [
      {t:'users',sql:'INSERT OR REPLACE INTO users (id,name,username,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',f:['id','name','username','password_hash','role','created_at']},
      {t:'patients',sql:'INSERT OR REPLACE INTO patients (id,fullName,cpf,birthDate,address,city,phone,cellphone,billingValue,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',f:['id','fullName','cpf','birthDate','address','city','phone','cellphone','billingValue','created_at']},
      {t:'encounters',sql:'INSERT OR REPLACE INTO encounters (id,patientId,type,status,admitted_at,completed_at) VALUES (?,?,?,?,?,?)',f:['id','patientId','type','status','admitted_at','completed_at']},
      {t:'triages',sql:'INSERT OR REPLACE INTO triages (id,encounterId,manchesterColor,weightKg,bloodPressure,temperatureCelsius,heartRateBpm,complaints,triaged_at) VALUES (?,?,?,?,?,?,?,?,?)',f:['id','encounterId','manchesterColor','weightKg','bloodPressure','temperatureCelsius','heartRateBpm','complaints','triaged_at']},
      {t:'clinical_notes',sql:'INSERT OR REPLACE INTO clinical_notes (id,encounterId,noteType,subjectiveContent,objectiveContent,assessmentContent,planContent,signatureHash,isClosed,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',f:['id','encounterId','noteType','subjectiveContent','objectiveContent','assessmentContent','planContent','signatureHash','isClosed','created_at']}
    ];
    for (const tbl of tbls) {
      const rows = (await cloudDb.execute(`SELECT * FROM ${tbl.t}`)).rows;
      for (const row of rows) {
        try { await db.execute({sql:tbl.sql, args:tbl.f.map(fi => row[fi] ?? null)}); } catch(e) {}
      }
    }
    console.log('[SYNC] Download concluido!');
  } else {
    console.log(`[SYNC] Local (${localU}) / Nuvem (${cloudU}) - OK.`);
  }
};

// --- INICIALIZACAO PRINCIPAL ---
(async () => {
  try {
    await initLocalDb();
    const {rows} = await db.execute({sql:'SELECT id FROM users WHERE username=?', args:['admin']});
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin', 10);
      const aid = 'US-' + crypto.randomBytes(4).toString('hex');
      await db.execute({sql:'INSERT INTO users (id,name,username,password_hash,role) VALUES (?,?,?,?,?)', args:[aid,'Administrador','admin',hash,'Administrador']});
      console.log('[DB] Usuario admin criado (senha: admin).');
    }
    // Cloud sync em background com timeout de 15s
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 15s')), 15000));
    Promise.race([autoSyncFromCloud(), timeout]).catch(e => console.warn('[SYNC] Sync inicial ignorado:', e.message));
  } catch(err) {
    console.error('[DB] Erro critico:', err);
  }
})();
"""

# Find start and end of the old block
old_start_marker = '// --- INICIALIZACAO DO BANCO LOCAL ---'
old_end_marker = '})();'

start_idx = content.find(old_start_marker)
if start_idx == -1:
    # Try original marker
    old_start_marker = '// --- INICIALIZAÇÃO DO BANCO DE DADOS (TURSO) ---'
    start_idx = content.find(old_start_marker)

end_idx = content.find(old_end_marker, start_idx) + len(old_end_marker)

print(f"Found block at chars {start_idx} to {end_idx}")
print(f"Old block first line: {content[start_idx:start_idx+60]}")

new_content = content[:start_idx] + new_block + content[end_idx:]

with open(r'backend\app.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_content)

print(f"Done! File written: {len(new_content)} chars")
