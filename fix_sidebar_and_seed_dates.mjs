import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { randomBytes } from 'crypto';

// 1. Atualizar src/main.js para garantir que Alertas & Estagnação está no menu lateral em renderAppStructure
const mainJsPath = 'c:/Health Nexus/src/main.js';
let mainJsContent = readFileSync(mainJsPath, 'utf8');

const navAtendimentoOld = `            <li>
              <a class="nav-item \${state.activeTab === 'atendimento' ? 'active' : ''}" data-tab="atendimento">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Atendimentos</span>
              </a>
            </li>`;

const navAtendimentoNew = `            <li>
              <a class="nav-item \${state.activeTab === 'atendimento' ? 'active' : ''}" data-tab="atendimento">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Atendimentos</span>
              </a>
            </li>
            <li>
              <a class="nav-item \${state.activeTab === 'estagnacao' ? 'active' : ''}" data-tab="estagnacao" style="position: relative;">
                <i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>
                <span>Alertas & Estagnação</span>
                <span id="stagnation-nav-badge" class="badge-count" style="display:none; margin-left: auto; background: #ef4444; color: #fff; border-radius: 10px; font-size: 0.7rem; padding: 2px 7px; font-weight: 700;">0</span>
              </a>
            </li>`;

if (mainJsContent.includes(navAtendimentoOld) && !mainJsContent.includes('data-tab="estagnacao"')) {
  mainJsContent = mainJsContent.replace(navAtendimentoOld, navAtendimentoNew);
  writeFileSync(mainJsPath, mainJsContent, 'utf8');
  console.log('✅ Aba Alertas & Estagnação adicionada ao HTML do menu lateral em src/main.js!');
} else {
  console.log('ℹ️ Menu lateral já continha a aba Alertas & Estagnação ou usou formato diferente.');
}

// 2. Semear agendamentos para 21/07/2026 e 22/07/2026 e 23/07/2026
const db = createClient({ url: 'file:local.db' });

const datesToSeed = ['2026-07-21', '2026-07-22', '2026-07-23'];

const appointmentsBase = [
  { patientId: 'P-FICT-001', patientName: 'Carlos Eduardo Mendes',   doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentTime: '08:00', status: 'Confirmado',     notes: 'Retorno pós-ECG. Paciente hipertenso com controle medicamentoso.' },
  { patientId: 'P-FICT-002', patientName: 'Ana Beatriz Sousa',        doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentTime: '08:30', status: 'Agendado',       notes: 'Consulta de rotina. Criança de 5 anos, desenvolvimento normal.' },
  { patientId: 'P-FICT-003', patientName: 'Roberto Lima Ferreira',    doctorName: 'Dr. Carlos Oliveira', specialty: 'Clínica Geral',  appointmentTime: '09:00', status: 'Em Atendimento', notes: 'Queixa de dor lombar há 3 dias. Sem trauma relatado.' },
  { patientId: 'P-FICT-004', patientName: 'Juliana Costa Braga',      doctorName: 'Dra. Ana Costa',      specialty: 'Ortopedia',      appointmentTime: '09:30', status: 'Agendado',       notes: 'Dor no joelho direito após queda. Solicitar RX.' },
  { patientId: 'P-FICT-005', patientName: 'Marcos Vinícius Alves',    doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentTime: '10:00', status: 'Agendado',       notes: 'Primeiro atendimento. Palpitações frequentes ao esforço.' },
  { patientId: 'P-FICT-006', patientName: 'Fernanda Ramos Dias',      doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentTime: '10:30', status: 'Confirmado',     notes: 'Vacinação e avaliação do desenvolvimento neuromotor.' },
  { patientId: 'P-FICT-007', patientName: 'Paulo Henrique Torres',    doctorName: 'Dr. Carlos Oliveira', specialty: 'Clínica Geral',  appointmentTime: '11:00', status: 'Concluído',      notes: 'Exames de sangue solicitados. Colesterol LDL elevado.' },
  { patientId: 'P-FICT-008', patientName: 'Camila Nascimento Silva',  doctorName: 'Dra. Ana Costa',      specialty: 'Ortopedia',      appointmentTime: '11:30', status: 'Agendado',       notes: 'Fratura consolidada no rádio. Revisão de raio-X e retorno.' },
  { patientId: 'P-FICT-009', patientName: 'Diego Martins Corrêa',     doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentTime: '14:00', status: 'Agendado',       notes: 'Monitoramento de stent coronariano. Checkup semestral.' },
  { patientId: 'P-FICT-010', patientName: 'Luciana Pereira Gomes',    doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentTime: '14:30', status: 'Cancelado',      notes: 'Paciente remarcou consulta para amanhã por imprevistos.' },
  { patientId: 'P-FICT-011', patientName: 'Rafael Souza Barbosa',     doctorName: 'Dr. Carlos Oliveira', specialty: 'Clínica Geral',  appointmentTime: '15:00', status: 'Agendado',       notes: 'Controle glicêmico. Diabetes tipo 2 em acompanhamento.' },
  { patientId: 'P-FICT-012', patientName: 'Patrícia Oliveira Melo',   doctorName: 'Dra. Ana Costa',      specialty: 'Ortopedia',      appointmentTime: '15:30', status: 'Confirmado',     notes: 'Tendinite no ombro direito. Indicação de fisioterapia.' },
  { patientId: 'P-FICT-013', patientName: 'Thiago Rodrigues Nunes',   doctorName: 'Dr. João Silva',      specialty: 'Cardiologia',    appointmentTime: '16:00', status: 'Agendado',       notes: 'Avaliação pré-operatória cardiovascular.' },
  { patientId: 'P-FICT-014', patientName: 'Bruna Aparecida Lopes',    doctorName: 'Dra. Maria Santos',   specialty: 'Pediatria',      appointmentTime: '16:30', status: 'Agendado',       notes: 'Criança com febre recorrente há 5 dias. Suspeita de infecção.' },
];

async function runSeed() {
  const nowIso = new Date().toISOString();
  let totalInserted = 0;

  for (const dateStr of datesToSeed) {
    for (const apt of appointmentsBase) {
      const id = 'APT-' + dateStr + '-' + randomBytes(3).toString('hex');
      try {
        await db.execute({
          sql: 'INSERT INTO appointments (id, patientId, patientName, doctorName, specialty, appointmentDate, appointmentTime, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [id, apt.patientId, apt.patientName, apt.doctorName, apt.specialty, dateStr, apt.appointmentTime, apt.status, apt.notes, nowIso, nowIso]
        });
        totalInserted++;
      } catch(e) {}
    }
  }

  console.log(`✅ Total de agendamentos semeados para 21/07, 22/07 e 23/07: ${totalInserted}`);
  db.close();
}

runSeed().catch(console.error);
