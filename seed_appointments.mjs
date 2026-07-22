import { createClient } from '@libsql/client';
import { randomBytes } from 'crypto';

const db = createClient({ url: 'file:local.db' });

const today = new Date().toISOString().split('T')[0];

const appointments = [
  { patientId: 'P-FICT-001', patientName: 'Carlos Eduardo Mendes',   doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentDate: today, appointmentTime: '08:00', status: 'Confirmado',     notes: 'Retorno pós-ECG. Paciente hipertenso com controle medicamentoso.' },
  { patientId: 'P-FICT-002', patientName: 'Ana Beatriz Sousa',        doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentDate: today, appointmentTime: '08:30', status: 'Agendado',       notes: 'Consulta de rotina. Criança de 5 anos, desenvolvimento normal.' },
  { patientId: 'P-FICT-003', patientName: 'Roberto Lima Ferreira',    doctorName: 'Dr. Carlos Oliveira', specialty: 'Clínica Geral',  appointmentDate: today, appointmentTime: '09:00', status: 'Em Atendimento', notes: 'Queixa de dor lombar há 3 dias. Sem trauma relatado.' },
  { patientId: 'P-FICT-004', patientName: 'Juliana Costa Braga',      doctorName: 'Dra. Ana Costa',      specialty: 'Ortopedia',      appointmentDate: today, appointmentTime: '09:30', status: 'Agendado',       notes: 'Dor no joelho direito após queda. Solicitar RX.' },
  { patientId: 'P-FICT-005', patientName: 'Marcos Vinícius Alves',    doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentDate: today, appointmentTime: '10:00', status: 'Agendado',       notes: 'Primeiro atendimento. Palpitações frequentes ao esforço.' },
  { patientId: 'P-FICT-006', patientName: 'Fernanda Ramos Dias',      doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentDate: today, appointmentTime: '10:30', status: 'Confirmado',     notes: 'Vacinação e avaliação do desenvolvimento neuromotor.' },
  { patientId: 'P-FICT-007', patientName: 'Paulo Henrique Torres',    doctorName: 'Dr. Carlos Oliveira', specialty: 'Clínica Geral',  appointmentDate: today, appointmentTime: '11:00', status: 'Concluído',      notes: 'Exames de sangue solicitados. Colesterol LDL elevado.' },
  { patientId: 'P-FICT-008', patientName: 'Camila Nascimento Silva',  doctorName: 'Dra. Ana Costa',      specialty: 'Ortopedia',      appointmentDate: today, appointmentTime: '11:30', status: 'Agendado',       notes: 'Fratura consolidada no rádio. Revisão de raio-X e retorno.' },
  { patientId: 'P-FICT-009', patientName: 'Diego Martins Corrêa',     doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentDate: today, appointmentTime: '14:00', status: 'Agendado',       notes: 'Monitoramento de stent coronariano. Checkup semestral.' },
  { patientId: 'P-FICT-010', patientName: 'Luciana Pereira Gomes',    doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentDate: today, appointmentTime: '14:30', status: 'Cancelado',      notes: 'Paciente remarcou consulta para amanhã por imprevistos.' },
  { patientId: 'P-FICT-011', patientName: 'Rafael Souza Barbosa',     doctorName: 'Dr. Carlos Oliveira', specialty: 'Clínica Geral',  appointmentDate: today, appointmentTime: '15:00', status: 'Agendado',       notes: 'Controle glicêmico. Diabetes tipo 2 em acompanhamento.' },
  { patientId: 'P-FICT-012', patientName: 'Patrícia Oliveira Melo',   doctorName: 'Dra. Ana Costa',      specialty: 'Ortopedia',      appointmentDate: today, appointmentTime: '15:30', status: 'Confirmado',     notes: 'Tendinite no ombro direito. Indicação de fisioterapia.' },
  { patientId: 'P-FICT-013', patientName: 'Thiago Rodrigues Nunes',   doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentDate: today, appointmentTime: '16:00', status: 'Agendado',       notes: 'Avaliação pré-operatória cardiovascular.' },
  { patientId: 'P-FICT-014', patientName: 'Bruna Aparecida Lopes',    doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentDate: today, appointmentTime: '16:30', status: 'Agendado',       notes: 'Criança com febre recorrente há 5 dias. Suspeita de infecção.' },
];

async function seed() {
  const nowIso = new Date().toISOString();
  let inserted = 0;
  for (const apt of appointments) {
    const id = 'APT-' + randomBytes(4).toString('hex');
    try {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO appointments (id, patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [id, apt.patientId, apt.patientName, apt.doctorName, apt.specialty, apt.appointmentDate, apt.appointmentTime, apt.status, apt.notes, nowIso, nowIso]
      });
      inserted++;
      console.log(`  ✓ ${apt.appointmentTime} — ${apt.patientName} (${apt.status})`);
    } catch(e) {
      console.error(`  ✗ Erro ao inserir ${apt.patientName}:`, e.message);
    }
  }
  const check = await db.execute({ sql: 'SELECT COUNT(*) as total FROM appointments WHERE appointmentDate = ?', args: [today] });
  console.log(`\n✅ ${inserted} agendamentos inseridos para ${today}`);
  console.log(`📋 Total no banco: ${check.rows[0].total}`);
  db.close();
}

seed().catch(console.error);
