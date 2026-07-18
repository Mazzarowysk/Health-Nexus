import express from 'express';
import cors from 'cors';

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

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
app.get('/api/dashboard/summary', (req, res) => {
  // Valores estáticos simulados. Em produção, buscar via SQL do PostgreSQL.
  res.status(200).json({
    activePatients: 142,
    occupancyRate: 84.5,
    averageWaitTimeMinutes: 18,
    dailyAppointmentsCount: 84,
    billingSummary: {
      totalRevenue: 245000.00,
      pendingClaims: 45100.00
    }
  });
});

// Endpoint para criação de pacientes
app.post('/api/patients', (req, res) => {
  const { fullName, cpf, birthDate } = req.body;

  if (!fullName || !cpf || !birthDate) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos fullName, cpf e birthDate são de preenchimento obrigatório.'
    });
  }

  // Simulação de persistência (Banco de dados PostgreSQL)
  const patientId = crypto.randomUUID ? crypto.randomUUID() : 'e1f1ad7e-bf91-4d1a-a53c-12b23a54b38d';
  
  res.status(201).json({
    status: 'success',
    patientId,
    fullName,
    message: 'Paciente registrado com sucesso.'
  });
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
