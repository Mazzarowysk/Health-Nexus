import { db, cloudDb } from './backend/database/client.js';

async function runSimulation() {
  console.log('=====================================================');
  console.log(' 🏥 INICIANDO SIMULAÇÃO COMPLETA DE ATENDIMENTOS ');
  console.log('=====================================================');

  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split('T')[0];

  const databases = [db];
  if (cloudDb) databases.push(cloudDb);

  for (const targetDb of databases) {
    try {
      // Desativar chaves estrangeiras temporariamente para reset limpo
      try { await targetDb.execute('PRAGMA foreign_keys = OFF'); } catch (_) {}

      // 1. Limpar tabelas para reset perfeito
      await targetDb.execute('DELETE FROM triages');
      await targetDb.execute('DELETE FROM encounters');
      await targetDb.execute('DELETE FROM tv_calls');
      await targetDb.execute('DELETE FROM beds');
      await targetDb.execute('DELETE FROM consulting_rooms');

      console.log('[SIMULATOR] Tabelas anteriores resetadas.');

      // 1.5 Garantir pacientes cadastrados
      const demoPatients = [
        { id: 'PAT-DEMO-01', fullName: 'Amanda Alvarenga', cpf: '111.222.333-01' },
        { id: 'PAT-DEMO-02', fullName: 'Ana Beatriz Oliveira', cpf: '111.222.333-02' },
        { id: 'PAT-DEMO-03', fullName: 'Bernardo Lima Fernandes', cpf: '111.222.333-03' },
        { id: 'PAT-DEMO-04', fullName: 'Bruno Silva Souza', cpf: '111.222.333-04' },
        { id: 'PAT-DEMO-05', fullName: 'Camila Teixeira Silva', cpf: '111.222.333-05' },
        { id: 'PAT-DEMO-06', fullName: 'Daniel Rocha Santos', cpf: '111.222.333-06' },
        { id: 'PAT-DEMO-07', fullName: 'Eduardo Rocha Pinto', cpf: '111.222.333-07' },
        { id: 'PAT-DEMO-08', fullName: 'Fernanda Lima Castro', cpf: '111.222.333-08' },
        { id: 'PAT-DEMO-09', fullName: 'Gabriel Castro Neves', cpf: '111.222.333-09' },
        { id: 'PAT-DEMO-10', fullName: 'Helena Martins Duarte', cpf: '111.222.333-10' },
        { id: 'PAT-DEMO-11', fullName: 'Igor Ferreira Mello', cpf: '111.222.333-11' },
        { id: 'PAT-DEMO-12', fullName: 'Juliana Mendes Rocha', cpf: '111.222.333-12' },
        { id: 'PAT-DEMO-13', fullName: 'Lucas Martins Costa', cpf: '111.222.333-13' },
        { id: 'PAT-DEMO-14', fullName: 'Mariana Costa Lima', cpf: '111.222.333-14' }
      ];

      for (const p of demoPatients) {
        await targetDb.execute({
          sql: 'INSERT OR IGNORE INTO patients (id, fullName, cpf, birthDate, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [p.id, p.fullName, p.cpf, '1990-01-01', '(11) 99999-9999', nowIso, nowIso]
        });
      }

      // 2. Inserir Consultórios Ativos
      const rooms = [
        { id: 'ROOM-01', name: 'Consultório 01', specialty: 'Clínica Geral', currentDoctor: 'Dr. Carlos Oliveira', status: 'Em Atendimento' },
        { id: 'ROOM-02', name: 'Consultório 02', specialty: 'Cardiologia', currentDoctor: 'Dr. João Silva', status: 'Em Atendimento' },
        { id: 'ROOM-03', name: 'Consultório 03', specialty: 'Pediatria', currentDoctor: 'Dra. Maria Santos', status: 'Em Atendimento' },
        { id: 'ROOM-04', name: 'Consultório 04', specialty: 'Ortopedia', currentDoctor: 'Dra. Ana Costa', status: 'Disponível' },
        { id: 'ROOM-05', name: 'Sala de Sutura', specialty: 'Enfermagem/Procedimentos', currentDoctor: 'Enf. Juliana Paes', status: 'Disponível' }
      ];

      for (const r of rooms) {
        await targetDb.execute({
          sql: 'INSERT INTO consulting_rooms (id, name, specialty, currentDoctor, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          args: [r.id, r.name, r.specialty, r.currentDoctor, r.status, nowIso]
        });
      }

      // 3. Inserir Leitos Hospitalares nas Alas
      const beds = [
        { id: 'UTI-01', bedNumber: 'UTI-01', sector: 'UTI Adulto', status: 'Ocupado', patientId: 'PAT-DEMO-01', patientName: 'Amanda Alvarenga', admittedAt: nowIso },
        { id: 'UTI-02', bedNumber: 'UTI-02', sector: 'UTI Adulto', status: 'Ocupado', patientId: 'PAT-DEMO-02', patientName: 'Ana Beatriz Oliveira', admittedAt: nowIso },
        { id: 'UTI-03', bedNumber: 'UTI-03', sector: 'UTI Adulto', status: 'Vago', patientId: null, patientName: null, admittedAt: null },
        { id: 'ENF-01', bedNumber: 'ENF-01', sector: 'Enfermaria', status: 'Ocupado', patientId: 'PAT-DEMO-06', patientName: 'Daniel Rocha Santos', admittedAt: nowIso },
        { id: 'ENF-02', bedNumber: 'ENF-02', sector: 'Enfermaria', status: 'Higienizacao', patientId: null, patientName: null, admittedAt: null },
        { id: 'ENF-03', bedNumber: 'ENF-03', sector: 'Enfermaria', status: 'Vago', patientId: null, patientName: null, admittedAt: null },
        { id: 'PED-01', bedNumber: 'PED-01', sector: 'Pediatria', status: 'Ocupado', patientId: 'PAT-DEMO-03', patientName: 'Bernardo Lima Fernandes', admittedAt: nowIso },
        { id: 'PED-02', bedNumber: 'PED-02', sector: 'Pediatria', status: 'Vago', patientId: null, patientName: null, admittedAt: null },
        { id: 'MAT-01', bedNumber: 'MAT-01', sector: 'Maternidade', status: 'Vago', patientId: null, patientName: null, admittedAt: null }
      ];

      for (const b of beds) {
        await targetDb.execute({
          sql: 'INSERT INTO beds (id, bedNumber, sector, status, patientId, patientName, admittedAt, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [b.id, b.bedNumber, b.sector, b.status, b.patientId, b.patientName, b.admittedAt, nowIso]
        });
      }

      // 4. Inserir Atendimentos nos Diversos Estágios do Fluxo
      const encounters = [
        // Recepção: Aguardando Triagem
        { id: 'ENC-001', patientId: 'PAT-DEMO-07', type: 'Pronto-Socorro', status: 'Aguardando_Triagem', room: null },
        { id: 'ENC-002', patientId: 'PAT-DEMO-09', type: 'Pronto-Socorro', status: 'Aguardando_Triagem', room: null },

        // Aguardando Atendimento Médico (Com Triagem Manchester)
        { id: 'ENC-003', patientId: 'PAT-DEMO-04', type: 'Pronto-Socorro', status: 'Aguardando_Atendimento', room: null },
        { id: 'ENC-004', patientId: 'PAT-DEMO-05', type: 'Pronto-Socorro', status: 'Aguardando_Atendimento', room: null },
        { id: 'ENC-005', patientId: 'PAT-DEMO-08', type: 'Pronto-Socorro', status: 'Aguardando_Atendimento', room: null },

        // Em Atendimento nos Consultórios
        { id: 'ENC-006', patientId: 'PAT-DEMO-10', type: 'Pronto-Socorro', status: 'Em_Atendimento', room: 'Consultório 01' },
        { id: 'ENC-007', patientId: 'PAT-DEMO-11', type: 'Pronto-Socorro', status: 'Em_Atendimento', room: 'Consultório 02' },
        { id: 'ENC-008', patientId: 'PAT-DEMO-12', type: 'Pronto-Socorro', status: 'Em_Atendimento', room: 'Consultório 03' },

        // Fila de Internação (Aguardando Leito)
        { id: 'ENC-009', patientId: 'PAT-DEMO-13', type: 'Internação', status: 'Aguardando_Leito', room: null },
        { id: 'ENC-010', patientId: 'PAT-DEMO-14', type: 'Internação', status: 'Aguardando_Leito', room: null },

        // Internados nos Leitos
        { id: 'ENC-011', patientId: 'PAT-DEMO-01', type: 'Internação', status: 'Internado', room: 'UTI-01' },
        { id: 'ENC-012', patientId: 'PAT-DEMO-02', type: 'Internação', status: 'Internado', room: 'UTI-02' },
        { id: 'ENC-013', patientId: 'PAT-DEMO-06', type: 'Internação', status: 'Internado', room: 'ENF-01' },
        { id: 'ENC-014', patientId: 'PAT-DEMO-03', type: 'Internação', status: 'Internado', room: 'PED-01' }
      ];

      for (const e of encounters) {
        await targetDb.execute({
          sql: 'INSERT INTO encounters (id, patientId, type, status, room, admitted_at) VALUES (?, ?, ?, ?, ?, ?)',
          args: [e.id, e.patientId, e.type, e.status, e.room, nowIso]
        });
      }

      // 5. Inserir Triagens de Manchester
      const triages = [
        { id: 'TRI-003', encounterId: 'ENC-003', manchesterColor: 'Laranja', bloodPressure: '160/100', temperatureCelsius: 38.5, heartRateBpm: 110, complaints: 'Dor torácica intensa e falta de ar.' },
        { id: 'TRI-004', encounterId: 'ENC-004', manchesterColor: 'Amarelo', bloodPressure: '130/85', temperatureCelsius: 37.8, heartRateBpm: 92, complaints: 'Febre alta contínua e dor abdominal moderada.' },
        { id: 'TRI-005', encounterId: 'ENC-005', manchesterColor: 'Verde', bloodPressure: '120/80', temperatureCelsius: 36.6, heartRateBpm: 75, complaints: 'Entorse leve no tornozelo e escoriações.' },
        { id: 'TRI-006', encounterId: 'ENC-006', manchesterColor: 'Vermelho', bloodPressure: '180/110', temperatureCelsius: 37.2, heartRateBpm: 125, complaints: 'Crise hipertensiva com visão turva.' },
        { id: 'TRI-007', encounterId: 'ENC-007', manchesterColor: 'Amarelo', bloodPressure: '125/80', temperatureCelsius: 36.8, heartRateBpm: 80, complaints: 'Palpitação e ansiedade acentuada.' },
        { id: 'TRI-008', encounterId: 'ENC-008', manchesterColor: 'Verde', bloodPressure: '115/75', temperatureCelsius: 38.1, heartRateBpm: 98, complaints: 'Sintomas gripais e tosse produtiva.' }
      ];

      for (const t of triages) {
        await targetDb.execute({
          sql: 'INSERT INTO triages (id, encounterId, manchesterColor, bloodPressure, temperatureCelsius, heartRateBpm, complaints, triaged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [t.id, t.encounterId, t.manchesterColor, t.bloodPressure, t.temperatureCelsius, t.heartRateBpm, t.complaints, nowIso]
        });
      }

      // 6. Inserir Chamadas para o Painel de TV
      const tvCalls = [
        { id: 'CALL-001', patientName: 'Gabriel Castro Neves', roomName: 'Consultório 01', manchesterColor: 'Vermelho', doctorName: 'Dr. Carlos Oliveira' },
        { id: 'CALL-002', patientName: 'Helena Martins Duarte', roomName: 'Consultório 02', manchesterColor: 'Amarelo', doctorName: 'Dr. João Silva' },
        { id: 'CALL-003', patientName: 'Igor Ferreira Mello', roomName: 'Consultório 03', manchesterColor: 'Verde', doctorName: 'Dra. Maria Santos' },
        { id: 'CALL-004', patientName: 'Bruno Silva Souza', roomName: 'Triagem 01', manchesterColor: 'Laranja', doctorName: 'Enf. Juliana Paes' }
      ];

      for (const c of tvCalls) {
        await targetDb.execute({
          sql: 'INSERT INTO tv_calls (id, patientName, roomName, manchesterColor, doctorName, calledAt) VALUES (?, ?, ?, ?, ?, ?)',
          args: [c.id, c.patientName, c.roomName, c.manchesterColor, c.doctorName, nowIso]
        });
      }

      console.log('[SIMULATOR] Banco atualizado com sucesso!');
    } catch (err) {
      console.error('[SIMULATOR] Erro durante simulação:', err.message);
    }
  }

  console.log('=====================================================');
  console.log(' ✨ SIMULAÇÃO CONCLUÍDA COM SUCESSO! ✨ ');
  console.log('=====================================================');
  process.exit(0);
}

runSimulation();
