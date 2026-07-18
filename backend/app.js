import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { db } from './database/client.js';

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- INICIALIZAÇÃO DO BANCO DE DADOS (TURSO) ---
(async () => {
  try {
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

    console.log('Banco de dados local/Turso inicializado com sucesso.');
  } catch (err) {
    console.error('Falha ao inicializar tabela de banco de dados:', err);
  }
})();

// --- ROTAS DA API ---

// Endpoint de verificação de integridade (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Endpoint consolidado da Dashboard
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // Busca a contagem real de pacientes inseridos no banco Turso
    const countResult = await db.execute('SELECT COUNT(*) as count FROM patients');
    const totalPatients = Number(countResult.rows[0].count) || 0;

    res.status(200).json({
      activePatients: totalPatients,
      occupancyRate: 84.5,
      averageWaitTimeMinutes: 18,
      dailyAppointmentsCount: 84,
      billingSummary: {
        totalRevenue: 245000.00,
        pendingClaims: 45100.00
      }
    });
  } catch (err) {
    console.error('Erro ao buscar resumo da dashboard:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao buscar estatísticas da dashboard.'
    });
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
    for (const patient of mockPatients) {
      const patientId = await generatePatientId(patient.fullName);
      
      const check = await db.execute({
        sql: 'SELECT id FROM patients WHERE cpf = ?',
        args: [patient.cpf]
      });
      if (check.rows.length === 0) {
        await db.execute({
          sql: 'INSERT INTO patients (id, fullName, cpf, birthDate, address, city, phone, cellphone, billingValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [patientId, patient.fullName, patient.cpf, patient.birthDate, patient.address, patient.city, patient.phone, patient.cellphone, patient.billingValue]
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Dados fictícios gerados com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao gerar dados fictícios:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao gerar dados fictícios no banco.'
    });
  }
});

// Endpoint para resetar todos os pacientes do banco
app.post('/api/settings/reset', async (req, res) => {
  try {
    await db.execute('DELETE FROM patients');
    res.status(200).json({
      status: 'success',
      message: 'Banco de dados de pacientes limpo com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao limpar banco de dados:', err);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao limpar banco de dados.'
    });
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
