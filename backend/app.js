import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './database/client.js';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'health-nexus-super-secret-key';

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- INICIALIZAÇÃO DO BANCO DE DADOS (TURSO) ---
(async () => {
  try {
    // Criar tabela de usuários
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'Médico',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await db.execute('ALTER TABLE users RENAME COLUMN email TO username');
    } catch (err) {
      // Ignora se a coluna já foi renomeada ou banco novo
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        birthDate TEXT NOT NULL,
        address TEXT,
        city TEXT,
        phone TEXT,
        cellphone TEXT,
        billingValue TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Auto-migração para banco de dados que já existe
    const columns = ['address', 'city', 'phone', 'cellphone', 'billingValue'];
    for (const col of columns) {
      try {
        await db.execute(`ALTER TABLE patients ADD COLUMN ${col} TEXT`);
      } catch (err) {
        // Ignora se a coluna já existe no SQLite
      }
    }

    // Criar tabela de atendimentos (encounters)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS encounters (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        admitted_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (patientId) REFERENCES patients(id)
      )
    `);

    // Criar tabela de triagens (triages)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS triages (
        id TEXT PRIMARY KEY,
        encounterId TEXT UNIQUE NOT NULL,
        manchesterColor TEXT NOT NULL,
        weightKg REAL,
        bloodPressure TEXT NOT NULL,
        temperatureCelsius REAL NOT NULL,
        heartRateBpm INTEGER,
        complaints TEXT NOT NULL,
        triaged_at TEXT NOT NULL,
        FOREIGN KEY (encounterId) REFERENCES encounters(id)
      )
    `);

    // Criar tabela de prontuário (clinical_notes)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clinical_notes (
        id TEXT PRIMARY KEY,
        encounterId TEXT UNIQUE NOT NULL,
        noteType TEXT NOT NULL,
        subjectiveContent TEXT,
        objectiveContent TEXT,
        assessmentContent TEXT,
        planContent TEXT,
        signatureHash TEXT,
        isClosed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (encounterId) REFERENCES encounters(id)
      )
    `);

    console.log('Banco de dados local/Turso inicializado com sucesso.');
    
    // Garantir que exista um usuário padrão admin/admin
    const { rows } = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: ['admin']
    });
    if (rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin', 10);
      const adminId = 'US-' + crypto.randomBytes(4).toString('hex');
      await db.execute({
        sql: 'INSERT INTO users (id, name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        args: [adminId, 'Administrador Padrão', 'admin', passwordHash, 'Administrador']
      });
      console.log('Usuário padrão "admin" (senha: admin) criado com sucesso.');
    }
  } catch (err) {
    console.error('Falha ao inicializar tabela de banco de dados:', err);
  }
})();

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
  console.log('Navegador fechado. Encerrando o servidor imediatamente...');
  res.sendStatus(200);
  setTimeout(() => process.exit(0), 100);
});

setInterval(() => {
  if (Date.now() - lastHeartbeat > 8000) {
    console.log('Nenhum navegador conectado. Encerrando o servidor...');
    process.exit(0);
  }
}, 2000);

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Nome, usuário e senha são obrigatórios.' });
    }

    // Verificar se o usuário já existe
    const existing = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Usuário já cadastrado.' });
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
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ message: 'Senha incorreta.' });
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
  const { patientId, type } = req.body;

  if (!patientId || !type) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos patientId e type são obrigatórios.'
    });
  }

  try {
    const patientCheck = await db.execute({
      sql: 'SELECT id FROM patients WHERE id = ?',
      args: [patientId]
    });

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Paciente não encontrado.'
      });
    }

    const activeCheck = await db.execute({
      sql: "SELECT id FROM encounters WHERE patientId = ? AND status != 'Finalizado'",
      args: [patientId]
    });

    if (activeCheck.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Este paciente já possui um atendimento ativo.'
      });
    }

    const encounterId = crypto.randomUUID();
    const admittedAt = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO encounters (id, patientId, type, status, admitted_at) VALUES (?, ?, ?, ?, ?)',
      args: [encounterId, patientId, type, 'Aguardando_Triagem', admittedAt]
    });

    res.status(201).json({
      status: 'success',
      encounterId,
      statusLabel: 'Aguardando_Triagem',
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
    
    // Inserção no banco de dados Turso (LibSQL)
    await db.execute({
      sql: 'INSERT INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [patientId, fullName, cpf, birthDate, address || '', city || '', phone || '', cellphone || '', billingValue || '']
    });

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

    await db.execute({
      sql: 'UPDATE patients SET fullName = ?, cpf = ?, birthDate = ?, address = ?, city = ?, phone = ?, cellphone = ?, billingValue = ? WHERE id = ?',
      args: [fullName, cpf, birthDate, address || '', city || '', phone || '', cellphone || '', billingValue || '', id]
    });

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
    { fullName: 'Roberto Alves Prado', cpf: '567.890.123-45', birthDate: '1965-07-30', address: 'Av. Afonso Pena, 2300', city: 'Belo Horizonte', phone: '(31) 3224-8899', cellphone: '(31) 98877-6655', billingValue: 'R$ 4.500,00' }
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

    // Gerar atendimentos fictícios para testar a fila
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

    res.status(200).json({ status: 'success', message: 'Dados importados e sincronizados com o Turso com sucesso!' });
  } catch (err) {
    console.error('Erro ao importar dados:', err);
    res.status(500).json({ status: 'error', message: 'Falha ao importar e sincronizar dados.' });
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

export default app;
