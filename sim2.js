import Database from 'better-sqlite3';
const db = new Database('local.db');
const now = new Date().toISOString().split('T')[0];

const rooms = [
  'Consultório 01', 'Consultório 02', 'Consultório 03', 'Consultório 04', 
  'Sala de Triagem', 'Exames / Raio-X'
];

const st = db.prepare(`
  INSERT INTO appointments (id, patientId, patientName, doctorName, specialty, roomName, appointmentDate, appointmentTime, status, notes) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
for (const room of rooms) {
  // Em Atendimento
  st.run(`sim-all-${count++}`, `sim-pat-all-${count}`, `Paciente Em Atendimento ${count}`, 'Dr. Simulação', 'Clínica Geral', room, now, '10:00', 'Em Atendimento', 'Simulação');
  // Concluído
  st.run(`sim-all-${count++}`, `sim-pat-all-${count}`, `Paciente Concluído ${count}`, 'Dr. Simulação', 'Clínica Geral', room, now, '09:00', 'Concluído', 'Simulação');
  // Agendado
  st.run(`sim-all-${count++}`, `sim-pat-all-${count}`, `Paciente Agendado ${count}`, 'Dr. Simulação', 'Clínica Geral', room, now, '11:00', 'Agendado', 'Simulação');
}

console.log('Simulated appointments created for ALL consulting rooms.');
