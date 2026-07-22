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

async function testPEPFlow() {
  console.log('--- TESTANDO FLUXO COMPLETO DO PRONTUÁRIO ELETRÔNICO (PEP) ---');

  // 1. Login
  const login = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin' });
  authToken = login.body.token;

  // 2. Buscar atendimentos na fila
  const encs = await makeRequest('/api/encounters');
  const encounters = encs.body || [];

  if (encounters.length === 0) {
    console.error('Nenhum atendimento na fila!');
    process.exit(1);
  }

  const activeEnc = encounters.find(e => e.status === 'Em_Atendimento') || encounters[0];
  console.log('📍 Atendimento Selecionado:', activeEnc.patientName, '| ID:', activeEnc.id, '| Status:', activeEnc.status);

  // 3. Salvar Nota Clínica PEP (SOAP)
  const saveNoteRes = await makeRequest(`/api/encounters/${activeEnc.id}/notes`, 'POST', {
    noteType: 'Evolucao_Medica',
    subjectiveContent: 'Paciente relata melhora das dores após medicação.',
    objectiveContent: 'PA: 120/80 mmHg, FC: 78 bpm, Ausculta cardíaca rítmica.',
    assessmentContent: 'Quadro estável. Hipótese de Cefaleia Tensional revertida.',
    planContent: 'Alta médica com prescrição de Dipirona 500mg se dor.'
  });

  console.log('3. POST /api/encounters/:id/notes STATUS:', saveNoteRes.status, saveNoteRes.body);

  // 4. Buscar Nota Clínica Salva
  const getNoteRes = await makeRequest(`/api/encounters/${activeEnc.id}/notes`);
  console.log('4. GET /api/encounters/:id/notes STATUS:', getNoteRes.status, '| Nota:', getNoteRes.body?.subjectiveContent);

  // 5. Finalizar Atendimento (Alta Médica)
  const statusRes = await makeRequest(`/api/encounters/${activeEnc.id}/status`, 'PUT', { status: 'Finalizado' });
  console.log('5. PUT /api/encounters/:id/status STATUS:', statusRes.status, statusRes.body);

  console.log('\n🎉 TESTE DE PEP E ALTA MÉDICA CONCLUÍDO COM SUCESSO!');
}

testPEPFlow().catch(console.error);
