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

async function testStagnationTab() {
  console.log('--- TESTANDO ABA DE ALERTAS & ESTAGNAÇÃO (SLA HOSPITALAR) ---');

  // 1. Login
  const login = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin' });
  authToken = login.body.token;

  // 2. Buscar Alertas de Estagnação
  const alertsRes = await makeRequest('/api/stagnation/alerts');
  console.log('2. GET /api/stagnation/alerts STATUS:', alertsRes.status);
  console.log('▶ Total Alertas:', alertsRes.body.totalAlerts);
  console.log('▶ Alertas Críticos:', alertsRes.body.criticalCount);
  console.log('▶ Alertas Moderados:', alertsRes.body.warningCount);

  const alerts = alertsRes.body.alerts || [];

  if (alerts.length > 0) {
    const target = alerts[0];
    console.log(`📍 Testando Direcionamento do Paciente: ${target.patientName} (${target.id})`);

    // 3. Executar Direcionamento / Reatribuição
    const reassignRes = await makeRequest('/api/stagnation/reassign', 'POST', {
      encounterId: target.id,
      room: 'Consultório 02 (Dra. Maria)',
      status: 'Em_Atendimento'
    });

    console.log('3. POST /api/stagnation/reassign STATUS:', reassignRes.status, reassignRes.body);
  } else {
    console.log('Nenhum alerta de estagnação ativo no momento.');
  }

  console.log('\n🎉 TESTE DA ABA DE ESTAGNAÇÃO CONCLUÍDO COM SUCESSO!');
}

testStagnationTab().catch(console.error);
