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

async function testAll3Buttons() {
  console.log('--- TESTANDO OS 3 BOTÕES DA AGENDA ---');
  
  // Login
  const loginRes = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin' });
  authToken = loginRes.body.token;

  const apts = await makeRequest('/api/appointments');
  const items = apts.body?.data || [];

  if (items.length < 3) {
    console.error('Menos de 3 agendamentos no banco!');
    process.exit(1);
  }

  // Teste 1: Botão CONFIRMAR (Check Verde)
  const item1 = items[0];
  const res1 = await makeRequest(`/api/appointments/${item1.id}`, 'PUT', { status: 'Confirmado' });
  console.log(`✅ BOTÃO 1 (CONFIRMAR) -> Paciente: ${item1.patientName} | Status HTTP: ${res1.status} | Resposta:`, res1.body.message);

  // Teste 2: Botão ATENDER (Estetoscópio Rosa)
  const item2 = items[1];
  const res2A = await makeRequest(`/api/appointments/${item2.id}`, 'PUT', { status: 'Em Atendimento' });
  const res2B = await makeRequest('/api/encounters', 'POST', { patientId: item2.patientId, patientName: item2.patientName, type: 'Ambulatorio', status: 'Em_Atendimento' });
  console.log(`🩺 BOTÃO 2 (ATENDER)   -> Paciente: ${item2.patientName} | Status HTTP Agenda: ${res2A.status} | Status HTTP Fila: ${res2B.status} | Resposta:`, res2B.body);

  // Teste 3: Botão CANCELAR (X Vermelho)
  const item3 = items[2];
  const res3 = await makeRequest(`/api/appointments/${item3.id}`, 'PUT', { status: 'Cancelado' });
  console.log(`❌ BOTÃO 3 (CANCELAR)  -> Paciente: ${item3.patientName} | Status HTTP: ${res3.status} | Resposta:`, res3.body.message);

  // Validação na Fila Médica
  const encounters = await makeRequest('/api/encounters');
  const found = (encounters.body || []).find(e => e.patientName === item2.patientName);
  
  if (found) {
    console.log(`\n🎉 VALIDAÇÃO CONCLUÍDA COM SUCESSO!`);
    console.log(`▶ Paciente ${item2.patientName} está presente na Fila Médica com status: "${found.status}" e prioridade: "${found.manchesterColor}".`);
  } else {
    console.error(`❌ Paciente ${item2.patientName} não foi encontrado na Fila Médica.`);
  }
}

testAll3Buttons().catch(console.error);
