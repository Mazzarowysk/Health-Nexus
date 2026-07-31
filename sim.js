import Database from 'better-sqlite3';
const db = new Database('local.db');
const now = new Date().toISOString().split('T')[0];
db.exec(`
  INSERT INTO appointments (id, patientId, patientName, doctorName, specialty, roomName, appointmentDate, appointmentTime, status, notes) 
  VALUES 
  ('sim-1', 'sim-pat-1', 'Maria Oliveira', 'Dr. Silva', 'Clínica Médica', 'Consultório 01', '${now}', '10:00', 'Em Atendimento', 'Simulação'),
  ('sim-2', 'sim-pat-2', 'João Santos', 'Dr. Silva', 'Clínica Médica', 'Consultório 01', '${now}', '09:00', 'Concluído', 'Simulação'),
  ('sim-3', 'sim-pat-3', 'Pedro Alves', 'Dr. Silva', 'Clínica Médica', 'Consultório 01', '${now}', '11:00', 'Agendado', 'Simulação'),
  ('sim-4', 'sim-pat-4', 'Ana Lima', 'Dra. Costa', 'Pediatria', 'Consultório 03', '${now}', '08:00', 'Concluído', 'Simulação'),
  ('sim-5', 'sim-pat-5', 'Carla Souza', 'Dra. Costa', 'Pediatria', 'Consultório 03', '${now}', '10:30', 'Em Atendimento', 'Simulação')
`);
console.log('Simulated appointments created.');
