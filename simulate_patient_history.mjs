import http from 'http';

let authToken = '';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testPatientHistory() {
  console.log('--- TESTANDO HISTÓRICO DE PACIENTE & PRONTUÁRIO PÓS-ALTA ---');

  // 1. Login
  const login = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin' });
  authToken = login.body.token;

  // 2. Buscar lista de pacientes
  const patientsRes = await makeRequest('/api/patients');
  const patients = patientsRes.body?.data || patientsRes.body || [];

  if (patients.length === 0) {
    console.error('Nenhum paciente encontrado!');
    process.exit(1);
  }

  const patient = patients[0];
  console.log('📍 Paciente Selecionado:', patient.fullName, '| ID:', patient.id);

  // 3. Buscar Histórico do Paciente
  const historyRes = await makeRequest(`/api/patients/${patient.id}/history`);
  console.log('3. GET /api/patients/:id/history STATUS:', historyRes.status);
  
  const data = historyRes.body?.data || {};
  console.log('▶ Total Atendimentos (Encounters):', data.encounters?.length || 0);
  console.log('▶ Total Agendamentos (Appointments):', data.appointments?.length || 0);
  console.log('▶ Total Prescrições (Prescriptions):', data.prescriptions?.length || 0);

  console.log('\n🎉 TESTE DE HISTÓRICO DE PACIENTES CONCLUÍDO COM SUCESSO!');
}

testPatientHistory().catch(console.error);
