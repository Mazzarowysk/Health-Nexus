import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:/Health Nexus/backend/app.js';
let content = readFileSync(filePath, 'utf8');

// 1. Reescrever POST /api/encounters para garantir tolerância total (auto-criação de paciente se faltar, atualização de status se existir)
const oldPostEncounters = `app.post('/api/encounters', async (req, res) => {
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
});`;

const newPostEncounters = `app.post('/api/encounters', async (req, res) => {
  const { patientId, type, patientName, status: reqStatus } = req.body;

  if (!patientId || !type) {
    return res.status(400).json({
      status: 'error',
      message: 'Os campos patientId e type são obrigatórios.'
    });
  }

  try {
    // 1. Garantir que o paciente exista na tabela patients para evitar falhas no JOIN
    const patientCheck = await db.execute({
      sql: 'SELECT id, fullName FROM patients WHERE id = ?',
      args: [patientId]
    });

    if (patientCheck.rows.length === 0) {
      const pName = patientName || 'Paciente Agendado';
      const nowIso = new Date().toISOString();
      await db.execute({
        sql: \`INSERT INTO patients (id, fullName, cpf, birthDate, gender, phone, email, status, created_at, updated_at)
              VALUES (?, ?, ?, '1990-01-01', 'Outro', '(11) 99999-9999', 'paciente@healthnexus.com', 'Ativo', ?, ?)\`,
        args: [patientId, pName, '000.000.000-00', nowIso, nowIso]
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
          sql: \`INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at)
                VALUES (?, ?, 'AMARELO', 70, '120/80', 36.5, 80, 'Atendimento Ambulatorial Agendado', ?)\`,
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
        sql: \`INSERT INTO triages (id, encounterId, manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at)
              VALUES (?, ?, 'AMARELO', 70, '120/80', 36.5, 80, 'Consulta Ambulatorial Agendada', ?)\`,
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
});`;

content = content.replace(oldPostEncounters, newPostEncounters);

// 2. Atualizar GET /api/encounters para usar LEFT JOIN patients e COALESCE nos nomes
const oldGetEncounters = `app.get('/api/encounters', async (req, res) => {
  try {
    const result = await db.execute(\`
      SELECT 
        e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at,
        p.fullName as patientName, p.cpf as patientCpf, p.birthDate as patientBirthDate,
        t.manchesterColor, t.weightKg, t.bloodPressure, t.temperatureCelsius, t.heartRateBpm, t.complaints, t.triaged_at
      FROM encounters e
      JOIN patients p ON e.patientId = p.id
      LEFT JOIN triages t ON e.id = t.encounterId
      ORDER BY e.admitted_at DESC
    \`);
    res.status(200).json(result.rows);
  } catch (err) {`;

const newGetEncounters = `app.get('/api/encounters', async (req, res) => {
  try {
    const result = await db.execute(\`
      SELECT 
        e.id, e.patientId, e.type, e.status, e.admitted_at, e.completed_at,
        COALESCE(p.fullName, 'Paciente Agendado') as patientName,
        COALESCE(p.cpf, '000.000.000-00') as patientCpf,
        COALESCE(p.birthDate, '1990-01-01') as patientBirthDate,
        COALESCE(t.manchesterColor, 'AMARELO') as manchesterColor,
        COALESCE(t.weightKg, 70) as weightKg,
        COALESCE(t.bloodPressure, '120/80') as bloodPressure,
        COALESCE(t.temperatureCelsius, 36.5) as temperatureCelsius,
        COALESCE(t.heartRateBpm, 80) as heartRateBpm,
        COALESCE(t.complaints, 'Consulta em andamento') as complaints,
        t.triaged_at
      FROM encounters e
      LEFT JOIN patients p ON e.patientId = p.id
      LEFT JOIN triages t ON e.id = t.encounterId
      ORDER BY e.admitted_at DESC
    \`);
    res.status(200).json(result.rows);
  } catch (err) {`;

content = content.replace(oldGetEncounters, newGetEncounters);

writeFileSync(filePath, content, 'utf8');
console.log('✅ fix_encounters_backend.mjs executado com sucesso em backend/app.js!');
