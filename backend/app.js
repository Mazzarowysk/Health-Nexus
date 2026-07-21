import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as clientModule from './database/client.js';
import { db, reconnectCloud } from './database/client.js';

// Getter dinâmico: acessa cloudDb atual (pode ser recriado por reconnectCloud)
const getCloudDb = () => clientModule.cloudDb;

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'health-nexus-super-secret-key';

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- INICIALIZACAO DO BANCO LOCAL ---
const initLocalDb = async () => {
  const SQL_USERS = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'Medico', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_PATIENTS = `CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, birthDate TEXT NOT NULL, address TEXT, city TEXT, phone TEXT, cellphone TEXT, billingValue TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;
  const SQL_ENCOUNTERS = `CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, admitted_at TEXT NOT NULL, completed_at TEXT)`;
  const SQL_TRIAGES = `CREATE TABLE IF NOT EXISTS triages (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, manchesterColor TEXT NOT NULL, weightKg REAL, bloodPressure TEXT NOT NULL, temperatureCelsius REAL NOT NULL, heartRateBpm INTEGER, complaints TEXT NOT NULL, triaged_at TEXT NOT NULL)`;
  const SQL_NOTES = `CREATE TABLE IF NOT EXISTS clinical_notes (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, noteType TEXT NOT NULL, subjectiveContent TEXT, objectiveContent TEXT, assessmentContent TEXT, planContent TEXT, signatureHash TEXT, isClosed INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_SYNC_LOGS = `CREATE TABLE IF NOT EXISTS sync_logs (key TEXT PRIMARY KEY, timestamp TEXT NOT NULL)`;
  const SQL_APPOINTMENTS = `CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, patientName TEXT NOT NULL, doctorName TEXT NOT NULL, specialty TEXT NOT NULL, appointmentDate TEXT NOT NULL, appointmentTime TEXT NOT NULL, status TEXT DEFAULT 'Agendado', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;
  const SQL_BEDS = `CREATE TABLE IF NOT EXISTS beds (id TEXT PRIMARY KEY, bedNumber TEXT NOT NULL, sector TEXT NOT NULL, status TEXT DEFAULT 'Vago', patientId TEXT, patientName TEXT, admittedAt TEXT, updated_at TEXT)`;
  const SQL_PRESCRIPTIONS = `CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, encounterId TEXT NOT NULL, patientId TEXT NOT NULL, patientName TEXT NOT NULL, doctorName TEXT NOT NULL, medicationsJson TEXT NOT NULL, status TEXT DEFAULT 'Ativa', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;

  const SQL_DOCTORS = `CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, name TEXT NOT NULL, crm TEXT UNIQUE NOT NULL, specialty TEXT NOT NULL, phone TEXT, email TEXT, status TEXT DEFAULT 'Ativo', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;

  await db.execute(SQL_USERS);
  try { await db.execute('ALTER TABLE users RENAME COLUMN email TO username'); } catch (e) {}
  await db.execute(SQL_PATIENTS);
  for (const col of ['address','city','phone','cellphone','billingValue','updated_at']) {
    try { await db.execute(`ALTER TABLE patients ADD COLUMN ${col} TEXT`); } catch (e) {}
  }
  await db.execute(SQL_ENCOUNTERS);
  await db.execute(SQL_TRIAGES);
  await db.execute(SQL_NOTES);
  await db.execute(SQL_SYNC_LOGS);
  await db.execute(SQL_APPOINTMENTS);
  await db.execute(SQL_BEDS);
  await db.execute(SQL_PRESCRIPTIONS);
  await db.execute(SQL_DOCTORS);

  // Seed de médicos se a tabela estiver vazia
  try {
    const docCount = Number((await db.execute('SELECT COUNT(*) as c FROM doctors')).rows[0].c);
    if (docCount === 0) {
      const initialDoctors = [
        { id: 'DOC-001', name: 'Dr. João Silva', crm: '123456-SP', specialty: 'Cardiologia', phone: '(11) 98765-4321', email: 'joao.silva@healthnexus.med.br', status: 'Ativo' },
        { id: 'DOC-002', name: 'Dra. Maria Santos', crm: '234567-SP', specialty: 'Pediatria', phone: '(11) 98765-4322', email: 'maria.santos@healthnexus.med.br', status: 'Ativo' },
        { id: 'DOC-003', name: 'Dr. Carlos Oliveira', crm: '345678-SP', specialty: 'Clínica Geral', phone: '(11) 98765-4323', email: 'carlos.oliveira@healthnexus.med.br', status: 'Ativo' },
        { id: 'DOC-004', name: 'Dra. Ana Costa', crm: '456789-SP', specialty: 'Ortopedia', phone: '(11) 98765-4324', email: 'ana.costa@healthnexus.med.br', status: 'Ativo' }
      ];
      for (const doc of initialDoctors) {
        await db.execute({
          sql: 'INSERT INTO doctors (id, name, crm, specialty, phone, email, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [doc.id, doc.name, doc.crm, doc.specialty, doc.phone, doc.email, doc.status, new Date().toISOString()]
        });
      }
    }
  } catch (e) {}

  // Índices para acelerar queries filtradas por data na agenda
  await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointmentDate)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON appointments (appointmentDate, doctorName)');

  // Seed de leitos se a tabela estiver vazia
  try {
    const bedCount = Number((await db.execute('SELECT COUNT(*) as c FROM beds')).rows[0].c);
    if (bedCount === 0) {
      const initialBeds = [
        { id: 'BED-UTI-01', bedNumber: 'UTI-01', sector: 'UTI Adulto', status: 'Vago' },
        { id: 'BED-UTI-02', bedNumber: 'UTI-02', sector: 'UTI Adulto', status: 'Vago' },
        { id: 'BED-UTI-03', bedNumber: 'UTI-03', sector: 'UTI Adulto', status: 'Vago' },
        { id: 'BED-ENF-01', bedNumber: 'ENF-01', sector: 'Enfermaria', status: 'Vago' },
        { id: 'BED-ENF-02', bedNumber: 'ENF-02', sector: 'Enfermaria', status: 'Vago' },
        { id: 'BED-ENF-03', bedNumber: 'ENF-03', sector: 'Enfermaria', status: 'Vago' },
        { id: 'BED-PED-01', bedNumber: 'PED-01', sector: 'Pediatria', status: 'Vago' },
        { id: 'BED-PED-02', bedNumber: 'PED-02', sector: 'Pediatria', status: 'Vago' },
        { id: 'BED-MAT-01', bedNumber: 'MAT-01', sector: 'Maternidade', status: 'Vago' },
        { id: 'BED-MAT-02', bedNumber: 'MAT-02', sector: 'Maternidade', status: 'Vago' }
      ];
      for (const b of initialBeds) {
        await db.execute({
          sql: 'INSERT INTO beds (id, bedNumber, sector, status, updated_at) VALUES (?, ?, ?, ?, ?)',
          args: [b.id, b.bedNumber, b.sector, b.status, new Date().toISOString()]
        });
      }
    }
  } catch (e) {}

  console.log('[DB] Banco local OK.');
};

// --- SYNC CLOUD -> LOCAL ao iniciar (garantir estrutura de tabelas) ---
const autoSyncFromCloud = async () => {
  if (!getCloudDb() || process.env.VERCEL) return;
  console.log('[SYNC] Verificando estrutura do banco Turso...');
  const SQL_USERS = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'Medico', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_PATIENTS = `CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, birthDate TEXT NOT NULL, address TEXT, city TEXT, phone TEXT, cellphone TEXT, billingValue TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;
  const SQL_ENCOUNTERS = `CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, admitted_at TEXT NOT NULL, completed_at TEXT)`;
  const SQL_TRIAGES = `CREATE TABLE IF NOT EXISTS triages (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, manchesterColor TEXT NOT NULL, weightKg REAL, bloodPressure TEXT NOT NULL, temperatureCelsius REAL NOT NULL, heartRateBpm INTEGER, complaints TEXT NOT NULL, triaged_at TEXT NOT NULL)`;
  const SQL_NOTES = `CREATE TABLE IF NOT EXISTS clinical_notes (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, noteType TEXT NOT NULL, subjectiveContent TEXT, objectiveContent TEXT, assessmentContent TEXT, planContent TEXT, signatureHash TEXT, isClosed INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  const SQL_SYNC_LOGS = `CREATE TABLE IF NOT EXISTS sync_logs (key TEXT PRIMARY KEY, timestamp TEXT NOT NULL)`;
  const SQL_APPOINTMENTS = `CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, patientName TEXT NOT NULL, doctorName TEXT NOT NULL, specialty TEXT NOT NULL, appointmentDate TEXT NOT NULL, appointmentTime TEXT NOT NULL, status TEXT DEFAULT 'Agendado', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;
  const SQL_BEDS = `CREATE TABLE IF NOT EXISTS beds (id TEXT PRIMARY KEY, bedNumber TEXT NOT NULL, sector TEXT NOT NULL, status TEXT DEFAULT 'Vago', patientId TEXT, patientName TEXT, admittedAt TEXT, updated_at TEXT)`;
  const SQL_PRESCRIPTIONS = `CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, encounterId TEXT NOT NULL, patientId TEXT NOT NULL, patientName TEXT NOT NULL, doctorName TEXT NOT NULL, medicationsJson TEXT NOT NULL, status TEXT DEFAULT 'Ativa', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
  
  const cloud = getCloudDb();
  if (!cloud) return;
  try {
    await cloud.execute(SQL_USERS);
    try { await cloud.execute('ALTER TABLE users RENAME COLUMN email TO username'); } catch (e) {}
    await cloud.execute(SQL_PATIENTS);
    for (const col of ['address','city','phone','cellphone','billingValue','updated_at']) {
      try { await cloud.execute(`ALTER TABLE patients ADD COLUMN ${col} TEXT`); } catch (e) {}
    }
    await cloud.execute(SQL_ENCOUNTERS);
    await cloud.execute(SQL_TRIAGES);
    await cloud.execute(SQL_NOTES);
    await cloud.execute(SQL_SYNC_LOGS);
    await cloud.execute(SQL_APPOINTMENTS);
    await cloud.execute(SQL_BEDS);
    await cloud.execute(SQL_PRESCRIPTIONS);
    await cloud.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointmentDate)');
    await cloud.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON appointments (appointmentDate, doctorName)');
    console.log('[SYNC] Estrutura do Turso pronta para sincronização.');
  } catch (err) {
    const isNetErr = err.message?.includes('fetch failed') || err.message?.includes('timeout') || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
    if (isNetErr) {
      console.warn('[SYNC] Sem conexão com Turso durante sync inicial. Continuando sem nuvem...');
    } else {
      console.error('[SYNC] Erro ao verificar estrutura do Turso:', err.message);
    }
  }
};

// --- INICIALIZACAO DO BANCO CLOUD (para garantir tabelas no Turso) ---
const initCloudDb = async () => {
  const cloud = getCloudDb();
  if (!cloud) return;
  
  const execWithTimeout = async (task) => {
    return Promise.race([
      task,
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_12S')), 12000))
    ]);
  };

  const tasks = async () => {
    const SQL_USERS = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'Medico', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
    const SQL_PATIENTS = `CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL, birthDate TEXT NOT NULL, address TEXT, city TEXT, phone TEXT, cellphone TEXT, billingValue TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;
    const SQL_ENCOUNTERS = `CREATE TABLE IF NOT EXISTS encounters (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, admitted_at TEXT NOT NULL, completed_at TEXT)`;
    const SQL_TRIAGES = `CREATE TABLE IF NOT EXISTS triages (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, manchesterColor TEXT NOT NULL, weightKg REAL, bloodPressure TEXT NOT NULL, temperatureCelsius REAL NOT NULL, heartRateBpm INTEGER, complaints TEXT NOT NULL, triaged_at TEXT NOT NULL)`;
    const SQL_NOTES = `CREATE TABLE IF NOT EXISTS clinical_notes (id TEXT PRIMARY KEY, encounterId TEXT UNIQUE NOT NULL, noteType TEXT NOT NULL, subjectiveContent TEXT, objectiveContent TEXT, assessmentContent TEXT, planContent TEXT, signatureHash TEXT, isClosed INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
    const SQL_SYNC_LOGS = `CREATE TABLE IF NOT EXISTS sync_logs (key TEXT PRIMARY KEY, timestamp TEXT NOT NULL)`;
    const SQL_APPOINTMENTS = `CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, patientId TEXT NOT NULL, patientName TEXT NOT NULL, doctorName TEXT NOT NULL, specialty TEXT NOT NULL, appointmentDate TEXT NOT NULL, appointmentTime TEXT NOT NULL, status TEXT DEFAULT 'Agendado', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`;
    const SQL_BEDS = `CREATE TABLE IF NOT EXISTS beds (id TEXT PRIMARY KEY, bedNumber TEXT NOT NULL, sector TEXT NOT NULL, status TEXT DEFAULT 'Vago', patientId TEXT, patientName TEXT, admittedAt TEXT, updated_at TEXT)`;
    const SQL_PRESCRIPTIONS = `CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, encounterId TEXT NOT NULL, patientId TEXT NOT NULL, patientName TEXT NOT NULL, doctorName TEXT NOT NULL, medicationsJson TEXT NOT NULL, status TEXT DEFAULT 'Ativa', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`;
    
    await cloud.execute(SQL_USERS);
    try { await cloud.execute('ALTER TABLE users RENAME COLUMN email TO username'); } catch (e) {}
    await cloud.execute(SQL_PATIENTS);
    for (const col of ['address','city','phone','cellphone','billingValue','updated_at']) {
      try { await cloud.execute(`ALTER TABLE patients ADD COLUMN ${col} TEXT`); } catch (e) {}
    }
    await cloud.execute(SQL_ENCOUNTERS);
    await cloud.execute(SQL_TRIAGES);
    await cloud.execute(SQL_NOTES);
    await cloud.execute(SQL_SYNC_LOGS);
    await cloud.execute(SQL_APPOINTMENTS);
    await cloud.execute(SQL_BEDS);
    await cloud.execute(SQL_PRESCRIPTIONS);
    await cloud.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointmentDate)');
    await cloud.execute('CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON appointments (appointmentDate, doctorName)');

    try {
      const bedCount = Number((await cloud.execute('SELECT COUNT(*) as c FROM beds')).rows[0].c);
      if (bedCount === 0) {
        const initialBeds = [
          { id: 'BED-UTI-01', bedNumber: 'UTI-01', sector: 'UTI Adulto', status: 'Vago' },
          { id: 'BED-UTI-02', bedNumber: 'UTI-02', sector: 'UTI Adulto', status: 'Vago' },
          { id: 'BED-UTI-03', bedNumber: 'UTI-03', sector: 'UTI Adulto', status: 'Vago' },
          { id: 'BED-ENF-01', bedNumber: 'ENF-01', sector: 'Enfermaria', status: 'Vago' },
          { id: 'BED-ENF-02', bedNumber: 'ENF-02', sector: 'Enfermaria', status: 'Vago' },
          { id: 'BED-ENF-03', bedNumber: 'ENF-03', sector: 'Enfermaria', status: 'Vago' },
          { id: 'BED-PED-01', bedNumber: 'PED-01', sector: 'Pediatria', status: 'Vago' },
          { id: 'BED-PED-02', bedNumber: 'PED-02', sector: 'Pediatria', status: 'Vago' },
          { id: 'BED-MAT-01', bedNumber: 'MAT-01', sector: 'Maternidade', status: 'Vago' },
          { id: 'BED-MAT-02', bedNumber: 'MAT-02', sector: 'Maternidade', status: 'Vago' }
        ];
        for (const b of initialBeds) {
          await cloud.execute({
            sql: 'INSERT INTO beds (id, bedNumber, sector, status, updated_at) VALUES (?, ?, ?, ?, ?)',
            args: [b.id, b.bedNumber, b.sector, b.status, new Date().toISOString()]
          });
        }
      }
    } catch (e) {}
  };

  try {
    await execWithTimeout(tasks());
    console.log('[DB] Banco Turso (cloud) OK.');
  } catch (err) {
    if (err.message === 'TIMEOUT_12S') {
      console.warn('[DB] Timeout ao inicializar Turso, continuando...');
    } else {
      console.warn('[DB] Erro de rede ou indisponibilidade Turso (silenciado):', err.message);
    }
  }
};

// --- INICIALIZACAO PRINCIPAL ---
const isVercel = !!process.env.VERCEL;

export const init = async () => {
  try {
    if (isVercel) {
      await initCloudDb();
      await initLocalDb();
    } else {
      await initLocalDb();
      if (getCloudDb()) await initCloudDb();
    }
    const {rows} = await db.execute({sql:"SELECT id FROM users WHERE LOWER(username) = 'admin'", args:[]});
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin', 10);
      const aid = 'US-' + crypto.randomBytes(4).toString('hex');
      await db.execute({sql:'INSERT INTO users (id,name,username,password_hash,role) VALUES (?,?,?,?,?)', args:[aid,'Administrador','admin',hash,'Administrador']});
      console.log('[DB] Usuario admin criado (senha: admin).');
    }
    // Sync automático apenas localmente (no Vercel o db já É o cloud)
    if (!isVercel) {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 15s')), 15000));
      Promise.race([autoSyncFromCloud(), timeout]).catch(e => console.warn('[SYNC] Sync inicial ignorado:', e.message));
    }
  } catch(err) {
    console.error('[DB] Erro critico:', err);
  }
};




// --- MIDDLEWARES DE AUTENTICAÇÃO ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
};

// --- ROTAS E LÓGICA DE HEARTBEAT (Auto-shutdown) ---
// Dá 60 segundos iniciais para o Vite compilar e o navegador abrir
let lastHeartbeat = Date.now() + 60000; 

app.post('/api/heartbeat', (req, res) => {
  lastHeartbeat = Date.now();
  res.sendStatus(200);
});

app.post('/api/shutdown', (req, res) => {
  console.log('Navegador fechado. Encerrando o servidor (ignorado em modo desenvolvimento)...');
  res.sendStatus(200);
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => process.exit(0), 100);
  }
});

setInterval(() => {
  if (process.env.NODE_ENV !== 'development' && Date.now() - lastHeartbeat > 8000) {
    console.log('Nenhum navegador conectado. Encerrando o servidor...');
    process.exit(0);
  }
}, 2000);

// --- ROTAS DE AUTENTICAÇÃO ---

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, username, role, created_at FROM users WHERE id = ?',
      args: [req.user.id]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado ou inativo.' });
    }

    const u = result.rows[0];
    res.json({
      user: { id: u.id, name: u.name, role: u.role, username: u.username }
    });
  } catch (err) {
    console.error('Erro ao verificar sessão do usuário:', err);
    res.status(500).json({ message: 'Erro ao verificar token de autenticação.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();
    const role = (req.body.role || 'Médico').trim();

    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Nome, usuário e senha são obrigatórios.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'O nome de usuário deve ter pelo menos 3 caracteres.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 4 caracteres.' });
    }

    // Verificar se o usuário já existe (case-insensitive)
    const existing = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username]
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Usuário já cadastrado com este nome de usuário.' });
    }

    // Hash da senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = crypto.randomUUID();
    const userRole = role || 'Médico';

    await db.execute({
      sql: 'INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      args: [userId, name, username, passwordHash, userRole]
    });

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', userId });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ message: 'Erro interno ao cadastrar usuário.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      args: [username]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    // Gerar token JWT (expira em 24h)
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login bem-sucedido!',
      token,
      user: { id: user.id, name: user.name, role: user.role, username: user.username }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro interno durante o login.' });
  }
});

// --- ROTAS DA API ---

// Endpoint de verificação de integridade (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Proteger todas as requisições para a API a partir daqui
app.use('/api', authenticateToken);

// Endpoint consolidado da Dashboard
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // Busca a contagem real de pacientes inseridos no banco Turso
    const countResult = await db.execute('SELECT COUNT(*) as count FROM patients');
    const totalPatients = Number(countResult.rows[0].count) || 0;

    // Busca contagem real de atendimentos ativos (não Finalizados)
    const activeResult = await db.execute("SELECT COUNT(*) as count FROM encounters WHERE status != 'Finalizado'");
    const activePatientsCount = Number(activeResult.rows[0].count) || 0;

    // Calcular o tempo médio de espera (diferença entre admitido e triado para os últimos triados)
    // Se não houver dados, retorna 18 min
    let avgWaitTime = 18;
    const waitResult = await db.execute(`
      SELECT e.admitted_at, t.triaged_at 
      FROM encounters e 
      JOIN triages t ON e.id = t.encounterId 
      ORDER BY t.triaged_at DESC LIMIT 10
    `);
    if (waitResult.rows.length > 0) {
      let sumMinutes = 0;
      let count = 0;
      waitResult.rows.forEach(row => {
        const admitted = new Date(row.admitted_at);
        const triaged = new Date(row.triaged_at);
        const diffMs = triaged - admitted;
        if (diffMs > 0) {
          sumMinutes += diffMs / (60 * 1000);
          count++;
        }
      });
      if (count > 0) {
        avgWaitTime = Math.round(sumMinutes / count);
      }
    }

    res.status(200).json({
      activePatients: totalPatients,
      occupancyRate: 84.5,
      averageWaitTimeMinutes: avgWaitTime,
      dailyAppointmentsCount: 84 + activePatientsCount,
      billingSummary: {
        totalRevenue: 245000.00,
        pendingClaims: 45100.00
      },
      occupancyData: [
        { label: 'UTI Adulto', value: 25, color: '#e63946' },
        { label: 'Enfermaria', value: 85, color: '#457b9d' },
        { label: 'Pediatria', value: 12, color: '#2a9d8f' },
        { label: 'Maternidade', value: 18, color: '#f4a261' },
        { label: 'Disponíveis', value: 25, color: '#e9ecef' }
      ],
      appointmentsHistory: [
        { label: 'Seg', urgencia: 45, ambulatorial: 120 },
        { label: 'Ter', urgencia: 52, ambulatorial: 135 },
        { label: 'Qua', urgencia: 48, ambulatorial: 125 },
        { label: 'Qui', urgencia: 60, ambulatorial: 140 },
        { label: 'Sex', urgencia: 58, ambulatorial: 130 },
        { label: 'Sáb', urgencia: 75, ambulatorial: 40 },
        { label: 'Dom', urgencia: 82, ambulatorial: 15 }
      ]
    });
  } catch (err) {
    console.error('Erro ao buscar resumo da dashboard:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao buscar estatísticas da dashboard.'
    });
  }
});

// --- ENDPOINTS DE ATENDIMENTO E TRIAGEM (MÓDULO 02) ---

// Abrir novo atendimento
app.post('/api/encounters', async (req, res) => {
  const { patientId, type, patientName, status: reqStatus } = req.body;

  if (!patientId || !type) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos patientId e type são obrigatórios.'
    });
  }

  try {
    // 1. Garantir que o paciente exista na tabela patients para evitar erro 404 e falha de JOIN
    const patientCheck = await db.execute({
      sql: 'SELECT id, fullName FROM patients WHERE id = ?',
      args: [patientId]
    });

    if (patientCheck.rows.length === 0) {
      const pName = patientName || 'Paciente Agendado';
      const nowIso = new Date().toISOString();
      const randomCpf = `${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}`;
      await db.execute({
        sql: `INSERT INTO patients (id, fullName, cpf, birthDate, phone, created_at, updated_at)
              VALUES (?, ?, ?, '1990-01-01', '(11) 99999-9999', ?, ?)`,
        args: [patientId, pName, randomCpf, nowIso, nowIso]
      });
    }

    // 2. Verificar se já existe atendimento ativo para este paciente
    const activeCheck = await db.execute({
      sql: "SELECT id FROM encounters WHERE patientId = ? AND status != 'Finalizado'",
      args: [patientId]
    });

    const targetStatus = reqStatus || (type === 'Ambulatorio' ? 'Em_Atendimento' : 'Aguardando_Triagem');

    if (activeCheck.rows.length > 0) {
      const existingEncId = activeCheck.rows[0].id;
      await db.execute({
        sql: "UPDATE encounters SET status = ? WHERE id = ?",
        args: [targetStatus, existingEncId]
      });

      // Garantir triagem padrão caso vá para consulta médica
      const triageCheck = await db.execute({
        sql: "SELECT id FROM triages WHERE encounterId = ?",
        args: [existingEncId]
      });

      if (triageCheck.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at)
                VALUES (?, ?, 'AMARELO', 70, '120/80', 36.5, 80, 'Atendimento Ambulatorial Agendado', ?)`,
          args: [crypto.randomUUID(), existingEncId, new Date().toISOString()]
        });
      }

      return res.status(200).json({
        status: 'success',
        encounterId: existingEncId,
        statusLabel: targetStatus,
        message: 'Atendimento existente atualizado com sucesso.'
      });
    }

    // 3. Criar novo atendimento
    const encounterId = crypto.randomUUID();
    const admittedAt = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encounterId, patientId, type, targetStatus, admittedAt]
    });

    // Se for ambulatorial ou direto para consulta, insere registro de triagem padrão
    if (targetStatus === 'Em_Atendimento' || targetStatus === 'Aguardando_Atendimento') {
      await db.execute({
        sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at)
              VALUES (?, ?, 'AMARELO', 70, '120/80', 36.5, 80, 'Consulta Ambulatorial Agendada', ?)`,
        args: [crypto.randomUUID(), encounterId, admittedAt]
      });
    }

    res.status(201).json({
      status: 'success',
      encounterId,
      statusLabel: targetStatus,
      admitted_at: admittedAt
    });
  } catch (err) {
    console.error('Erro ao abrir atendimento:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao abrir atendimento no banco de dados.'
    });
  }
});

// Listar atendimentos com dados de paciente e triagem
app.get('/api/encounters', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at,
        p.fullName as patientName, p.cpf as patientCpf, p.birthDate as patientBirthDate,
        t.manchesterColor, t.weightKg, t.bloodPressure, t.temperatureCelsius, t.heartRateBpm, t.complaints, t.triaged_at
      FROM encounters e
      JOIN patients p ON e.patientId = p.id
      LEFT JOIN triages t ON e.id = t.encounterId
      ORDER BY e.admitted_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar atendimentos:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao buscar atendimentos.'
    });
  }
});

// Realizar triagem Manchester
app.post('/api/encounters/:id/triage', async (req, res) => {
  const { id } = req.params;
  const { manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints } = req.body;

  if (!manchesterColor || !bloodPressure || !temperatureCelsius || !complaints) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos manchesterColor, bloodPressure, temperatureCelsius e complaints são obrigatórios.'
    });
  }

  const bpRegex = /^\d{2,3}\/\d{2,3}$/;
  if (!bpRegex.test(bloodPressure)) {
    return res.status(400).json({
      status: 'error',
      message: 'Pressão Arterial deve estar no formato ex: 120/80.'
    });
  }

  const temp = parseFloat(temperatureCelsius);
  if (isNaN(temp) || temp < 30.0 || temp > 45.0) {
    return res.status(400).json({
      status: 'error',
      message: 'Temperatura corporal deve ser um valor entre 30.0°C e 45.0°C.'
    });
  }

  if (heartRateBpm) {
    const hr = parseInt(heartRateBpm, 10);
    if (isNaN(hr) || hr < 30 || hr > 220) {
      return res.status(400).json({
        status: 'error',
        message: 'Frequência cardíaca deve ser um valor inteiro entre 30 e 220 bpm.'
      });
    }
  }

  try {
    const encounterCheck = await db.execute({
      sql: 'SELECT status FROM encounters WHERE id = ?',
      args: [id]
    });

    if (encounterCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Atendimento não encontrado.'
      });
    }

    if (encounterCheck.rows[0].status !== 'Aguardando_Triagem') {
      return res.status(400).json({
        status: 'error',
        message: 'Este atendimento já foi triado ou finalizado.'
      });
    }

    const triageId = crypto.randomUUID();
    const triagedAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        triageId,
        id,
        manchesterColor,
        weightKg ? parseFloat(weightKg) : null,
        bloodPressure,
        temp,
        heartRateBpm ? parseInt(heartRateBpm, 10) : null,
        complaints,
        triagedAt
      ]
    });

    await db.execute({
      sql: "UPDATE encounters SET status = 'Aguardando_Atendimento' WHERE id = ?",
      args: [id]
    });

    res.status(200).json({
      status: 'success',
      triageId,
      encounterStatus: 'Aguardando_Atendimento'
    });
  } catch (err) {
    console.error('Erro ao salvar triagem:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao registrar triagem no banco de dados.'
    });
  }
});

// Alterar status do atendimento
app.put('/api/encounters/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Aguardando_Triagem', 'Aguardando_Atendimento', 'Em_Atendimento', 'Finalizado'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Status inválido fornecido.'
    });
  }

  try {
    const check = await db.execute({
      sql: 'SELECT id FROM encounters WHERE id = ?',
      args: [id]
    });

    if (check.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Atendimento não encontrado.'
      });
    }

    const completedAt = status === 'Finalizado' ? new Date().toISOString() : null;

    if (completedAt) {
      await db.execute({
        sql: "UPDATE encounters SET status = ?, completed_at = ? WHERE id = ?",
        args: [status, completedAt, id]
      });
    } else {
      await db.execute({
        sql: "UPDATE encounters SET status = ? WHERE id = ?",
        args: [status, id]
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Status do atendimento atualizado para ${status}.`
    });
  } catch (err) {
    console.error('Erro ao atualizar status do atendimento:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao atualizar status do atendimento.'
    });
  }
});

// --- ROTAS DO PRONTUÁRIO (CLINICAL NOTES) ---

// Buscar nota clínica
app.get('/api/encounters/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: 'SELECT * FROM clinical_notes WHERE encounterId = ?',
      args: [id]
    });
    
    if (result.rows.length === 0) {
      return res.status(200).json(null);
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar nota clínica:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao buscar nota clínica' });
  }
});

// Salvar Rascunho da nota clínica
app.post('/api/encounters/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { noteType, subjectiveContent, objectiveContent, assessmentContent, planContent } = req.body;
    
    // Verificar se já existe uma nota e se está fechada
    const check = await db.execute({
      sql: 'SELECT isClosed FROM clinical_notes WHERE encounterId = ?',
      args: [id]
    });
    
    if (check.rows.length > 0 && check.rows[0].isClosed) {
      return res.status(403).json({ status: 'error', message: 'Prontuário assinado. Não é possível editar.' });
    }
    
    if (check.rows.length === 0) {
      // Inserir
      const noteId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO clinical_notes (id, encounterId, noteType, subjectiveContent, objectiveContent, assessmentContent, planContent) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [noteId, id, noteType || 'Anamnese', subjectiveContent || '', objectiveContent || '', assessmentContent || '', planContent || '']
      });
      return res.status(201).json({ status: 'success', message: 'Rascunho criado.' });
    } else {
      // Atualizar
      await db.execute({
        sql: `UPDATE clinical_notes 
              SET noteType = ?, subjectiveContent = ?, objectiveContent = ?, assessmentContent = ?, planContent = ? 
              WHERE encounterId = ?`,
        args: [noteType || 'Anamnese', subjectiveContent || '', objectiveContent || '', assessmentContent || '', planContent || '', id]
      });
      return res.status(200).json({ status: 'success', message: 'Rascunho atualizado.' });
    }
  } catch (err) {
    console.error('Erro ao salvar nota clínica:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao salvar rascunho.' });
  }
});

// Assinar e Fechar Prontuário
app.post('/api/encounters/:id/sign', async (req, res) => {
  try {
    const { id } = req.params;
    const { passwordVerification } = req.body;
    
    if (!passwordVerification) {
      return res.status(400).json({ status: 'error', message: 'Senha não informada.' });
    }
    
    // Simular verificação de senha
    if (passwordVerification !== 'admin123' && passwordVerification !== 'medico123') {
      return res.status(401).json({ status: 'error', message: 'Senha inválida para assinatura.' });
    }
    
    // Verificar se existe nota para o encontro
    const check = await db.execute({
      sql: 'SELECT id, isClosed FROM clinical_notes WHERE encounterId = ?',
      args: [id]
    });
    
    if (check.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Nenhuma nota encontrada para assinar.' });
    }
    
    if (check.rows[0].isClosed) {
      return res.status(400).json({ status: 'error', message: 'Prontuário já está assinado.' });
    }
    
    // Gerar Hash MD5 (Simulado)
    const hash = crypto.createHash('sha256').update(id + Date.now().toString()).digest('hex');
    
    // Assinar e fechar nota
    await db.execute({
      sql: 'UPDATE clinical_notes SET signatureHash = ?, isClosed = 1 WHERE encounterId = ?',
      args: [hash, id]
    });
    
    // Atualizar status do encounter para Finalizado
    const completedAt = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE encounters SET status = ?, completed_at = ? WHERE id = ?',
      args: ['Finalizado', completedAt, id]
    });
    
    res.status(200).json({
      status: 'success',
      signatureHash: hash,
      isClosed: 1,
      signedAt: completedAt
    });
  } catch (err) {
    console.error('Erro ao assinar prontuário:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao assinar prontuário.' });
  }
});

// Função auxiliar para gerar ID personalizado do paciente (Ex: "AO-0001")
async function generatePatientId(fullName) {
  const nameParts = fullName.trim().toUpperCase().split(/\s+/);
  let initials = 'HN';
  if (nameParts.length >= 1) {
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    initials = `${firstInitial}${lastInitial}`;
  }

  const result = await db.execute({
    sql: "SELECT id FROM patients WHERE id LIKE ? ORDER BY id DESC",
    args: [`${initials}-%`]
  });

  let nextNumber = 1;
  if (result.rows.length > 0) {
    let maxNum = 0;
    result.rows.forEach(row => {
      const idStr = String(row.id);
      const parts = idStr.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    nextNumber = maxNum + 1;
  }

  const seqString = String(nextNumber).padStart(4, '0');
  return `${initials}-${seqString}`;
}

// Endpoint para criação de pacientes
app.post('/api/patients', async (req, res) => {
  const { fullName, cpf, birthDate, address, city, phone, cellphone, billingValue } = req.body;

  if (!fullName || !cpf || !birthDate) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos fullName, cpf e birthDate são de preenchimento obrigatório.'
    });
  }

  try {
    const patientId = await generatePatientId(fullName);
    
    const nowIso = new Date().toISOString();
    await db.execute({
      sql: 'INSERT INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [patientId, fullName, cpf, birthDate, address || '', city || '', phone || '', cellphone || '', billingValue || '', nowIso, nowIso]
    });

    try {
      await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [nowIso] });
    } catch (e) {}

    res.status(201).json({
      status: 'success',
      patientId,
      fullName,
      message: 'Paciente registrado com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao salvar paciente:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        status: 'error',
        message: 'Já existe um paciente cadastrado com este CPF.'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Falha ao salvar paciente no banco de dados.'
    });
  }
});

// Endpoint para obter todos os pacientes
app.get('/api/patients', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM patients ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar pacientes:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao buscar lista de pacientes.'
    });
  }
});

// Endpoint para atualizar um paciente
app.put('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  const { fullName, cpf, birthDate, address, city, phone, cellphone, billingValue } = req.body;

  if (!fullName || !cpf || !birthDate) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos fullName, cpf e birthDate são de preenchimento obrigatório.'
    });
  }

  try {
    const checkCpf = await db.execute({
      sql: 'SELECT id FROM patients WHERE cpf = ? AND id != ?',
      args: [cpf, id]
    });

    if (checkCpf.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Outro paciente já está cadastrado com este CPF.'
      });
    }

    const updatedAt = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE patients SET fullName = ?, cpf = ?, birthDate = ?, address = ?, city = ?, phone = ?, cellphone = ?, billingValue = ?, updated_at = ? WHERE id = ?',
      args: [fullName, cpf, birthDate, address || '', city || '', phone || '', cellphone || '', billingValue || '', updatedAt, id]
    });

    try {
      await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [updatedAt] });
    } catch (e) {}

    res.status(200).json({
      status: 'success',
      message: 'Paciente atualizado com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao atualizar paciente:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao atualizar paciente.'
    });
  }
});

// Endpoint para excluir um paciente
app.delete('/api/patients/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute({
      sql: 'DELETE FROM patients WHERE id = ?',
      args: [id]
    });

    const nowIso = new Date().toISOString();
    try {
      await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [nowIso] });
    } catch (e) {}

    res.status(200).json({
      status: 'success',
      message: 'Paciente excluído com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao excluir paciente:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao excluir paciente.'
    });
  }
});

// Endpoint para gerar dados fictícios (Seed)
app.post('/api/settings/seed', async (req, res) => {
  const mockPatients = [
    { fullName: 'Ana Beatriz Oliveira', cpf: '123.456.789-01', birthDate: '1992-05-14', address: 'Av. Paulista, 1200 - Bela Vista', city: 'São Paulo', phone: '(11) 3214-5589', cellphone: '(11) 98745-1234', billingValue: 'R$ 350,00' },
    { fullName: 'Carlos Henrique Santos', cpf: '234.567.890-12', birthDate: '1985-11-23', address: 'Rua das Flores, 45 - Centro', city: 'Campinas', phone: '(19) 3456-7890', cellphone: '(19) 99876-5432', billingValue: 'R$ 1.250,50' },
    { fullName: 'Bruno Silva Souza', cpf: '345.678.901-23', birthDate: '1979-08-05', address: 'Rua Silva Jardim, 380 - Cambuí', city: 'Campinas', phone: '(19) 3212-4040', cellphone: '(19) 98817-5809', billingValue: 'R$ 10.534,22' },
    { fullName: 'Mariana Costa Lima', cpf: '456.789.012-34', birthDate: '2001-02-18', address: 'Av. Copacabana, 850 - Ap 402', city: 'Rio de Janeiro', phone: '(21) 2548-9900', cellphone: '(21) 97765-4321', billingValue: 'R$ 80,00' },
    { fullName: 'Roberto Alves Prado', cpf: '567.890.123-45', birthDate: '1965-07-30', address: 'Av. Afonso Pena, 2300', city: 'Belo Horizonte', phone: '(31) 3224-8899', cellphone: '(31) 98877-6655', billingValue: 'R$ 4.500,00' },
    { fullName: 'Juliana Mendes Rocha', cpf: '678.901.234-56', birthDate: '1995-10-12', address: 'Rua XV de Novembro, 120', city: 'Curitiba', phone: '(41) 3012-9900', cellphone: '(41) 99123-4567', billingValue: 'R$ 680,00' },
    { fullName: 'Fernanda Souza Lima', cpf: '789.012.345-67', birthDate: '1988-04-03', address: 'Av. Sete de Setembro, 4500', city: 'Salvador', phone: '(71) 3324-5500', cellphone: '(71) 98811-2233', billingValue: 'R$ 150,00' },
    { fullName: 'Gabriel Castro Neves', cpf: '890.123.456-78', birthDate: '1990-12-25', address: 'Rua Ceará, 90', city: 'Belo Horizonte', phone: '(31) 3412-5500', cellphone: '(31) 99765-1212', billingValue: 'R$ 2.300,00' },
    { fullName: 'Lucas Martins Costa', cpf: '901.234.567-89', birthDate: '2004-06-30', address: 'Av. Ipiranga, 500', city: 'São Paulo', phone: '(11) 3112-9090', cellphone: '(11) 99191-8888', billingValue: 'R$ 95,00' },
    { fullName: 'Patricia Barbosa Dias', cpf: '012.345.678-90', birthDate: '1973-03-15', address: 'Rua do Ouvidor, 50', city: 'Rio de Janeiro', phone: '(21) 2221-4500', cellphone: '(21) 99231-7788', billingValue: 'R$ 1.800,00' },
    { fullName: 'Rodrigo Gomes Pires', cpf: '123.098.876-54', birthDate: '1961-09-08', address: 'Av. Batel, 1420', city: 'Curitiba', phone: '(41) 3223-1100', cellphone: '(41) 99188-7766', billingValue: 'R$ 5.400,00' },
    { fullName: 'Camila Teixeira Silva', cpf: '234.187.765-43', birthDate: '1998-01-22', address: 'Rua Barra Funda, 800', city: 'São Paulo', phone: '(11) 3662-4411', cellphone: '(11) 98118-2233', billingValue: 'R$ 410,00' }
  ];

  try {
    // Limpar tabelas de atendimento e triagem antes do seed
    await db.execute('DELETE FROM triages');
    await db.execute('DELETE FROM encounters');

    const insertedPatientIds = [];

    for (const patient of mockPatients) {
      const check = await db.execute({
        sql: 'SELECT id FROM patients WHERE cpf = ?',
        args: [patient.cpf]
      });

      let patientId;
      if (check.rows.length === 0) {
        patientId = await generatePatientId(patient.fullName);
        await db.execute({
          sql: 'INSERT INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [patientId, patient.fullName, patient.cpf, patient.birthDate, patient.address, patient.city, patient.phone, patient.cellphone, patient.billingValue]
        });
      } else {
        patientId = check.rows[0].id;
      }
      insertedPatientIds.push({ id: patientId, name: patient.fullName });
    }

    // Gerar atendimentos fictícios para testar a fila e relatórios
    const now = new Date();
    
    // 1. Atendimento de Urgência finalizado para Ana Beatriz Oliveira (triagem Amarela)
    const encId1 = crypto.randomUUID();
    const admTime1 = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2h atrás
    const compTime1 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(); // 1h atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [encId1, insertedPatientIds[0].id, 'Urgencia', 'Finalizado', admTime1, compTime1]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId1, 'Amarelo', 62.0, '120/80', 38.1, 85, 'Febre e tosse seca persistente.', admTime1]
    });

    // 2. Atendimento de Urgência aguardando consulta para Carlos Henrique Santos (triagem Laranja - Muito Urgente)
    const encId2 = crypto.randomUUID();
    const admTime2 = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // 30 min atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId2, insertedPatientIds[1].id, 'Urgencia', 'Aguardando_Atendimento', admTime2]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId2, 'Laranja', 84.5, '150/95', 36.6, 98, 'Dor torácica leve irradiando para o braço.', admTime2]
    });

    // 3. Atendimento de Urgência aguardando consulta para Mariana Costa Lima (triagem Verde - Pouco Urgente)
    const encId3 = crypto.randomUUID();
    const admTime3 = new Date(now.getTime() - 40 * 60 * 1000).toISOString(); // 40 min atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId3, insertedPatientIds[3].id, 'Urgencia', 'Aguardando_Atendimento', admTime3]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId3, 'Verde', 58.0, '110/70', 37.2, 72, 'Entorse leve no tornozelo esquerdo.', admTime3]
    });

    // 4. Atendimento de Urgência aguardando triagem para Bruno Silva Souza
    const encId4 = crypto.randomUUID();
    const admTime4 = new Date(now.getTime() - 15 * 60 * 1000).toISOString(); // 15 min atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId4, insertedPatientIds[2].id, 'Urgencia', 'Aguardando_Triagem', admTime4]
    });

    // 5. Atendimento Ambulatorial finalizado para Roberto Alves Prado (Manchester Azul)
    const encId5 = crypto.randomUUID();
    const admTime5 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 dias atrás
    const compTime5 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString();
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [encId5, insertedPatientIds[4].id, 'Ambulatorio', 'Finalizado', admTime5, compTime5]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId5, 'Azul', 72.0, '120/75', 36.3, 68, 'Consulta de rotina para renovação de receita.', admTime5]
    });

    // 6. Atendimento de Urgência em consulta para Juliana Mendes Rocha (Manchester Vermelho)
    const encId6 = crypto.randomUUID();
    const admTime6 = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // 10 min atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId6, insertedPatientIds[5].id, 'Urgencia', 'Em_Atendimento', admTime6]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId6, 'Vermelho', 65.0, '90/60', 35.8, 120, 'Parada cardiorrespiratória revertida no SAMU.', admTime6]
    });

    // 7. Atendimento Ambulatorial aguardando consulta para Fernanda Souza Lima
    const encId7 = crypto.randomUUID();
    const admTime7 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 1 dia atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId7, insertedPatientIds[6].id, 'Ambulatorio', 'Aguardando_Atendimento', admTime7]
    });

    // 8. Atendimento de Urgência finalizado para Gabriel Castro Neves (Manchester Laranja)
    const encId8 = crypto.randomUUID();
    const admTime8 = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(); // 5h atrás
    const compTime8 = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(); // 4h atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [encId8, insertedPatientIds[7].id, 'Urgencia', 'Finalizado', admTime8, compTime8]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId8, 'Laranja', 90.0, '160/100', 37.0, 105, 'Cefaleia súbita e intensa com dormência no braço.', admTime8]
    });

    // 9. Atendimento de Urgência aguardando triagem para Lucas Martins Costa
    const encId9 = crypto.randomUUID();
    const admTime9 = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 min atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId9, insertedPatientIds[8].id, 'Urgencia', 'Aguardando_Triagem', admTime9]
    });

    // 10. Atendimento Ambulatorial em consulta para Rodrigo Gomes Pires (Manchester Amarelo)
    const encId10 = crypto.randomUUID();
    const admTime10 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(); // 1h atrás
    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encId10, insertedPatientIds[10].id, 'Ambulatorio', 'Em_Atendimento', admTime10]
    });
    await db.execute({
      sql: `INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), encId10, 'Amarelo', 80.0, '130/85', 38.5, 90, 'Dor de ouvido intensa com secreção.', admTime10]
    });

    res.status(200).json({
      status: 'success',
      message: 'Dados fictícios de pacientes, atendimentos e triagens gerados com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao gerar dados fictícios:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao gerar dados fictícios no banco.'
    });
  }
});

// Endpoint para resetar todas as tabelas do banco
app.post('/api/settings/reset', async (req, res) => {
  try {
    await db.execute('DELETE FROM clinical_notes');
    await db.execute('DELETE FROM triages');
    await db.execute('DELETE FROM encounters');
    await db.execute('DELETE FROM patients');
    res.status(200).json({
      status: 'success',
      message: 'Banco de dados limpo com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao limpar banco de dados:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao limpar banco de dados.'
    });
  }
});

// Endpoint para exportar todos os dados
app.get('/api/settings/export', async (req, res) => {
  try {
    const users = await db.execute('SELECT * FROM users');
    const patients = await db.execute('SELECT * FROM patients');
    const encounters = await db.execute('SELECT * FROM encounters');
    const triages = await db.execute('SELECT * FROM triages');
    const clinical_notes = await db.execute('SELECT * FROM clinical_notes');

    res.status(200).json({
      users: users.rows,
      patients: patients.rows,
      encounters: encounters.rows,
      triages: triages.rows,
      clinical_notes: clinical_notes.rows
    });
  } catch (err) {
    console.error('Erro ao exportar dados:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao exportar banco de dados.' });
  }
});

// Endpoint para importar dados
app.post('/api/settings/import', async (req, res) => {
  const { users, patients, encounters, triages, clinical_notes } = req.body;
  if (!users || !patients || !encounters || !triages || !clinical_notes) {
    return res.status(400).json({ status: 'error', message: 'Formato de JSON inválido.' });
  }

  try {
    // 1. users
    for (const u of users) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO users (id, name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [u.id, u.name, u.username, u.password_hash, u.role, u.created_at]
      });
    }

    // 2. patients
    for (const p of patients) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [p.id, p.fullName, p.cpf, p.birthDate, p.address, p.city, p.phone, p.cellphone, p.billingValue, p.created_at]
      });
    }

    // 3. encounters
    for (const e of encounters) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO encounters (id, patientId, type, status, admitted_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at]
      });
    }

    // 4. triages
    for (const t of triages) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [t.id, t.encounterId, t.manchesterColor, t.weightKg, t.bloodPressure, t.temperatureCelsius, t.heartRateBpm, t.complaints, t.triaged_at]
      });
    }

    // 5. clinical_notes
    for (const c of clinical_notes) {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO clinical_notes (id, encounterId, noteType, subjectiveContent, objectiveContent, assessmentContent, planContent, signatureHash, isClosed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [c.id, c.encounterId, c.noteType, c.subjectiveContent, c.objectiveContent, c.assessmentContent, c.planContent, c.signatureHash, c.isClosed, c.created_at]
      });
    }

    res.status(200).json({ status: 'success', message: 'Dados importados com sucesso!' });
  } catch (err) {
    console.error('Erro ao importar dados:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao importar dados.' });
  }
});

// --- AGENDA MÉDICA (APPOINTMENTS) ---
app.get('/api/appointments', async (req, res) => {
  try {
    const { date, doctor } = req.query;
    let sql = 'SELECT * FROM appointments';
    let args = [];
    let conditions = [];

    if (date) {
      conditions.push('appointmentDate = ?');
      args.push(date);
    }
    if (doctor) {
      conditions.push('doctorName = ?');
      args.push(doctor);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY appointmentTime ASC';

    const result = await db.execute({ sql, args });
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao listar consultas.' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, notes } = req.body;
    if (!patientId || !patientName || !doctorName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ status: 'error', message: 'Preencha todos os campos obrigatórios da consulta.' });
    }
    const id = 'APT-' + crypto.randomBytes(4).toString('hex');
    const nowIso = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO appointments (id, patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Agendado', ?, ?, ?)`,
      args: [id, patientId, patientName, doctorName, specialty || 'Clínica Geral', appointmentDate, appointmentTime, notes || '', nowIso, nowIso]
    });

    if (!process.env.VERCEL) {
      await updatePreviousAndLastUpload(nowIso);
    }

    res.status(201).json({ status: 'success', message: 'Consulta agendada com sucesso.', data: { id } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao agendar consulta.' });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const nowIso = new Date().toISOString();
    
    const statusVal = status !== undefined ? status : null;
    const notesVal = notes !== undefined ? notes : null;

    await db.execute({
      sql: 'UPDATE appointments SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?',
      args: [statusVal, notesVal, nowIso, id]
    });

    if (!process.env.VERCEL) {
      try {
        await updatePreviousAndLastUpload(nowIso);
      } catch (e) {
        console.warn('[SyncNotice] updatePreviousAndLastUpload notice:', e);
      }
    }

    res.status(200).json({ status: 'success', message: 'Consulta atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro em PUT /api/appointments/:id:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao atualizar consulta: ' + err.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: 'DELETE FROM appointments WHERE id = ?',
      args: [id]
    });
    res.status(200).json({ status: 'success', message: 'Consulta excluída com sucesso.' });
  } catch (err) {
    console.error('Erro em DELETE /api/appointments/:id:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao excluir consulta.' });
  }
});

// --- GESTÃO DE LEITOS (BEDS) ---
app.get('/api/beds', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM beds ORDER BY sector ASC, bedNumber ASC');
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao listar leitos.' });
  }
});

app.post('/api/beds/admit', async (req, res) => {
  try {
    const { bedId, patientId, patientName } = req.body;
    if (!bedId || !patientId || !patientName) {
      return res.status(400).json({ status: 'error', message: 'Leito e paciente são obrigatórios.' });
    }
    const nowIso = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE beds SET status = "Ocupado", patientId = ?, patientName = ?, admittedAt = ?, updated_at = ? WHERE id = ?',
      args: [patientId, patientName, nowIso, nowIso, bedId]
    });

    if (!process.env.VERCEL) {
      await updatePreviousAndLastUpload(nowIso);
    }

    res.status(200).json({ status: 'success', message: 'Paciente internado no leito com sucesso.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao internar paciente no leito.' });
  }
});

app.post('/api/beds/discharge', async (req, res) => {
  try {
    const { bedId } = req.body;
    if (!bedId) {
      return res.status(400).json({ status: 'error', message: 'ID do leito é obrigatório.' });
    }
    const nowIso = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE beds SET status = "Higienizacao", patientId = NULL, patientName = NULL, admittedAt = NULL, updated_at = ? WHERE id = ?',
      args: [nowIso, bedId]
    });

    if (!process.env.VERCEL) {
      await updatePreviousAndLastUpload(nowIso);
    }

    res.status(200).json({ status: 'success', message: 'Alta concedida. Leito encaminhado para higienização.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao dar alta do leito.' });
  }
});

app.put('/api/beds/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Vago', 'Higienizacao', 'Manutencao'
    const nowIso = new Date().toISOString();
    await db.execute({
      sql: 'UPDATE beds SET status = ?, updated_at = ? WHERE id = ?',
      args: [status, nowIso, id]
    });

    if (!process.env.VERCEL) {
      await updatePreviousAndLastUpload(nowIso);
    }

    res.status(200).json({ status: 'success', message: 'Status do leito atualizado com sucesso.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao atualizar status do leito.' });
  }
});

// --- PRESCRIÇÃO MÉDICA (PRESCRIPTIONS) ---
app.get('/api/prescriptions', async (req, res) => {
  try {
    const { encounterId, patientId } = req.query;
    let sql = 'SELECT * FROM prescriptions';
    let args = [];
    if (encounterId) {
      sql += ' WHERE encounterId = ?';
      args.push(encounterId);
    } else if (patientId) {
      sql += ' WHERE patientId = ?';
      args.push(patientId);
    }
    sql += ' ORDER BY created_at DESC';
    const result = await db.execute({ sql, args });
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao carregar prescrições.' });
  }
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const { encounterId, patientId, patientName, doctorName, medicationsJson } = req.body;
    if (!encounterId || !patientId || !patientName || !medicationsJson) {
      return res.status(400).json({ status: 'error', message: 'Dados insuficientes para gerar a prescrição.' });
    }
    const id = 'RX-' + crypto.randomBytes(4).toString('hex');
    const nowIso = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO prescriptions (id, encounterId, patientId, patientName, doctorName, medicationsJson, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Ativa', ?)`,
      args: [id, encounterId, patientId, patientName, doctorName || 'Médico Responsável', JSON.stringify(medicationsJson), nowIso]
    });

    if (!process.env.VERCEL) {
      await updatePreviousAndLastUpload(nowIso);
    }

    res.status(201).json({ status: 'success', message: 'Prescrição emitida com sucesso.', data: { id } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Erro ao criar prescrição.' });
  }
});

// Helper para execução de queries individuais com auto-retry em conexões expiradas/ociosas
const executeWithRetry = async (originalClient, sql, args = [], maxRetries = 3) => {
  const sanitizedArgs = (args || []).map(v => (v === undefined ? null : v));
  let currentClient = originalClient;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await currentClient.execute({ sql, args: sanitizedArgs });
      return res;
    } catch (err) {
      const isConnErr = err.message?.includes('fetch failed') || 
                        err.message?.includes('timeout') || 
                        err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                        err.cause?.code === 'ECONNRESET';
      if (isConnErr && attempt < maxRetries) {
        const waitMs = 800 * attempt; // backoff: 800ms, 1600ms
        console.warn(`[DB] Tentativa ${attempt}/${maxRetries} falhou (${err.cause?.code || 'fetch failed'}). Recriando conexão em ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        // Recriar conexão Turso para descartar socket TCP morto
        const fresh = reconnectCloud();
        if (fresh) currentClient = fresh;
        continue;
      }
      throw err;
    }
  }
};

// Helper para execução em lote rápida e ultra-resiliente no Turso/SQLite
const batchExecute = async (client, statements) => {
  if (!statements || statements.length === 0) return;
  const sanitized = statements.map(s => ({
    sql: s.sql,
    args: (s.args || []).map(v => (v === undefined ? null : v))
  }));

  // Executar em lotes de 50 para evitar limites de tamanho do payload do Turso HTTP
  const CHUNK_SIZE = 50;
  for (let i = 0; i < sanitized.length; i += CHUNK_SIZE) {
    const chunk = sanitized.slice(i, i + CHUNK_SIZE);
    let success = false;

    // Tentativa em lote com retry de reconexão
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (typeof client.batch === 'function') {
          await client.batch(chunk, 'write');
        } else {
          for (const stmt of chunk) {
            await client.execute(stmt);
          }
        }
        success = true;
        break;
      } catch (batchErr) {
        console.warn(`[batchExecute] Tentativa ${attempt} em lote falhou: ${batchErr.message}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    // Se as 2 tentativas em lote falharem, executa linha por linha individualmente
    if (!success) {
      for (const stmt of chunk) {
        try {
          await client.execute(stmt);
        } catch (singleErr) {
          console.error('[batchExecute] Falha na SQL individual:', stmt.sql, singleErr.message);
        }
      }
    }
  }
};

// Função auxiliar para buscar contagens e timestamps de um DB em apenas 1 consulta
const getDbStats = async (client) => {
  if (!client) return null;
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Turso connection timeout 8s')), 8000)
    );
    const queryPromise = client.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as cnt_users,
        (SELECT COUNT(*) FROM patients) as cnt_patients,
        (SELECT COUNT(*) FROM encounters) as cnt_encounters,
        (SELECT COUNT(*) FROM triages) as cnt_triages,
        (SELECT COUNT(*) FROM clinical_notes) as cnt_clinical_notes,
        (SELECT COUNT(*) FROM appointments) as cnt_appointments,
        (SELECT COUNT(*) FROM beds) as cnt_beds,
        (SELECT COUNT(*) FROM prescriptions) as cnt_prescriptions,
        (SELECT MAX(created_at) FROM users) as max_users,
        (SELECT MAX(COALESCE(updated_at, created_at)) FROM patients) as max_patients,
        (SELECT MAX(admitted_at) FROM encounters) as max_encounters,
        (SELECT MAX(triaged_at) FROM triages) as max_triages,
        (SELECT MAX(created_at) FROM clinical_notes) as max_clinical_notes,
        (SELECT MAX(COALESCE(updated_at, created_at)) FROM appointments) as max_appointments,
        (SELECT MAX(COALESCE(updated_at, admittedAt)) FROM beds) as max_beds,
        (SELECT MAX(created_at) FROM prescriptions) as max_prescriptions,
        (SELECT MAX(timestamp) FROM sync_logs WHERE key IN ('last_upload', 'last_download')) as last_sync,
        (SELECT timestamp FROM sync_logs WHERE key = 'previous_upload') as previous_upload
    `);
    const r = await Promise.race([queryPromise, timeoutPromise]);
    const row = r && r.rows && r.rows[0] ? r.rows[0] : {};
    return {
      counts: {
        users: Number(row.cnt_users || 0),
        patients: Number(row.cnt_patients || 0),
        encounters: Number(row.cnt_encounters || 0),
        triages: Number(row.cnt_triages || 0),
        clinical_notes: Number(row.cnt_clinical_notes || 0),
        appointments: Number(row.cnt_appointments || 0),
        beds: Number(row.cnt_beds || 0),
        prescriptions: Number(row.cnt_prescriptions || 0)
      },
      timestamps: {
        users: row.max_users || null,
        patients: row.max_patients || null,
        encounters: row.max_encounters || null,
        triages: row.max_triages || null,
        clinical_notes: row.max_clinical_notes || null,
        appointments: row.max_appointments || null,
        beds: row.max_beds || null,
        prescriptions: row.max_prescriptions || null,
        last_sync: row.last_sync || null
      },
      lastSync: row.last_sync || null,
      previousSync: row.previous_upload || null
    };
  } catch (e) {
    console.warn('[DB] Erro ou timeout ao buscar estatísticas do banco:', e.message);
    return null;
  }
};

// Obter o status de sincronização (com timestamps de última modificação de forma ultra-rápida)
app.get('/api/sync/status', async (req, res) => {
  try {
    const tables = ['users', 'patients', 'encounters', 'triages', 'clinical_notes', 'appointments', 'beds', 'prescriptions'];
    const localStats = await getDbStats(db);
    const localCounts = localStats ? localStats.counts : {};
    const localTimestamps = localStats ? localStats.timestamps : {};
    const previousLocalSync = localStats ? localStats.previousSync : null;

    if (getCloudDb()) {
      const cloudStats = await getDbStats(getCloudDb());
      const cloudCounts = cloudStats ? cloudStats.counts : {};
      const cloudTimestamps = cloudStats ? cloudStats.timestamps : {};
      const previousCloudSync = cloudStats ? cloudStats.previousSync : null;

      const parseTs = (ts) => {
        if (!ts) return 0;
        let s = String(ts).trim();
        if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T') + 'Z';
        const d = new Date(s);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

      // Determinar o último ponto de sincronização gravado em sync_logs
      const lastLocalSyncTs = parseTs(localStats ? localStats.lastSync : null);
      const lastCloudSyncTs = parseTs(cloudStats ? cloudStats.lastSync : null);
      const effectiveSyncTs = Math.max(lastLocalSyncTs, lastCloudSyncTs);

      let hasDifferences = false;

      // 1. Checar se número de registros difere em alguma tabela
      const countMismatch = tables.some(key => (localCounts[key] || 0) !== (cloudCounts[key] || 0));

      if (countMismatch) {
        hasDifferences = true;
      } else if (effectiveSyncTs > 0) {
        // 2. Se já houve sincronização prévia, verificar se algum banco possui alterações posteriores ao último sync
        const BUFFER_MS = 5000;
        const hasNewerLocalChanges = tables.some(key => parseTs(localTimestamps[key]) > (effectiveSyncTs + BUFFER_MS));
        const hasNewerCloudChanges = tables.some(key => parseTs(cloudTimestamps[key]) > (effectiveSyncTs + BUFFER_MS));

        hasDifferences = hasNewerLocalChanges || hasNewerCloudChanges;
      } else {
        // 3. Se ainda não há registro em sync_logs e as contagens são 100% idênticas, considerar sincronizado
        hasDifferences = false;
      }

      res.status(200).json({
        status: 'success',
        cloudConfigured: true,
        isVercel: !!process.env.VERCEL,
        synchronized: !hasDifferences,
        local: localCounts,
        cloud: cloudCounts,
        localTimestamps,
        cloudTimestamps,
        previousLocalBackup: previousLocalSync,
        previousCloudBackup: previousCloudSync
      });
    } else {
      res.status(200).json({
        status: 'success',
        cloudConfigured: false,
        isVercel: !!process.env.VERCEL,
        synchronized: true,
        local: localCounts,
        cloud: localCounts,
        localTimestamps,
        cloudTimestamps: localTimestamps
      });
    }
  } catch (err) {
    console.error('Erro ao verificar status de sincronização:', err);
    res.status(500).json({ status: 'error', message: 'Erro ao verificar sincronização.' });
  }
});

// Enviar banco ativo para a nuvem em Lote (Super Rápido)
app.post('/api/sync/upload', async (req, res) => {
  if (!getCloudDb()) {
    return res.status(400).json({ status: 'error', message: 'Banco na nuvem não configurado.' });
  }

  try {
    const cloudDb = getCloudDb();
    const [users, patients, encounters, triages, clinical_notes, appointments, beds, prescriptions] = await Promise.all([
      db.execute('SELECT * FROM users').then(r => r.rows),
      db.execute('SELECT * FROM patients').then(r => r.rows),
      db.execute('SELECT * FROM encounters').then(r => r.rows),
      db.execute('SELECT * FROM triages').then(r => r.rows),
      db.execute('SELECT * FROM clinical_notes').then(r => r.rows),
      db.execute('SELECT * FROM appointments').then(r => r.rows),
      db.execute('SELECT * FROM beds').then(r => r.rows),
      db.execute('SELECT * FROM prescriptions').then(r => r.rows)
    ]);

    const stmts = [
      ...users.map(u => ({
        sql: 'INSERT OR REPLACE INTO users (id, name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [u.id, u.name, u.username, u.password_hash, u.role, u.created_at]
      })),
      ...patients.map(p => ({
        sql: 'INSERT OR REPLACE INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [p.id, p.fullName, p.cpf, p.birthDate, p.address, p.city, p.phone, p.cellphone, p.billingValue, p.created_at, p.updated_at || p.created_at]
      })),
      ...encounters.map(e => ({
        sql: 'INSERT OR REPLACE INTO encounters (id, patientId, type, status, admitted_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at]
      })),
      ...triages.map(t => ({
        sql: 'INSERT OR REPLACE INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [t.id, t.encounterId, t.manchesterColor, t.weightKg, t.bloodPressure, t.temperatureCelsius, t.heartRateBpm, t.complaints, t.triaged_at]
      })),
      ...clinical_notes.map(cn => ({
        sql: 'INSERT OR REPLACE INTO clinical_notes (id, encounterId, noteType, subjectiveContent, objectiveContent, assessmentContent, planContent, signatureHash, isClosed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [cn.id, cn.encounterId, cn.noteType, cn.subjectiveContent, cn.objectiveContent, cn.assessmentContent, cn.planContent, cn.signatureHash, cn.isClosed, cn.created_at]
      })),
      ...appointments.map(apt => ({
        sql: 'INSERT OR REPLACE INTO appointments (id, patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [apt.id, apt.patientId, apt.patientName, apt.doctorName, apt.specialty, apt.appointmentDate, apt.appointmentTime, apt.status, apt.notes, apt.created_at, apt.updated_at]
      })),
      ...beds.map(bed => ({
        sql: 'INSERT OR REPLACE INTO beds (id, bedNumber, sector, status, patientId, patientName, admittedAt, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [bed.id, bed.bedNumber, bed.sector, bed.status, bed.patientId, bed.patientName, bed.admittedAt, bed.updated_at]
      })),
      ...prescriptions.map(rx => ({
        sql: 'INSERT OR REPLACE INTO prescriptions (id, encounterId, patientId, patientName, doctorName, medicationsJson, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [rx.id, rx.encounterId, rx.patientId, rx.patientName, rx.doctorName, rx.medicationsJson, rx.status, rx.created_at]
      }))
    ];

    await batchExecute(cloudDb, stmts);

    const nowIso = new Date().toISOString();
    try {
      // Rotacionar em db local
      const localLogRes = await db.execute({ sql: "SELECT timestamp FROM sync_logs WHERE key = 'last_upload'", args: [] });
      const prevLocal = localLogRes?.rows?.[0]?.timestamp;
      if (prevLocal) {
        await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('previous_upload', ?)", args: [prevLocal] });
      }
      await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [nowIso] });

      // Rotacionar no cloudDb
      const cloudLogRes = await cloudDb.execute({ sql: "SELECT timestamp FROM sync_logs WHERE key = 'last_upload'", args: [] });
      const prevCloud = cloudLogRes?.rows?.[0]?.timestamp;
      if (prevCloud) {
        await cloudDb.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('previous_upload', ?)", args: [prevCloud] });
      }
      await cloudDb.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [nowIso] });
    } catch (e) {}

    res.status(200).json({ status: 'success', message: 'Dados enviados para a nuvem com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar dados para a nuvem:', err.message || err);
    const isNetworkErr = err.message?.includes('fetch failed') || err.message?.includes('timeout') || err.code === 'UND_ERR_CONNECT_TIMEOUT';
    const statusCode = isNetworkErr ? 503 : 500;
    const userMsg = isNetworkErr 
      ? 'Conexão com a nuvem (Turso) expirou. Os dados continuam salvos com segurança no banco local.' 
      : (err.message || 'Falha ao enviar dados para a nuvem.');
    res.status(statusCode).json({ status: 'error', message: userMsg });
  }
});

// Baixar banco da nuvem para o ativo em Lote (Super Rápido)
app.post('/api/sync/download', async (req, res) => {
  if (!getCloudDb()) {
    return res.status(400).json({ status: 'error', message: 'Banco na nuvem não configurado.' });
  }

  try {
    const cloudDb = getCloudDb();
    const [users, patients, encounters, triages, clinical_notes, appointments, beds, prescriptions] = await Promise.all([
      executeWithRetry(cloudDb, 'SELECT * FROM users').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM patients').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM encounters').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM triages').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM clinical_notes').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM appointments').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM beds').then(r => r.rows),
      executeWithRetry(cloudDb, 'SELECT * FROM prescriptions').then(r => r.rows)
    ]);

    const stmts = [
      ...users.map(u => ({
        sql: 'INSERT OR REPLACE INTO users (id, name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [u.id, u.name, u.username, u.password_hash, u.role, u.created_at]
      })),
      ...patients.map(p => ({
        sql: 'INSERT OR REPLACE INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [p.id, p.fullName, p.cpf, p.birthDate, p.address, p.city, p.phone, p.cellphone, p.billingValue, p.created_at, p.updated_at || p.created_at]
      })),
      ...encounters.map(e => ({
        sql: 'INSERT OR REPLACE INTO encounters (id, patientId, type, status, admitted_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at]
      })),
      ...triages.map(t => ({
        sql: 'INSERT OR REPLACE INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [t.id, t.encounterId, t.manchesterColor, t.weightKg, t.bloodPressure, t.temperatureCelsius, t.heartRateBpm, t.complaints, t.triaged_at]
      })),
      ...clinical_notes.map(cn => ({
        sql: 'INSERT OR REPLACE INTO clinical_notes (id, encounterId, noteType, subjectiveContent, objectiveContent, assessmentContent, planContent, signatureHash, isClosed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [cn.id, cn.encounterId, cn.noteType, cn.subjectiveContent, cn.objectiveContent, cn.assessmentContent, cn.planContent, cn.signatureHash, cn.isClosed, cn.created_at]
      })),
      ...appointments.map(apt => ({
        sql: 'INSERT OR REPLACE INTO appointments (id, patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [apt.id, apt.patientId, apt.patientName, apt.doctorName, apt.specialty, apt.appointmentDate, apt.appointmentTime, apt.status, apt.notes, apt.created_at, apt.updated_at]
      })),
      ...beds.map(bed => ({
        sql: 'INSERT OR REPLACE INTO beds (id, bedNumber, sector, status, patientId, patientName, admittedAt, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [bed.id, bed.bedNumber, bed.sector, bed.status, bed.patientId, bed.patientName, bed.admittedAt, bed.updated_at]
      })),
      ...prescriptions.map(rx => ({
        sql: 'INSERT OR REPLACE INTO prescriptions (id, encounterId, patientId, patientName, doctorName, medicationsJson, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [rx.id, rx.encounterId, rx.patientId, rx.patientName, rx.doctorName, rx.medicationsJson, rx.status, rx.created_at]
      }))
    ];

    await batchExecute(db, stmts);

    const nowIso = new Date().toISOString();
    try {
      await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_download', ?)", args: [nowIso] });
      await db.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [nowIso] });
      // Gravar no cloud também para manter sync_logs em sincronia
      const cdb = getCloudDb();
      if (cdb) await cdb.execute({ sql: "INSERT OR REPLACE INTO sync_logs (key, timestamp) VALUES ('last_upload', ?)", args: [nowIso] });
    } catch (e) {}

    res.status(200).json({ status: 'success', message: 'Dados baixados da nuvem com sucesso!' });
  } catch (err) {
    console.error('Erro ao baixar dados da nuvem:', err.message || err);
    const isNetworkErr = err.message?.includes('fetch failed') || err.message?.includes('timeout') || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
    const statusCode = isNetworkErr ? 503 : 500;
    const userMsg = isNetworkErr 
      ? 'Conexão com a nuvem (Turso) expirou. Os dados continuam salvos no banco local.' 
      : (err.message || 'Falha ao baixar dados da nuvem.');
    res.status(statusCode).json({ status: 'error', message: userMsg });
  }
});

// --- ROTAS DO CORPO CLÍNICO (MÉDICOS) ---
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM doctors ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar médicos:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao buscar médicos.' });
  }
});

app.post('/api/doctors', async (req, res) => {
  const { name, crm, specialty, phone, email } = req.body;
  if (!name || !crm || !specialty) {
    return res.status(400).json({ status: 'error', message: 'Nome, CRM e Especialidade são obrigatórios.' });
  }
  const id = 'DOC-' + crypto.randomUUID().substring(0, 8).toUpperCase();
  const createdAt = new Date().toISOString();
  try {
    await db.execute({
      sql: 'INSERT INTO doctors (id, name, crm, specialty, phone, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, name.trim(), crm.trim(), specialty.trim(), phone?.trim() || '', email?.trim() || '', 'Ativo', createdAt, createdAt]
    });
    res.status(201).json({ status: 'success', id, message: 'Médico cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar médico:', err);
    if (err.message?.includes('UNIQUE constraint failed: doctors.crm')) {
      return res.status(400).json({ status: 'error', message: 'Já existe um médico cadastrado com este CRM.' });
    }
    res.status(500).json({ status: 'error', message: 'Falha ao cadastrar médico.' });
  }
});

app.put('/api/doctors/:id', async (req, res) => {
  const { id } = req.params;
  const { name, crm, specialty, phone, email, status } = req.body;
  const updatedAt = new Date().toISOString();
  try {
    await db.execute({
      sql: 'UPDATE doctors SET name = ?, crm = ?, specialty = ?, phone = ?, email = ?, status = ?, updated_at = ? WHERE id = ?',
      args: [name.trim(), crm.trim(), specialty.trim(), phone?.trim() || '', email?.trim() || '', status || 'Ativo', updatedAt, id]
    });
    res.status(200).json({ status: 'success', message: 'Cadastro de médico atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar médico:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao atualizar médico.' });
  }
});

app.delete('/api/doctors/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: "UPDATE doctors SET status = 'Inativo', updated_at = ? WHERE id = ?", args: [new Date().toISOString(), id] });
    res.status(200).json({ status: 'success', message: 'Médico inativado com sucesso!' });
  } catch (err) {
    console.error('Erro ao inativar médico:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao inativar médico.' });
  }
});

// --- TRATAMENTO GLOBAL DE ERROS ---
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err);
  res.status(500).json({
    status: 'error',
    message: 'Ocorreu um erro interno no servidor.'
  });
});


// Rota de Histórico Clínico & Prontuário Pós-Alta do Paciente
app.get('/api/patients/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const patientRes = await db.execute({
      sql: 'SELECT * FROM patients WHERE id = ?',
      args: [id]
    });

    const patient = patientRes.rows[0] || { id, fullName: 'Paciente Agendado' };

    const encountersRes = await db.execute({
      sql: `
        SELECT 
          e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at,
          t.manchesterColor, t.bloodPressure, t.temperatureCelsius, t.complaints,
          cn.noteType, cn.subjectiveContent, cn.assessmentContent, cn.planContent
        FROM encounters e
        LEFT JOIN triages t ON e.id = t.encounterId
        LEFT JOIN clinical_notes cn ON e.id = cn.encounterId
        WHERE e.patientId = ?
        ORDER BY e.admitted_at DESC
      `,
      args: [id]
    });

    const appointmentsRes = await db.execute({
      sql: 'SELECT * FROM appointments WHERE patientId = ? ORDER BY appointmentDate DESC',
      args: [id]
    });

    const prescriptionsRes = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE patientId = ? ORDER BY created_at DESC',
      args: [id]
    });

    res.status(200).json({
      status: 'success',
      data: {
        patient,
        encounters: encountersRes.rows || [],
        appointments: appointmentsRes.rows || [],
        prescriptions: prescriptionsRes.rows || []
      }
    });
  } catch (err) {
    console.error('Erro ao buscar histórico do paciente:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao buscar histórico do paciente.' });
  }
});

export default app;
