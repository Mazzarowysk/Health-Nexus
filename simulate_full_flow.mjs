import http from 'http';

let authToken = '';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

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

async function testFullFlow() {
  console.log('--- SIMULAÇÃO DE ATENDIMENTO COM AUTENTICAÇÃO REAL ---');
  
  // 0. Fazer Login com admin / admin
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: 'admin'
  });
  console.log('0. LOGIN STATUS:', loginRes.status, loginRes.body?.message || loginRes.body);

  if (loginRes.body?.token) {
    authToken = loginRes.body.token;
    console.log('🔑 JWT Token obtido com sucesso!');
  } else {
    console.error('Falha no login!');
    process.exit(1);
  }

  // 1. Obter agendamentos
  const apts = await makeRequest('/api/appointments');
  console.log('1. GET /api/appointments STATUS:', apts.status, '| Total agendamentos:', apts.body?.data?.length || 0);

  const thiago = (apts.body?.data || []).find(a => (a.patientName || '').includes('Thiago')) || apts.body?.data?.[0];
  if (!thiago) {
    console.error('Nenhum agendamento encontrado!');
    process.exit(1);
  }

  console.log('📍 Paciente Selecionado:', thiago.patientName, '| ID:', thiago.id, '| PatientId:', thiago.patientId);

  // 2. Atualizar status na agenda (PUT /api/appointments/:id)
  const updateRes = await makeRequest(`/api/appointments/${thiago.id}`, 'PUT', { status: 'Em Atendimento' });
  console.log('2. PUT /api/appointments/:id STATUS:', updateRes.status, updateRes.body);

  // 3. Abrir/Atualizar atendimento (POST /api/encounters)
  const encRes = await makeRequest('/api/encounters', 'POST', {
    patientId: thiago.patientId,
    patientName: thiago.patientName,
    type: 'Ambulatorio',
    status: 'Em_Atendimento'
  });
  console.log('3. POST /api/encounters STATUS:', encRes.status, encRes.body);

  // 4. Verificar se paciente aparece em /api/encounters (Fila de Consulta Médica)
  const encounters = await makeRequest('/api/encounters');
  console.log('4. GET /api/encounters STATUS:', encounters.status, '| Total atendimentos na fila:', encounters.body?.length || 0);

  const foundInQueue = Array.isArray(encounters.body) && encounters.body.find(e => e.patientId === thiago.patientId || e.patientName === thiago.patientName);
  
  if (foundInQueue) {
    console.log('\n🎉 SUCESSO TOTAL DA SIMULAÇÃO!');
    console.log('▶ Paciente:', foundInQueue.patientName);
    console.log('▶ Status na Fila Médica:', foundInQueue.status);
    console.log('▶ Classificação Manchester:', foundInQueue.manchesterColor);
  } else {
    console.error('\n❌ ERRO! Paciente não foi encontrado na Fila!');
  }
}

testFullFlow().catch(console.error);
